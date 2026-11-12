"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  addBareOrigin,
  argvLogArgv,
  assertBlocked,
  assertOk,
  assertUnchanged,
  cloneFrom,
  git,
  initGitRepo,
  revParse,
  runScript,
  startWorktree,
  withTempDir,
  writeFile,
  writeGitLogger,
} = require("../test/helpers");

function pushEnv(cwd) {
  const bin = path.join(cwd, ".bin");
  const { logFile } = writeGitLogger(bin);
  return {
    logFile,
    env: { PATH: `${bin}${path.delimiter}${process.env.PATH}` },
  };
}

describe("push-task", () => {
  test("pushes only the task branch without --force", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd, { baseBranch: "trunk" });
      const bare = addBareOrigin(cwd);
      const originBase = revParse(bare, "refs/heads/trunk");
      git(cwd, ["checkout", "trunk"]);
      writeFile(cwd, "base-ahead.txt", "local base\n");
      git(cwd, ["add", "base-ahead.txt"]);
      git(cwd, ["commit", "-m", "local base ahead of origin"]);
      const localBase = revParse(cwd, "trunk");
      assert.notEqual(localBase, originBase);
      const wt = startWorktree(cwd, "ABC-12");
      writeFile(wt, "push.txt", "ahead\n");
      git(wt, ["add", "push.txt"]);
      git(wt, ["commit", "-m", "ahead"]);
      const { env, logFile } = pushEnv(cwd);
      const result = runScript("push-task", ["ABC-12"], { cwd: wt, env });
      assertOk(result, { branch: "ABC-12", remote: "origin" });
      const heads = git(bare, ["show-ref"]).stdout;
      assert.match(heads, /refs\/heads\/ABC-12/);
      assert.equal(revParse(bare, "refs/heads/trunk"), originBase);
      const pushLines = argvLogArgv(logFile).filter((args) => args[0] === "push");
      assert.equal(pushLines.length, 1);
      assert.deepEqual(pushLines[0], ["push", "--porcelain", "origin", "ABC-12"]);
    });
  });

  test("UNCHANGED when the remote is already up to date", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      const bare = addBareOrigin(cwd);
      const wt = startWorktree(cwd, "001-feature");
      writeFile(wt, "push.txt", "ahead\n");
      git(wt, ["add", "push.txt"]);
      git(wt, ["commit", "-m", "ahead"]);
      assertOk(runScript("push-task", ["001-feature"], { cwd: wt }));
      const remoteSha = revParse(bare, "refs/heads/001-feature");
      const result = runScript("push-task", ["001-feature"], { cwd: wt });
      assertUnchanged(result, { branch: "001-feature", remote: "origin" });
      assert.equal(revParse(bare, "refs/heads/001-feature"), remoteSha);
    });
  });

  test("BLOCKED when no remote exists", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      startWorktree(cwd, "001-feature");
      assertBlocked(
        runScript("push-task", ["001-feature"], { cwd }),
        /no git remote named origin/
      );
    });
  });

  test("BLOCKED when extra arguments are passed", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      addBareOrigin(cwd);
      startWorktree(cwd, "001-feature");
      assertBlocked(
        runScript("push-task", ["001-feature", "extra"], { cwd }),
        /unexpected arguments/
      );
    });
  });

  test("uses the single non-origin remote", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      const bare = addBareOrigin(cwd, "upstream");
      const wt = startWorktree(cwd, "001-feature");
      writeFile(wt, "push.txt", "ahead\n");
      git(wt, ["add", "push.txt"]);
      git(wt, ["commit", "-m", "ahead"]);
      const { env, logFile } = pushEnv(cwd);
      const result = runScript("push-task", ["001-feature"], { cwd: wt, env });
      assertOk(result, { branch: "001-feature", remote: "upstream" });
      git(bare, ["show-ref", "--verify", "refs/heads/001-feature"]);
      const pushLines = argvLogArgv(logFile).filter((args) => args[0] === "push");
      assert.deepEqual(pushLines[0], ["push", "--porcelain", "upstream", "001-feature"]);
    });
  });

  test("BLOCKED when two remotes exist and neither is origin", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      const bare = addBareOrigin(cwd, "upstream");
      git(cwd, ["remote", "add", "fork", bare]);
      startWorktree(cwd, "001-feature");
      assertBlocked(
        runScript("push-task", ["001-feature"], { cwd }),
        /no git remote named origin/
      );
    });
  });

  test("BLOCKED on a diverged remote instead of force-pushing", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      const bare = addBareOrigin(cwd);
      const wt = startWorktree(cwd, "001-feature");
      writeFile(wt, "push.txt", "ahead\n");
      git(wt, ["add", "push.txt"]);
      git(wt, ["commit", "-m", "ahead"]);
      assertOk(runScript("push-task", ["001-feature"], { cwd: wt }));

      const other = path.join(cwd, ".other");
      cloneFrom(bare, other);
      git(other, ["checkout", "-B", "001-feature", "origin/001-feature"]);
      writeFile(other, "other.txt", "remote side\n");
      git(other, ["add", "other.txt"]);
      git(other, ["commit", "-m", "remote ahead"]);
      git(other, ["push", "origin", "001-feature"]);

      writeFile(wt, "local-only.txt", "local side\n");
      git(wt, ["add", "local-only.txt"]);
      git(wt, ["commit", "-m", "local ahead"]);

      const { env, logFile } = pushEnv(cwd);
      assertBlocked(
        runScript("push-task", ["001-feature"], { cwd: wt, env }),
        /push of 001-feature to origin failed/
      );
      const pushLines = argvLogArgv(logFile).filter((args) => args[0] === "push");
      assert.ok(
        pushLines.some((args) =>
          args.length === 4 &&
          args[1] === "--porcelain" &&
          args[2] === "origin" &&
          args[3] === "001-feature"
        )
      );
      assert.equal(
        pushLines.some((args) => args.includes("--force") || args.includes("-f") || args.includes("--force-with-lease")),
        false
      );
    });
  });
});
