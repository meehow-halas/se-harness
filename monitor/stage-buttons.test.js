"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const http = require("http");
const net = require("net");
const path = require("path");

const { withTempDir } = require("../test/helpers");
const { BIND_HOST, createRequestHandler, shutdownMonitor, startServer } = require("./index");
const { createSessionRegistry, SessionError } = require("./sessions");
const { createChatController } = require("./chat");
const { listTasks } = require("./tasks");
const {
  ACTION_CLOSE,
  ACTION_DOIT,
  ACTION_REVIEW,
  buildStagePrompt,
  gateStageSend,
  stageTaskKeys,
  visibleStageButtons,
} = require("./stage-buttons");

const TODO = "queued-aa";
const IN_PROGRESS = "moving-bb";
const IN_REVIEW = "looking-dd";
const DONE = "vaulted-ee";
const TASK = "031-stage-ww";
const OTHER = "032-other-xx";
const BASE = "release-lab";
const IMPLEMENTER_MODEL = "implementer-wire-44";
const REVIEWER_MODEL = "reviewer-wire-55";
const API_KEY = "cursor_test_key_stage";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function writeConfig(cwd, extraAgents = {}) {
  fs.mkdirSync(path.join(cwd, ".dhs", "monitor"), { recursive: true });
  fs.mkdirSync(path.join(cwd, ".dhs", "scripts"), { recursive: true });
  fs.writeFileSync(
    path.join(cwd, "harness.config.json"),
    `${JSON.stringify({
      dhs: { generatedFrom: "8.1.4" },
      agents: {
        docs: ["notes/spec.md"],
        baseBranch: BASE,
        statuses: {
          todo: TODO,
          "in progress": IN_PROGRESS,
          "in review": IN_REVIEW,
          done: DONE,
        },
        roles: {
          architect: { model: { cursor: "architect-not-for-stage" } },
          implementer: { model: { cursor: IMPLEMENTER_MODEL } },
          reviewer: { model: { cursor: REVIEWER_MODEL } },
        },
        ...extraAgents,
      },
    })}\n`
  );
}

function writeJiraSpy(cwd) {
  const script = path.join(cwd, ".dhs", "scripts", "jira");
  const logFile = path.join(cwd, "jira-argv.log");
  fs.writeFileSync(
    script,
    `#!/bin/sh
printf '%s\\n' "$*" >> ${JSON.stringify(logFile)}
echo OK
`
  );
  fs.chmodSync(script, 0o755);
  return logFile;
}

function jiraTransitionCalled(logFile) {
  if (!fs.existsSync(logFile)) {
    return false;
  }
  return fs.readFileSync(logFile, "utf8").split(/\r?\n/).some((line) =>
    line.trim().startsWith("transition")
  );
}

function writeFeature(cwd, basename, { title, status }) {
  const dir = path.join(cwd, "notes", "features");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${basename}.feature.md`);
  fs.writeFileSync(
    file,
    `---
id: ${basename}
title: ${title}
status: ${status}
type: feature
depends: []
relates: []
---

# ${title}
`
  );
  return file;
}

function writePrompt(cwd, basename) {
  const dir = path.join(cwd, "notes", "prompt");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, `${basename}.prompt.md`),
    `# prompt for ${basename}\n`
  );
}

function featureStatus(file) {
  const text = fs.readFileSync(file, "utf8");
  const match = text.match(/^status:\s*(.+)$/m);
  return match ? match[1].trim() : "";
}

function createFakeSdk({ onSend } = {}) {
  const creates = [];
  const sends = [];
  let seq = 0;

  function makeAgent(id) {
    return {
      agentId: id,
      async send(text) {
        sends.push({ agentId: id, text });
        if (typeof onSend === "function") {
          onSend(text, id);
        }
        await delay(5);
        return {
          async *stream() {},
          async wait() {
            return { status: "finished" };
          },
        };
      },
      async [Symbol.asyncDispose]() {},
    };
  }

  return {
    creates,
    sends,
    async create(opts) {
      creates.push(opts);
      return makeAgent(`fake-stage-${++seq}`);
    },
    async resume() {
      throw new Error("agent id is not live");
    },
  };
}

