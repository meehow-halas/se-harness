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
  cloneFrom,
  currentBranch,
  git,
  initGitRepo,
  revParse,
  runScript,
  startTask,
  startWorktree,
  writeGhStub,
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

  test("cuts a new task branch from origin/base, not from a stale local base", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      const bare = addBareOrigin(cwd);
      const other = cloneFrom(bare, path.join(cwd, "..", `${path.basename(cwd)}-peer`));
      writeFile(other, "merged-elsewhere.txt", "from origin\n");
      git(other, ["add", "merged-elsewhere.txt"]);
      git(other, ["commit", "-m", "merged elsewhere"]);
      git(other, ["push", "origin", "dev"]);
      assert.equal(fs.existsSync(path.join(cwd, "merged-elsewhere.txt")), false);
      const result = runScript("start-task", ["001-feature"], { cwd });
      const { fields } = assertOk(result, { branch: "001-feature", created: "yes" });
      assert.equal(
        fs.existsSync(path.join(fields.worktree, "merged-elsewhere.txt")),
        true,
        "new task branch must include commits that are on origin/dev"
      );
    });
  });

  test("starts <task>-2 when the old task branch has a merged PR, so no commits join the old PR", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "001-feature"));
      const wt = path.join(cwd, ".git", "dhs-worktrees", "001-feature");
      writeFile(wt, "old.txt", "old work\n");
      git(wt, ["add", "old.txt"]);
      git(wt, ["commit", "-m", "old work"]);
      const oldSha = revParse(wt, "HEAD");
      assertOk(runScript("return-to-base", [], { cwd: wt }));
      const bin = path.join(cwd, ".bin");
      writeGhStub(bin, { prStates: "MERGED" });
      const env = { PATH: `${bin}${path.delimiter}${process.env.PATH}` };
      const result = runScript("start-task", ["001-feature"], { cwd, env });
      const { fields } = assertOk(result, { branch: "001-feature-2", created: "yes" });
      assert.equal(fs.existsSync(path.join(fields.worktree, "old.txt")), false, "new branch starts from base, not the old task branch");
      assert.equal(currentBranch(fields.worktree), "001-feature-2");
      assert.equal(revParse(cwd, "001-feature"), oldSha, "the old task branch is not moved");
    });
  });

  test("keeps reusing the task branch when its PR is still open", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      assertOk(startTask(cwd, "001-feature"));
      const wt = path.join(cwd, ".git", "dhs-worktrees", "001-feature");
      assertOk(runScript("return-to-base", [], { cwd: wt }));
      const bin = path.join(cwd, ".bin");
      writeGhStub(bin, { prStates: "OPEN CLOSED" });
      const env = { PATH: `${bin}${path.delimiter}${process.env.PATH}` };
      assertOk(runScript("start-task", ["001-feature"], { cwd, env }), { branch: "001-feature", created: "no" });
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

  test("copies untracked file-tracker files into the worktree and removes them from launch", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      const task = "042-login";
      writeFile(cwd, `docs/features/${task}.feature.md`, "alpha-spec\n");
      writeFile(cwd, `docs/prompt/${task}.prompt.md`, "alpha-prompt\n");
      writeFile(cwd, `docs/feature-log/${task}.log.md`, "alpha-log\n");
      writeFile(cwd, "notes-unrelated.txt", "keep-me\n");
      const wt = startWorktree(cwd, task);
      assert.equal(
        fs.readFileSync(path.join(wt, `docs/features/${task}.feature.md`), "utf8"),
        "alpha-spec\n"
      );
      assert.equal(
        fs.readFileSync(path.join(wt, `docs/prompt/${task}.prompt.md`), "utf8"),
        "alpha-prompt\n"
      );
      assert.equal(
        fs.readFileSync(path.join(wt, `docs/feature-log/${task}.log.md`), "utf8"),
        "alpha-log\n"
      );
      assert.equal(fs.existsSync(path.join(cwd, `docs/features/${task}.feature.md`)), false);
      assert.equal(fs.existsSync(path.join(cwd, `docs/prompt/${task}.prompt.md`)), false);
      assert.equal(fs.existsSync(path.join(cwd, `docs/feature-log/${task}.log.md`)), false);
      assert.equal(fs.readFileSync(path.join(cwd, "notes-unrelated.txt"), "utf8"), "keep-me\n");
      assert.equal(currentBranch(cwd), "dev");
    });
  });

  test("restores tracked dirty file-tracker files on launch after copying into the worktree", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      const task = "007-checkout";
      writeFile(cwd, `docs/features/${task}.feature.md`, "head-spec\n");
      writeFile(cwd, `docs/prompt/${task}.prompt.md`, "head-prompt\n");
      writeFile(cwd, `docs/feature-log/${task}.log.md`, "head-log\n");
      git(cwd, ["add", `docs/features/${task}.feature.md`, `docs/prompt/${task}.prompt.md`, `docs/feature-log/${task}.log.md`]);
      git(cwd, ["commit", "-m", "tracker on base"]);
      writeFile(cwd, `docs/features/${task}.feature.md`, "dirty-spec\n");
      writeFile(cwd, `docs/prompt/${task}.prompt.md`, "dirty-prompt\n");
      writeFile(cwd, `docs/feature-log/${task}.log.md`, "dirty-log\n");
      writeFile(cwd, "scratch.txt", "other-dirty\n");
      const wt = startWorktree(cwd, task);
      assert.equal(
        fs.readFileSync(path.join(wt, `docs/features/${task}.feature.md`), "utf8"),
        "dirty-spec\n"
      );
      assert.equal(
        fs.readFileSync(path.join(wt, `docs/prompt/${task}.prompt.md`), "utf8"),
        "dirty-prompt\n"
      );
      assert.equal(
        fs.readFileSync(path.join(wt, `docs/feature-log/${task}.log.md`), "utf8"),
        "dirty-log\n"
      );
      assert.equal(
        fs.readFileSync(path.join(cwd, `docs/features/${task}.feature.md`), "utf8"),
        "head-spec\n"
      );
      assert.equal(
        fs.readFileSync(path.join(cwd, `docs/prompt/${task}.prompt.md`), "utf8"),
        "head-prompt\n"
      );
      assert.equal(
        fs.readFileSync(path.join(cwd, `docs/feature-log/${task}.log.md`), "utf8"),
        "head-log\n"
      );
      assert.equal(fs.readFileSync(path.join(cwd, "scratch.txt"), "utf8"), "other-dirty\n");
    });
  });

  test("leaves tracked clean file-tracker files on launch", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      const task = "019-session";
      writeFile(cwd, `docs/features/${task}.feature.md`, "clean-spec\n");
      writeFile(cwd, `docs/prompt/${task}.prompt.md`, "clean-prompt\n");
      writeFile(cwd, `docs/feature-log/${task}.log.md`, "clean-log\n");
      git(cwd, ["add", `docs/features/${task}.feature.md`, `docs/prompt/${task}.prompt.md`, `docs/feature-log/${task}.log.md`]);
      git(cwd, ["commit", "-m", "tracker committed"]);
      const wt = startWorktree(cwd, task);
      assert.equal(
        fs.readFileSync(path.join(wt, `docs/features/${task}.feature.md`), "utf8"),
        "clean-spec\n"
      );
      assert.equal(
        fs.readFileSync(path.join(cwd, `docs/features/${task}.feature.md`), "utf8"),
        "clean-spec\n"
      );
      assert.equal(
        fs.readFileSync(path.join(cwd, `docs/prompt/${task}.prompt.md`), "utf8"),
        "clean-prompt\n"
      );
      assert.equal(
        fs.readFileSync(path.join(cwd, `docs/feature-log/${task}.log.md`), "utf8"),
        "clean-log\n"
      );
    });
  });

  test("second start-task keeps the worktree spec when the launch copy is stale", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      const task = "047-gadget";
      writeFile(cwd, `docs/features/${task}.feature.md`, "status: todo\n");
      const wt = startWorktree(cwd, task);
      writeFile(wt, `docs/features/${task}.feature.md`, "status: in progress\n");
      writeFile(cwd, `docs/features/${task}.feature.md`, "status: todo\n");
      assertUnchanged(startTask(cwd, task), { branch: task, created: "no", worktree: wt });
      assert.equal(
        fs.readFileSync(path.join(wt, `docs/features/${task}.feature.md`), "utf8"),
        "status: in progress\n"
      );
      assert.equal(
        fs.readFileSync(path.join(cwd, `docs/features/${task}.feature.md`), "utf8"),
        "status: todo\n"
      );
    });
  });

  test("second start-task does not clobber worktree tracker files when launch is already clean", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      const task = "033-widget";
      writeFile(cwd, `docs/features/${task}.feature.md`, "first-spec\n");
      writeFile(cwd, `docs/prompt/${task}.prompt.md`, "first-prompt\n");
      writeFile(cwd, `docs/feature-log/${task}.log.md`, "first-log\n");
      const wt = startWorktree(cwd, task);
      writeFile(wt, `docs/feature-log/${task}.log.md`, "worktree-log\n");
      assertUnchanged(startTask(cwd, task), { branch: task, created: "no", worktree: wt });
      assert.equal(
        fs.readFileSync(path.join(wt, `docs/feature-log/${task}.log.md`), "utf8"),
        "worktree-log\n"
      );
      assert.equal(fs.existsSync(path.join(cwd, `docs/feature-log/${task}.log.md`)), false);
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
