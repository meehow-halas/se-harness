#!/usr/bin/env node
"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");
const { createSessionRegistry, SessionError } = require("./sessions");

const DEFAULT_PORT = 7310;
const DEFAULT_MAX_AGENTS = 4;
const BIND_HOST = "127.0.0.1";
const IMPLEMENTED_HOST_ID = "cursor";
const LOCK_REL = path.join(".dhs", "monitor", "instance.lock");
const HOSTS_REL = path.join(".dhs", "references", "hosts.json");

function usage() {
  return "Usage: node .dhs/monitor --host <id> [--port <n>] [--max-agents <n>]";
}

function parsePositiveInt(raw, { min, max }) {
  if (!/^\d+$/.test(String(raw))) {
    return null;
  }
  const n = Number.parseInt(raw, 10);
  if (n < min || n > max) {
    return null;
  }
  return n;
}

function flagValue(argv, i, flag) {
  const cur = argv[i];
  if (cur === flag) {
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("-")) {
      return { error: "usage" };
    }
    return { value: next, nextIndex: i + 2 };
  }
  if (cur.startsWith(`${flag}=`)) {
    const value = cur.slice(flag.length + 1);
    if (value === "") {
      return { error: "usage" };
    }
    return { value, nextIndex: i + 1 };
  }
  return null;
}

function parseArgs(argv) {
  let host;
  let port = DEFAULT_PORT;
  let maxAgents = DEFAULT_MAX_AGENTS;
  let i = 0;
  while (i < argv.length) {
    const cur = argv[i];
    const hostFlag = flagValue(argv, i, "--host");
    if (hostFlag) {
      if (hostFlag.error) {
        return { error: "usage" };
      }
      host = hostFlag.value;
      i = hostFlag.nextIndex;
      continue;
    }
    const portFlag = flagValue(argv, i, "--port");
    if (portFlag) {
      if (portFlag.error) {
        return { error: "usage" };
      }
      const parsed = parsePositiveInt(portFlag.value, { min: 1, max: 65535 });
      if (parsed === null) {
        return { error: "usage" };
      }
      port = parsed;
      i = portFlag.nextIndex;
      continue;
    }
    const maxFlag = flagValue(argv, i, "--max-agents");
    if (maxFlag) {
      if (maxFlag.error) {
        return { error: "usage" };
      }
      const parsed = parsePositiveInt(maxFlag.value, { min: 1, max: 1000 });
      if (parsed === null) {
        return { error: "usage" };
      }
      maxAgents = parsed;
      i = maxFlag.nextIndex;
      continue;
    }
    if (cur === "-h" || cur === "--help") {
      return { error: "help" };
    }
    return { error: "usage" };
  }
  if (host === undefined) {
    return { error: "usage" };
  }
  return { host, port, maxAgents };
}

function lockPath(cwd) {
  return path.join(cwd, LOCK_REL);
}

function monitorUrl(port) {
  return `http://${BIND_HOST}:${port}/`;
}

