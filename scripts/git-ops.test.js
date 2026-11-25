"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  addBareOrigin,
  argvLogArgv,
  assertBlocked,
  assertOk,
  assertUnchanged,
  git,
  initGitRepo,
  revParse,
  runScript,
  startWorktree,
  withTempDir,
  writeFile,
  writeGhPrStub,
  writeGhStub,
} = require("../test/helpers");

const TASK = "ABC-7";
const OPS = ["worktree", "commit", "push", "pr"];
const WORDS = ["--user-request", "please do it now"];

function setOps(cwd, ops, baseBranch = "trunk") {
  const agents = { baseBranch };
  if (ops !== undefined) agents.git = ops;
  fs.writeFileSync(
    path.join(cwd, "harness.config.json"),
    `${JSON.stringify({ agents }, null, 2)}\n`
  );
}

function ops(...off) {
  return Object.fromEntries(OPS.map((op) => [op, !off.includes(op)]));
}

// A repo with origin and a task worktree holding one uncommitted file.
function fixture(run) {
  withTempDir((cwd) => {
    initGitRepo(cwd, { baseBranch: "trunk" });
    writeFile(cwd, ".git/info/exclude", ".bin/\nharness.config.json\n");
    const bare = addBareOrigin(cwd);
    const wt = startWorktree(cwd, TASK);
    writeFile(wt, "work.txt", "work\n");
    run({ cwd, bare, wt });
  });
}

function commitWork(wt) {
  git(wt, ["add", "work.txt"]);
  git(wt, ["commit", "-m", "work"]);
}

function state(...dirs) {
  return dirs
    .map((d) => git(d, ["for-each-ref"]).stdout + git(d, ["worktree", "list"]).stdout)
    .join("---\n");
}

function gh(cwd, writer = writeGhStub, opts) {
  const bin = path.join(cwd, ".bin");
  const { logFile } = writer(bin, opts);
  return {
    env: { PATH: `${bin}${path.delimiter}${process.env.PATH}` },
    log: () => (fs.existsSync(logFile) ? argvLogArgv(logFile) : []),
  };
}

const openPr = {
  number: 7,
  state: "OPEN",
  url: "https://example.com/pr/7",
  mergeable: "MERGEABLE",
  headRefName: TASK,
  baseRefName: "trunk",
};

function assertDisabled(result, op) {
  const parsed = assertUnchanged(result);
  assert.equal(parsed.fields.git, `${op} disabled`, result.stdout);
  return parsed;
}

