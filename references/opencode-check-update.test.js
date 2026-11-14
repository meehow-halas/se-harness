"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { pathToFileURL } = require("url");

const SOURCE = path.join(__dirname, "opencode-check-update.js");
const SCRIPT = path.join(__dirname, "..", "scripts", "check-update");
const NOTICE = /seh 1\.0\.0 is installed; 1\.2\.0 is available \(GitHub tag\)/;

async function withProject(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "seh-oc-plugin-"));
  try {
    return await fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// OpenCode loads `.opencode/plugins/*.js` as ES modules; this package is CommonJS,
// so import a copy with an .mjs extension.
async function loadPlugin(dir) {
  const copy = path.join(dir, "seh-check-update.mjs");
  fs.copyFileSync(SOURCE, copy);
  return (await import(pathToFileURL(copy).href)).default;
}

function installSeh(project, { version = "1.0.0", tags = [], countFile } = {}) {
  fs.mkdirSync(path.join(project, ".seh", "scripts"), { recursive: true });
  fs.writeFileSync(path.join(project, ".seh", "VERSION"), `${version}\n`);
  fs.copyFileSync(SCRIPT, path.join(project, ".seh", "scripts", "check-update"));
  const lines = ["#!/bin/sh", `printf called\\\\n >> ${JSON.stringify(countFile)}`];
  for (const tag of tags) {
    lines.push(`printf '%s\\t%s\\n' abc refs/tags/${tag}`);
  }
  const stub = path.join(project, "ls-remote-stub");
  fs.writeFileSync(stub, `${lines.join("\n")}\n`, { mode: 0o755 });
  return stub;
}

function fakeContext(directory, events, { putImpl } = {}) {
  const puts = [];
  const subscriptions = [];
  let finish;
  const done = new Promise((resolve) => {
    finish = resolve;
  });
  const ctx = {
    location: { directory },
    event: {
      subscribe(options) {
        subscriptions.push(options);
        return (async function* () {
          try {
            for (const event of events) {
              yield event;
            }
          } finally {
            finish();
          }
        })();
      },
    },
    session: {
      instructions: {
        entry: {
          async put(input) {
            puts.push(input);
            if (putImpl) {
              await putImpl(input);
            }
          },
        },
      },
    },
  };
  return { ctx, puts, subscriptions, done };
}

async function withStubEnv(stub, fn) {
  const saved = {
    SEH_GIT_LS_REMOTE: process.env.SEH_GIT_LS_REMOTE,
    SEH_CHECK_NOW: process.env.SEH_CHECK_NOW,
  };
  process.env.SEH_GIT_LS_REMOTE = stub;
  process.env.SEH_CHECK_NOW = "1000";
  try {
    return await fn();
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

const created = (sessionID, extra = {}) => ({
  type: "session.created",
  data: { sessionID, ...extra },
});

function callCount(countFile) {
  return fs.existsSync(countFile)
    ? fs.readFileSync(countFile, "utf8").split("\n").filter(Boolean).length
    : 0;
}

describe("opencode check-update plugin", () => {
  test("default export is the V2 plugin definition OpenCode requires", async () => {
    await withProject(async (dir) => {
      const plugin = await loadPlugin(dir);
      assert.equal(typeof plugin, "object");
      assert.equal(typeof plugin.id, "string");
      assert.notEqual(plugin.id, "");
      assert.equal(typeof plugin.setup, "function");
    });
  });

  test("puts the notice on each new top-level session, not on subagent sessions", async () => {
    await withProject(async (project) => {
      const countFile = path.join(project, "calls");
      const stub = installSeh(project, { tags: ["v1.2.0"], countFile });
      const nested = path.join(project, "packages", "app");
      fs.mkdirSync(nested, { recursive: true });
      const plugin = await loadPlugin(project);
      const { ctx, puts, subscriptions, done } = fakeContext(nested, [
        { type: "server.connected", data: {} },
        created("ses_top"),
        created("ses_child", { parentID: "ses_top" }),
        created("ses_second"),
      ]);
      await withStubEnv(stub, async () => {
        const cleanup = plugin.setup(ctx);
        await done;
        assert.equal(typeof cleanup, "function");
        cleanup();
      });
      assert.deepEqual(subscriptions[0].types, ["session.created"]);
      assert.ok(subscriptions[0].signal instanceof AbortSignal);
      assert.deepEqual(
        puts.map((p) => [p.sessionID, p.key]),
        [
          ["ses_top", "seh-update"],
          ["ses_second", "seh-update"],
        ]
      );
      for (const p of puts) {
        assert.match(p.value, NOTICE);
      }
      assert.equal(callCount(countFile), 1);
    });
  });

  test("checks again for each session, so a long-lived server sees a newer tag later", async () => {
    await withProject(async (project) => {
      const countFile = path.join(project, "calls");
      const stub = installSeh(project, { tags: [], countFile });
      const cache = path.join(project, ".seh", "update-check.json");
      fs.writeFileSync(cache, '{"checkedAt":1000,"latest":"1.0.0"}\n');
      const plugin = await loadPlugin(project);
      const events = (function* () {
        yield created("ses_before");
        fs.writeFileSync(cache, '{"checkedAt":1000,"latest":"1.2.0"}\n');
        yield created("ses_after");
      })();
      const { ctx, puts, done } = fakeContext(project, events);
      await withStubEnv(stub, async () => {
        plugin.setup(ctx);
        await done;
      });
      assert.deepEqual(puts.map((p) => p.sessionID), ["ses_after"]);
      assert.match(puts[0].value, NOTICE);
    });
  });

  test("puts nothing when no newer tag exists", async () => {
    await withProject(async (project) => {
      const countFile = path.join(project, "calls");
      const stub = installSeh(project, { version: "1.2.0", tags: ["1.2.0", "1.1.0"], countFile });
      const plugin = await loadPlugin(project);
      const { ctx, puts, done } = fakeContext(project, [created("ses_a")]);
      await withStubEnv(stub, async () => {
        plugin.setup(ctx);
        await done;
      });
      assert.deepEqual(puts, []);
      assert.equal(callCount(countFile), 1);
    });
  });

  test("fails open when put throws or the host lacks the session API", async () => {
    await withProject(async (project) => {
      const countFile = path.join(project, "calls");
      const stub = installSeh(project, { tags: ["2.0.0"], countFile });
      const plugin = await loadPlugin(project);
      const failing = fakeContext(project, [created("ses_a"), created("ses_b")], {
        putImpl: () => {
          throw new Error("boom");
        },
      });
      await withStubEnv(stub, async () => {
        assert.doesNotThrow(() => plugin.setup(failing.ctx));
        await failing.done;
      });
      assert.equal(failing.puts.length, 2);

      assert.doesNotThrow(() => plugin.setup({ location: { directory: project } }));
      assert.doesNotThrow(() => plugin.setup(undefined));
    });
  });
});
