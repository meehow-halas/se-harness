"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const http = require("http");
const net = require("net");
const path = require("path");

const { withTempDir } = require("../test/helpers");
const { BIND_HOST, createRequestHandler, shutdownMonitor, startServer } = require("./index");
const {
  MISSING_API_KEY,
  PLANIT_LOCK_REL,
  SessionError,
  createSessionRegistry,
} = require("./sessions");

const MODEL = "composer-fixture-omega";
const API_KEY = "cursor_test_key_zeta";
const TASK_A = "001-alpha";
const TASK_B = "002-beta";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function writeConfig(cwd, extraAgents = {}) {
  fs.mkdirSync(path.join(cwd, ".dhs", "monitor"), { recursive: true });
  fs.writeFileSync(
    path.join(cwd, "harness.config.json"),
    `${JSON.stringify({
      dhs: { generatedFrom: "8.1.4" },
      agents: { baseBranch: "trunk", ...extraAgents },
    })}\n`
  );
}

function createFakeSdk({ sendDelayMs = 40 } = {}) {
  const creates = [];
  const resumes = [];
  const sends = [];
  const disposes = [];
  const liveIds = new Set();
  let seq = 0;
  let inFlight = 0;
  let maxInFlight = 0;

  function makeAgent(id) {
    return {
      agentId: id,
      async send(text) {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        sends.push({ agentId: id, text });
        try {
          await delay(sendDelayMs);
          return {
            async *stream() {
              yield {
                type: "assistant",
                message: {
                  content: [{ type: "text", text: `echo:${text}` }],
                },
              };
            },
            async wait() {
              return { status: "finished" };
            },
          };
        } finally {
          inFlight -= 1;
        }
      },
      async [Symbol.asyncDispose]() {
        disposes.push(id);
        liveIds.delete(id);
      },
    };
  }

  return {
    creates,
    resumes,
    sends,
    disposes,
    liveIds,
    maxInFlight: () => maxInFlight,
    async create(opts) {
      creates.push(opts);
      const id = `fake-${++seq}`;
      liveIds.add(id);
      return makeAgent(id);
    },
    async resume(id, opts) {
      resumes.push({ id, opts });
      if (!liveIds.has(id)) {
        throw new Error("agent id is not live");
      }
      return makeAgent(id);
    },
  };
}

function registryFor(cwd, { sdk, maxAgents = 4, env } = {}) {
  return createSessionRegistry({
    cwd,
    maxAgents,
    env: env || { CURSOR_API_KEY: API_KEY },
    sdk: sdk || createFakeSdk(),
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

function requestJson({ port, method, urlPath, body }) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: BIND_HOST,
        port,
        path: urlPath,
        method,
        headers: { "Content-Type": "application/json" },
      },
      (res) => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = null;
          }
          resolve({ status: res.statusCode, body: data, json: parsed });
        });
      }
    );
    req.on("error", reject);
    if (body !== undefined) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

function collectSse(port, urlPath, { until, timeoutMs = 4000 } = {}) {
  const events = [];
  let resolveReady;
  const ready = new Promise((resolve) => {
    resolveReady = resolve;
  });
  const done = new Promise((resolve, reject) => {
    const req = http.get(
      { host: BIND_HOST, port, path: urlPath },
      (res) => {
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
            if (events.length === 1) {
              resolveReady();
            }
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
      }
    );
    req.on("error", (err) => {
      if (err.code === "ECONNRESET") {
        resolve(events);
        return;
      }
      reject(err);
    });
  });
  return { events, ready, done };
}

