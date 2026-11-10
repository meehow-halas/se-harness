"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const http = require("http");
const net = require("net");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const {
  PAYLOAD_DIRS,
  REPO_ROOT,
  makePackageRoot,
  runCli,
  withTempDir,
} = require("../test/helpers");
const {
  BIND_HOST,
  DEFAULT_MAX_AGENTS,
  DEFAULT_PORT,
  monitorUrl,
  openMonitorUrl,
  openerArgs,
  parseArgs,
  startServer,
  usage,
} = require("./index");

const MONITOR_ENTRY = path.join(REPO_ROOT, "monitor", "index.js");
const PACKAGE_VERSION = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8")
).version;

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

function writeReadyProject(dir, { version, generatedFrom } = {}) {
  const ver = version || "8.1.4";
  const from = generatedFrom === undefined ? ver : generatedFrom;
  fs.mkdirSync(path.join(dir, ".dhs", "references"), { recursive: true });
  fs.writeFileSync(path.join(dir, ".dhs", "VERSION"), `${ver}\n`);
  fs.writeFileSync(
    path.join(dir, "harness.config.json"),
    `${JSON.stringify({
      dhs: { generatedFrom: from },
      agents: { baseBranch: "trunk" },
    })}\n`
  );
  fs.copyFileSync(
    path.join(REPO_ROOT, "references", "hosts.json"),
    path.join(dir, ".dhs", "references", "hosts.json")
  );
  copyMonitorRuntime(path.join(dir, ".dhs", "monitor"));
}

function monitorTestEnv(extra = {}) {
  return { ...process.env, DHS_MONITOR_NO_OPEN: "1", ...extra };
}

function runMonitor(args, { cwd, entry, env } = {}) {
  const script = entry || path.join(cwd, ".dhs", "monitor");
  return spawnSync(process.execPath, [script, ...args], {
    cwd,
    encoding: "utf8",
    env: monitorTestEnv(env),
    timeout: 8000,
  });
}

function startMonitor(args, { cwd, entry, env } = {}) {
  const script = entry || path.join(cwd, ".dhs", "monitor");
  const child = spawn(process.execPath, [script, ...args], {
    cwd,
    env: monitorTestEnv(env),
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
            stdout,
            stderr,
          });
        }
      };
      child.stdout.on("data", check);
      child.once("error", onError);
      child.once("exit", onExit);
      check();
    });
  }
  return {
    child,
    waitForUrl,
    getStdout: () => stdout,
    getStderr: () => stderr,
  };
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
      {
        host: BIND_HOST,
        port,
        path: urlPath,
      },
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

function listenAddresses(port) {
  const result = spawnSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN"], {
    encoding: "utf8",
  });
  return `${result.stdout || ""}\n${result.stderr || ""}`;
}

function writeOpenRecorder(dir) {
  const bin = path.join(dir, "record-open");
  const logFile = path.join(dir, "open-argv.log");
  fs.writeFileSync(
    bin,
    `#!/usr/bin/env node
const fs = require("fs");
fs.writeFileSync(process.env.DHS_MONITOR_OPEN_LOG, process.argv.slice(2).join("\\n") + "\\n");
`
  );
  fs.chmodSync(bin, 0o755);
  return { bin, logFile };
}

function waitForFile(file, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (fs.existsSync(file)) {
        const text = fs.readFileSync(file, "utf8");
        if (text.trim()) {
          resolve(text);
          return;
        }
      }
      if (Date.now() - started >= timeoutMs) {
        reject(new Error(`timeout waiting for ${file}`));
        return;
      }
      setTimeout(tick, 25);
    };
    tick();
  });
}

function openSse(port, urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.get(
      { host: BIND_HOST, port, path: urlPath },
      (res) => {
        res.once("data", () => resolve({ req, res }));
      }
    );
    req.on("error", reject);
  });
}

function assertPortBindable(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(port, BIND_HOST, () => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });
}

describe("parseArgs", () => {
  test("requires --host and does not default it to cursor", () => {
    assert.deepEqual(parseArgs([]), { error: "usage" });
    assert.deepEqual(parseArgs(["--port", "7310"]), { error: "usage" });
    assert.deepEqual(parseArgs(["--host"]), { error: "usage" });
    const parsed = parseArgs(["--host", "not-cursor"]);
    assert.equal(parsed.host, "not-cursor");
    assert.equal(parsed.port, DEFAULT_PORT);
    assert.equal(parsed.maxAgents, DEFAULT_MAX_AGENTS);
  });

  test("reads --port and --max-agents instead of baked-in defaults", () => {
    const parsed = parseArgs([
      "--host",
      "cursor",
      "--port",
      "18001",
      "--max-agents",
      "7",
    ]);
    assert.equal(parsed.host, "cursor");
    assert.equal(parsed.port, 18001);
    assert.equal(parsed.maxAgents, 7);
  });
});

