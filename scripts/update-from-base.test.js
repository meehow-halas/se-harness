"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  assertBlocked,
  assertOk,
  assertUnchanged,
  git,
  initGitRepo,
  runScript,
  startTask,
  withTempDir,
  writeFile,
} = require("../test/helpers");

describe("update-from-base", () => {
  test("UNCHANGED when base is already an ancestor", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "001-feature"));
      const result = runScript("update-from-base", ["001-feature"], { cwd });
      assertUnchanged(result);
    });
  });

  test("merges base with --no-edit when it has moved", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "001-feature"));
      writeFile(cwd, "task.txt", "t\n");
      git(cwd, ["add", "task.txt"]);
      git(cwd, ["commit", "-m", "task"]);
      git(cwd, ["checkout", "dev"]);
      writeFile(cwd, "base.txt", "b\n");
      git(cwd, ["add", "base.txt"]);
      git(cwd, ["commit", "-m", "base moved"]);
      git(cwd, ["checkout", "001-feature"]);
      const result = runScript("update-from-base", ["001-feature"], { cwd });
      assertOk(result);
      assert.equal(fs.existsSync(path.join(cwd, "base.txt")), true);
    });
  });

  test("BLOCKED on conflicts and leaves the conflicted index", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "001-feature"));
      writeFile(cwd, "README.md", "task\n");
      git(cwd, ["add", "README.md"]);
      git(cwd, ["commit", "-m", "task"]);
      git(cwd, ["checkout", "dev"]);
      writeFile(cwd, "README.md", "base\n");
      git(cwd, ["add", "README.md"]);
      git(cwd, ["commit", "-m", "base"]);
      git(cwd, ["checkout", "001-feature"]);
      const result = runScript("update-from-base", ["001-feature"], { cwd });
      assertBlocked(result);
      const unmerged = git(cwd, ["diff", "--name-only", "--diff-filter=U"]).stdout;
      assert.match(unmerged, /README.md/);
    });
  });
});
