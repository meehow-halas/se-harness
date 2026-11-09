"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

const {
  assertBlocked,
  assertOk,
  assertUnchanged,
  currentBranch,
  git,
  initGitRepo,
  runScript,
  startTask,
  withTempDir,
} = require("../test/helpers");

describe("return-to-base", () => {
  test("rejects extra arguments", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertBlocked(runScript("return-to-base", ["nope"], { cwd }));
    });
  });

  test("checks out the base branch and keeps the task branch", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "001-feature"));
      const result = runScript("return-to-base", [], { cwd });
      assertOk(result);
      assert.equal(currentBranch(cwd), "dev");
      git(cwd, ["rev-parse", "--verify", "001-feature"]);
    });
  });

  test("UNCHANGED when already on base", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      const result = runScript("return-to-base", [], { cwd });
      assertUnchanged(result);
    });
  });
});