describe("agents.git: disabled operations", () => {
  test("start-task: worktree off creates nothing and prints the launch checkout", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd, { baseBranch: "trunk" });
      const bare = addBareOrigin(cwd);
      setOps(cwd, ops("worktree"));
      writeFile(cwd, `docs/features/${TASK}.feature.md`, "spec\n");
      const before = state(cwd, bare);
      const parsed = assertDisabled(runScript("start-task", [TASK], { cwd }), "worktree");
      assert.equal(fs.realpathSync(parsed.fields.worktree), fs.realpathSync(cwd));
      assert.equal(state(cwd, bare), before);
      assert.equal(fs.existsSync(path.join(cwd, ".git", "seh-worktrees")), false);
      assert.equal(fs.existsSync(path.join(cwd, `docs/features/${TASK}.feature.md`)), true);
    });
  });

  test("commit-task: commit off leaves refs, index and file alone", () => {
    fixture(({ cwd, bare, wt }) => {
      setOps(cwd, ops("commit"));
      const before = state(cwd, bare);
      assertDisabled(runScript("commit-task", [TASK, "work.txt"], { cwd: wt }), "commit");
      assert.equal(state(cwd, bare), before);
      assert.match(git(wt, ["status", "--porcelain"]).stdout, /^\?\? work\.txt$/m);
    });
  });

  test("push-task: push off leaves the remote alone", () => {
    fixture(({ cwd, bare, wt }) => {
      commitWork(wt);
      setOps(cwd, ops("push"));
      const before = state(cwd, bare);
      assertDisabled(runScript("push-task", [TASK], { cwd: wt }), "push");
      assert.equal(state(cwd, bare), before);
    });
  });

  test("open-pr: pr off makes no gh call", () => {
    fixture(({ cwd, wt }) => {
      setOps(cwd, ops("pr"));
      const stub = gh(cwd);
      assertDisabled(runScript("open-pr", [TASK], { cwd: wt, env: stub.env }), "pr");
      assert.deepEqual(stub.log(), []);
    });
  });

  for (const off of OPS) {
    test(`merge-pr: ${off} off keeps pr disabled, no gh call`, () => {
      fixture(({ cwd, wt }) => {
        setOps(cwd, ops(off));
        const stub = gh(cwd, writeGhPrStub, { prs: [openPr] });
        assertDisabled(runScript("merge-pr", [TASK], { cwd: wt, env: stub.env }), "pr");
        assert.deepEqual(stub.log(), []);
      });
    });
  }

  test("chain: commit off disables push even with push true", () => {
    fixture(({ cwd, bare, wt }) => {
      commitWork(wt);
      setOps(cwd, { worktree: true, commit: false, push: true, pr: true });
      const before = state(cwd, bare);
      assertDisabled(runScript("push-task", [TASK], { cwd: wt }), "push");
      assert.equal(state(cwd, bare), before);
    });
  });

  test("a key missing from agents.git counts as off", () => {
    fixture(({ cwd, bare, wt }) => {
      commitWork(wt);
      setOps(cwd, { worktree: true, commit: true });
      const before = state(cwd, bare);
      assertDisabled(runScript("push-task", [TASK], { cwd: wt }), "push");
      assert.equal(state(cwd, bare), before);
    });
  });

  test("commit on with push off: commit is created, nothing pushed", () => {
    fixture(({ cwd, bare, wt }) => {
      setOps(cwd, ops("push", "pr"));
      const head = revParse(wt, "HEAD");
      const remote = state(bare);
      assertOk(runScript("commit-task", [TASK, "work.txt"], { cwd: wt }));
      assert.notEqual(revParse(wt, "HEAD"), head);
      assertDisabled(runScript("push-task", [TASK], { cwd: wt }), "push");
      assert.equal(state(bare), remote);
    });
  });

  test("push on with pr off: branch is pushed", () => {
    fixture(({ cwd, bare, wt }) => {
      commitWork(wt);
      setOps(cwd, ops("pr"));
      assertOk(runScript("push-task", [TASK], { cwd: wt }));
      assert.equal(revParse(bare, `refs/heads/${TASK}`), revParse(wt, "HEAD"));
    });
  });

  test("git disabled wins over agents.git", () => {
    fixture(({ cwd, wt }) => {
      setOps(cwd, ops("commit"), "");
      const parsed = assertUnchanged(runScript("commit-task", [TASK, "work.txt"], { cwd: wt }));
      assert.equal(parsed.fields.git, "disabled");
    });
  });
});

