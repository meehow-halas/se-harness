"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const {
  argvLogLines,
  assertBlocked,
  assertOk,
  assertUnchanged,
  initGitRepo,
  pathHidingCommand,
  runScript,
  startTask,
  withTempDir,
  writeGhStub,
} = require("../test/helpers");

function withGh(cwd, stubOpts) {
  const bin = path.join(cwd, ".bin");
  const { logFile } = writeGhStub(bin, stubOpts);
  return {
    logFile,
    env: { PATH: `${bin}${path.delimiter}${process.env.PATH}` },
  };
}

describe("open-pr", () => {
  test("BLOCKED when gh is not on PATH", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "001-feature"));
      const result = runScript("open-pr", ["001-feature"], {
        cwd,
        env: { PATH: pathHidingCommand(cwd, "gh") },
      });
      assertBlocked(result, /gh is not available/);
    });
  });

  test("UNCHANGED when a PR already exists", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "001-feature"));
      const { env, logFile } = withGh(cwd, {
        existingUrl: "https://example.com/pr/9",
      });
      const result = runScript("open-pr", ["001-feature"], { cwd, env });
      assertUnchanged(result);
      assert.match(result.stdout, /url: https:\/\/example.com\/pr\/9/);
      const log = argvLogLines(logFile);
      assert.ok(log.some((line) => line.startsWith("pr view 001-feature")));
      assert.equal(
        log.some((line) => line.startsWith("pr create")),
        false
      );
      assert.equal(
        log.some((line) => /\bpr merge\b/.test(line)),
        false
      );
    });
  });

  test("creates a PR with --fill when title and body are omitted", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "001-feature"));
      const { env, logFile } = withGh(cwd);
      const result = runScript("open-pr", ["001-feature"], { cwd, env });
      assertOk(result);
      assert.match(result.stdout, /url: https:\/\/example.com\/pr\/1/);
      const log = argvLogLines(logFile);
      assert.ok(log.includes("pr create --base dev --head 001-feature --fill"));
      assert.equal(
        log.some((line) => line.startsWith("pr create") && /\b--title\b|\b--body\b/.test(line)),
        false
      );
      assert.equal(
        log.some((line) => /\bpr merge\b/.test(line)),
        false
      );
    });
  });

  test("passes --title and --body when provided and does not add --fill", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "001-feature"));
      const { env, logFile } = withGh(cwd);
      const result = runScript("open-pr", [
        "001-feature",
        "--title",
        "T",
        "--body",
        "B",
      ], { cwd, env });
      assertOk(result);
      const log = argvLogLines(logFile);
      assert.ok(log.includes("pr create --base dev --head 001-feature --title T --body B"));
      assert.equal(
        log.some((line) => line.startsWith("pr create") && /\b--fill\b/.test(line)),
        false
      );
    });
  });

  test("BLOCKED when extra arguments are passed", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "001-feature"));
      const { env } = withGh(cwd);
      assertBlocked(
        runScript("open-pr", ["001-feature", "extra"], { cwd, env }),
        /unexpected arguments/
      );
    });
  });
});
