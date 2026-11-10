"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const http = require("http");
const net = require("net");
const path = require("path");
const { spawn } = require("child_process");

const { withTempDir, writeFile } = require("../test/helpers");
const { BIND_HOST } = require("./index");
const { listTasks } = require("./tasks");
const { filterTasks, parseFilters } = require("./layout");

const REPO_ROOT = path.join(__dirname, "..");

const FILE_STATUSES = {
  todo: "queued-aa",
  "in progress": "moving-bb",
  "code review": "checking-cc",
  "in review": "looking-dd",
  done: "vaulted-ee",
};

function allocPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, BIND_HOST, () => {
      const { port } = server.address();
      server.close((err) => (err ? reject(err) : resolve(port)));
    });
    server.on("error", reject);
  });
}

function copyMonitorRuntime(destMonitor) {
  fs.cpSync(path.join(REPO_ROOT, "monitor"), destMonitor, {
    recursive: true,
    filter: (from) => !/\.test\.[cm]?js$/.test(from),
  });
}

function writeFeature(cwd, rel, { title, status, depends }) {
  const dependsLine =
    Array.isArray(depends) && depends.length
      ? `depends: [${depends.join(", ")}]`
      : "depends: []";
  writeFile(
    cwd,
    rel,
    `---
id: ${path.basename(rel, ".feature.md")}
title: ${title}
status: ${status}
type: feature
${dependsLine}
relates: []
---

# ${title}
`
  );
}

function writeReadyProject(dir, { agents } = {}) {
  const ver = "8.1.4";
  fs.mkdirSync(path.join(dir, ".dhs", "references"), { recursive: true });
  fs.mkdirSync(path.join(dir, ".dhs", "scripts"), { recursive: true });
  fs.writeFileSync(path.join(dir, ".dhs", "VERSION"), `${ver}\n`);
  fs.writeFileSync(
    path.join(dir, "harness.config.json"),
    `${JSON.stringify({
      dhs: { generatedFrom: ver },
      agents: agents || {
        docs: ["kb/prd.md"],
        baseBranch: "trunk",
        statuses: FILE_STATUSES,
      },
    })}\n`
  );
  fs.copyFileSync(
    path.join(REPO_ROOT, "references", "hosts.json"),
    path.join(dir, ".dhs", "references", "hosts.json")
  );
  copyMonitorRuntime(path.join(dir, ".dhs", "monitor"));
}

function writeSpyBin(cwd, { jiraSearchOut, jiraSearchExit = 0, recordCurl } = {}) {
  const bin = path.join(cwd, ".spy-bin");
  fs.mkdirSync(bin, { recursive: true });
  const curlLog = path.join(bin, "curl.called");
  const pathJiraLog = path.join(bin, "path-jira.called");
  const curl = path.join(bin, "curl");
  fs.writeFileSync(
    curl,
    `#!/bin/sh
echo "$@" >> ${JSON.stringify(curlLog)}
echo 200
`
  );
  fs.chmodSync(curl, 0o755);
  const pathJira = path.join(bin, "jira");
  fs.writeFileSync(
    pathJira,
    `#!/bin/sh
echo path >> ${JSON.stringify(pathJiraLog)}
printf 'OK\\nkey: FAKE-1\\nstatus: bogus\\ntitle: from PATH\\ndepends:\\n'
`
  );
  fs.chmodSync(pathJira, 0o755);
  if (jiraSearchOut != null) {
    const scriptLog = path.join(cwd, ".dhs", "scripts", "jira.called");
    const script = path.join(cwd, ".dhs", "scripts", "jira");
    fs.writeFileSync(
      script,
      `#!/bin/sh
echo "$@" >> ${JSON.stringify(scriptLog)}
if [ "$1" != "search" ]; then
  echo "unexpected $1" >&2
  exit 2
fi
cat <<'EOF'
${jiraSearchOut}
EOF
exit ${Number(jiraSearchExit) || 0}
`
    );
    fs.chmodSync(script, 0o755);
  }
  return {
    curlLog,
    pathJiraLog,
    env: { PATH: `${bin}${path.delimiter}${process.env.PATH}` },
  };
}

function startMonitor(args, { cwd, env }) {
  const child = spawn(process.execPath, [path.join(cwd, ".dhs", "monitor"), ...args], {
    cwd,
    env: { ...process.env, DHS_MONITOR_NO_OPEN: "1", ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  function waitForUrl(timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(
          new Error(
            `timeout waiting for Monitor URL\nstdout: ${stdout}\nstderr: ${stderr}`
          )
        );
      }, timeoutMs);
      const cleanup = () => {
        clearTimeout(timer);
        child.stdout.off("data", check);
        child.off("error", onError);
        child.off("exit", onExit);
      };
      const onError = (err) => {
        cleanup();
        reject(err);
      };
      const onExit = (code) => {
        cleanup();
        reject(
          new Error(
            `Monitor exited ${code} before printing a URL\nstdout: ${stdout}\nstderr: ${stderr}`
          )
        );
      };
      const check = () => {
        const match = stdout.match(/http:\/\/127\.0\.0\.1:(\d+)\/?/);
        if (match) {
          cleanup();
          resolve({
            url: `http://127.0.0.1:${match[1]}/`,
            port: Number(match[1]),
          });
        }
      };
      child.stdout.on("data", check);
      child.once("error", onError);
      child.once("exit", onExit);
      check();
    });
  }
  return { child, waitForUrl };
}

