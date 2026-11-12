"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  git,
  initGitRepo,
  runScript,
  scriptOutputLines,
  withTempDir,
  writeHarnessConfig,
} = require("../test/helpers");

const SCRIPTS = [
  ["start-task", ["001-feature"]],
  ["commit-task", ["001-feature", "README.md"]],
  ["push-task", ["001-feature"]],
  ["open-pr", ["001-feature"]],
  ["update-from-base", ["001-feature"]],
  ["return-to-base", []],
];

// Every value that must mean "git disabled".
const DISABLED_VALUES = [
  ["empty string", ""],
  ["whitespace", "   "],
  ["null", null],
];

function refs(cwd) {
  return git(cwd, ["for-each-ref"]).stdout + git(cwd, ["worktree", "list"]).stdout;
}

describe("git disabled (empty agents.baseBranch)", () => {
  for (const [label, value] of DISABLED_VALUES) {
    for (const [name, args] of SCRIPTS) {
      test(`${name}: ${label} in a git repo is UNCHANGED and touches nothing`, () => {
        withTempDir((cwd) => {
          initGitRepo(cwd, { baseBranch: "trunk", config: false });
          writeHarnessConfig(cwd, value);
          fs.writeFileSync(path.join(cwd, "dirty.txt"), "x\n");
          const before = refs(cwd);
          const result = runScript(name, args, { cwd });
          assert.equal(result.status, 0, result.stdout + result.stderr);
          const lines = scriptOutputLines(result);
          assert.equal(result.stdout.split("\n")[0], "UNCHANGED");
          assert.ok(result.stdout.includes("git: disabled"), result.stdout);
          assert.equal(refs(cwd), before);
          assert.equal(fs.existsSync(path.join(cwd, "dirty.txt")), true);
          assert.equal(git(cwd, ["branch", "--show-current"]).stdout.trim(), "trunk");
          assert.ok(lines);
        });
      });

      test(`${name}: ${label} without a git repo is UNCHANGED`, () => {
        withTempDir((cwd) => {
          writeHarnessConfig(cwd, value);
          const result = runScript(name, args, { cwd });
          assert.equal(result.status, 0, result.stdout + result.stderr);
          assert.equal(result.stdout.split("\n")[0], "UNCHANGED");
          assert.ok(result.stdout.includes("git: disabled"), result.stdout);
          assert.equal(fs.existsSync(path.join(cwd, ".git")), false);
        });
      });
    }
  }

  test("start-task prints the launch checkout as worktree", () => {
    withTempDir((cwd) => {
      writeHarnessConfig(cwd, "");
      const result = runScript("start-task", ["001-feature"], { cwd });
      const real = fs.realpathSync(cwd);
      const m = result.stdout.match(/^worktree: (.*)$/m);
      assert.ok(m, result.stdout);
      assert.equal(fs.realpathSync(m[1]), real);
    });
  });

  test("a set baseBranch other than dev still runs the git path", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd, { baseBranch: "trunk" });
      const result = runScript("start-task", ["001-feature"], { cwd });
      assert.equal(result.status, 0, result.stdout + result.stderr);
      assert.match(result.stdout, /^OK$/m);
      assert.match(result.stdout, /base: trunk/);
    });
  });

  test("jira runs without a git repo", () => {
    withTempDir((cwd) => {
      writeHarnessConfig(cwd, "");
      const result = runScript("jira", ["transition", "PRJ-1", "todo"], { cwd });
      assert.doesNotMatch(result.stdout, /not a git repository/);
    });
  });
});

describe("fanout-plan with git disabled", () => {
  test("plans one key at a time even when --max allows more", () => {
    withTempDir((cwd) => {
      writeHarnessConfig(cwd, "");
      const result = runScript(
        "fanout-plan",
        ["--skill", "doit", "--keys", "QA-1,QB-2,QC-3", "--max", "3"],
        { cwd }
      );
      assert.equal(result.status, 0, result.stdout + result.stderr);
      assert.match(result.stdout, /^mode: sequential$/m);
      assert.match(result.stdout, /^max: 1$/m);
      assert.match(result.stdout, /^ready: QA-1$/m);
      assert.match(result.stdout, /^queued: QB-2/m);
    });
  });

  test("stays parallel when baseBranch is set", () => {
    withTempDir((cwd) => {
      writeHarnessConfig(cwd, "trunk");
      const result = runScript(
        "fanout-plan",
        ["--skill", "doit", "--keys", "QA-1,QB-2", "--max", "2"],
        { cwd }
      );
      assert.match(result.stdout, /^mode: parallel$/m);
      assert.match(result.stdout, /^ready: QA-1,QB-2$/m);
    });
  });
});
