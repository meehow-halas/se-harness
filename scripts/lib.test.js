"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  REPO_ROOT,
  assertBlocked,
  assertOk,
  envWithGh,
  git,
  initGitRepo,
  runScript,
  startTask,
  withTempDir,
  writeFile,
  writeHarnessConfig,
} = require("../test/helpers");

function sourceWithoutComments(body) {
  return body
    .split("\n")
    .map((line) => {
      if (line.startsWith("#!")) {
        return line;
      }
      const hash = line.indexOf("#");
      return hash === -1 ? line : line.slice(0, hash);
    })
    .join("\n");
}

const ALL_SCRIPTS = [
  ["start-task", ["001-feature"]],
  ["commit-task", ["001-feature", "README.md"]],
  ["push-task", ["001-feature"]],
  ["open-pr", ["001-feature"]],
  ["update-from-base", ["001-feature"]],
  ["return-to-base", []],
];

function runAllowlisted(cwd, name, args) {
  const { env } = envWithGh(cwd);
  return runScript(name, args, { cwd, env });
}

describe("scripts source allowlist", () => {
  test("helpers do not rebase, reset, force-push, or merge PRs", () => {
    const dir = path.join(REPO_ROOT, "scripts");
    for (const name of fs.readdirSync(dir)) {
      if (name.endsWith(".test.js") || !fs.statSync(path.join(dir, name)).isFile()) {
        continue;
      }
      const body = sourceWithoutComments(fs.readFileSync(path.join(dir, name), "utf8"));
      assert.equal(/\bgit\s+rebase\b/.test(body), false, name);
      assert.equal(/\bgit\s+reset\b/.test(body), false, name);
      assert.equal(
        /\bgit\s+push\b[^\n]*(?:--force(?:-with-lease)?|\s-f\b)/.test(body),
        false,
        name
      );
      assert.equal(/\bgh\s+pr\s+merge\b/.test(body), false, name);
    }
  });
});

describe("shared refusals", () => {
  for (const [name, args] of ALL_SCRIPTS) {
    test(`${name}: missing harness.config.json is BLOCKED`, () => {
      withTempDir((cwd) => {
        initGitRepo(cwd, { config: false });
        assertBlocked(
          runAllowlisted(cwd, name, args),
          /harness\.config\.json is missing/
        );
      });
    });

    test(`${name}: missing agents.baseBranch is BLOCKED`, () => {
      withTempDir((cwd) => {
        initGitRepo(cwd, { config: false });
        fs.writeFileSync(path.join(cwd, "harness.config.json"), "{}\n");
        assertBlocked(
          runAllowlisted(cwd, name, args),
          /agents\.baseBranch is missing/
        );
      });
    });
  }

  test("empty task name is BLOCKED", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertBlocked(runScript("start-task", [], { cwd }), /missing task branch name/);
      assertBlocked(runScript("push-task", [], { cwd }), /missing task branch name/);
      assertBlocked(
        runScript("update-from-base", [], { cwd }),
        /missing task branch name/
      );
    });
  });

  test("task name starting with - is BLOCKED", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertBlocked(startTask(cwd, "-foo"), /invalid task branch name/);
    });
  });

  test("task equal to base branch is BLOCKED", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd, { baseBranch: "dev" });
      assertBlocked(
        startTask(cwd, "dev"),
        /task branch dev is the configured base branch/
      );
      assertBlocked(
        runScript("push-task", ["dev"], { cwd }),
        /task branch dev is the configured base branch/
      );
    });
  });

  test("outside a git repository is BLOCKED", () => {
    withTempDir((cwd) => {
      writeHarnessConfig(cwd, "dev");
      assertBlocked(
        startTask(cwd, "001-feature"),
        /this directory is not a git repository/
      );
    });
  });

  test("detached HEAD is BLOCKED for require_on_task", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "001-feature"));
      git(cwd, ["checkout", "--detach", "HEAD"]);
      writeFile(cwd, "a.txt", "x\n");
      assertBlocked(
        runScript("commit-task", ["001-feature", "a.txt"], { cwd }),
        /detached HEAD/
      );
    });
  });
});