describe("startServer bind", () => {
  test("listens on 127.0.0.1 only", async () => {
    const port = await allocPort();
    const server = await startServer({ port });
    try {
      assert.equal(server.address().address, BIND_HOST);
      assert.equal(BIND_HOST, "127.0.0.1");
      const lsof = listenAddresses(port);
      if (lsof.includes("LISTEN")) {
        assert.match(lsof, /127\.0\.0\.1/);
        assert.equal(lsof.includes(`*:${port}`), false);
        assert.equal(lsof.includes(`0.0.0.0:${port}`), false);
      }
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

describe("node .dhs/monitor", () => {
  test("missing --host prints usage and exits 1", () => {
    withTempDir((cwd) => {
      writeReadyProject(cwd);
      const result = runMonitor([], { cwd });
      assert.equal(result.status, 1);
      assert.equal(result.stderr.trim(), usage());
      assert.equal(result.stdout, "");
    });
  });

  test("missing .dhs stops with install/setup and does not serve", () => {
    withTempDir((cwd) => {
      const result = runMonitor(["--host", "cursor"], {
        cwd,
        entry: MONITOR_ENTRY,
      });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /dhs install/);
      assert.match(result.stderr, /\/dhs-setup/);
    });
  });

  test("missing harness.config.json stops with setup and does not serve", () => {
    withTempDir((cwd) => {
      writeReadyProject(cwd);
      fs.rmSync(path.join(cwd, "harness.config.json"));
      const result = runMonitor(["--host", "cursor"], { cwd });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /\/dhs-setup/);
      assert.match(result.stderr, /harness\.config\.json/);
    });
  });

  test("VERSION mismatch stops with setup and does not serve", () => {
    withTempDir((cwd) => {
      writeReadyProject(cwd, {
        version: "4.4.4",
        generatedFrom: "9.9.9",
      });
      const result = runMonitor(["--host", "cursor"], { cwd });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /\/dhs-setup/);
      assert.match(result.stderr, /VERSION/);
    });
  });

  test("unknown host id stops", () => {
    withTempDir((cwd) => {
      writeReadyProject(cwd);
      const result = runMonitor(["--host", "not-a-host"], { cwd });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /Unknown host id: not-a-host/);
    });
  });

  test("known non-cursor host stops as not implemented", () => {
    withTempDir((cwd) => {
      writeReadyProject(cwd);
      const result = runMonitor(["--host", "claude-code"], { cwd });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /not implemented/);
      assert.doesNotMatch(result.stderr, /Unknown host/);
    });
  });

  test("successful start prints a loopback URL, writes the lock, and serves the stub", async () => {
    await withTempDir(async (cwd) => {
      writeReadyProject(cwd);
      const port = await allocPort();
      const started = startMonitor(
        ["--host", "cursor", "--port", String(port), "--max-agents", "7"],
        { cwd }
      );
      try {
        const got = await started.waitForUrl();
        assert.equal(got.url, `http://127.0.0.1:${port}/`);
        const lock = JSON.parse(
          fs.readFileSync(
            path.join(cwd, ".dhs", "monitor", "instance.lock"),
            "utf8"
          )
        );
        assert.equal(lock.pid, started.child.pid);
        assert.equal(lock.port, port);
        assert.equal(lock.cwd, fs.realpathSync(cwd));
        assert.equal(lock.maxAgents, 7);
        const page = await get("/", port);
        assert.equal(page.status, 200);
        assert.match(page.body, /Monitor/);
        const lsof = listenAddresses(port);
        if (lsof.includes("LISTEN")) {
          assert.equal(lsof.includes(`0.0.0.0:${port}`), false);
        }
      } finally {
        await stopMonitor(started.child);
      }
    });
  });

  test("second start in the same cwd prints the URL and does not start a second listener", async () => {
    await withTempDir(async (cwd) => {
      writeReadyProject(cwd);
      const port = await allocPort();
      const otherPort = await allocPort();
      const first = startMonitor(
        ["--host", "cursor", "--port", String(port)],
        { cwd }
      );
      try {
        const got = await first.waitForUrl();
        const second = runMonitor(
          ["--host", "cursor", "--port", String(otherPort)],
          { cwd }
        );
        assert.equal(second.status, 0, second.stderr);
        assert.equal(second.stdout.trim(), got.url);
        const page = await get("/", port);
        assert.equal(page.status, 200);
        const other = await new Promise((resolve) => {
          const req = http.get({ host: BIND_HOST, port: otherPort, path: "/" }, () => {
            resolve("connected");
          });
          req.on("error", () => resolve("free"));
        });
        assert.equal(other, "free");
      } finally {
        await stopMonitor(first.child);
      }
    });
  });

  test("stale lock from a dead pid is replaced", async () => {
    await withTempDir(async (cwd) => {
      writeReadyProject(cwd);
      const dead = spawnSync(process.execPath, ["-e", "process.exit(0)"]);
      const stalePort = await allocPort();
      fs.writeFileSync(
        path.join(cwd, ".dhs", "monitor", "instance.lock"),
        `${JSON.stringify({
          pid: dead.pid,
          port: stalePort,
          cwd: path.resolve(cwd),
        })}\n`
      );
      const port = await allocPort();
      const started = startMonitor(
        ["--host", "cursor", "--port", String(port)],
        { cwd }
      );
      try {
        const got = await started.waitForUrl();
        assert.equal(got.port, port);
        const lock = JSON.parse(
          fs.readFileSync(
            path.join(cwd, ".dhs", "monitor", "instance.lock"),
            "utf8"
          )
        );
        assert.equal(lock.pid, started.child.pid);
        assert.equal(lock.port, port);
      } finally {
        await stopMonitor(started.child);
      }
    });
  });

  test("different cwd gets its own instance", async () => {
    await withTempDir(async (root) => {
      const a = path.join(root, "a");
      const b = path.join(root, "b");
      fs.mkdirSync(a);
      fs.mkdirSync(b);
      writeReadyProject(a);
      writeReadyProject(b);
      const portA = await allocPort();
      const portB = await allocPort();
      const first = startMonitor(
        ["--host", "cursor", "--port", String(portA)],
        { cwd: a }
      );
      const second = startMonitor(
        ["--host", "cursor", "--port", String(portB)],
        { cwd: b }
      );
      try {
        const gotA = await first.waitForUrl();
        const gotB = await second.waitForUrl();
        assert.equal(gotA.port, portA);
        assert.equal(gotB.port, portB);
        assert.equal((await get("/", portA)).status, 200);
        assert.equal((await get("/", portB)).status, 200);
      } finally {
        await stopMonitor(first.child);
        await stopMonitor(second.child);
      }
    });
  });

  test("after dhs install, node .dhs/monitor serves the stub on the printed URL", async () => {
    await withTempDir(async (root) => {
      const pkg = path.join(root, "pkg");
      const project = path.join(root, "project");
      fs.mkdirSync(pkg);
      fs.mkdirSync(project);
      makePackageRoot(pkg, { version: PACKAGE_VERSION, payload: PAYLOAD_DIRS });
      copyMonitorRuntime(path.join(pkg, "monitor"));
      const installed = runCli(["install"], { cwd: project, packageRoot: pkg });
      assert.equal(installed.status, 0, installed.stderr);
      assert.equal(
        fs.existsSync(path.join(project, ".dhs", "monitor", "index.test.js")),
        false
      );
      fs.writeFileSync(
        path.join(project, "harness.config.json"),
        `${JSON.stringify({
          dhs: { generatedFrom: PACKAGE_VERSION },
          agents: { baseBranch: "trunk" },
        })}\n`
      );
      const port = await allocPort();
      const started = startMonitor(
        ["--host", "cursor", "--port", String(port)],
        { cwd: project }
      );
      try {
        const got = await started.waitForUrl();
        assert.equal(got.url, `http://127.0.0.1:${port}/`);
        const page = await get("/", port);
        assert.equal(page.status, 200);
        assert.match(page.body, /<title>Monitor<\/title>/);
      } finally {
        await stopMonitor(started.child);
      }
    });
  });
});

