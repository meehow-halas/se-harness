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
  startWorktree,
  withTempDir,
  writeFile,
} = require("../test/helpers");

describe("update-from-base", () => {
  test("UNCHANGED when base is already an ancestor", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      const wt = startWorktree(cwd, "001-feature");
      const sha = revParse(wt, "HEAD");
      const result = runScript("update-from-base", ["001-feature"], { cwd: wt });
      assertUnchanged(result, { branch: "001-feature", base: "dev" });
      assert.equal(revParse(wt, "HEAD"), sha);
      assert.equal(currentBranch(wt), "001-feature");
    });
  });

  test("merges base with --no-edit when it has moved", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd, { baseBranch: "trunk" });
      const wt = startWorktree(cwd, "ABC-12");
      writeFile(wt, "task.txt", "t\n");
      git(wt, ["add", "task.txt"]);
      git(wt, ["commit", "-m", "task"]);
      writeFile(cwd, "base.txt", "b\n");
      git(cwd, ["add", "base.txt"]);
      git(cwd, ["commit", "-m", "base moved"]);
      const editor = failingEditor(cwd);
      const result = runScript("update-from-base", ["ABC-12"], {
        cwd: wt,
        env: editor.env,
      });
      const { fields } = assertOk(result, { branch: "ABC-12", base: "trunk" });
      assert.ok(fields.commit);
      assert.equal(fs.existsSync(path.join(wt, "base.txt")), true);
      assert.equal(fs.existsSync(path.join(wt, "task.txt")), true);
      assert.equal(fs.existsSync(editor.stamp), false);
      const parents = git(wt, ["rev-list", "--parents", "-n", "1", "HEAD"])
        .stdout.trim()
        .split(" ");
      assert.ok(parents.length >= 3, "expected a merge commit, not a rebase");
      assert.equal(currentBranch(wt), "ABC-12");
    });
  });

  test("BLOCKED on conflicts and leaves the conflicted index", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      const wt = startWorktree(cwd, "001-feature");
      writeFile(wt, "README.md", "task\n");
      git(wt, ["add", "README.md"]);
      git(wt, ["commit", "-m", "task"]);
      writeFile(cwd, "README.md", "base\n");
      git(cwd, ["add", "README.md"]);
      git(cwd, ["commit", "-m", "base"]);
      const result = runScript("update-from-base", ["001-feature"], { cwd: wt });
      assertBlocked(result, /merge of dev into 001-feature has conflicts/);
      const unmerged = git(wt, ["diff", "--name-only", "--diff-filter=U"]).stdout;
      assert.match(unmerged, /README.md/);
      assert.equal(currentBranch(wt), "001-feature");
    });
  });

  test("BLOCKED when checkout is not the task branch", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd, { baseBranch: "trunk" });
      startWorktree(cwd, "ABC-12");
      assertBlocked(
        runScript("update-from-base", ["ABC-12"], { cwd }),
        /checkout is trunk, not task branch ABC-12/
      );
      assert.equal(currentBranch(cwd), "trunk");
    });
  });

  test("BLOCKED when extra arguments are passed", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      startWorktree(cwd, "001-feature");
      assertBlocked(
        runScript("update-from-base", ["001-feature", "extra"], { cwd }),
        /unexpected arguments/
      );
    });
  });
});
