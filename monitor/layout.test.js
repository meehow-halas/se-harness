"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const http = require("http");
const net = require("net");
const path = require("path");
const { spawn } = require("child_process");

const { withTempDir } = require("../test/helpers");
const { BIND_HOST } = require("./index");
const {
  LEFT_MAX_RATIO,
  LEFT_MIN_PX,
  STORAGE_FILTERS,
  STORAGE_LEFT_WIDTH,
  clampLeftWidth,
  filterTasks,
  parseFilters,
  readFilters,
  readLeftWidth,
  uiConfigFromHarness,
  writeFilters,
  writeLeftWidth,
} = require("./layout");

const REPO_ROOT = path.join(__dirname, "..");

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

function writeReadyProject(dir, { statuses } = {}) {
  const ver = "8.1.4";
  fs.mkdirSync(path.join(dir, ".dhs", "references"), { recursive: true });
  fs.writeFileSync(path.join(dir, ".dhs", "VERSION"), `${ver}\n`);
  fs.writeFileSync(
    path.join(dir, "harness.config.json"),
    `${JSON.stringify({
      dhs: { generatedFrom: ver },
      agents: {
        baseBranch: "trunk",
        statuses: statuses || {
          todo: "queued-aa",
          "in progress": "moving-bb",
          "code review": "checking-cc",
          "in review": "looking-dd",
          done: "vaulted-ee",
        },
      },
    })}\n`
  );
  fs.copyFileSync(
    path.join(REPO_ROOT, "references", "hosts.json"),
    path.join(dir, ".dhs", "references", "hosts.json")
  );
  copyMonitorRuntime(path.join(dir, ".dhs", "monitor"));
}

function startMonitor(args, { cwd }) {
  const child = spawn(process.execPath, [path.join(cwd, ".dhs", "monitor"), ...args], {
    cwd,
    env: { ...process.env },
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

function memoryStorage(initial) {
  const data = { ...initial };
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null;
    },
    setItem(key, value) {
      data[key] = String(value);
    },
    data,
  };
}

describe("left pane width", () => {
  test("cannot shrink below 350px or grow beyond 25% of the current viewport", () => {
    const wide = 2000;
    const other = 1760;
    assert.equal(clampLeftWidth(10, wide), LEFT_MIN_PX);
    assert.equal(clampLeftWidth(10, other), LEFT_MIN_PX);
    assert.equal(clampLeftWidth(9999, wide), Math.floor(wide * LEFT_MAX_RATIO));
    assert.equal(clampLeftWidth(9999, other), Math.floor(other * LEFT_MAX_RATIO));
    assert.notEqual(
      Math.floor(wide * LEFT_MAX_RATIO),
      Math.floor(other * LEFT_MAX_RATIO)
    );
  });

  test("reload reads the stored width and clamps it to this viewport", () => {
    const storage = memoryStorage();
    const saved = writeLeftWidth(storage, 480, 2000);
    assert.equal(saved, 480);
    assert.equal(storage.data[STORAGE_LEFT_WIDTH], "480");
    assert.equal(readLeftWidth(storage, 2000), 480);
    assert.equal(readLeftWidth(storage, 1760), Math.floor(1760 * LEFT_MAX_RATIO));
  });
});

describe("filters", () => {
  test("default hide uses the configured done string, not a baked-in done", () => {
    const doneStatus = "vaulted-ee";
    const tasks = [
      { key: "a", title: "Keep me", status: "queued-aa" },
      { key: "b", title: "Closed", status: doneStatus },
      { key: "c", title: "Literal done still open", status: "done" },
    ];
    const hidden = filterTasks(tasks, parseFilters(null), doneStatus);
    assert.deepEqual(
      hidden.map((row) => row.key),
      ["a", "c"]
    );
    const named = filterTasks(
      tasks,
      { name: "Keep", status: "", hideDone: true },
      doneStatus
    );
    assert.deepEqual(
      named.map((row) => row.key),
      ["a"]
    );
  });

  test("reload restores name, status, and hideDone from storage", () => {
    const storage = memoryStorage();
    writeFilters(storage, {
      name: "alpha-zz",
      status: "moving-bb",
      hideDone: false,
    });
    const restored = readFilters(storage);
    assert.equal(restored.name, "alpha-zz");
    assert.equal(restored.status, "moving-bb");
    assert.equal(restored.hideDone, false);
    assert.equal(readFilters(memoryStorage()).hideDone, true);
    assert.match(storage.data[STORAGE_FILTERS], /alpha-zz/);
  });

  test("ui config reads done from harness statuses, not a hardcoded done", () => {
    const ui = uiConfigFromHarness({
      agents: {
        statuses: {
          todo: "queued-aa",
          done: "vaulted-ee",
        },
      },
    });
    assert.equal(ui.doneStatus, "vaulted-ee");
    assert.equal(ui.statuses.todo, "queued-aa");
  });
});

describe("layout chrome over HTTP", () => {
  test("serves two-column chrome, Add, composer, and config done from the project", async () => {
    await withTempDir(async (cwd) => {
      writeReadyProject(cwd);
      const port = await allocPort();
      const started = startMonitor(["--host", "cursor", "--port", String(port)], {
        cwd,
      });
      try {
        await started.waitForUrl();
        const page = await get("/", port);
        assert.equal(page.status, 200);
        assert.match(page.body, /id="left-pane"/);
        assert.match(page.body, /id="right-pane"/);
        assert.match(page.body, />Add</);
        assert.match(page.body, /id="composer"/);
        assert.match(page.body, />Send</);
        const css = await get("/app.css", port);
        assert.equal(css.status, 200);
        assert.match(css.body, /--chat-width: 720px/);
        const config = await get("/api/config", port);
        assert.equal(config.status, 200);
        const body = JSON.parse(config.body);
        assert.equal(body.doneStatus, "vaulted-ee");
        assert.equal(body.statuses.todo, "queued-aa");
        assert.notEqual(body.doneStatus, "done");
      } finally {
        await stopMonitor(started.child);
      }
    });
  });
});