describe("open URL and stop", () => {
  test("without --port, printed URL and opener use 7310", () => {
    const parsed = parseArgs(["--host", "cursor"]);
    assert.equal(parsed.port, DEFAULT_PORT);
    assert.equal(DEFAULT_PORT, 7310);
    const url = monitorUrl(parsed.port);
    assert.equal(url, "http://127.0.0.1:7310/");
    const spec = openerArgs(url, "darwin", {});
    assert.deepEqual(spec, { command: "open", args: ["http://127.0.0.1:7310/"] });
    const calls = [];
    openMonitorUrl(url, {
      env: {},
      platform: "darwin",
      spawn: (command, args) => {
        calls.push({ command, args });
        return { unref() {}, on() {} };
      },
    });
    assert.deepEqual(calls, [
      { command: "open", args: ["http://127.0.0.1:7310/"] },
    ]);
  });

  test("opener argv uses the effective --port, not 7310", async () => {
    await withTempDir(async (cwd) => {
      writeReadyProject(cwd);
      const port = await allocPort();
      assert.notEqual(port, 7310);
      const { bin, logFile } = writeOpenRecorder(cwd);
      const started = startMonitor(
        ["--host", "cursor", "--port", String(port)],
        {
          cwd,
          env: {
            DHS_MONITOR_NO_OPEN: "",
            DHS_MONITOR_OPEN_BIN: bin,
            DHS_MONITOR_OPEN_LOG: logFile,
          },
        }
      );
      try {
        const got = await started.waitForUrl();
        assert.equal(got.url, `http://127.0.0.1:${port}/`);
        const logged = await waitForFile(logFile);
        assert.match(logged, new RegExp(`http://127\\.0\\.0\\.1:${port}/`));
        assert.doesNotMatch(logged, /7310/);
      } finally {
        await stopMonitor(started.child);
      }
    });
  });

  test("opener does not run when DHS_MONITOR_NO_OPEN=1", async () => {
    await withTempDir(async (cwd) => {
      writeReadyProject(cwd);
      const port = await allocPort();
      const { bin, logFile } = writeOpenRecorder(cwd);
      const calls = [];
      openMonitorUrl(monitorUrl(port), {
        env: { DHS_MONITOR_NO_OPEN: "1", DHS_MONITOR_OPEN_BIN: bin },
        spawn: (command, args) => {
          calls.push({ command, args });
          return { unref() {}, on() {} };
        },
      });
      assert.equal(calls.length, 0);
      const started = startMonitor(
        ["--host", "cursor", "--port", String(port)],
        {
          cwd,
          env: {
            DHS_MONITOR_NO_OPEN: "1",
            DHS_MONITOR_OPEN_BIN: bin,
            DHS_MONITOR_OPEN_LOG: logFile,
          },
        }
      );
      try {
        await started.waitForUrl();
        await new Promise((resolve) => setTimeout(resolve, 200));
        assert.equal(fs.existsSync(logFile), false);
      } finally {
        await stopMonitor(started.child);
      }
    });
  });

  test("second start opens the live lock URL and does not bind --port", async () => {
    await withTempDir(async (cwd) => {
      writeReadyProject(cwd);
      const port = await allocPort();
      const otherPort = await allocPort();
      assert.notEqual(port, otherPort);
      const first = startMonitor(["--host", "cursor", "--port", String(port)], {
        cwd,
      });
      try {
        const got = await first.waitForUrl();
        const { bin, logFile } = writeOpenRecorder(cwd);
        const second = runMonitor(
          ["--host", "cursor", "--port", String(otherPort)],
          {
            cwd,
            env: {
              DHS_MONITOR_NO_OPEN: "",
              DHS_MONITOR_OPEN_BIN: bin,
              DHS_MONITOR_OPEN_LOG: logFile,
            },
          }
        );
        assert.equal(second.status, 0, second.stderr);
        assert.equal(second.stdout.trim(), got.url);
        const logged = await waitForFile(logFile);
        assert.match(logged, new RegExp(`http://127\\.0\\.0\\.1:${port}/`));
        assert.doesNotMatch(
          logged,
          new RegExp(`http://127\\.0\\.0\\.1:${otherPort}/`)
        );
        await assertPortBindable(otherPort);
      } finally {
        await stopMonitor(first.child);
      }
    });
  });

  test("SIGTERM with a live SSE client frees that --port", async () => {
    await withTempDir(async (cwd) => {
      writeReadyProject(cwd);
      const port = await allocPort();
      const started = startMonitor(
        ["--host", "cursor", "--port", String(port)],
        { cwd }
      );
      try {
        await started.waitForUrl();
        const sse = await openSse(port, "/api/tasks/events");
        const exited = new Promise((resolve) => {
          started.child.once("exit", resolve);
        });
        started.child.kill("SIGTERM");
        await exited;
        await assertPortBindable(port);
        sse.req.destroy();
      } finally {
        await stopMonitor(started.child);
      }
    });
  });
});
