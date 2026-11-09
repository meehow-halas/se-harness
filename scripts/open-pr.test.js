"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const {
  argvLogArgv,
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
      assertUnchanged(result, {
        branch: "001-feature",
        head: "001-feature",
        url: "https://example.com/pr/9",
      });
      const log = argvLogArgv(logFile);
      assert.ok(log.some((args) => args[0] === "pr" && args[1] === "view" && args[2] === "001-feature"));
      assert.equal(
        log.some((args) => args[0] === "pr" && args[1] === "create"),
        false
      );
      assert.equal(
        log.some((args) => args[0] === "pr" && args[1] === "merge"),
        false
      );
    });
  });

  test("creates a PR with --fill when title and body are omitted", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd, { baseBranch: "trunk" });
      assertOk(startTask(cwd, "ABC-12"));
      const { env, logFile } = withGh(cwd);
      const result = runScript("open-pr", ["ABC-12"], { cwd, env });
      assertOk(result, {
        branch: "ABC-12",
        base: "trunk",
        head: "ABC-12",
        url: "https://example.com/pr/1",
      });
      const log = argvLogArgv(logFile);
      assert.ok(
        log.some((args) =>
          args[0] === "pr" &&
          args[1] === "create" &&
          args.includes("--base") &&
          args[args.indexOf("--base") + 1] === "trunk" &&
          args.includes("--head") &&
          args[args.indexOf("--head") + 1] === "ABC-12" &&
          args.includes("--fill")
        )
      );
      assert.equal(
        log.some((args) => args[0] === "pr" && args[1] === "create" && (args.includes("--title") || args.includes("--body"))),
        false
      );
      assert.equal(
        log.some((args) => args[0] === "pr" && args[1] === "merge"),
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
      const log = argvLogArgv(logFile);
      assert.ok(
        log.some((args) =>
          args[0] === "pr" &&
          args[1] === "create" &&
          args.includes("--base") &&
          args[args.indexOf("--base") + 1] === "dev" &&
          args.includes("--head") &&
          args[args.indexOf("--head") + 1] === "001-feature" &&
          args.includes("--title") &&
          args[args.indexOf("--title") + 1] === "T" &&
          args.includes("--body") &&
          args[args.indexOf("--body") + 1] === "B"
        )
      );
      assert.equal(
        log.some((args) => args[0] === "pr" && args[1] === "create" && args.includes("--fill")),
        false
      );
    });
  });

  test("keeps --title and --body as single arguments when they contain spaces", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "001-feature"));
      const { env, logFile } = withGh(cwd);
      const result = runScript(
        "open-pr",
        ["001-feature", "--title", "Hello world", "--body", "Line two"],
        { cwd, env }
      );
      assertOk(result);
      const log = argvLogArgv(logFile);
      const create = log.find((args) => args[0] === "pr" && args[1] === "create");
      assert.ok(create);
      assert.equal(create[create.indexOf("--title") + 1], "Hello world");
      assert.equal(create[create.indexOf("--body") + 1], "Line two");
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

  test("BLOCKED when the task branch does not exist", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd, { baseBranch: "trunk" });
      const { env } = withGh(cwd);
      assertBlocked(
        runScript("open-pr", ["ABC-12"], { cwd, env }),
        /task branch ABC-12 does not exist/
      );
    });
  });

  test("BLOCKED when --title has no value", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "001-feature"));
      const { env } = withGh(cwd);
      assertBlocked(
        runScript("open-pr", ["001-feature", "--title"], { cwd, env }),
        /missing value for --title/
      );
    });
  });

  test("passes --title without --fill when body is omitted", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd, { baseBranch: "trunk" });
      assertOk(startTask(cwd, "ABC-12"));
      const { env, logFile } = withGh(cwd);
      assertOk(
        runScript("open-pr", ["ABC-12", "--title", "Only title"], { cwd, env }),
        { base: "trunk", head: "ABC-12" }
      );
      const create = argvLogArgv(logFile).find(
        (args) => args[0] === "pr" && args[1] === "create"
      );
      assert.ok(create);
      assert.equal(create[create.indexOf("--title") + 1], "Only title");
      assert.equal(create.includes("--fill"), false);
    });
  });

  test("BLOCKED when gh pr create fails", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "001-feature"));
      const { env } = withGh(cwd, { createFails: true });
      assertBlocked(
        runScript("open-pr", ["001-feature"], { cwd, env }),
        /pull request failed/
      );
    });
  });
});