function registryFor(cwd, { sdk, maxAgents = 4 } = {}) {
  return createSessionRegistry({
    cwd,
    maxAgents,
    env: { CURSOR_API_KEY: API_KEY },
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

const STATUSES = {
  todo: TODO,
  "in progress": IN_PROGRESS,
  "in review": IN_REVIEW,
  done: DONE,
};

describe("stage button visibility", () => {
  test("buttons compare configured status strings, not hardcoded todo or in progress", () => {
    assert.notEqual(TODO, "todo");
    assert.notEqual(IN_PROGRESS, "in progress");
    assert.notEqual(IN_REVIEW, "in review");
    const ready = {
      key: TASK,
      status: TODO,
      hasSpecPrompt: true,
    };
    const doit = visibleStageButtons(ready, { statuses: STATUSES, baseBranch: BASE });
    assert.deepEqual(
      doit.map((row) => row.id),
      [ACTION_DOIT]
    );
    const literalTodo = visibleStageButtons(
      { key: TASK, status: "todo", hasSpecPrompt: true },
      { statuses: STATUSES, baseBranch: BASE }
    );
    assert.deepEqual(literalTodo, []);
    const moving = visibleStageButtons(
      { key: TASK, status: IN_PROGRESS, hasSpecPrompt: true },
      { statuses: STATUSES, baseBranch: BASE }
    );
    assert.deepEqual(
      moving.map((row) => row.id),
      [ACTION_REVIEW]
    );
    const literalProgress = visibleStageButtons(
      { key: TASK, status: "in progress", hasSpecPrompt: true },
      { statuses: STATUSES, baseBranch: BASE }
    );
    assert.deepEqual(literalProgress, []);
    const review = visibleStageButtons(
      { key: TASK, status: IN_REVIEW, hasSpecPrompt: true },
      { statuses: STATUSES, baseBranch: BASE }
    );
    assert.equal(review.length, 1);
    assert.equal(review[0].id, ACTION_CLOSE);
    assert.equal(review[0].confirm, true);
    assert.match(review[0].label, new RegExp(BASE));
  });

  test("hidden when the condition does not hold", () => {
    assert.deepEqual(
      visibleStageButtons(
        { key: TASK, status: TODO, hasSpecPrompt: false },
        { statuses: STATUSES, baseBranch: BASE }
      ),
      []
    );
    assert.deepEqual(
      visibleStageButtons(
        { key: TASK, status: DONE, hasSpecPrompt: true },
        { statuses: STATUSES, baseBranch: BASE }
      ),
      []
    );
    assert.deepEqual(
      visibleStageButtons(null, { statuses: STATUSES, baseBranch: BASE }),
      []
    );
    const jiraMoving = visibleStageButtons(
      { key: "ZX9-11", status: "Lab Moving", hasSpecPrompt: true },
      {
        statuses: { todo: "Lab Queue", inProgress: "Lab Moving", inReview: "Lab Looking" },
        baseBranch: BASE,
      }
    );
    assert.deepEqual(
      jiraMoving.map((row) => row.id),
      [ACTION_REVIEW]
    );
  });
});

describe("stage send does not write tracker status", () => {
  test("doit does not rewrite frontmatter status or call jira transition", async () => {
    await withTempDir(async (cwd) => {
      writeConfig(cwd);
      const jiraLog = writeJiraSpy(cwd);
      const file = writeFeature(cwd, TASK, { title: "Stage ww", status: TODO });
      writePrompt(cwd, TASK);
      const sdk = createFakeSdk();
      const sessions = registryFor(cwd, { sdk });
      const before = featureStatus(file);
      assert.equal(before, TODO);
      await sessions.startStage(TASK, { action: ACTION_DOIT });
      assert.equal(featureStatus(file), before);
      assert.equal(jiraTransitionCalled(jiraLog), false);
      assert.equal(fs.existsSync(jiraLog) && fs.readFileSync(jiraLog, "utf8").trim() !== "", false);
      assert.equal(sdk.sends.length, 1);
      assert.match(sdk.sends[0].text, /\/dhs-doit/);
      assert.match(sdk.sends[0].text, new RegExp(TASK));
      assert.equal(sdk.creates[0].model.id, IMPLEMENTER_MODEL);
    });
  });
});

describe("close confirm and single key", () => {
  test("close does not send without confirm", async () => {
    await withTempDir(async (cwd) => {
      writeConfig(cwd);
      writeFeature(cwd, TASK, { title: "Stage ww", status: IN_REVIEW });
      writePrompt(cwd, TASK);
      const sdk = createFakeSdk();
      const sessions = registryFor(cwd, { sdk });
      await assert.rejects(
        () => sessions.startStage(TASK, { action: ACTION_CLOSE }),
        (err) => {
          assert.ok(err instanceof SessionError);
          assert.equal(err.code, "confirm_required");
          return true;
        }
      );
      assert.equal(sdk.sends.length, 0);
      assert.equal(gateStageSend({ action: ACTION_CLOSE }).allowed, false);
      const api = {
        stages: [],
        async stage(taskKey, body) {
          api.stages.push({ taskKey, ...body });
          return { taskKey };
        },
      };
      const controller = createChatController({ api });
      await controller.selectTask(TASK);
      const blocked = await controller.startStage(ACTION_CLOSE);
      assert.equal(blocked.started, false);
      assert.equal(blocked.needsConfirm, true);
      assert.equal(api.stages.length, 0);
    });
  });

  test("close sends one task key, never a list", async () => {
    await withTempDir(async (cwd) => {
      writeConfig(cwd);
      writeFeature(cwd, TASK, { title: "Stage ww", status: IN_REVIEW });
      writeFeature(cwd, OTHER, { title: "Other xx", status: IN_REVIEW });
      writePrompt(cwd, TASK);
      writePrompt(cwd, OTHER);
      const sdk = createFakeSdk();
      const sessions = registryFor(cwd, { sdk });
      const keys = stageTaskKeys(TASK);
      assert.deepEqual(keys, [TASK]);
      assert.equal(keys.length, 1);
      const prompt = buildStagePrompt({
        action: ACTION_CLOSE,
        taskKey: TASK,
        baseBranch: BASE,
      });
      assert.match(prompt, /\/dhs-checkit close/);
      assert.match(prompt, new RegExp(TASK));
      assert.doesNotMatch(prompt, new RegExp(OTHER));
      assert.doesNotMatch(prompt, /,/);
      await sessions.startStage(TASK, {
        action: ACTION_CLOSE,
        confirmed: true,
        keys: [TASK, OTHER],
      });
      assert.equal(sdk.sends.length, 1);
      assert.match(sdk.sends[0].text, new RegExp(TASK));
      assert.doesNotMatch(sdk.sends[0].text, new RegExp(OTHER));
      assert.doesNotMatch(sdk.sends[0].text, /,/);
      assert.equal(sdk.creates[0].model.id, REVIEWER_MODEL);
    });
  });
});

describe("stage HTTP and chrome", () => {
  test("POST close without confirm is refused; confirm dialog is in the page", async () => {
    await withTempDir(async (cwd) => {
      writeConfig(cwd);
      writeFeature(cwd, TASK, { title: "Stage ww", status: IN_REVIEW });
      writePrompt(cwd, TASK);
      const sdk = createFakeSdk();
      const sessions = registryFor(cwd, { sdk });
      const port = await allocPort();
      const server = await startServer({
        port,
        handler: createRequestHandler({ sessions, cwd }),
      });
      try {
        const refused = await requestJson({
          port,
          method: "POST",
          urlPath: `/api/sessions/${TASK}/stage`,
          body: { action: ACTION_CLOSE, keys: [TASK, OTHER] },
        });
        assert.equal(refused.status, 400, refused.body);
        assert.equal(refused.json.code, "confirm_required");
        assert.equal(sdk.sends.length, 0);
        const sent = await requestJson({
          port,
          method: "POST",
          urlPath: `/api/sessions/${TASK}/stage`,
          body: {
            action: ACTION_CLOSE,
            confirmed: true,
            keys: [TASK, OTHER],
          },
        });
        assert.equal(sent.status, 200, sent.body);
        assert.equal(sdk.sends.length, 1);
        assert.doesNotMatch(sdk.sends[0].text, new RegExp(OTHER));
        const page = await get("/", port);
        assert.match(page.body, /id="close-confirm"/);
        assert.match(page.body, /id="stage-buttons"/);
        assert.match(page.body, /id="close-confirm-yes"/);
        const listed = await requestJson({
          port,
          method: "GET",
          urlPath: "/api/tasks",
        });
        const row = listed.json.tasks.find((task) => task.key === TASK);
        assert.equal(row.hasSpecPrompt, true);
        assert.equal(row.status, IN_REVIEW);
        assert.notEqual(row.status, "in review");
      } finally {
        await shutdownMonitor({ cwd, server, sessions, exitProcess: false });
      }
    });
  });

  test("files list hasSpecPrompt is false without a prompt file; worktree warn does not block", async () => {
    await withTempDir(async (cwd) => {
      writeConfig(cwd);
      writeFeature(cwd, TASK, { title: "Stage ww", status: TODO });
      fs.mkdirSync(path.join(cwd, ".git", "dhs-worktrees", TASK), {
        recursive: true,
      });
      const listed = listTasks(cwd);
      const row = listed.tasks.find((task) => task.key === TASK);
      assert.equal(row.hasSpecPrompt, false);
      assert.equal(row.worktreeExists, true);
      writePrompt(cwd, TASK);
      const ready = listTasks(cwd).tasks.find((task) => task.key === TASK);
      assert.equal(ready.hasSpecPrompt, true);
      const sdk = createFakeSdk();
      const sessions = registryFor(cwd, { sdk });
      const result = await sessions.startStage(TASK, { action: ACTION_DOIT });
      assert.equal(result.worktreeExists, true);
      assert.equal(sdk.sends.length, 1);
    });
  });
});