function stopMonitor(child) {
  return new Promise((resolve) => {
    if (!child || child.exitCode !== null) {
      resolve();
      return;
    }
    child.once("exit", () => resolve());
    child.kill("SIGTERM");
  });
}

function get(urlPath, port) {
  return new Promise((resolve, reject) => {
    const req = http.get(
      { host: BIND_HOST, port, path: urlPath },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          body += chunk;
        });
        res.on("end", () => resolve({ status: res.statusCode, body }));
      }
    );
    req.on("error", reject);
  });
}

describe("files tracker list", () => {
  test("lists title and configured status from agents.docs features, not a literal todo", () => {
    withTempDir((cwd) => {
      writeReadyProject(cwd);
      writeFile(cwd, "kb/prd.md", "prd\n");
      writeFeature(cwd, "kb/features/011-alpha-zz.feature.md", {
        title: "Alpha zz panel",
        status: FILE_STATUSES.todo,
      });
      writeFeature(cwd, "kb/features/012-beta-yy.feature.md", {
        title: "Beta yy blocked",
        status: FILE_STATUSES.todo,
        depends: ["011-alpha-zz"],
      });
      writeFeature(cwd, "docs/features/001-leftover.feature.md", {
        title: "Leftover under docs/features",
        status: "todo",
      });
      const spy = writeSpyBin(cwd, {
        jiraSearchOut:
          "OK\nkey: FAKE-9\nstatus: x\ntitle: should not list in files mode\ndepends:\n",
      });
      const listed = listTasks(cwd, { env: spy.env });
      const titles = listed.tasks.map((row) => row.title).sort();
      assert.deepEqual(titles, ["Alpha zz panel", "Beta yy blocked"]);
      const alpha = listed.tasks.find((row) => row.key === "011-alpha-zz");
      assert.equal(alpha.status, "queued-aa");
      assert.notEqual(alpha.status, "todo");
      const beta = listed.tasks.find((row) => row.key === "012-beta-yy");
      assert.equal(beta.dependsUnmet, true);
      assert.equal(alpha.dependsUnmet, false);
      assert.equal(fs.existsSync(path.join(cwd, ".dhs", "scripts", "jira.called")), false);
      assert.equal(fs.existsSync(spy.curlLog), false);
    });
  });

  test("live session run-state is running on that row only", () => {
    withTempDir((cwd) => {
      writeReadyProject(cwd);
      writeFile(cwd, "kb/prd.md", "prd\n");
      writeFeature(cwd, "kb/features/011-alpha-zz.feature.md", {
        title: "Alpha zz panel",
        status: FILE_STATUSES.todo,
      });
      writeFeature(cwd, "kb/features/012-beta-yy.feature.md", {
        title: "Beta yy",
        status: FILE_STATUSES.todo,
      });
      const listed = listTasks(cwd, {
        sessions: { list: () => [{ taskKey: "011-alpha-zz" }] },
      });
      assert.equal(
        listed.tasks.find((row) => row.key === "011-alpha-zz").runState,
        "running"
      );
      assert.equal(
        listed.tasks.find((row) => row.key === "012-beta-yy").runState,
        "idle"
      );
    });
  });
});

