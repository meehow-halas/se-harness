"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const http = require("http");
const net = require("net");
const path = require("path");
const { spawn } = require("child_process");

const { withTempDir, writeFile } = require("../test/helpers");
const { createFakeAgentCli } = require("../test/fake-agent-cli");
const { BIND_HOST, createRequestHandler, shutdownMonitor, startServer } =
  require("./index");
const { filterTasks, parseFilters } = require("./layout");
const { createListRefresher } = require("./refresh");
const { createSessionRegistry } = require("./sessions");
const { listTasks } = require("./tasks");

const REPO_ROOT = path.join(__dirname, "..");

const FILE_STATUSES = {
  todo: "queued-aa",
  "in progress": "moving-bb",
  "code review": "checking-cc",
  "in review": "looking-dd",
  done: "vaulted-ee",
};

function waitUntil(fn, timeoutMs = 4000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const value = await fn();
        if (value) {
          resolve(value);
          return;
        }
      } catch {
        // keep waiting
      }
      if (Date.now() - started > timeoutMs) {
        reject(new Error("timeout waiting for list refresh"));
        return;
      }
      setTimeout(tick, 40);
    };
    tick();
  });
}

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

function writeSpyBin(cwd, { searchFile, recordCurl } = {}) {
  const bin = path.join(cwd, ".spy-bin");
  fs.mkdirSync(bin, { recursive: true });
  const curlLog = path.join(bin, "curl.called");
  const curl = path.join(bin, "curl");
  fs.writeFileSync(
    curl,
    `#!/bin/sh
echo "$@" >> ${JSON.stringify(curlLog)}
echo 200
`
  );
  fs.chmodSync(curl, 0o755);
  if (recordCurl === false) {
    // still record if invoked
  }
  const outFile = searchFile || path.join(cwd, "jira-search.out");
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
cat ${JSON.stringify(outFile)}
`
  );
  fs.chmodSync(script, 0o755);
  return {
    curlLog,
    scriptLog,
    searchFile: outFile,
    env: { PATH: `${bin}${path.delimiter}${process.env.PATH}` },
  };
}

function startMonitor(args, { cwd, env }) {
  const child = spawn(process.execPath, [path.join(cwd, ".dhs", "monitor"), ...args], {
    cwd,
    env: { ...process.env, ...env },
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
    const req = http.get({ host: BIND_HOST, port, path: urlPath }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => resolve({ status: res.statusCode, body }));
    });
    req.on("error", reject);
  });
}

function collectSse(port, urlPath, { until, timeoutMs = 5000 } = {}) {
  const events = [];
  return new Promise((resolve, reject) => {
    const req = http.get({ host: BIND_HOST, port, path: urlPath }, (res) => {
      let buf = "";
      res.setEncoding("utf8");
      const timer = setTimeout(() => {
        req.destroy();
        reject(new Error(`SSE timeout: ${JSON.stringify(events)}`));
      }, timeoutMs);
      res.on("data", (chunk) => {
        buf += chunk;
        const parts = buf.split("\n\n");
        buf = parts.pop();
        for (const part of parts) {
          const line = part.split("\n").find((row) => row.startsWith("data: "));
          if (!line) {
            continue;
          }
          events.push(JSON.parse(line.slice(6)));
          if (until && until(events)) {
            clearTimeout(timer);
            req.destroy();
            resolve(events);
          }
        }
      });
      res.on("end", () => {
        clearTimeout(timer);
        resolve(events);
      });
    });
    req.on("error", (err) => {
      if (err.code === "ECONNRESET") {
        resolve(events);
        return;
      }
      reject(err);
    });
  });
}

describe("files list refresh", () => {
  test("a new spec file appears in the list payload without restarting Monitor", async () => {
    await withTempDir(async (cwd) => {
      writeReadyProject(cwd);
      writeFile(cwd, "kb/prd.md", "prd\n");
      writeFeature(cwd, "kb/features/011-alpha-zz.feature.md", {
        title: "Alpha zz panel",
        status: FILE_STATUSES.todo,
      });
      const refresher = createListRefresher({
        cwd,
        pollMs: 80,
        debounceMs: 20,
      });
      try {
        const seen = [];
        refresher.subscribe((payload) => seen.push(payload));
        assert.equal(
          refresher.snapshot().tasks.some((row) => row.key === "013-gamma-xx"),
          false
        );
        writeFeature(cwd, "kb/features/013-gamma-xx.feature.md", {
          title: "Gamma xx after architect",
          status: FILE_STATUSES.todo,
        });
        const payload = await waitUntil(() => {
          const latest = seen[seen.length - 1];
          return latest && latest.tasks.some((row) => row.key === "013-gamma-xx")
            ? latest
            : null;
        });
        const row = payload.tasks.find((task) => task.key === "013-gamma-xx");
        assert.equal(row.title, "Gamma xx after architect");
        assert.equal(row.status, "queued-aa");
      } finally {
        refresher.stop();
      }
    });
  });

  test("a status change on the files tracker appears and default done filter still hides the configured string", async () => {
    await withTempDir(async (cwd) => {
      writeReadyProject(cwd);
      writeFile(cwd, "kb/prd.md", "prd\n");
      writeFeature(cwd, "kb/features/011-alpha-zz.feature.md", {
        title: "Alpha zz panel",
        status: FILE_STATUSES.todo,
      });
      writeFeature(cwd, "kb/features/012-beta-yy.feature.md", {
        title: "Beta yy stays open",
        status: FILE_STATUSES.todo,
      });
      const refresher = createListRefresher({
        cwd,
        pollMs: 80,
        debounceMs: 20,
      });
      try {
        const seen = [];
        refresher.subscribe((payload) => seen.push(payload));
        writeFeature(cwd, "kb/features/011-alpha-zz.feature.md", {
          title: "Alpha zz panel",
          status: FILE_STATUSES.done,
        });
        const payload = await waitUntil(() => {
          const listed = seen[seen.length - 1];
          const alpha =
            listed && listed.tasks.find((row) => row.key === "011-alpha-zz");
          return alpha && alpha.status === FILE_STATUSES.done ? listed : null;
        });
        const alpha = payload.tasks.find((row) => row.key === "011-alpha-zz");
        assert.equal(alpha.status, "vaulted-ee");
        assert.notEqual(alpha.status, "done");
        const visible = filterTasks(
          payload.tasks,
          parseFilters(null),
          FILE_STATUSES.done
        );
        assert.equal(
          visible.some((row) => row.status === FILE_STATUSES.done),
          false
        );
        assert.equal(
          visible.some((row) => row.key === "012-beta-yy"),
          true
        );
      } finally {
        refresher.stop();
      }
    });
  });

  test("HTTP list and SSE pick up a new spec without restarting the process", async () => {
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
        env: { DHS_MONITOR_LIST_POLL_MS: "80" },
      });
      try {
        await started.waitForUrl();
        const before = await get("/api/tasks", port);
        assert.equal(JSON.parse(before.body).tasks.length, 1);
        const sse = collectSse(port, "/api/tasks/events", {
          until: (events) =>
            events.some(
              (event) =>
                Array.isArray(event.tasks) &&
                event.tasks.some((row) => row.key === "013-gamma-xx")
            ),
        });
        writeFeature(cwd, "kb/features/013-gamma-xx.feature.md", {
          title: "Gamma xx after architect",
          status: FILE_STATUSES.todo,
        });
        const events = await sse;
        const after = await get("/api/tasks", port);
        const listed = JSON.parse(after.body);
        assert.equal(
          listed.tasks.some((row) => row.key === "013-gamma-xx"),
          true
        );
        assert.equal(
          events.some((event) =>
            (event.tasks || []).some((row) => row.key === "013-gamma-xx")
          ),
          true
        );
        const app = await get("/app.js", port);
        assert.match(app.body, /\/api\/tasks\/events/);
        assert.match(app.body, /filterTasks/);
      } finally {
        await stopMonitor(started.child);
      }
    });
  });
});

describe("jira list refresh", () => {
  test("a stubbed new Jira row appears via jira search poll, not curl, without restart", async () => {
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
      writeFeature(cwd, "docs/features/001-leftover.feature.md", {
        title: "Leftover file must not appear",
        status: "todo",
      });
      const spy = writeSpyBin(cwd);
      fs.writeFileSync(
        spy.searchFile,
        `OK
key: ZX9-11
status: Waiting Lab
title: ZX9 unique panel title
depends:
`
      );
      const refresher = createListRefresher({
        cwd,
        env: spy.env,
        pollMs: 80,
        debounceMs: 20,
      });
      try {
        const seen = [];
        refresher.subscribe((payload) => seen.push(payload));
        assert.equal(
          refresher.snapshot().tasks.some((row) => row.key === "ZX9-44"),
          false
        );
        fs.writeFileSync(
          spy.searchFile,
          `OK
key: ZX9-11
status: Waiting Lab
title: ZX9 unique panel title
depends:
key: ZX9-44
status: Waiting Lab
title: ZX9 architect created row
depends:
`
        );
        const payload = await waitUntil(() => {
          const listed = seen[seen.length - 1];
          return listed && listed.tasks.some((row) => row.key === "ZX9-44")
            ? listed
            : null;
        });
        assert.equal(
          payload.tasks.some((row) => row.title === "ZX9 architect created row"),
          true
        );
        assert.equal(
          payload.tasks.some((row) => row.title === "Leftover file must not appear"),
          false
        );
        assert.equal(fs.existsSync(spy.curlLog), false);
        const called = fs.readFileSync(spy.scriptLog, "utf8").trim().split("\n");
        assert.ok(called.length >= 2);
        assert.ok(called.every((line) => line.trim() === "search"));
      } finally {
        refresher.stop();
      }
    });
  });

  test("Jira status change appears and default done filter hides the mapped done string", async () => {
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
      const spy = writeSpyBin(cwd);
      fs.writeFileSync(
        spy.searchFile,
        `OK
key: ZX9-11
status: Waiting Lab
title: ZX9 unique panel title
depends:
key: ZX9-8
status: Waiting Lab
title: ZX9 still open
depends:
`
      );
      const refresher = createListRefresher({
        cwd,
        env: spy.env,
        pollMs: 80,
        debounceMs: 20,
      });
      try {
        const seen = [];
        refresher.subscribe((payload) => seen.push(payload));
        fs.writeFileSync(
          spy.searchFile,
          `OK
key: ZX9-11
status: Shipped Lab
title: ZX9 unique panel title
depends:
key: ZX9-8
status: Waiting Lab
title: ZX9 still open
depends:
`
        );
        const payload = await waitUntil(() => {
          const listed = seen[seen.length - 1];
          const row =
            listed && listed.tasks.find((task) => task.key === "ZX9-11");
          return row && row.status === "Shipped Lab" ? listed : null;
        });
        assert.equal(
          payload.tasks.find((row) => row.key === "ZX9-11").status,
          "Shipped Lab"
        );
        const visible = filterTasks(
          payload.tasks,
          parseFilters(null),
          "Shipped Lab"
        );
        assert.equal(
          visible.some((row) => row.status === "Shipped Lab"),
          false
        );
        assert.equal(
          visible.some((row) => row.key === "ZX9-8"),
          true
        );
        assert.equal(fs.existsSync(spy.curlLog), false);
      } finally {
        refresher.stop();
      }
    });
  });
});

describe("refresh after agent activity", () => {
  test("run idle and a tracker Write tool nudge the list refresher", async () => {
    await withTempDir(async (cwd) => {
      writeReadyProject(cwd);
      writeFile(cwd, "kb/prd.md", "prd\n");
      writeFeature(cwd, "kb/features/011-alpha-zz.feature.md", {
        title: "Alpha zz panel",
        status: FILE_STATUSES.todo,
      });
      const cli = createFakeAgentCli({
        streamFor() {
          return [
            {
              type: "tool_call",
              name: "Write",
              path: "kb/features/013-gamma-xx.feature.md",
            },
            {
              type: "assistant",
              message: {
                content: [{ type: "text", text: "wrote spec" }],
              },
            },
          ];
        },
      });
      const nudges = [];
      const sessions = createSessionRegistry({
        cwd,
        maxAgents: 4,
        env: { PATH: "/usr/bin", HOME: "/tmp" },
        spawn: cli.spawn,
        onListRefresh(event) {
          nudges.push(event);
        },
      });
      const port = await allocPort();
      const handler = createRequestHandler({ sessions, cwd });
      const server = await startServer({ port, handler });
      try {
        await sessions.createSession({
          taskKey: "011-alpha-zz",
          model: "composer-fixture-omega",
        });
        writeFeature(cwd, "kb/features/013-gamma-xx.feature.md", {
          title: "Gamma xx after architect",
          status: FILE_STATUSES.todo,
        });
        await sessions.send("011-alpha-zz", "create the spec");
        assert.equal(
          nudges.some(
            (event) =>
              event &&
              event.type === "tool_call" &&
              String(event.path).includes(".feature.md")
          ),
          true
        );
        assert.equal(
          nudges.some((event) => event && event.type === "run" && event.status === "idle"),
          true
        );
        const listed = listTasks(cwd);
        assert.equal(
          listed.tasks.some((row) => row.key === "013-gamma-xx"),
          true
        );
      } finally {
        await shutdownMonitor({ cwd, server, sessions, exitProcess: false });
      }
    });
  });
});
