"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  assertBlocked,
  assertOk,
  assertUnchanged,
  currentBranch,
  failingEditor,
  git,
  initGitRepo,
  revParse,
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
      const sha = revParse(cwd, "HEAD");
      const result = runScript("update-from-base", ["001-feature"], { cwd });
      assertUnchanged(result);
      assert.equal(revParse(cwd, "HEAD"), sha);
      assert.equal(currentBranch(cwd), "001-feature");
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
      const editor = failingEditor(cwd);
      const result = runScript("update-from-base", ["001-feature"], {
        cwd,
        env: editor.env,
      });
      assertOk(result);
      assert.equal(fs.existsSync(path.join(cwd, "base.txt")), true);
      assert.equal(fs.existsSync(path.join(cwd, "task.txt")), true);
      assert.equal(fs.existsSync(editor.stamp), false);
      const parents = git(cwd, ["rev-list", "--parents", "-n", "1", "HEAD"])
        .stdout.trim()
        .split(" ");
      assert.ok(parents.length >= 3, "expected a merge commit, not a rebase");
      assert.equal(currentBranch(cwd), "001-feature");
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
      assertBlocked(result, /merge of dev into 001-feature has conflicts/);
      const unmerged = git(cwd, ["diff", "--name-only", "--diff-filter=U"]).stdout;
      assert.match(unmerged, /README.md/);
      assert.equal(currentBranch(cwd), "001-feature");
    });
  });

  test("BLOCKED when extra arguments are passed", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "001-feature"));
      assertBlocked(
        runScript("update-from-base", ["001-feature", "extra"], { cwd }),
        /unexpected arguments/
      );
    });
  });
});
