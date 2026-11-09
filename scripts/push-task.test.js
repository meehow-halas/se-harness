"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");

const {
  addBareOrigin,
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

describe("push-task", () => {
  test("pushes only the task branch without --force", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      const bare = addBareOrigin(cwd);
      assertOk(startTask(cwd, "001-feature"));
      writeFile(cwd, "push.txt", "ahead\n");
      git(cwd, ["add", "push.txt"]);
      git(cwd, ["commit", "-m", "ahead"]);
      const result = runScript("push-task", ["001-feature"], { cwd });
      assertOk(result);
      assert.match(result.stdout, /remote: origin/);
      const heads = git(bare, ["show-ref"]).stdout;
      assert.match(heads, /refs\/heads\/001-feature/);
      fs.rmSync(bare, { recursive: true, force: true });
    });
  });

  test("UNCHANGED when the remote is already up to date", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      const bare = addBareOrigin(cwd);
      assertOk(startTask(cwd, "001-feature"));
      writeFile(cwd, "push.txt", "ahead\n");
      git(cwd, ["add", "push.txt"]);
      git(cwd, ["commit", "-m", "ahead"]);
      assertOk(runScript("push-task", ["001-feature"], { cwd }));
      const result = runScript("push-task", ["001-feature"], { cwd });
      assertUnchanged(result);
      fs.rmSync(bare, { recursive: true, force: true });
    });
  });

  test("BLOCKED when no remote exists", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "001-feature"));
      assertBlocked(runScript("push-task", ["001-feature"], { cwd }));
    });
  });

  test("uses the single non-origin remote", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      const bare = addBareOrigin(cwd, "upstream");
      assertOk(startTask(cwd, "001-feature"));
      writeFile(cwd, "push.txt", "ahead\n");
      git(cwd, ["add", "push.txt"]);
      git(cwd, ["commit", "-m", "ahead"]);
      const result = runScript("push-task", ["001-feature"], { cwd });
      assertOk(result);
      assert.match(result.stdout, /remote: upstream/);
      fs.rmSync(bare, { recursive: true, force: true });
    });
  });
});
