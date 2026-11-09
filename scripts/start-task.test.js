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
  revParse,
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
      assertBlocked(
        runScript("start-task", ["001-feature", "extra"], { cwd }),
        /unexpected arguments/
      );
      assert.equal(currentBranch(cwd), "dev");
      assert.equal(
        git(cwd, ["show-ref", "--heads"]).stdout.includes("refs/heads/001-feature"),
        false
      );
    });
  });

  test("creates a branch from the configured base, not from HEAD", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      git(cwd, ["checkout", "-b", "other"]);
      writeFile(cwd, "other.txt", "from other\n");
      git(cwd, ["add", "other.txt"]);
      git(cwd, ["commit", "-m", "other work"]);
      const baseSha = revParse(cwd, "dev");
      const otherSha = revParse(cwd, "HEAD");
      const result = startTask(cwd, "001-feature");
      assertOk(result);
      assert.match(result.stdout, /created: yes/);
      assert.equal(currentBranch(cwd), "001-feature");
      assert.equal(revParse(cwd, "HEAD"), baseSha);
      assert.notEqual(revParse(cwd, "HEAD"), otherSha);
      assert.equal(fs.existsSync(path.join(cwd, "other.txt")), false);
    });
  });

  test("UNCHANGED when already on the task branch", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "001-feature"));
      const sha = revParse(cwd, "HEAD");
      const result = startTask(cwd, "001-feature");
      assertUnchanged(result);
      assert.match(result.stdout, /created: no/);
      assert.equal(currentBranch(cwd), "001-feature");
      assert.equal(revParse(cwd, "HEAD"), sha);
    });
  });

  test("checks out an existing local branch without creating", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "001-feature"));
      writeFile(cwd, "task.txt", "kept\n");
      git(cwd, ["add", "task.txt"]);
      git(cwd, ["commit", "-m", "task work"]);
      const taskSha = revParse(cwd, "HEAD");
      assertOk(runScript("return-to-base", [], { cwd }));
      const result = startTask(cwd, "001-feature");
      assertOk(result);
      assert.match(result.stdout, /created: no/);
      assert.equal(currentBranch(cwd), "001-feature");
      assert.equal(revParse(cwd, "HEAD"), taskSha);
      assert.equal(fs.existsSync(path.join(cwd, "task.txt")), true);
    });
  });

  test("creates a local branch from origin/task when only the remote exists", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "001-feature"));
      writeFile(cwd, "task.txt", "on task\n");
      git(cwd, ["add", "task.txt"]);
      git(cwd, ["commit", "-m", "task work"]);
      addBareOrigin(cwd);
      git(cwd, ["push", "-u", "origin", "001-feature"]);
      git(cwd, ["checkout", "dev"]);
      git(cwd, ["branch", "-D", "001-feature"]);
      const result = startTask(cwd, "001-feature");
      assertOk(result);
      assert.match(result.stdout, /created: no/);
      assert.equal(currentBranch(cwd), "001-feature");
      assert.equal(fs.existsSync(path.join(cwd, "task.txt")), true);
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
      assertBlocked(startTask(cwd, "001-feature"), /could not check out 001-feature/);
      assert.equal(currentBranch(cwd), "dev");
      assert.equal(fs.readFileSync(path.join(cwd, "README.md"), "utf8"), "dirty on base\n");
    });
  });

  test("BLOCKED when the configured base branch is not local", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd, { baseBranch: "main" });
      writeHarnessConfig(cwd, "dev");
      assertBlocked(
        startTask(cwd, "001-feature"),
        /base branch dev does not exist locally/
      );
    });
  });
});