describe("jira tracker list", () => {
  test("Monitor lists jira search rows and does not glob leftover files or call curl", async () => {
    await withTempDir(async (cwd) => {
      writeReadyProject(cwd, {
        agents: {
          docs: ["docs/prd.md"],
          baseBranch: "trunk",
          tracker: {
            url: "https://jira.zx9.example.test",
            user: "zx9.owner@example.test",
            projectKey: "ZX9",
            issueTypes: { feature: "Work Packet", bug: "Incident Ticket" },
            statuses: { done: "Shipped Lab" },
          },
        },
      });
      writeFile(cwd, "docs/prd.md", "prd\n");
      writeFeature(cwd, "docs/features/001-leftover.feature.md", {
        title: "Leftover file must not appear",
        status: "todo",
      });
      const spy = writeSpyBin(cwd, {
        jiraSearchOut: `OK
key: ZX9-11
status: Waiting Lab
title: ZX9 unique panel title
depends: ZX9-2
key: ZX9-2
status: Waiting Lab
title: ZX9 still open dep
depends:
key: ZX9-4
status: Moving Lab
title: ZX9 unique in-flight title
depends:
key: ZX9-9
status: Shipped Lab
title: ZX9 unique shipped title
depends:
`,
      });
      const port = await allocPort();
      const started = startMonitor(["--host", "cursor", "--port", String(port)], {
        cwd,
        env: spy.env,
      });
      try {
        await started.waitForUrl();
        const res = await get("/api/tasks", port);
        assert.equal(res.status, 200, res.body);
        const body = JSON.parse(res.body);
        const titles = body.tasks.map((row) => row.title).sort();
        assert.deepEqual(titles, [
          "ZX9 still open dep",
          "ZX9 unique in-flight title",
          "ZX9 unique panel title",
          "ZX9 unique shipped title",
        ]);
        assert.equal(
          body.tasks.some((row) => row.title === "Leftover file must not appear"),
          false
        );
        const open = body.tasks.find((row) => row.key === "ZX9-11");
        assert.equal(open.status, "Waiting Lab");
        assert.equal(open.dependsUnmet, true);
        assert.equal(
          body.tasks.find((row) => row.key === "ZX9-4").status,
          "Moving Lab"
        );
        assert.equal(
          body.tasks.find((row) => row.key === "ZX9-9").status,
          "Shipped Lab"
        );
        const visible = filterTasks(
          body.tasks,
          parseFilters(null),
          "Shipped Lab"
        );
        assert.equal(
          visible.some((row) => row.status === "Waiting Lab"),
          true
        );
        assert.equal(
          visible.some((row) => row.status === "Moving Lab"),
          true
        );
        assert.equal(
          visible.some((row) => row.status === "Shipped Lab"),
          false
        );
        const page = await get("/", port);
        assert.match(page.body, /id="task-list"/);
        assert.match(page.body, /id="task-list-error"/);
        const app = await get("/app.js", port);
        assert.match(app.body, /\/api\/tasks/);
        assert.match(app.body, /task\.title/);
        assert.match(app.body, /task\.status/);
        assert.match(app.body, /payload\.error/);
        assert.match(app.body, /task-list-error/);
        assert.equal(fs.existsSync(spy.curlLog), false);
        assert.equal(fs.existsSync(spy.pathJiraLog), false);
        const jiraCalls = fs
          .readFileSync(path.join(cwd, ".dhs", "scripts", "jira.called"), "utf8")
          .trim()
          .split("\n")
          .filter(Boolean);
        assert.ok(jiraCalls.length >= 1);
        assert.ok(jiraCalls.every((line) => line.trim() === "search"));
      } finally {
        await stopMonitor(started.child);
      }
    });
  });

  test("jira search BLOCKED is returned as error instead of a silent empty list", async () => {
    await withTempDir(async (cwd) => {
      writeReadyProject(cwd, {
        agents: {
          docs: ["docs/prd.md"],
          baseBranch: "trunk",
          tracker: {
            url: "https://jira.zx9.example.test",
            user: "zx9.owner@example.test",
            projectKey: "ZX9",
            issueTypes: { feature: "Work Packet", bug: "Incident Ticket" },
            statuses: { todo: "Waiting Lab", done: "Shipped Lab" },
          },
        },
      });
      writeFile(cwd, "docs/prd.md", "prd\n");
      const spy = writeSpyBin(cwd, {
        jiraSearchOut:
          "BLOCKED: Jira HTTP 410 Gone — migrate to /rest/api/3/search/jql",
        jiraSearchExit: 1,
      });
      const port = await allocPort();
      const started = startMonitor(["--host", "cursor", "--port", String(port)], {
        cwd,
        env: spy.env,
      });
      try {
        await started.waitForUrl();
        const res = await get("/api/tasks", port);
        assert.equal(res.status, 200, res.body);
        const body = JSON.parse(res.body);
        assert.deepEqual(body.tasks, []);
        assert.match(body.error, /BLOCKED: Jira HTTP 410 Gone/);
        assert.match(body.error, /search\/jql/);
        const page = await get("/", port);
        assert.match(page.body, /id="task-list-error"/);
        const app = await get("/app.js", port);
        assert.match(app.body, /payload\.error/);
        assert.doesNotMatch(
          app.body,
          /fetch\("\/api\/tasks"\)\.then\(\(res\) => \(res\.ok \? res\.json\(\) : \{ tasks: \[\] \}\)\)/
        );
      } finally {
        await stopMonitor(started.child);
      }
    });
  });
});

describe("files list over HTTP", () => {
  test("left-column API returns configured title and status from the fixture project", async () => {
    await withTempDir(async (cwd) => {
      writeReadyProject(cwd);
      writeFile(cwd, "kb/prd.md", "prd\n");
      writeFeature(cwd, "kb/features/011-alpha-zz.feature.md", {
        title: "Alpha zz panel",
        status: FILE_STATUSES.todo,
      });
      const port = await allocPort();
      const started = startMonitor(["--host", "cursor", "--port", String(port)], {
        cwd,
        env: {},
      });
      try {
        await started.waitForUrl();
        const res = await get("/api/tasks", port);
        assert.equal(res.status, 200);
        const body = JSON.parse(res.body);
        assert.equal(body.tasks.length, 1);
        assert.equal(body.tasks[0].title, "Alpha zz panel");
        assert.equal(body.tasks[0].status, "queued-aa");
        assert.notEqual(body.tasks[0].status, "todo");
        const app = await get("/app.js", port);
        assert.match(app.body, /fetch\("\/api\/tasks"\)/);
      } finally {
        await stopMonitor(started.child);
      }
    });
  });
});
