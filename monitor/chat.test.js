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
  MODE_INTERACTIVE,
  buildFirstPlanitPrompt,
  createChatController,
  isConsultantEvent,
  onMessagesAppended,
  onUserScroll,
  shouldRefreshListFromEvent,
  shouldSubmitKeydown,
  trimComposer,
  visibleChatMessages,
} = require("./chat");
const { uiConfigFromHarness } = require("./layout");

const REPO_ROOT = path.join(__dirname, "..");
const TASK_A = "011-alpha-zz";
const TASK_B = "012-beta-yy";
const MODEL = "chat-model-omega-77";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function writeReadyProject(dir) {
  const ver = "8.1.4";
  fs.mkdirSync(path.join(dir, ".dhs", "references"), { recursive: true });
  fs.writeFileSync(path.join(dir, ".dhs", "VERSION"), `${ver}\n`);
  fs.writeFileSync(
    path.join(dir, "harness.config.json"),
    `${JSON.stringify({
      dhs: { generatedFrom: ver },
      agents: {
        baseBranch: "trunk",
        statuses: { todo: "queued-aa", done: "vaulted-ee" },
        roles: {
          architect: { model: { cursor: MODEL } },
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
    env: { ...process.env, DHS_MONITOR_NO_OPEN: "1" },
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

function createFakeApi() {
  const listeners = new Map();
  const selects = [];
  const sends = [];
  const creates = [];
  const closed = [];
  return {
    selects,
    sends,
    creates,
    closed,
    async createSession(body) {
      creates.push(body);
      return {
        taskKey: body.taskKey || `new-${creates.length}`,
        resumed: Boolean(body.taskKey) && creates.length > 1,
      };
    },
    async select(taskKey) {
      selects.push(taskKey);
      return { taskKey, selected: true };
    },
    async send(taskKey, text, extra) {
      const rec = { taskKey, text, extra, paused: false };
      sends.push(rec);
      await delay(40);
      if (rec.paused) {
        throw new Error("run paused");
      }
      const fns = listeners.get(taskKey) || [];
      for (const fn of fns) {
        fn({
          type: "message",
          message: { role: "assistant", text: `echo:${text}` },
        });
        fn({ type: "run", status: "idle" });
      }
      return { status: "finished" };
    },
    async snapshot() {
      return { messages: [], busy: false };
    },
    openEvents(taskKey, onEvent) {
      if (!listeners.has(taskKey)) {
        listeners.set(taskKey, []);
      }
      listeners.get(taskKey).push(onEvent);
      return () => {
        closed.push(taskKey);
        listeners.set(
          taskKey,
          (listeners.get(taskKey) || []).filter((fn) => fn !== onEvent)
        );
      };
    },
    emit(taskKey, event) {
      for (const fn of listeners.get(taskKey) || []) {
        fn(event);
      }
    },
    pause(taskKey) {
      for (const rec of sends) {
        if (rec.taskKey === taskKey) {
          rec.paused = true;
        }
      }
    },
    dispose(taskKey) {
      closed.push(`dispose:${taskKey}`);
    },
  };
}

async function submitVia(controller, { via, text }) {
  if (via === "enter") {
    assert.equal(shouldSubmitKeydown({ key: "Enter", shiftKey: false }), true);
  } else {
    assert.equal(via, "send");
  }
  return controller.submit(text);
}

describe("chat turns", () => {
  test("consultant output is not a user-facing chat turn", () => {
    assert.equal(
      isConsultantEvent({
        type: "assistant",
        agent: { name: "consultant" },
        message: { content: [{ type: "text", text: "CONSULT" }] },
      }),
      true
    );
    const shown = visibleChatMessages([
      { role: "user", text: "go" },
      { role: "consultant", text: "CONSULT hidden" },
      { role: "assistant", text: "visible", agent: { name: "consultant" } },
      { role: "assistant", text: "ok" },
    ]);
    assert.deepEqual(
      shown.map((row) => row.text),
      ["go", "ok"]
    );
  });
});

describe("composer", () => {
  test("Enter and Send both submit the trimmed text as interactive", async () => {
    const api = createFakeApi();
    const controller = createChatController({
      api,
      defaultModel: MODEL,
      mode: MODE_INTERACTIVE,
    });
    await controller.selectTask(TASK_A);
    const fromEnter = await submitVia(controller, {
      via: "enter",
      text: "  from-enter  ",
    });
    const fromSend = await submitVia(controller, {
      via: "send",
      text: "from-send",
    });
    assert.equal(fromEnter.submitted, true);
    assert.equal(fromEnter.text, "from-enter");
    assert.equal(fromSend.submitted, true);
    assert.equal(fromSend.text, "from-send");
    assert.equal(trimComposer("  "), "");
    assert.equal(shouldSubmitKeydown({ key: "Enter", shiftKey: true }), false);
    assert.equal(api.sends.length, 2);
    assert.equal(api.sends[0].extra.mode, MODE_INTERACTIVE);
    assert.equal(api.sends[1].extra.mode, MODE_INTERACTIVE);
    assert.equal(api.creates[0].model, MODEL);
    assert.notEqual(MODEL, "composer-1");
  });
});

describe("session switch", () => {
  test("selecting B does not dispose or pause A's run and keeps A streaming", async () => {
    const api = createFakeApi();
    const controller = createChatController({
      api,
      defaultModel: MODEL,
    });
    await controller.selectTask(TASK_A);
    api.emit(TASK_A, { type: "run", status: "running" });
    const sendA = controller.submit("keep-a");
    await controller.selectTask(TASK_B);
    assert.equal(controller.view().selected, TASK_B);
    assert.equal(controller.view().showLoader, false);
    assert.deepEqual(controller.watchedKeys().sort(), [TASK_A, TASK_B].sort());
    assert.equal(api.closed.length, 0);
    assert.equal(
      api.closed.some((row) => String(row).includes("dispose")),
      false
    );
    assert.equal(api.sends[0].paused, false);
    await sendA;
    assert.equal(api.sends[0].paused, false);
    await controller.selectTask(TASK_A);
    assert.equal(
      controller.view().messages.some((row) => row.text === "echo:keep-a"),
      true
    );
  });
});

describe("loader and scroll", () => {
  test("loader is visible only while the selected run is active", async () => {
    const api = createFakeApi();
    const controller = createChatController({ api, defaultModel: MODEL });
    await controller.selectTask(TASK_A);
    api.emit(TASK_A, { type: "run", status: "running" });
    assert.equal(controller.view().showLoader, true);
    await controller.selectTask(TASK_B);
    api.emit(TASK_B, { type: "run", status: "idle" });
    assert.equal(controller.view().showLoader, false);
    await controller.selectTask(TASK_A);
    assert.equal(controller.view().showLoader, true);
    api.emit(TASK_A, { type: "run", status: "idle" });
    assert.equal(controller.view().showLoader, false);
  });

  test("autoscroll stays on the latest until the user scrolls up, then jump restores it", () => {
    const atBottom = onUserScroll({
      scrollTop: 200,
      scrollHeight: 240,
      clientHeight: 40,
    });
    assert.equal(atBottom.stickToBottom, true);
    assert.equal(atBottom.showJump, false);
    assert.equal(onMessagesAppended({ stickToBottom: true }).scrollToLatest, true);

    const scrolledUp = onUserScroll({
      scrollTop: 10,
      scrollHeight: 400,
      clientHeight: 40,
    });
    assert.equal(scrolledUp.stickToBottom, false);
    assert.equal(scrolledUp.showJump, true);
    assert.equal(
      onMessagesAppended({ stickToBottom: false }).scrollToLatest,
      false
    );
    const jumped = onUserScroll({
      scrollTop: 360,
      scrollHeight: 400,
      clientHeight: 40,
    });
    assert.equal(jumped.stickToBottom, true);
    assert.equal(jumped.showJump, false);
  });
});

describe("chat chrome over HTTP", () => {
  test("page has jump-to-latest, loader, and config model from harness", async () => {
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
        assert.match(page.body, /id="jump-latest"/);
        assert.match(page.body, /Latest/);
        assert.match(page.body, /id="chat-loader"/);
        assert.match(page.body, /id="composer-send"/);
        const script = await get("/chat.js", port);
        assert.equal(script.status, 200);
        const config = await get("/api/config", port);
        assert.equal(config.status, 200);
        const body = JSON.parse(config.body);
        assert.equal(body.defaultModel, MODEL);
        assert.equal(body.mode, MODE_INTERACTIVE);
        assert.notEqual(body.defaultModel, "composer-1");
      } finally {
        await stopMonitor(started.child);
      }
    });
  });
});

describe("Add → planit", () => {
  test("first planit prompt carries /dhs-planit and the user text", () => {
    const request = "spec the logout ribbon";
    const prompt = buildFirstPlanitPrompt(`  ${request}  `);
    assert.match(prompt, /\/dhs-planit/);
    assert.match(prompt, new RegExp(request));
    assert.doesNotMatch(prompt, /\/dhs-shipit/);
    assert.equal(buildFirstPlanitPrompt("/dhs-planit already"), "/dhs-planit already");
  });

  test("Add starts a new planit session and first send is interactive planit", async () => {
    const api = createFakeApi();
    const refreshes = [];
    api.refreshTasks = async () => {
      refreshes.push("tasks");
    };
    const controller = createChatController({
      api,
      defaultModel: MODEL,
      mode: MODE_INTERACTIVE,
    });
    await controller.selectTask(TASK_A);
    const added = await controller.startAdd();
    assert.equal(added.started, true);
    assert.notEqual(added.taskKey, TASK_A);
    assert.equal(api.creates[api.creates.length - 1].intent, "planit");
    assert.equal(api.creates[api.creates.length - 1].taskKey, undefined);
    assert.equal(api.creates[api.creates.length - 1].model, MODEL);
    assert.equal(controller.view().selected, added.taskKey);
    const first = await controller.submit("  describe logout  ");
    assert.equal(first.submitted, true);
    assert.equal(first.intent, "planit");
    assert.equal(first.mode, MODE_INTERACTIVE);
    assert.equal(api.sends[0].taskKey, added.taskKey);
    assert.equal(api.sends[0].text, "describe logout");
    assert.equal(api.sends[0].extra.intent, "planit");
    assert.equal(api.sends[0].extra.mode, MODE_INTERACTIVE);
    assert.ok(refreshes.includes("tasks"));
    const follow = await controller.submit("Q1: use vaulted-ee");
    assert.equal(follow.intent, undefined);
    assert.equal(api.sends[1].extra.intent, undefined);
    assert.equal(api.closed.some((row) => String(row).includes("dispose")), false);
  });
});

describe("list refresh from stream events", () => {
  test("run idle and tracker Write refresh the list; consultant tools do not", async () => {
    assert.equal(
      shouldRefreshListFromEvent({ type: "run", status: "idle" }),
      true
    );
    assert.equal(
      shouldRefreshListFromEvent({
        type: "tool_call",
        name: "Write",
        path: "kb/features/013-gamma-xx.feature.md",
      }),
      true
    );
    assert.equal(
      shouldRefreshListFromEvent({
        type: "tool_call",
        name: "consultant",
        status: "completed",
      }),
      false
    );
    const refreshes = [];
    const api = createFakeApi();
    api.refreshTasks = async () => {
      refreshes.push("tasks");
    };
    const controller = createChatController({ api, defaultModel: MODEL });
    await controller.selectTask(TASK_A);
    controller.ingest(TASK_A, {
      type: "tool_call",
      name: "Write",
      path: "kb/features/013-gamma-xx.feature.md",
    });
    controller.ingest(TASK_A, { type: "run", status: "idle" });
    await delay(10);
    assert.ok(refreshes.length >= 2);
  });
});

describe("ui config model", () => {
  test("default chat model is the configured cursor architect id", () => {
    const ui = uiConfigFromHarness({
      agents: {
        roles: {
          architect: { model: { cursor: MODEL } },
        },
      },
    });
    assert.equal(ui.defaultModel, MODEL);
    assert.equal(ui.mode, MODE_INTERACTIVE);
  });
});
