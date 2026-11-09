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
  currentBranch,
  git,
  initGitRepo,
  revParse,
  runScript,
  startTask,
  startWorktree,
  withTempDir,
  writeFile,
  writeGitLogger,
  writeHarnessConfig,
} = require("../test/helpers");

describe("start-task", () => {
  test("rejects extra arguments", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertBlocked(
        runScript("start-task", ["001-feature", "extra"], { cwd }),
        /unexpected arguments/
      );
      assert.equal(currentBranch(cwd), "dev");
      assert.equal(
        git(cwd, ["show-ref", "--heads"]).stdout.includes("refs/heads/001-feature"),
        false
      );
    });
  });

  test("creates a worktree from the configured base, not from HEAD, and leaves the caller", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd, { baseBranch: "trunk" });
      git(cwd, ["checkout", "-b", "other"]);
      writeFile(cwd, "other.txt", "from other\n");
      git(cwd, ["add", "other.txt"]);
      git(cwd, ["commit", "-m", "other work"]);
      const baseSha = revParse(cwd, "trunk");
      const otherSha = revParse(cwd, "HEAD");
      const result = startTask(cwd, "ABC-12");
      const { fields } = assertOk(result, {
        branch: "ABC-12",
        base: "trunk",
        created: "yes",
      });
      assert.equal(currentBranch(cwd), "other");
      assert.equal(revParse(cwd, "HEAD"), otherSha);
      assert.equal(fs.existsSync(path.join(cwd, "other.txt")), true);
      const wt = fields.worktree;
      assert.equal(
        fs.realpathSync(wt),
        fs.realpathSync(path.join(cwd, ".git", "dhs-worktrees", "ABC-12"))
      );
      assert.equal(currentBranch(wt), "ABC-12");
      assert.equal(revParse(wt, "HEAD"), baseSha);
      assert.equal(fs.existsSync(path.join(wt, "other.txt")), false);
    });
  });

  test("UNCHANGED when the worktree already exists; caller stays put", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      const first = assertOk(startTask(cwd, "001-feature"));
      const wt = first.fields.worktree;
      const sha = revParse(wt, "HEAD");
      const result = startTask(cwd, "001-feature");
      assertUnchanged(result, {
        branch: "001-feature",
        base: "dev",
        created: "no",
        worktree: wt,
      });
      assert.equal(currentBranch(cwd), "dev");
      assert.equal(revParse(wt, "HEAD"), sha);
    });
  });

  test("UNCHANGED when already inside the task worktree", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      const wt = startWorktree(cwd, "001-feature");
      const result = startTask(wt, "001-feature");
      assertUnchanged(result, {
        branch: "001-feature",
        created: "no",
        worktree: wt,
      });
      assert.equal(currentBranch(wt), "001-feature");
    });
  });

  test("attaches an existing local branch without creating", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      const wt = startWorktree(cwd, "001-feature");
      writeFile(wt, "task.txt", "kept\n");
      git(wt, ["add", "task.txt"]);
      git(wt, ["commit", "-m", "task work"]);
      const taskSha = revParse(wt, "HEAD");
      assertOk(runScript("return-to-base", [], { cwd: wt }));
      assert.equal(fs.existsSync(wt), false);
      const result = startTask(cwd, "001-feature");
      const { fields } = assertOk(result, { branch: "001-feature", created: "no" });
      assert.equal(currentBranch(cwd), "dev");
      assert.equal(revParse(fields.worktree, "HEAD"), taskSha);
      assert.equal(fs.existsSync(path.join(fields.worktree, "task.txt")), true);
    });
  });

  test("creates a local branch from origin/task when only the remote exists", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      const wt = startWorktree(cwd, "001-feature");
      writeFile(wt, "task.txt", "on task\n");
      git(wt, ["add", "task.txt"]);
      git(wt, ["commit", "-m", "task work"]);
      addBareOrigin(cwd);
      git(wt, ["push", "-u", "origin", "001-feature"]);
      assertOk(runScript("return-to-base", [], { cwd: wt }));
      git(cwd, ["branch", "-D", "001-feature"]);
      const bin = path.join(cwd, ".bin");
      const { logFile } = writeGitLogger(bin);
      const result = runScript("start-task", ["001-feature"], {
        cwd,
        env: { PATH: `${bin}${path.delimiter}${process.env.PATH}` },
      });
      const { fields } = assertOk(result, { branch: "001-feature", created: "no" });
      assert.equal(currentBranch(cwd), "dev");
      assert.equal(fs.existsSync(path.join(fields.worktree, "task.txt")), true);
      assert.equal(
        argvLogArgv(logFile).some((args) => args[0] === "push"),
        false
      );
    });
  });

  test("does not block when the primary working tree is dirty", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      writeFile(cwd, "README.md", "dirty on base\n");
      const { fields } = assertOk(startTask(cwd, "001-feature"), {
        branch: "001-feature",
        created: "yes",
      });
      assert.equal(currentBranch(cwd), "dev");
      assert.equal(fs.readFileSync(path.join(cwd, "README.md"), "utf8"), "dirty on base\n");
      assert.equal(
        fs.readFileSync(path.join(fields.worktree, "README.md"), "utf8"),
        "fixture\n"
      );
    });
  });

  test("two tasks get two worktrees; primary stays on base", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      const a = startWorktree(cwd, "task-a");
      const b = startWorktree(cwd, "task-b");
      assert.equal(currentBranch(cwd), "dev");
      assert.equal(currentBranch(a), "task-a");
      assert.equal(currentBranch(b), "task-b");
      assert.notEqual(a, b);
    });
  });

  test("copies file-tracker files from the launch tree into the worktree", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      writeFile(cwd, "docs/features/001-feature.feature.md", "spec\n");
      writeFile(cwd, "docs/prompt/001-feature.prompt.md", "prompt\n");
      writeFile(cwd, "docs/feature-log/001-feature.log.md", "log\n");
      const wt = startWorktree(cwd, "001-feature");
      assert.equal(
        fs.readFileSync(path.join(wt, "docs/features/001-feature.feature.md"), "utf8"),
        "spec\n"
      );
      assert.equal(
        fs.readFileSync(path.join(wt, "docs/prompt/001-feature.prompt.md"), "utf8"),
        "prompt\n"
      );
      assert.equal(
        fs.readFileSync(path.join(wt, "docs/feature-log/001-feature.log.md"), "utf8"),
        "log\n"
      );
    });
  });

  test("symlinks .dhs when it is missing from the worktree", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      fs.mkdirSync(path.join(cwd, ".dhs", "scripts"), { recursive: true });
      fs.writeFileSync(path.join(cwd, ".dhs", "scripts", "start-task"), "#!/bin/sh\n");
      const wt = startWorktree(cwd, "001-feature");
      assert.equal(fs.lstatSync(path.join(wt, ".dhs")).isSymbolicLink(), true);
      assert.equal(
        fs.realpathSync(path.join(wt, ".dhs")),
        fs.realpathSync(path.join(cwd, ".dhs"))
      );
    });
  });

  test("BLOCKED when the configured base branch is not local", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd, { baseBranch: "main" });
      writeHarnessConfig(cwd, "dev");
      assertBlocked(
        startTask(cwd, "001-feature"),
        /base branch dev does not exist locally/
      );
    });
  });
});
