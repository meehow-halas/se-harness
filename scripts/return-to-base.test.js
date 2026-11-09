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
  startTask,
  withTempDir,
  writeFile,
} = require("../test/helpers");

describe("return-to-base", () => {
  test("rejects extra arguments", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "001-feature"));
      assertBlocked(
        runScript("return-to-base", ["nope"], { cwd }),
        /unexpected arguments/
      );
      assert.equal(currentBranch(cwd), "001-feature");
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
      const sha = revParse(cwd, "HEAD");
      const result = runScript("return-to-base", [], { cwd });
      assertUnchanged(result);
      assert.equal(currentBranch(cwd), "dev");
      assert.equal(revParse(cwd, "HEAD"), sha);
    });
  });

  test("BLOCKED when the working tree is dirty and checkout cannot switch", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "001-feature"));
      writeFile(cwd, "README.md", "task version\n");
      git(cwd, ["add", "README.md"]);
      git(cwd, ["commit", "-m", "task edit"]);
      writeFile(cwd, "README.md", "dirty on task\n");
      assertBlocked(
        runScript("return-to-base", [], { cwd }),
        /could not check out dev/
      );
      assert.equal(currentBranch(cwd), "001-feature");
      assert.equal(
        fs.readFileSync(path.join(cwd, "README.md"), "utf8"),
        "dirty on task\n"
      );
    });
  });
});
