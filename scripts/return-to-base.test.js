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
  git,
  initGitRepo,
  revParse,
  runScript,
  startWorktree,
  withTempDir,
  writeFile,
} = require("../test/helpers");

describe("return-to-base", () => {
  test("rejects extra arguments", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      startWorktree(cwd, "001-feature");
      assertBlocked(
        runScript("return-to-base", ["nope"], { cwd }),
        /unexpected arguments/
      );
      assert.equal(currentBranch(cwd), "dev");
    });
  });

  test("removes the dhs worktree and keeps the task branch and primary checkout", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd, { baseBranch: "trunk" });
      const wt = startWorktree(cwd, "ABC-12");
      const result = runScript("return-to-base", [], { cwd: wt });
      assertOk(result, { branch: "trunk", worktree: "removed", path: wt });
      assert.equal(currentBranch(cwd), "trunk");
      assert.equal(fs.existsSync(wt), false);
      git(cwd, ["rev-parse", "--verify", "ABC-12"]);
    });
  });

  test("UNCHANGED when already on base in the primary checkout", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      const sha = revParse(cwd, "HEAD");
      const result = runScript("return-to-base", [], { cwd });
      assertUnchanged(result, { branch: "dev" });
      assert.equal(currentBranch(cwd), "dev");
      assert.equal(revParse(cwd, "HEAD"), sha);
    });
  });

  test("checks out base from a primary checkout that is not on base", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      git(cwd, ["checkout", "-b", "other"]);
      const result = runScript("return-to-base", [], { cwd });
      assertOk(result, { branch: "dev" });
      assert.equal(currentBranch(cwd), "dev");
    });
  });

  test("BLOCKED when the worktree is dirty and cannot be removed", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      const wt = startWorktree(cwd, "001-feature");
      writeFile(wt, "README.md", "dirty on task\n");
      assertBlocked(
        runScript("return-to-base", [], { cwd: wt }),
        /could not remove worktree/
      );
      assert.equal(currentBranch(wt), "001-feature");
      assert.equal(currentBranch(cwd), "dev");
      assert.equal(
        fs.readFileSync(path.join(wt, "README.md"), "utf8"),
        "dirty on task\n"
      );
    });
  });
});