describe("agents.git: --user-request", () => {
  test("start-task creates the worktree although worktree is off", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd, { baseBranch: "trunk" });
      setOps(cwd, ops(...OPS));
      const parsed = assertOk(runScript("start-task", [TASK, ...WORDS], { cwd }));
      assert.equal(revParse(cwd, `refs/heads/${TASK}`), revParse(cwd, "trunk"));
      assert.equal(
        git(parsed.fields.worktree, ["branch", "--show-current"]).stdout.trim(),
        TASK
      );
    });
  });

  test("commit-task commits although the whole chain is off", () => {
    fixture(({ cwd, bare, wt }) => {
      setOps(cwd, ops(...OPS));
      const head = revParse(wt, "HEAD");
      const remote = state(bare);
      assertOk(runScript("commit-task", [TASK, ...WORDS, "work.txt"], { cwd: wt }));
      assert.equal(revParse(wt, "HEAD~1"), head);
      assert.equal(git(wt, ["status", "--porcelain", "--", "work.txt"]).stdout, "");
      assert.equal(state(bare), remote);
    });
  });

  test("commit-task with the flag still refuses the base checkout", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd, { baseBranch: "trunk" });
      setOps(cwd, ops(...OPS));
      writeFile(cwd, "work.txt", "work\n");
      const head = revParse(cwd, "trunk");
      assertBlocked(
        runScript("commit-task", [TASK, ...WORDS, "work.txt"], { cwd }),
        /not task branch/
      );
      assert.equal(revParse(cwd, "trunk"), head);
    });
  });

  test("push-task pushes although commit and push are off", () => {
    fixture(({ cwd, bare, wt }) => {
      commitWork(wt);
      setOps(cwd, ops("commit", "push", "pr"));
      assertOk(runScript("push-task", [...WORDS, TASK], { cwd: wt }));
      assert.equal(revParse(bare, `refs/heads/${TASK}`), revParse(wt, "HEAD"));
    });
  });

  test("open-pr creates the PR although the whole chain is off", () => {
    fixture(({ cwd, wt }) => {
      setOps(cwd, ops(...OPS));
      const stub = gh(cwd);
      assertOk(
        runScript("open-pr", [TASK, "--title", "T", ...WORDS], { cwd: wt, env: stub.env })
      );
      assert.deepEqual(
        stub.log().find((a) => a[1] === "create"),
        ["pr", "create", "--base", "trunk", "--head", TASK, "--title", "T"]
      );
    });
  });

  for (const [name, extra] of [
    ["start-task", []],
    ["commit-task", ["work.txt"]],
    ["push-task", []],
    ["open-pr", []],
  ]) {
    for (const [label, tail] of [
      ["empty", ["--user-request", ""]],
      ["blank", ["--user-request", "  "]],
      ["missing", ["--user-request"]],
    ]) {
      test(`${name}: ${label} words are BLOCKED and change nothing`, () => {
        fixture(({ cwd, bare, wt }) => {
          setOps(cwd, ops(...OPS));
          const stub = gh(cwd);
          const before = state(cwd, bare);
          const result = runScript(name, [TASK, ...extra, ...tail], { cwd: wt, env: stub.env });
          assertBlocked(result, /empty --user-request/);
          assert.equal(state(cwd, bare), before);
          assert.deepEqual(stub.log(), []);
        });
      });
    }

    test(`${name}: the flag does not override git disabled`, () => {
      fixture(({ cwd, bare, wt }) => {
        setOps(cwd, ops(), "");
        const stub = gh(cwd);
        const before = state(cwd, bare);
        const result = runScript(name, [TASK, ...extra, ...WORDS], { cwd: wt, env: stub.env });
        const parsed = assertUnchanged(result);
        assert.equal(parsed.fields.git, "disabled");
        assert.equal(state(cwd, bare), before);
        assert.deepEqual(stub.log(), []);
      });
    });
  }

  test("merge-pr takes no flag: pr off, nothing is merged", () => {
    fixture(({ cwd, wt }) => {
      setOps(cwd, ops("pr"));
      const stub = gh(cwd, writeGhPrStub, { prs: [openPr] });
      assertBlocked(
        runScript("merge-pr", [TASK, ...WORDS], { cwd: wt, env: stub.env }),
        /expected exactly one task argument/
      );
      assert.deepEqual(stub.log(), []);
    });
  });
});

describe("return-to-base with agents.git", () => {
  for (const off of ["commit", "worktree"]) {
    test(`${off} off keeps a dirty worktree`, () => {
      fixture(({ cwd, wt }) => {
        setOps(cwd, ops(off));
        const result = runScript("return-to-base", [], { cwd: wt });
        const parsed = assertUnchanged(result, { branch: TASK });
        assert.equal(fs.realpathSync(parsed.fields.worktree), fs.realpathSync(wt));
        assert.equal(fs.readFileSync(path.join(wt, "work.txt"), "utf8"), "work\n");
        assert.equal(fs.existsSync(path.join(wt, "harness.config.json")), true);
      });
    });
  }

  test("commit off removes a worktree holding only the launch symlinks", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd, { baseBranch: "trunk" });
      writeFile(cwd, ".seh/VERSION", "x\n");
      setOps(cwd, ops("commit"));
      const wt = startWorktree(cwd, TASK);
      assertOk(runScript("return-to-base", [], { cwd: wt }), { worktree: "removed" });
      assert.equal(fs.existsSync(wt), false);
    });
  });

  test("commit on: a dirty worktree is still BLOCKED, also with push off", () => {
    fixture(({ cwd, wt }) => {
      setOps(cwd, ops("push"));
      assertBlocked(
        runScript("return-to-base", [], { cwd: wt }),
        /could not remove worktree/
      );
      assert.equal(fs.existsSync(path.join(wt, "work.txt")), true);
    });
  });
});

describe("fanout-plan with agents.git", () => {
  function plan(config) {
    let out;
    withTempDir((cwd) => {
      setOps(cwd, config);
      out = runScript("fanout-plan", ["--skill", "doit", "--keys", "QA-1,QB-2", "--max", "3"], {
        cwd,
      }).stdout;
    });
    return out;
  }

  test("worktree off plans sequentially, max 1", () => {
    assert.match(plan(ops("worktree")), /^mode: sequential\nmax: 1\nready: QA-1$/m);
  });

  test("a later operation off stays parallel", () => {
    assert.match(plan(ops("commit")), /^mode: parallel\nmax: 3\nready: QA-1,QB-2$/m);
  });

  test("no agents.git stays parallel", () => {
    assert.match(plan(undefined), /^mode: parallel$/m);
  });
});