function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readLockFile(cwd) {
  const file = lockPath(cwd);
  if (!fs.existsSync(file)) {
    return null;
  }
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    if (!data || typeof data !== "object") {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function writeLockFile(cwd, record) {
  const file = lockPath(cwd);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    `${JSON.stringify({
      pid: record.pid,
      port: record.port,
      cwd: record.cwd,
      maxAgents: record.maxAgents,
    })}\n`
  );
}

function removeOwnLock(cwd) {
  const file = lockPath(cwd);
  const lock = readLockFile(cwd);
  if (lock && lock.pid === process.pid) {
    fs.rmSync(file, { force: true });
  }
}

function liveInstance(cwd) {
  const lock = readLockFile(cwd);
  if (!lock) {
    return null;
  }
  if (!pidAlive(lock.pid)) {
    return null;
  }
  if (!Number.isInteger(lock.port)) {
    return null;
  }
  return lock;
}

function setupGuardError(cwd) {
  const dhsDir = path.join(cwd, ".dhs");
  if (!fs.existsSync(dhsDir)) {
    return "Missing .dhs/. Run dhs install, then /dhs-setup.";
  }
  const versionPath = path.join(dhsDir, "VERSION");
  if (!fs.existsSync(versionPath)) {
    return "Missing .dhs/VERSION. Run dhs install, then /dhs-setup.";
  }
  const configPath = path.join(cwd, "harness.config.json");
  if (!fs.existsSync(configPath)) {
    return "Missing harness.config.json. Run /dhs-setup (and dhs install first if .dhs/ is missing).";
  }
  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch {
    return "Invalid JSON in harness.config.json. Run /dhs-setup.";
  }
  const version = fs.readFileSync(versionPath, "utf8").trim();
  const generatedFrom =
    config && config.dhs && typeof config.dhs.generatedFrom === "string"
      ? config.dhs.generatedFrom.trim()
      : "";
  if (version === "" || version !== generatedFrom) {
    return "harness.config.json dhs.generatedFrom does not match .dhs/VERSION. Run /dhs-setup (and dhs install first if .dhs/ is missing).";
  }
  return null;
}

function loadProjectHosts(cwd) {
  const hostsPath = path.join(cwd, HOSTS_REL);
  if (!fs.existsSync(hostsPath)) {
    return { error: "Missing .dhs/references/hosts.json. Run dhs install, then /dhs-setup." };
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(hostsPath, "utf8"));
  } catch {
    return { error: "Invalid JSON at .dhs/references/hosts.json. Run dhs install." };
  }
  if (!Array.isArray(data.hosts)) {
    return { error: "Invalid .dhs/references/hosts.json. Run dhs install." };
  }
  return { hosts: data.hosts };
}

function json(res, status, body) {
  const payload = `${JSON.stringify(body)}\n`;
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function readJsonBody(req, limit = 1_000_000) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > limit) {
        req.destroy();
        reject(new Error("body too large"));
      }
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function parsePathname(req) {
  return new URL(req.url || "/", `http://${BIND_HOST}`).pathname;
}

function sessionRoute(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "api" || parts[1] !== "sessions") {
    return null;
  }
  if (parts.length === 2) {
    return { kind: "collection" };
  }
  const taskKey = decodeURIComponent(parts[2]);
  const action = parts[3] || "item";
  return { kind: "item", taskKey, action };
}

function serveStub(req, res) {
  let pathname;
  try {
    pathname = parsePathname(req);
  } catch {
    res.writeHead(400);
    res.end();
    return true;
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    return false;
  }
  if (pathname === "/" || pathname === "/index.html") {
    const file = path.join(__dirname, "public", "index.html");
    const body = fs.readFileSync(file);
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Length": body.length,
    });
    if (req.method === "HEAD") {
      res.end();
      return true;
    }
    res.end(body);
    return true;
  }
  return false;
}

function requestHandler(req, res) {
  if (serveStub(req, res)) {
    return;
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405);
    res.end();
    return;
  }
  res.writeHead(404);
  res.end();
}

function handleSessionError(res, err) {
  if (err instanceof SessionError) {
    json(res, err.httpStatus, { error: err.message, code: err.code });
    return;
  }
  json(res, 500, { error: err.message || String(err) });
}

async function handleApi(req, res, sessions) {
  let pathname;
  try {
    pathname = parsePathname(req);
  } catch {
    res.writeHead(400);
    res.end();
    return;
  }
  const route = sessionRoute(pathname);
  if (!route) {
    json(res, 404, { error: "not found" });
    return;
  }
  if (route.kind === "collection" && req.method === "GET") {
    json(res, 200, { sessions: sessions.list(), selected: sessions.selected() });
    return;
  }
  if (route.kind === "collection" && req.method === "POST") {
    const body = await readJsonBody(req);
    const created = await sessions.createSession({
      taskKey: body.taskKey,
      model: body.model,
    });
    json(res, 201, created);
    return;
  }
  if (route.kind !== "item") {
    json(res, 404, { error: "not found" });
    return;
  }
  if (route.action === "events" && req.method === "GET") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    const writeEvent = (event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };
    const snap = sessions.snapshot(route.taskKey);
    writeEvent({ type: "snapshot", messages: snap.messages || [] });
    const unsubscribe = sessions.subscribe(route.taskKey, writeEvent);
    const keepAlive = setInterval(() => {
      res.write(": ping\n\n");
    }, 15000);
    req.on("close", () => {
      clearInterval(keepAlive);
      unsubscribe();
    });
    return;
  }
  if (route.action === "item" && req.method === "GET") {
    json(res, 200, sessions.snapshot(route.taskKey));
    return;
  }
  if (route.action === "select" && req.method === "POST") {
    json(res, 200, sessions.select(route.taskKey));
    return;
  }
  if (route.action === "close" && req.method === "POST") {
    json(res, 200, await sessions.closeSession(route.taskKey));
    return;
  }
  if (route.action === "send" && req.method === "POST") {
    const body = await readJsonBody(req);
    const result = await sessions.send(route.taskKey, body.text, {
      intent: body.intent,
    });
    json(res, 200, result);
    return;
  }
  json(res, 405, { error: "method not allowed" });
}

