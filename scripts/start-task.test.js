"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  addBareOrigin,
  assertBlocked,
  assertOk,
  assertUnchanged,
  currentBranch,
  git,
  initGitRepo,
  runScript,
  startTask,
  withTempDir,
  writeFile,
  writeHarnessConfig,
} = require("../test/helpers");

describe("start-task", () => {
  test("rejects extra arguments", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertBlocked(runScript("start-task", ["001-feature", "extra"], { cwd }));
    });
  });

  test("creates a branch from base", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      const result = startTask(cwd, "001-feature");
      assertOk(result);
      assert.match(result.stdout, /created: yes/);
      assert.equal(currentBranch(cwd), "001-feature");
    });
  });

  test("UNCHANGED when already on the task branch", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "001-feature"));
      const result = startTask(cwd, "001-feature");
      assertUnchanged(result);
      assert.match(result.stdout, /created: no/);
    });
  });

  test("checks out an existing local branch without creating", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "001-feature"));
      assertOk(runScript("return-to-base", [], { cwd }));
      const result = startTask(cwd, "001-feature");
      assertOk(result);
      assert.match(result.stdout, /created: no/);
      assert.equal(currentBranch(cwd), "001-feature");
    });
  });

  test("creates a local branch from origin/task when only the remote exists", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "001-feature"));
      writeFile(cwd, "task.txt", "on task\n");
      git(cwd, ["add", "task.txt"]);
      git(cwd, ["commit", "-m", "task work"]);
      const bare = addBareOrigin(cwd);
      git(cwd, ["push", "-u", "origin", "001-feature"]);
      git(cwd, ["checkout", "dev"]);
      git(cwd, ["branch", "-D", "001-feature"]);
      const result = startTask(cwd, "001-feature");
      assertOk(result);
      assert.match(result.stdout, /created: no/);
      assert.equal(currentBranch(cwd), "001-feature");
      assert.equal(fs.existsSync(path.join(cwd, "task.txt")), true);
      fs.rmSync(bare, { recursive: true, force: true });
    });
  });

  test("BLOCKED when the working tree is dirty and checkout cannot switch", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "001-feature"));
      writeFile(cwd, "README.md", "task version\n");
      git(cwd, ["add", "README.md"]);
      git(cwd, ["commit", "-m", "task edit"]);
      assertOk(runScript("return-to-base", [], { cwd }));
      writeFile(cwd, "README.md", "dirty on base\n");
      assertBlocked(startTask(cwd, "001-feature"));
    });
  });

  test("BLOCKED when the configured base branch is not local", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd, { baseBranch: "main" });
      writeHarnessConfig(cwd, "dev");
      assertBlocked(startTask(cwd, "001-feature"));
    });
  });
});
