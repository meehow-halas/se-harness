"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const http = require("http");
const net = require("net");
const path = require("path");

const { withTempDir } = require("../test/helpers");
const { createFakeAgentCli } = require("../test/fake-agent-cli");
const { BIND_HOST, createRequestHandler, shutdownMonitor, startServer } = require("./index");
const {
  LOGGED_OUT_CLI,
  MISSING_CLI,
  PLANIT_LOCK_REL,
  SessionError,
  createSessionRegistry,
} = require("./sessions");

const MODEL = "composer-fixture-omega";
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

function registryFor(cwd, { cli, maxAgents = 4, env } = {}) {
  const fake = cli || createFakeAgentCli();
  return createSessionRegistry({
    cwd,
    maxAgents,
    env: env || {
      PATH: "/usr/bin",
      HOME: "/tmp",
      CURSOR_API_KEY: "must-not-reach-child-omega",
    },
    spawn: fake.spawn,
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
  test("uses a distinct CLI process per task key and does not recycle one across keys", async () => {
    await withTempDir(async (cwd) => {
      writeConfig(cwd);
      const cli = createFakeAgentCli();
      const sessions = registryFor(cwd, { cli });
      const a = await sessions.createSession({ taskKey: TASK_A, model: MODEL });
      const b = await sessions.createSession({ taskKey: TASK_B, model: MODEL });
      assert.equal(cli.creates.length, 2);
      assert.notEqual(a.agentId, b.agentId);
      assert.notEqual(cli.creates[0].pid, cli.creates[1].pid);
      assert.equal(cli.creates[0].model.id, MODEL);
      assert.equal(cli.creates[0].env.CURSOR_API_KEY, undefined);
      assert.equal(cli.creates[0].args.includes("--api-key"), false);
      assert.equal(cli.creates[0].cwd, cwd);
      assert.equal(cli.creates[1].cwd, cwd);
      await Promise.all([
        sessions.send(TASK_A, "ping-a"),
        sessions.send(TASK_B, "ping-b"),
      ]);
      assert.equal(cli.sends.length, 2);
      assert.notEqual(cli.sends[0].pid, cli.sends[1].pid);
      assert.equal(cli.maxInFlight(), 2);
      assert.equal(cli.disposes.length, 0);
    });
  });

  test("selecting session A does not dispose session B", async () => {
    await withTempDir(async (cwd) => {
      writeConfig(cwd);
      const cli = createFakeAgentCli();
      const sessions = registryFor(cwd, { cli });
      await sessions.createSession({ taskKey: TASK_A, model: MODEL });
      await sessions.createSession({ taskKey: TASK_B, model: MODEL });
      const sendB = sessions.send(TASK_B, "keep-running");
      sessions.select(TASK_A);
      assert.equal(sessions.selected(), TASK_A);
      sessions.select(TASK_B);
      await sendB;
      assert.equal(cli.disposes.length, 0);
      assert.equal(
        cli.sends.some((row) => row.text === "keep-running"),
        true
      );
    });
  });

  test("selecting B while A is in flight does not dispose or pause A", async () => {
    await withTempDir(async (cwd) => {
      writeConfig(cwd);
      const cli = createFakeAgentCli({ sendDelayMs: 80 });
      const sessions = registryFor(cwd, { cli });
      await sessions.createSession({ taskKey: TASK_A, model: MODEL });
      await sessions.createSession({ taskKey: TASK_B, model: MODEL });
      const sendA = sessions.send(TASK_A, "long-a");
      sessions.select(TASK_B);
      assert.equal(sessions.selected(), TASK_B);
      const result = await sendA;
      assert.equal(result.status, "finished");
      assert.equal(cli.disposes.length, 0);
      assert.equal(
        sessions.snapshot(TASK_A).messages.some((row) => row.text === "echo:long-a"),
        true
      );
    });
  });

  test("consultant stream output is not stored as a chat turn", async () => {
    await withTempDir(async (cwd) => {
      writeConfig(cwd);
      const cli = createFakeAgentCli({
        streamFor(text) {
          return [
            {
              type: "assistant",
              agent: { name: "consultant" },
              message: {
                role: "assistant",
                content: [{ type: "text", text: "CONSULT hidden" }],
              },
            },
            {
              type: "tool_call",
              name: "consultant",
              status: "completed",
            },
            {
              type: "assistant",
              message: {
                content: [{ type: "text", text: `echo:${text}` }],
              },
            },
          ];
        },
      });
      const sessions = registryFor(cwd, { cli });
      await sessions.createSession({ taskKey: TASK_A, model: MODEL });
      await sessions.send(TASK_A, "review-me");
      const texts = sessions.snapshot(TASK_A).messages.map((row) => row.text);
      assert.equal(texts.includes("CONSULT hidden"), false);
      assert.equal(texts.includes("echo:review-me"), true);
      assert.equal(sessions.snapshot(TASK_A).mode, "interactive");
    });
  });

  test("assistant stream chunks coalesce into one persisted turn", async () => {
    await withTempDir(async (cwd) => {
      writeConfig(cwd);
      const cli = createFakeAgentCli({
        streamFor() {
          return ["Z", "acz", "ynam"].map((text) => ({
            type: "assistant",
            message: { content: [{ type: "text", text }] },
          }));
        },
      });
      const sessions = registryFor(cwd, { cli });
      await sessions.createSession({ taskKey: TASK_A, model: MODEL });
      await sessions.send(TASK_A, "go");
      const assistant = sessions
        .snapshot(TASK_A)
        .messages.filter((row) => row.role === "assistant");
      assert.equal(assistant.length, 1);
      assert.equal(assistant[0].text, "Zaczynam");
      const stored = JSON.parse(
        fs.readFileSync(
          path.join(cwd, ".dhs", "monitor", "sessions", TASK_A, "messages.json"),
          "utf8"
        )
      );
      const storedAssistant = stored.filter((row) => row.role === "assistant");
      assert.equal(storedAssistant.length, 1);
      assert.equal(storedAssistant[0].text, "Zaczynam");
    });
  });

  test("consultant chunks between assistant deltas are omitted and remaining text coalesces", async () => {
    await withTempDir(async (cwd) => {
      writeConfig(cwd);
      const cli = createFakeAgentCli({
        streamFor() {
          return [
            {
              type: "assistant",
              message: { content: [{ type: "text", text: "Z" }] },
            },
            {
              type: "assistant",
              agent: { name: "consultant" },
              message: { content: [{ type: "text", text: "CONSULT hidden" }] },
            },
            {
              type: "assistant",
              message: { content: [{ type: "text", text: "acz" }] },
            },
            {
              type: "assistant",
              message: { content: [{ type: "text", text: "ynam" }] },
            },
          ];
        },
      });
      const sessions = registryFor(cwd, { cli });
      await sessions.createSession({ taskKey: TASK_A, model: MODEL });
      await sessions.send(TASK_A, "go");
      const texts = sessions.snapshot(TASK_A).messages.map((row) => row.text);
      assert.equal(texts.includes("CONSULT hidden"), false);
      const assistant = sessions
        .snapshot(TASK_A)
        .messages.filter((row) => row.role === "assistant");
      assert.equal(assistant.length, 1);
      assert.equal(assistant[0].text, "Zaczynam");
    });
  });

  test("assistant turns separated by a user message stay distinct", async () => {
    await withTempDir(async (cwd) => {
      writeConfig(cwd);
      const cli = createFakeAgentCli({
        streamFor(text) {
          const parts = text === "first" ? ["Alpha", "One"] : ["Beta", "Two"];
          return parts.map((chunk) => ({
            type: "assistant",
            message: { content: [{ type: "text", text: chunk }] },
          }));
        },
      });
      const sessions = registryFor(cwd, { cli });
      await sessions.createSession({ taskKey: TASK_A, model: MODEL });
      await sessions.send(TASK_A, "first");
      await sessions.send(TASK_A, "second");
      const assistant = sessions
        .snapshot(TASK_A)
        .messages.filter((row) => row.role === "assistant")
        .map((row) => row.text);
      assert.deepEqual(assistant, ["AlphaOne", "BetaTwo"]);
    });
  });

  test("four live agents at default --max-agents 4 have distinct ids and independent send", async () => {
    await withTempDir(async (cwd) => {
      writeConfig(cwd);
      const cli = createFakeAgentCli();
      const sessions = registryFor(cwd, { cli });
      const created = [];
      for (let i = 1; i <= 4; i += 1) {
        created.push(
          await sessions.createSession({ taskKey: `n4-${i}`, model: MODEL })
        );
      }
      assert.equal(cli.creates.length, 4);
      assert.equal(new Set(cli.creates.map((row) => row.pid)).size, 4);
      assert.equal(new Set(created.map((row) => row.agentId)).size, 4);
      await Promise.all(
        created.map((row, i) => sessions.send(`n4-${i + 1}`, `ping-${i + 1}`))
      );
      assert.equal(cli.sends.length, 4);
      assert.equal(cli.maxInFlight(), 4);
      assert.equal(
        cli.sends.map((row) => row.agentId).sort().join(","),
        created.map((row) => row.agentId).sort().join(",")
      );
    });
  });

  test("the (N+1)th live agent is refused, not queued", async () => {
    await withTempDir(async (cwd) => {
      writeConfig(cwd);
      const cli = createFakeAgentCli();
      const cap = 3;
      const sessions = registryFor(cwd, { cli, maxAgents: cap });
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
      assert.equal(cli.creates.length, cap);
      assert.equal(sessions.liveCount(), cap);
    });
  });

  test("fifth live agent at --max-agents 4 is refused, not queued", async () => {
    await withTempDir(async (cwd) => {
      writeConfig(cwd);
      const cli = createFakeAgentCli();
      const sessions = registryFor(cwd, { cli, maxAgents: 4 });
      for (let i = 1; i <= 4; i += 1) {
        await sessions.createSession({ taskKey: `n4-${i}`, model: MODEL });
      }
      await assert.rejects(
        () => sessions.createSession({ taskKey: "n4-5", model: MODEL }),
        (err) => {
          assert.ok(err instanceof SessionError);
          assert.equal(err.code, "cap");
          assert.equal(err.httpStatus, 409);
          assert.match(err.message, /live agent cap is 4 \(--max-agents\)/);
          assert.doesNotMatch(err.message, /queue/i);
          return true;
        }
      );
      assert.equal(cli.creates.length, 4);
      assert.equal(sessions.liveCount(), 4);
    });
  });

  test("two overlapping files-tracker planit runs do not both proceed", async () => {
    await withTempDir(async (cwd) => {
      writeConfig(cwd);
      const cli = createFakeAgentCli({ sendDelayMs: 80 });
      const sessions = registryFor(cwd, { cli });
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
      assert.equal(cli.sends.length, 1);
      assert.equal(cli.sends[0].text, "spec the login form");
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
      const cli = createFakeAgentCli({ sendDelayMs: 50 });
      const sessions = registryFor(cwd, { cli });
      await sessions.createSession({ taskKey: "WXYZ-11", model: MODEL });
      await sessions.createSession({ taskKey: "WXYZ-12", model: MODEL });
      await Promise.all([
        sessions.send("WXYZ-11", "/dhs-planit one", { intent: "planit" }),
        sessions.send("WXYZ-12", "/dhs-planit two", { intent: "planit" }),
      ]);
      assert.equal(cli.sends.length, 2);
      assert.equal(fs.existsSync(path.join(cwd, PLANIT_LOCK_REL)), false);
    });
  });

  test("create without CURSOR_API_KEY still spawns CLI and never loads @cursor/sdk", async () => {
    await withTempDir(async (cwd) => {
      writeConfig(cwd);
      const cli = createFakeAgentCli();
      const loaded = [];
      const Module = require("module");
      const orig = Module._load;
      Module._load = function hooked(request, ...rest) {
        if (String(request).includes("@cursor/sdk")) {
          loaded.push(request);
        }
        return orig.apply(this, [request, ...rest]);
      };
      try {
        const sessions = createSessionRegistry({
          cwd,
          maxAgents: 4,
          env: { PATH: "/usr/bin", HOME: "/tmp" },
          spawn: cli.spawn,
        });
        const created = await sessions.createSession({
          taskKey: TASK_A,
          model: MODEL,
        });
        assert.ok(created.agentId);
        assert.equal(cli.creates.length, 1);
        assert.equal(cli.creates[0].env.CURSOR_API_KEY, undefined);
        assert.equal(loaded.length, 0);
      } finally {
        Module._load = orig;
      }
    });
  });

  test("missing CLI binary does not spawn a session process", async () => {
    await withTempDir(async (cwd) => {
      writeConfig(cwd);
      const cli = createFakeAgentCli({ missingBinary: true });
      const sessions = registryFor(cwd, { cli });
      await assert.rejects(
        () => sessions.createSession({ taskKey: TASK_A, model: MODEL }),
        (err) => {
          assert.ok(err instanceof SessionError);
          assert.equal(err.message, MISSING_CLI);
          assert.match(err.message, /^BLOCKED:/);
          return true;
        }
      );
      assert.equal(cli.creates.length, 0);
      assert.equal(cli.acpSpawns().length, 0);
    });
  });

  test("logged-out CLI does not spawn a session process", async () => {
    await withTempDir(async (cwd) => {
      writeConfig(cwd);
      const cli = createFakeAgentCli({ loggedIn: false });
      const sessions = registryFor(cwd, { cli });
      await assert.rejects(
        () => sessions.createSession({ taskKey: TASK_A, model: MODEL }),
        (err) => {
          assert.ok(err instanceof SessionError);
          assert.equal(err.message, LOGGED_OUT_CLI);
          assert.match(err.message, /agent login/);
          return true;
        }
      );
      assert.equal(cli.creates.length, 0);
      assert.equal(cli.acpSpawns().length, 0);
      assert.equal(cli.statusSpawns().length, 1);
    });
  });

  test("stored CLI session id is resumed when live; otherwise a new process keeps old messages", async () => {
    await withTempDir(async (cwd) => {
      writeConfig(cwd);
      const cli = createFakeAgentCli();
      const liveId = "stored-live-id";
      cli.liveIds.add(liveId);
      const dir = path.join(cwd, ".dhs", "monitor", "sessions", TASK_A);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, "agent.json"),
        `${JSON.stringify({ agentId: liveId })}\n`
      );
      const sessions = registryFor(cwd, { cli });
      const created = await sessions.createSession({
        taskKey: TASK_A,
        model: MODEL,
      });
      assert.equal(created.agentId, liveId);
      assert.equal(cli.resumes.length, 1);
      assert.equal(cli.sessionNews.length, 0);
      assert.equal(cli.creates.length, 1);
    });
  });

  test("dead stored session id starts a new CLI session and leaves prior chat readable", async () => {
    await withTempDir(async (cwd) => {
      writeConfig(cwd);
      const cli = createFakeAgentCli();
      const dir = path.join(cwd, ".dhs", "monitor", "sessions", TASK_A);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, "agent.json"),
        `${JSON.stringify({ agentId: "dead-agent" })}\n`
      );
      const prior = [{ role: "user", text: "old question", at: "2020-01-01T00:00:00.000Z" }];
      fs.writeFileSync(path.join(dir, "messages.json"), `${JSON.stringify(prior)}\n`);
      const sessions = registryFor(cwd, { cli });
      const created = await sessions.createSession({
        taskKey: TASK_A,
        model: MODEL,
      });
      assert.equal(cli.resumes.length, 1);
      assert.equal(cli.sessionNews.length, 1);
      assert.notEqual(created.agentId, "dead-agent");
      const snap = sessions.snapshot(TASK_A);
      assert.equal(snap.messages[0].text, "old question");
    });
  });

  test("disposeAll on shutdown kills every live CLI child", async () => {
    await withTempDir(async (cwd) => {
      writeConfig(cwd);
      const cli = createFakeAgentCli();
      const sessions = registryFor(cwd, { cli });
      await sessions.createSession({ taskKey: TASK_A, model: MODEL });
      await sessions.createSession({ taskKey: TASK_B, model: MODEL });
      const port = await allocPort();
      const server = await startServer({
        port,
        handler: createRequestHandler({ sessions }),
      });
      await shutdownMonitor({ cwd, server, sessions, exitProcess: false });
      assert.equal(cli.disposes.length, 2);
      assert.equal(sessions.liveCount(), 0);
    });
  });
});

describe("session HTTP", () => {
  test("two sessions stream independently over SSE", async () => {
    await withTempDir(async (cwd) => {
      writeConfig(cwd);
      const cli = createFakeAgentCli({ sendDelayMs: 20 });
      const sessions = registryFor(cwd, { cli });
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
        assert.equal(cli.maxInFlight(), 2);

        const selectA = await requestJson({
          port,
          method: "POST",
          urlPath: `/api/sessions/${TASK_A}/select`,
        });
        assert.equal(selectA.status, 200);
        assert.equal(cli.disposes.length, 0);
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

  test("HTTP create with a missing CLI returns BLOCKED login/install text and skips ACP spawn", async () => {
    await withTempDir(async (cwd) => {
      writeConfig(cwd);
      const cli = createFakeAgentCli({ missingBinary: true });
      const sessions = createSessionRegistry({
        cwd,
        maxAgents: 4,
        env: { PATH: "/usr/bin" },
        spawn: cli.spawn,
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
        assert.equal(res.json.error, MISSING_CLI);
        assert.equal(cli.creates.length, 0);
      } finally {
        await shutdownMonitor({ cwd, server, sessions, exitProcess: false });
      }
    });
  });
});
