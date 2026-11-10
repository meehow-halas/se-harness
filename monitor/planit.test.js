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
const { createSessionRegistry } = require("./sessions");
const { listTasks } = require("./tasks");
const { buildFirstPlanitPrompt } = require("./chat");

const ARCHITECT_MODEL = "architect-wire-99";
const WRONG_MODEL = "client-guess-model";
const TASK_A = "001-keep-aa";
const NEW_KEY = "021-logout-qq";
const USER_REQUEST = "spec the logout ribbon for vaulted-ee";
const TODO_STATUS = "queued-aa";

function writeConfig(cwd, extraAgents = {}) {
  fs.mkdirSync(path.join(cwd, ".dhs", "monitor"), { recursive: true });
  fs.mkdirSync(path.join(cwd, ".dhs", "scripts"), { recursive: true });
  fs.writeFileSync(
    path.join(cwd, "harness.config.json"),
    `${JSON.stringify({
      dhs: { generatedFrom: "8.1.4" },
      agents: {
        docs: ["notes/spec.md"],
        baseBranch: "trunk",
        statuses: { todo: TODO_STATUS, done: "vaulted-ee" },
        roles: {
          architect: { model: { cursor: ARCHITECT_MODEL } },
          implementer: { model: { cursor: "implementer-not-for-add" } },
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
if [ "$1" = "create" ]; then
  echo "jira create must not run from Monitor" >&2
  exit 1
fi
echo OK
`
  );
  fs.chmodSync(script, 0o755);
  return logFile;
}

function jiraCreateCalled(logFile) {
  if (!fs.existsSync(logFile)) {
    return false;
  }
  return fs.readFileSync(logFile, "utf8").split(/\r?\n/).some((line) =>
    line.trim().startsWith("create")
  );
}

function featureFiles(cwd) {
  const dir = path.join(cwd, "notes", "features");
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs.readdirSync(dir).filter((name) => name.endsWith(".feature.md"));
}

function writeFeature(cwd, basename, title) {
  const dir = path.join(cwd, "notes", "features");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, `${basename}.feature.md`),
    `---
id: ${basename}
title: ${title}
status: ${TODO_STATUS}
type: feature
depends: []
relates: []
---

# ${title}
`
  );
}

