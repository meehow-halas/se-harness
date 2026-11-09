"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  REPO_ROOT,
  assertBlocked,
  assertOk,
  git,
  initGitRepo,
  runScript,
  startTask,
  withTempDir,
  writeFile,
  writeHarnessConfig,
} = require("../test/helpers");

describe("scripts source allowlist", () => {
  test("helpers do not rebase, reset, force, or merge PRs", () => {
    const dir = path.join(REPO_ROOT, "scripts");
    for (const name of fs.readdirSync(dir)) {
      if (name.endsWith(".test.js")) {
        continue;
      }
      const body = fs.readFileSync(path.join(dir, name), "utf8");
      assert.equal(body.includes("git rebase"), false, name);
      assert.equal(/\bgit reset\b/.test(body), false, name);
      assert.equal(body.includes("--force"), false, name);
      assert.equal(body.includes("gh pr merge"), false, name);
    }
  });
});

describe("shared refusals", () => {
  test("missing harness.config.json is BLOCKED", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd, { config: false });
      assertBlocked(startTask(cwd, "001-feature"));
    });
  });

  test("missing agents.baseBranch is BLOCKED", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd, { config: false });
      fs.writeFileSync(path.join(cwd, "harness.config.json"), "{}\n");
      assertBlocked(startTask(cwd, "001-feature"));
    });
  });

  test("empty task name is BLOCKED", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertBlocked(runScript("start-task", [], { cwd }));
    });
  });

  test("task name starting with - is BLOCKED", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertBlocked(startTask(cwd, "-foo"));
    });
  });

  test("task equal to base branch is BLOCKED", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd, { baseBranch: "dev" });
      assertBlocked(startTask(cwd, "dev"));
    });
  });

  test("outside a git repository is BLOCKED", () => {
    withTempDir((cwd) => {
      writeHarnessConfig(cwd, "dev");
      assertBlocked(startTask(cwd, "001-feature"));
    });
  });

  test("detached HEAD is BLOCKED for require_on_task", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "001-feature"));
      git(cwd, ["checkout", "--detach", "HEAD"]);
      writeFile(cwd, "a.txt", "x\n");
      assertBlocked(runScript("commit-task", ["001-feature", "a.txt"], { cwd }));
    });
  });
});