describe("session registry", () => {
  test("uses a distinct Agent per task key and does not recycle one across keys", async () => {
    await withTempDir(async (cwd) => {
      writeConfig(cwd);
      const sdk = createFakeSdk();
      const sessions = registryFor(cwd, { sdk });
      const a = await sessions.createSession({ taskKey: TASK_A, model: MODEL });
      const b = await sessions.createSession({ taskKey: TASK_B, model: MODEL });
      assert.equal(sdk.creates.length, 2);
      assert.notEqual(a.agentId, b.agentId);
      assert.equal(sdk.creates[0].model.id, MODEL);
      assert.equal(sdk.creates[0].apiKey, API_KEY);
      assert.equal(sdk.creates[0].local.cwd, cwd);
      assert.equal(sdk.creates[1].local.cwd, cwd);
      await Promise.all([
        sessions.send(TASK_A, "ping-a"),
        sessions.send(TASK_B, "ping-b"),
      ]);
      assert.equal(sdk.sends.length, 2);
      assert.equal(sdk.maxInFlight(), 2);
      assert.equal(sdk.disposes.length, 0);
    });
  });

  test("selecting session A does not dispose session B", async () => {
    await withTempDir(async (cwd) => {
      writeConfig(cwd);
      const sdk = createFakeSdk();
      const sessions = registryFor(cwd, { sdk });
      await sessions.createSession({ taskKey: TASK_A, model: MODEL });
      await sessions.createSession({ taskKey: TASK_B, model: MODEL });
      const sendB = sessions.send(TASK_B, "keep-running");
      sessions.select(TASK_A);
      assert.equal(sessions.selected(), TASK_A);
      sessions.select(TASK_B);
      await sendB;
      assert.equal(sdk.disposes.length, 0);
      assert.equal(
        sdk.sends.some((row) => row.text === "keep-running"),
        true
      );
    });
  });

  test("the (N+1)th live agent is refused, not queued", async () => {
    await withTempDir(async (cwd) => {
      writeConfig(cwd);
      const sdk = createFakeSdk();
      const cap = 3;
      const sessions = registryFor(cwd, { sdk, maxAgents: cap });
      await sessions.createSession({ taskKey: "t-1", model: MODEL });
      await sessions.createSession({ taskKey: "t-2", model: MODEL });
      await sessions.createSession({ taskKey: "t-3", model: MODEL });
      await assert.rejects(
        () => sessions.createSession({ taskKey: "t-4", model: MODEL }),
        (err) => {
          assert.ok(err instanceof SessionError);
          assert.equal(err.code, "cap");
          assert.match(err.message, new RegExp(String(cap)));
          assert.doesNotMatch(err.message, /queue/i);
          return true;
        }
      );
      assert.equal(sdk.creates.length, cap);
      assert.equal(sessions.liveCount(), cap);
    });
  });

  test("two overlapping files-tracker planit runs do not both proceed", async () => {
    await withTempDir(async (cwd) => {
      writeConfig(cwd);
      const sdk = createFakeSdk({ sendDelayMs: 80 });
      const sessions = registryFor(cwd, { sdk });
      await sessions.createSession({ taskKey: TASK_A, model: MODEL });
      await sessions.createSession({ taskKey: TASK_B, model: MODEL });
      const first = sessions.send(TASK_A, "spec the login form", {
        intent: "planit",
      });
      const lockFile = path.join(cwd, PLANIT_LOCK_REL);
      const lockDeadline = Date.now() + 1000;
      while (!fs.existsSync(lockFile) && Date.now() < lockDeadline) {
        await delay(5);
      }
      assert.equal(fs.existsSync(lockFile), true);
      await assert.rejects(
        () => sessions.send(TASK_B, "/dhs-planit spec logout", { intent: "planit" }),
        (err) => {
          assert.ok(err instanceof SessionError);
          assert.equal(err.code, "planit_locked");
          assert.match(err.message, /^BLOCKED:/);
          assert.match(err.message, /Architect is already writing a spec/);
          return true;
        }
      );
      await first;
      assert.equal(sdk.sends.length, 1);
      assert.equal(sdk.sends[0].text, "spec the login form");
      assert.equal(fs.existsSync(lockFile), false);
    });
  });

  test("jira tracker does not take the files planit basename lock", async () => {
    await withTempDir(async (cwd) => {
      writeConfig(cwd, {
        tracker: {
          projectKey: "WXYZ",
          url: "https://jira.example.test",
        },
      });
      const sdk = createFakeSdk({ sendDelayMs: 50 });
      const sessions = registryFor(cwd, { sdk });
      await sessions.createSession({ taskKey: "WXYZ-11", model: MODEL });
      await sessions.createSession({ taskKey: "WXYZ-12", model: MODEL });
      await Promise.all([
        sessions.send("WXYZ-11", "/dhs-planit one", { intent: "planit" }),
        sessions.send("WXYZ-12", "/dhs-planit two", { intent: "planit" }),
      ]);
      assert.equal(sdk.sends.length, 2);
      assert.equal(fs.existsSync(path.join(cwd, PLANIT_LOCK_REL)), false);
    });
  });

  test("missing CURSOR_API_KEY does not call Agent.create", async () => {
    await withTempDir(async (cwd) => {
      writeConfig(cwd);
      const sdk = createFakeSdk();
      const sessions = createSessionRegistry({
        cwd,
        maxAgents: 4,
        env: {},
        sdk,
      });
      await assert.rejects(
        () => sessions.createSession({ taskKey: TASK_A, model: MODEL }),
        (err) => {
          assert.ok(err instanceof SessionError);
          assert.equal(err.message, MISSING_API_KEY);
          return true;
        }
      );
      assert.equal(sdk.creates.length, 0);
      assert.equal(sdk.resumes.length, 0);
    });
  });

  test("Agent.resume is used when the stored id is live; otherwise a new agent keeps old messages", async () => {
    await withTempDir(async (cwd) => {
      writeConfig(cwd);
      const sdk = createFakeSdk();
      const liveId = "stored-live-id";
      sdk.liveIds.add(liveId);
      const dir = path.join(cwd, ".dhs", "monitor", "sessions", TASK_A);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, "agent.json"),
        `${JSON.stringify({ agentId: liveId })}\n`
      );
      const sessions = registryFor(cwd, { sdk });
      const created = await sessions.createSession({
        taskKey: TASK_A,
        model: MODEL,
      });
      assert.equal(created.agentId, liveId);
      assert.equal(sdk.resumes.length, 1);
      assert.equal(sdk.creates.length, 0);
    });
  });

  test("dead stored agent id creates a new agent and leaves prior chat readable", async () => {
    await withTempDir(async (cwd) => {
      writeConfig(cwd);
      const sdk = createFakeSdk();
      const dir = path.join(cwd, ".dhs", "monitor", "sessions", TASK_A);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, "agent.json"),
        `${JSON.stringify({ agentId: "dead-agent" })}\n`
      );
      const prior = [{ role: "user", text: "old question", at: "2020-01-01T00:00:00.000Z" }];
      fs.writeFileSync(path.join(dir, "messages.json"), `${JSON.stringify(prior)}\n`);
      const sessions = registryFor(cwd, { sdk });
      const created = await sessions.createSession({
        taskKey: TASK_A,
        model: MODEL,
      });
      assert.equal(sdk.resumes.length, 1);
      assert.equal(sdk.creates.length, 1);
      assert.notEqual(created.agentId, "dead-agent");
      const snap = sessions.snapshot(TASK_A);
      assert.equal(snap.messages[0].text, "old question");
    });
  });

  test("disposeAll on shutdown disposes every live agent", async () => {
    await withTempDir(async (cwd) => {
      writeConfig(cwd);
      const sdk = createFakeSdk();
      const sessions = registryFor(cwd, { sdk });
      await sessions.createSession({ taskKey: TASK_A, model: MODEL });
      await sessions.createSession({ taskKey: TASK_B, model: MODEL });
      const port = await allocPort();
      const server = await startServer({
        port,
        handler: createRequestHandler({ sessions }),
      });
      await shutdownMonitor({ cwd, server, sessions, exitProcess: false });
      assert.equal(sdk.disposes.length, 2);
      assert.equal(sessions.liveCount(), 0);
    });
  });
});