function registryFor(cwd, { cli, maxAgents = 4 } = {}) {
  const fake = cli || createFakeAgentCli();
  return createSessionRegistry({
    cwd,
    maxAgents,
    env: { PATH: "/usr/bin", HOME: "/tmp" },
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

describe("Add → /dhs-planit", () => {
  test("Add does not write a feature file or run jira create in the Monitor process", async () => {
    await withTempDir(async (cwd) => {
      writeConfig(cwd);
      const jiraLog = writeJiraSpy(cwd);
      const cli = createFakeAgentCli();
      const sessions = registryFor(cwd, { cli });
      await sessions.createSession({ taskKey: TASK_A, model: ARCHITECT_MODEL });
      const created = await sessions.createSession({ intent: "planit" });
      await sessions.send(created.taskKey, USER_REQUEST, { intent: "planit" });
      assert.deepEqual(featureFiles(cwd), []);
      assert.equal(jiraCreateCalled(jiraLog), false);
      assert.equal(fs.existsSync(path.join(cwd, "docs", "features")), false);
    });
  });

  test("the first agent prompt carries /dhs-planit and the user text, not /dhs-shipit", async () => {
    await withTempDir(async (cwd) => {
      writeConfig(cwd);
      const cli = createFakeAgentCli();
      const sessions = registryFor(cwd, { cli });
      const created = await sessions.createSession({
        intent: "planit",
        model: WRONG_MODEL,
      });
      assert.equal(cli.creates[0].model.id, ARCHITECT_MODEL);
      assert.notEqual(ARCHITECT_MODEL, WRONG_MODEL);
      await sessions.send(created.taskKey, USER_REQUEST);
      assert.equal(cli.sends.length, 1);
      const prompt = cli.sends[0].text;
      assert.equal(prompt, buildFirstPlanitPrompt(USER_REQUEST));
      assert.match(prompt, /\/dhs-planit/);
      assert.match(prompt, new RegExp(USER_REQUEST));
      assert.doesNotMatch(prompt, /\/dhs-shipit/);
      const visible = sessions.snapshot(created.taskKey).messages[0];
      assert.equal(visible.role, "user");
      assert.equal(visible.text, USER_REQUEST);
      await sessions.send(created.taskKey, "Q1: keep the ribbon");
      assert.equal(cli.sends[1].text, "Q1: keep the ribbon");
      assert.doesNotMatch(cli.sends[1].text, /\/dhs-planit/);
    });
  });

  test("Add does not reuse another task's agent process", async () => {
    await withTempDir(async (cwd) => {
      writeConfig(cwd);
      const cli = createFakeAgentCli();
      const sessions = registryFor(cwd, { cli });
      const existing = await sessions.createSession({
        taskKey: TASK_A,
        model: ARCHITECT_MODEL,
      });
      const added = await sessions.createSession({ intent: "planit" });
      assert.equal(cli.creates.length, 2);
      assert.notEqual(cli.creates[0].pid, cli.creates[1].pid);
      assert.notEqual(added.agentId, existing.agentId);
      assert.notEqual(added.taskKey, TASK_A);
      await Promise.all([
        sessions.send(TASK_A, "stay-on-a"),
        sessions.send(added.taskKey, USER_REQUEST, { intent: "planit" }),
      ]);
      assert.equal(cli.sends.length, 2);
      assert.notEqual(cli.sends[0].agentId, cli.sends[1].agentId);
      assert.equal(cli.disposes.length, 0);
    });
  });

  test("a completed files-tracker planit makes a new left-column key appear", async () => {
    await withTempDir(async (cwd) => {
      writeConfig(cwd);
      writeJiraSpy(cwd);
      writeFeature(cwd, TASK_A, "Keep me");
      const cli = createFakeAgentCli({
        onSend() {
          writeFeature(cwd, NEW_KEY, "Logout ribbon");
        },
      });
      const sessions = registryFor(cwd, { cli });
      const port = await allocPort();
      const server = await startServer({
        port,
        handler: createRequestHandler({ sessions, cwd }),
      });
      try {
        const before = await requestJson({
          port,
          method: "GET",
          urlPath: "/api/tasks",
        });
        assert.equal(before.status, 200);
        assert.equal(
          before.json.tasks.some((row) => row.key === NEW_KEY),
          false
        );
        const created = await requestJson({
          port,
          method: "POST",
          urlPath: "/api/sessions",
          body: { intent: "planit", model: WRONG_MODEL },
        });
        assert.equal(created.status, 201, created.body);
        assert.match(created.json.taskKey, /^new-\d+$/);
        assert.equal(created.json.model, ARCHITECT_MODEL);
        const sent = await requestJson({
          port,
          method: "POST",
          urlPath: `/api/sessions/${created.json.taskKey}/send`,
          body: { text: USER_REQUEST, intent: "planit", mode: "interactive" },
        });
        assert.equal(sent.status, 200, sent.body);
        assert.equal(sent.json.taskKey, NEW_KEY);
        const after = await requestJson({
          port,
          method: "GET",
          urlPath: "/api/tasks",
        });
        assert.equal(after.status, 200);
        const row = after.json.tasks.find((task) => task.key === NEW_KEY);
        assert.ok(row);
        assert.equal(row.title, "Logout ribbon");
        assert.equal(row.status, TODO_STATUS);
        assert.notEqual(TODO_STATUS, "todo");
        const listed = listTasks(cwd, { sessions });
        assert.equal(
          listed.tasks.some((task) => task.key === NEW_KEY),
          true
        );
      } finally {
        await shutdownMonitor({ cwd, server, sessions, exitProcess: false });
      }
    });
  });
});