function createRequestHandler({ sessions } = {}) {
  return (req, res) => {
    const run = async () => {
      let pathname;
      try {
        pathname = parsePathname(req);
      } catch {
        res.writeHead(400);
        res.end();
        return;
      }
      if (sessions && pathname.startsWith("/api/")) {
        try {
          await handleApi(req, res, sessions);
        } catch (err) {
          if (!res.headersSent) {
            handleSessionError(res, err);
          }
        }
        return;
      }
      requestHandler(req, res);
    };
    run().catch((err) => {
      if (!res.headersSent) {
        handleSessionError(res, err);
      }
    });
  };
}

function startServer({ port, handler }) {
  const server = http.createServer(handler || requestHandler);
  return new Promise((resolve, reject) => {
    const onError = (err) => {
      server.off("error", onError);
      reject(err);
    };
    server.once("error", onError);
    server.listen(port, BIND_HOST, () => {
      server.off("error", onError);
      resolve(server);
    });
  });
}

async function shutdownMonitor({ cwd, server, sessions, exitProcess = true }) {
  if (sessions) {
    await sessions.disposeAll();
  }
  removeOwnLock(cwd);
  await new Promise((resolve) => {
    if (!server) {
      resolve();
      return;
    }
    server.close(() => resolve());
  });
  if (exitProcess) {
    process.exit(0);
  }
}

function fail(message, code = 1) {
  console.error(message);
  process.exit(code);
}

function resolveCwd(input) {
  const resolved = path.resolve(input);
  try {
    return fs.realpathSync(resolved);
  } catch {
    return resolved;
  }
}

async function main(argv, ctx) {
  const cwd = resolveCwd((ctx && ctx.cwd) || process.cwd());
  const parsed = parseArgs(argv);
  if (parsed.error === "help") {
    console.log(usage());
    process.exit(0);
  }
  if (parsed.error) {
    fail(usage());
  }

  const existing = liveInstance(cwd);
  if (existing) {
    console.log(monitorUrl(existing.port));
    process.exit(0);
  }

  const guard = setupGuardError(cwd);
  if (guard) {
    fail(guard);
  }

  const loaded = loadProjectHosts(cwd);
  if (loaded.error) {
    fail(loaded.error);
  }
  const known = loaded.hosts.some((row) => row && row.id === parsed.host);
  if (!known) {
    fail(
      `Unknown host id: ${parsed.host}. Use an id from .dhs/references/hosts.json.`
    );
  }
  if (parsed.host !== IMPLEMENTED_HOST_ID) {
    fail(`Host ${parsed.host} is not implemented.`);
  }

  const sessions = createSessionRegistry({
    cwd,
    maxAgents: parsed.maxAgents,
    env: process.env,
  });
  const handler = createRequestHandler({ sessions });

  let server;
  try {
    server = await startServer({ port: parsed.port, handler });
  } catch (err) {
    fail(`Could not bind ${BIND_HOST}:${parsed.port}: ${err.message}`);
  }

  writeLockFile(cwd, {
    pid: process.pid,
    port: parsed.port,
    cwd,
    maxAgents: parsed.maxAgents,
  });

  const shutdown = () => {
    shutdownMonitor({ cwd, server, sessions, exitProcess: true }).catch(
      (err) => {
        console.error(err.message || String(err));
        process.exit(1);
      }
    );
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  console.log(monitorUrl(parsed.port));
}

if (require.main === module) {
  main(process.argv.slice(2)).catch((err) => {
    fail(err.message || String(err));
  });
}

module.exports = {
  BIND_HOST,
  DEFAULT_MAX_AGENTS,
  DEFAULT_PORT,
  createRequestHandler,
  main,
  parseArgs,
  shutdownMonitor,
  startServer,
  usage,
};
