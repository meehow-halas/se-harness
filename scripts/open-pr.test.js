"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  assertBlocked,
  assertOk,
  assertUnchanged,
  initGitRepo,
  pathWithoutCommand,
  runScript,
  startTask,
  withTempDir,
  writeGhStub,
} = require("../test/helpers");

describe("open-pr", () => {
  test("BLOCKED when gh is not on PATH", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "001-feature"));
      const result = runScript("open-pr", ["001-feature"], {
        cwd,
        env: { PATH: pathWithoutCommand("gh") },
      });
      assertBlocked(result);
    });
  });

  test("UNCHANGED when a PR already exists", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "001-feature"));
      const bin = path.join(cwd, ".bin");
      const { logFile } = writeGhStub(bin, {
        existingUrl: "https://example.com/pr/9",
      });
      const result = runScript("open-pr", ["001-feature"], {
        cwd,
        env: { PATH: `${bin}${path.delimiter}${process.env.PATH}` },
      });
      assertUnchanged(result);
      assert.match(result.stdout, /url: https:\/\/example.com\/pr\/9/);
      const log = fs.readFileSync(logFile, "utf8");
      assert.equal(log.includes("pr merge"), false);
    });
  });

  test("creates a PR with --fill when title and body are omitted", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "001-feature"));
      const bin = path.join(cwd, ".bin");
      const { logFile } = writeGhStub(bin);
      const result = runScript("open-pr", ["001-feature"], {
        cwd,
        env: { PATH: `${bin}${path.delimiter}${process.env.PATH}` },
      });
      assertOk(result);
      assert.match(result.stdout, /url: https:\/\/example.com\/pr\/1/);
      const log = fs.readFileSync(logFile, "utf8");
      assert.match(log, /pr create --base dev --head 001-feature --fill/);
      assert.equal(log.includes("pr merge"), false);
    });
  });

  test("passes --title and --body when provided", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "001-feature"));
      const bin = path.join(cwd, ".bin");
      const { logFile } = writeGhStub(bin);
      const result = runScript("open-pr", [
        "001-feature",
        "--title",
        "T",
        "--body",
        "B",
      ], {
        cwd,
        env: { PATH: `${bin}${path.delimiter}${process.env.PATH}` },
      });
      assertOk(result);
      const log = fs.readFileSync(logFile, "utf8");
      assert.match(log, /pr create --base dev --head 001-feature --title T --body B/);
    });
  });
});