describe("session HTTP", () => {
  test("two sessions stream independently over SSE", async () => {
    await withTempDir(async (cwd) => {
      writeConfig(cwd);
      const sdk = createFakeSdk({ sendDelayMs: 20 });
      const sessions = registryFor(cwd, { sdk });
      const port = await allocPort();
      const server = await startServer({
        port,
        handler: createRequestHandler({ sessions }),
      });
      try {
        const createdA = await requestJson({
          port,
          method: "POST",
          urlPath: "/api/sessions",
          body: { taskKey: TASK_A, model: MODEL },
        });
        const createdB = await requestJson({
          port,
          method: "POST",
          urlPath: "/api/sessions",
          body: { taskKey: TASK_B, model: MODEL },
        });
        assert.equal(createdA.status, 201, createdA.body);
        assert.equal(createdB.status, 201, createdB.body);
        assert.notEqual(createdA.json.agentId, createdB.json.agentId);

        const sseA = collectSse(port, `/api/sessions/${TASK_A}/events`, {
          until: (events) =>
            events.some(
              (ev) =>
                ev.type === "assistant" ||
                (ev.message && ev.message.text === "echo:hello-a")
            ),
        });
        const sseB = collectSse(port, `/api/sessions/${TASK_B}/events`, {
          until: (events) =>
            events.some(
              (ev) =>
                ev.type === "assistant" ||
                (ev.message && ev.message.text === "echo:hello-b")
            ),
        });
        await Promise.all([sseA.ready, sseB.ready]);

        const sendA = requestJson({
          port,
          method: "POST",
          urlPath: `/api/sessions/${TASK_A}/send`,
          body: { text: "hello-a" },
        });
        const sendB = requestJson({
          port,
          method: "POST",
          urlPath: `/api/sessions/${TASK_B}/send`,
          body: { text: "hello-b" },
        });
        const [resA, resB, eventsA, eventsB] = await Promise.all([
          sendA,
          sendB,
          sseA.done,
          sseB.done,
        ]);
        assert.equal(resA.status, 200, resA.body);
        assert.equal(resB.status, 200, resB.body);
        assert.equal(sdk.maxInFlight(), 2);

        const selectA = await requestJson({
          port,
          method: "POST",
          urlPath: `/api/sessions/${TASK_A}/select`,
        });
        assert.equal(selectA.status, 200);
        assert.equal(sdk.disposes.length, 0);
        assert.equal(
          eventsA.some(
            (ev) =>
              ev.type === "assistant" ||
              (ev.message && ev.message.text === "echo:hello-a")
          ),
          true
        );
        assert.equal(
          eventsB.some(
            (ev) =>
              ev.type === "assistant" ||
              (ev.message && ev.message.text === "echo:hello-b")
          ),
          true
        );
      } finally {
        await shutdownMonitor({ cwd, server, sessions, exitProcess: false });
      }
    });
  });

  test("HTTP create without an API key returns instructions and skips Agent.create", async () => {
    await withTempDir(async (cwd) => {
      writeConfig(cwd);
      const sdk = createFakeSdk();
      const sessions = createSessionRegistry({
        cwd,
        maxAgents: 4,
        env: {},
        sdk,
      });
      const port = await allocPort();
      const server = await startServer({
        port,
        handler: createRequestHandler({ sessions }),
      });
      try {
        const res = await requestJson({
          port,
          method: "POST",
          urlPath: "/api/sessions",
          body: { taskKey: TASK_A, model: MODEL },
        });
        assert.equal(res.status, 400);
        assert.equal(res.json.error, MISSING_API_KEY);
        assert.equal(sdk.creates.length, 0);
      } finally {
        await shutdownMonitor({ cwd, server, sessions, exitProcess: false });
      }
    });
  });
});
