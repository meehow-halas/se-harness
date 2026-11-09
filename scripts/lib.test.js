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
  startWorktree,
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
const TASK_SCRIPTS = ALL_SCRIPTS.filter(([name]) => name !== "return-to-base");
const ON_TASK_SCRIPTS = [
  ["commit-task", ["001-feature", "a.txt"]],
  ["update-from-base", ["001-feature"]],
];
const GIT_FLAGS = String.raw`(?:\s+-c\s+\S+|\s+-[^\s]+)`;

function gitSubcommand(name) {
  return new RegExp(String.raw`\bgit${GIT_FLAGS}*\s+${name}\b`);
}

function withTask(args, task) {
  return [task, ...args.slice(1)];
}

function runAllowlisted(cwd, name, args) {
  const { env } = envWithGh(cwd);
  return runScript(name, args, { cwd, env });
}

describe("scripts source allowlist", () => {
  test("helpers do not rebase, reset, force-push, or merge PRs", () => {
    const dir = path.join(REPO_ROOT, "scripts");
    const forcePush = new RegExp(
      String.raw`\bgit${GIT_FLAGS}*\s+push\b(?:[^\n]|\\\s*\n)*(?:--force(?:-with-lease)?|\s-f\b)`
    );
    const prMerge = /\bgh(?:\s+-[^\s]+)*\s+pr\s+merge\b/;
    for (const name of fs.readdirSync(dir)) {
      if (name.endsWith(".test.js") || !fs.statSync(path.join(dir, name)).isFile()) {
        continue;
      }
      const body = sourceWithoutComments(fs.readFileSync(path.join(dir, name), "utf8"));
      assert.equal(gitSubcommand("rebase").test(body), false, name);
      assert.equal(gitSubcommand("reset").test(body), false, name);
      assert.equal(forcePush.test(body), false, name);
      assert.equal(prMerge.test(body), false, name);
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

    test(`${name}: whitespace-only agents.baseBranch is BLOCKED`, () => {
      withTempDir((cwd) => {
        initGitRepo(cwd, { config: false });
        writeHarnessConfig(cwd, "   ");
        assertBlocked(
          runAllowlisted(cwd, name, args),
          /agents\.baseBranch is missing/
        );
      });
    });
  }

  for (const [name, args] of TASK_SCRIPTS) {
    test(`${name}: empty task name is BLOCKED`, () => {
      withTempDir((cwd) => {
        initGitRepo(cwd);
        assertBlocked(runAllowlisted(cwd, name, []), /missing task branch name/);
      });
    });

    test(`${name}: task name starting with - is BLOCKED`, () => {
      withTempDir((cwd) => {
        initGitRepo(cwd);
        assertBlocked(
          runAllowlisted(cwd, name, withTask(args, "-foo")),
          /invalid task branch name/
        );
      });
    });

    test(`${name}: task equal to base branch is BLOCKED`, () => {
      withTempDir((cwd) => {
        initGitRepo(cwd, { baseBranch: "trunk" });
        assertBlocked(
          runAllowlisted(cwd, name, withTask(args, "trunk")),
          /task branch trunk is the configured base branch/
        );
      });
    });
  }

  for (const [name, args] of ALL_SCRIPTS) {
    test(`${name}: outside a git repository is BLOCKED`, () => {
      withTempDir((cwd) => {
        writeHarnessConfig(cwd, "dev");
        assertBlocked(
          runAllowlisted(cwd, name, args),
          /this directory is not a git repository/
        );
      });
    });
  }

  for (const [name, args] of ON_TASK_SCRIPTS) {
    test(`${name}: detached HEAD is BLOCKED`, () => {
      withTempDir((cwd) => {
        initGitRepo(cwd);
        const wt = startWorktree(cwd, "001-feature");
        git(wt, ["checkout", "--detach", "HEAD"]);
        writeFile(wt, "a.txt", "x\n");
        assertBlocked(runAllowlisted(wt, name, args), /detached HEAD/);
      });
    });
  }
});
