"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const {
  argvLogArgv,
  assertBlocked,
  assertOk,
  assertUnchanged,
  git,
  initGitRepo,
  pathHidingCommand,
  runScript,
  startTask,
  withTempDir,
  writeGhPrStub,
  writeHarnessConfig,
} = require("../test/helpers");

function withGh(cwd, stubOpts) {
  const bin = path.join(cwd, ".bin");
  const { logFile } = writeGhPrStub(bin, stubOpts);
  return {
    logFile,
    env: { PATH: `${bin}${path.delimiter}${process.env.PATH}` },
  };
}

function pr(over) {
  return {
    number: 7,
    state: "OPEN",
    url: "https://example.com/pr/7",
    mergeable: "MERGEABLE",
    headRefName: "ABC-1",
    baseRefName: "dev",
    ...over,
  };
}

const merges = (log) => log.filter((a) => a[0] === "pr" && a[1] === "merge");

describe("merge-pr", () => {
  test("git disabled: UNCHANGED, no gh call", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      writeHarnessConfig(cwd, "");
      const { env, logFile } = withGh(cwd, { prs: [pr()] });
      const result = runScript("merge-pr", ["ABC-1"], { cwd, env });
      const parsed = assertUnchanged(result);
      assert.equal(parsed.fields.git, "disabled");
      assert.deepEqual(argvLogArgv(logFile), []);
    });
  });

  test("BLOCKED when gh is not on PATH", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      const result = runScript("merge-pr", ["ABC-1"], {
        cwd,
        env: { PATH: pathHidingCommand(cwd, "gh") },
      });
      assertBlocked(result, /gh is not available/);
    });
  });

  test("open mergeable PR: runs exactly gh pr merge <number> --squash", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "ABC-1"));
      const { env, logFile } = withGh(cwd, { prs: [pr({ number: 42, url: "https://example.com/pr/42" })] });
      const result = runScript("merge-pr", ["ABC-1"], { cwd, env });
      assertOk(result, {
        branch: "ABC-1",
        base: "dev",
        url: "https://example.com/pr/42",
        state: "merged",
      });
      assert.deepEqual(merges(argvLogArgv(logFile)), [["pr", "merge", "42", "--squash"]]);
    });
  });

  test("uses the configured base and ignores a PR into another base", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd, { baseBranch: "release-x" });
      assertOk(startTask(cwd, "ABC-1"));
      const { env, logFile } = withGh(cwd, {
        prs: [
          pr({ number: 3, baseRefName: "dev", url: "https://example.com/pr/3" }),
          pr({ number: 9, baseRefName: "release-x", url: "https://example.com/pr/9" }),
        ],
      });
      const result = runScript("merge-pr", ["ABC-1"], { cwd, env });
      assertOk(result, { base: "release-x", url: "https://example.com/pr/9" });
      const log = argvLogArgv(logFile);
      const list = log.find((a) => a[1] === "list");
      assert.equal(list[list.indexOf("--base") + 1], "release-x");
      assert.deepEqual(merges(log), [["pr", "merge", "9", "--squash"]]);
    });
  });

  test("PR only into another base: BLOCKED naming open-pr, no merge", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd, { baseBranch: "release-x" });
      assertOk(startTask(cwd, "ABC-1"));
      const { env, logFile } = withGh(cwd, { prs: [pr({ baseRefName: "dev" })] });
      const result = runScript("merge-pr", ["ABC-1"], { cwd, env });
      assertBlocked(result, /open-pr/);
      assert.deepEqual(merges(argvLogArgv(logFile)), []);
    });
  });

  test("CONFLICTING PR: BLOCKED naming update-from-base, no merge", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "ABC-1"));
      const { env, logFile } = withGh(cwd, { prs: [pr({ mergeable: "CONFLICTING" })] });
      const result = runScript("merge-pr", ["ABC-1"], { cwd, env });
      assertBlocked(result, /update-from-base/);
      assert.deepEqual(merges(argvLogArgv(logFile)), []);
    });
  });

  test("already merged: UNCHANGED state merged, no merge call", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "ABC-1"));
      const { env, logFile } = withGh(cwd, {
        prs: [pr({ state: "MERGED", url: "https://example.com/pr/5" })],
      });
      const result = runScript("merge-pr", ["ABC-1"], { cwd, env });
      assertUnchanged(result, { state: "merged", url: "https://example.com/pr/5" });
      assert.deepEqual(merges(argvLogArgv(logFile)), []);
    });
  });

  test("closed-only PR counts as no PR", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "ABC-1"));
      const { env } = withGh(cwd, { prs: [pr({ state: "CLOSED" })] });
      assertBlocked(runScript("merge-pr", ["ABC-1"], { cwd, env }), /open-pr/);
    });
  });

  test("no PR: BLOCKED naming open-pr", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "ABC-1"));
      const { env, logFile } = withGh(cwd, { prs: [] });
      const result = runScript("merge-pr", ["ABC-1"], { cwd, env });
      assertBlocked(result, /open-pr/);
      assert.deepEqual(merges(argvLogArgv(logFile)), []);
    });
  });

  test("gh pr merge fails: BLOCKED with the gh error, non-zero", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "ABC-1"));
      const { env } = withGh(cwd, { prs: [pr()], mergeFails: true });
      const result = runScript("merge-pr", ["ABC-1"], { cwd, env });
      assertBlocked(result, /merge failed.*not mergeable/);
    });
  });

  test("resolves <task>-N when the worktree is on <task>-2", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "ABC-1"));
      const wt = path.join(cwd, ".git", "seh-worktrees", "ABC-1");
      git(wt, ["checkout", "-b", "ABC-1-2"]);
      const { env, logFile } = withGh(cwd, {
        prs: [
          pr({ number: 1, state: "MERGED", headRefName: "ABC-1" }),
          pr({ number: 8, headRefName: "ABC-1-2", url: "https://example.com/pr/8" }),
        ],
      });
      const result = runScript("merge-pr", ["ABC-1"], { cwd, env });
      assertOk(result, { branch: "ABC-1-2", url: "https://example.com/pr/8" });
      assert.deepEqual(merges(argvLogArgv(logFile)), [["pr", "merge", "8", "--squash"]]);
    });
  });

  test("refuses the base branch as task", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd, { baseBranch: "release-x" });
      const { env, logFile } = withGh(cwd, { prs: [] });
      assertBlocked(runScript("merge-pr", ["release-x"], { cwd, env }), /base branch/);
      assert.deepEqual(argvLogArgv(logFile), []);
    });
  });

  test("never uses forbidden flags or git writes", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "ABC-1"));
      const before = git(cwd, ["rev-parse", "HEAD"]).stdout;
      const { env, logFile } = withGh(cwd, { prs: [pr()] });
      assertOk(runScript("merge-pr", ["ABC-1"], { cwd, env }));
      const flat = argvLogArgv(logFile).flat();
      for (const bad of ["--auto", "--admin", "--delete-branch", "--rebase", "--merge"]) {
        assert.equal(flat.includes(bad), false, bad);
      }
      assert.equal(git(cwd, ["rev-parse", "HEAD"]).stdout, before);
    });
  });
});
