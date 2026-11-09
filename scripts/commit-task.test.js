"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");

const {
  assertBlocked,
  assertOk,
  assertUnchanged,
  currentBranch,
  failingEditor,
  git,
  initGitRepo,
  runScript,
  startTask,
  withTempDir,
  writeFile,
} = require("../test/helpers");

describe("commit-task", () => {
  test("BLOCKED with no paths", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "001-feature"));
      assertBlocked(
        runScript("commit-task", ["001-feature"], { cwd }),
        /no paths listed/
      );
    });
  });

  test("BLOCKED for a missing untracked path", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "001-feature"));
      assertBlocked(
        runScript("commit-task", ["001-feature", "nope.txt"], { cwd }),
        /path nope\.txt does not exist/
      );
    });
  });

  test("BLOCKED when not on the task branch", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      writeFile(cwd, "a.txt", "a\n");
      assertBlocked(
        runScript("commit-task", ["001-feature", "a.txt"], { cwd }),
        /checkout is dev, not task branch 001-feature/
      );
    });
  });

  test("BLOCKED for an unknown option", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "001-feature"));
      writeFile(cwd, "a.txt", "a\n");
      assertBlocked(
        runScript("commit-task", ["001-feature", "--amend", "a.txt"], { cwd }),
        /unknown option --amend/
      );
    });
  });

  test("adds only listed paths and defaults the message to the task name", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "001-feature"));
      writeFile(cwd, "keep.txt", "keep\n");
      writeFile(cwd, "skip.txt", "skip\n");
      const result = runScript("commit-task", ["001-feature", "keep.txt"], { cwd });
      assertOk(result);
      assert.match(result.stdout, /commit: /);
      const msg = git(cwd, ["log", "-1", "--pretty=%s"]).stdout.trim();
      assert.equal(msg, "001-feature");
      const committed = git(cwd, ["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"])
        .stdout;
      assert.match(committed, /keep\.txt/);
      assert.equal(/skip\.txt/.test(committed), false);
      const untracked = git(cwd, ["ls-files", "--others", "--exclude-standard"]).stdout;
      assert.match(untracked, /skip\.txt/);
    });
  });

  test("uses --message when provided", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "001-feature"));
      writeFile(cwd, "a.txt", "a\n");
      const result = runScript(
        "commit-task",
        ["001-feature", "--message", "custom msg", "--", "a.txt"],
        { cwd }
      );
      assertOk(result);
      assert.equal(git(cwd, ["log", "-1", "--pretty=%s"]).stdout.trim(), "custom msg");
    });
  });

  test("UNCHANGED when listed paths have no staged diff", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "001-feature"));
      const result = runScript("commit-task", ["001-feature", "README.md"], { cwd });
      assertUnchanged(result);
      assert.match(result.stdout, /commit: none/);
    });
  });

  test("finishes a merge with --no-edit when MERGE_HEAD is present", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "001-feature"));
      writeFile(cwd, "task-only.txt", "t\n");
      git(cwd, ["add", "task-only.txt"]);
      git(cwd, ["commit", "-m", "task"]);
      git(cwd, ["checkout", "dev"]);
      writeFile(cwd, "base-only.txt", "b\n");
      git(cwd, ["add", "base-only.txt"]);
      git(cwd, ["commit", "-m", "base"]);
      git(cwd, ["checkout", "001-feature"]);
      git(cwd, ["merge", "--no-commit", "--no-ff", "dev"]);
      const editor = failingEditor(cwd);
      const result = runScript(
        "commit-task",
        ["001-feature", "task-only.txt", "base-only.txt"],
        { cwd, env: editor.env }
      );
      assertOk(result);
      assert.equal(fs.existsSync(editor.stamp), false);
      const parents = git(cwd, ["rev-list", "--parents", "-n", "1", "HEAD"])
        .stdout.trim()
        .split(" ");
      assert.ok(parents.length >= 3);
      const msg = git(cwd, ["log", "-1", "--pretty=%s"]).stdout.trim();
      assert.match(msg, /Merge branch ['"]dev['"]/);
      assert.notEqual(msg, "001-feature");
    });
  });

  test("stays on the task branch after a successful commit", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "001-feature"));
      writeFile(cwd, "a.txt", "a\n");
      assertOk(runScript("commit-task", ["001-feature", "a.txt"], { cwd }));
      assert.equal(currentBranch(cwd), "001-feature");
    });
  });
});
