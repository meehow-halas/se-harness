"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");

const {
  assertBlocked,
  assertOk,
  assertUnchanged,
  currentBranch,
  failingEditor,
  git,
  initGitRepo,
  revParse,
  runScript,
  startWorktree,
  withTempDir,
  writeFile,
} = require("../test/helpers");

describe("commit-task", () => {
  test("BLOCKED with no paths", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      const wt = startWorktree(cwd, "001-feature");
      assertBlocked(
        runScript("commit-task", ["001-feature"], { cwd: wt }),
        /no paths listed/
      );
    });
  });

  test("BLOCKED for a missing untracked path", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      const wt = startWorktree(cwd, "001-feature");
      assertBlocked(
        runScript("commit-task", ["001-feature", "nope.txt"], { cwd: wt }),
        /path nope\.txt does not exist/
      );
    });
  });

  test("BLOCKED when not on the task branch", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      writeFile(cwd, "a.txt", "a\n");
      assertBlocked(
        runScript("commit-task", ["001-feature", "a.txt"], { cwd }),
        /checkout is dev, not task branch 001-feature/
      );
    });
  });

  test("BLOCKED for an unknown option", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      startWorktree(cwd, "001-feature");
      writeFile(cwd, "a.txt", "a\n");
      assertBlocked(
        runScript("commit-task", ["001-feature", "--amend", "a.txt"], { cwd }),
        /unknown option --amend/
      );
    });
  });

  test("BLOCKED when --message has no value", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      startWorktree(cwd, "001-feature");
      writeFile(cwd, "a.txt", "a\n");
      assertBlocked(
        runScript("commit-task", ["001-feature", "--message"], { cwd }),
        /missing value for --message/
      );
    });
  });

  test("adds only listed paths and defaults the message to the task name", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      const wt = startWorktree(cwd, "ABC-12");
      writeFile(wt, "keep.txt", "keep\n");
      writeFile(wt, "skip.txt", "skip\n");
      const result = runScript("commit-task", ["ABC-12", "keep.txt"], { cwd: wt });
      const { fields } = assertOk(result, { branch: "ABC-12" });
      assert.ok(fields.commit);
      assert.notEqual(fields.commit, "none");
      const msg = git(wt, ["log", "-1", "--pretty=%s"]).stdout.trim();
      assert.equal(msg, "ABC-12");
      const committed = git(wt, ["diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD"])
        .stdout;
      assert.match(committed, /keep\.txt/);
      assert.equal(/skip\.txt/.test(committed), false);
      const untracked = git(wt, ["ls-files", "--others", "--exclude-standard"]).stdout;
      assert.match(untracked, /skip\.txt/);
    });
  });

  test("uses --message when provided", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      const wt = startWorktree(cwd, "001-feature");
      writeFile(wt, "a.txt", "a\n");
      const result = runScript(
        "commit-task",
        ["001-feature", "--message", "custom msg", "--", "a.txt"],
        { cwd: wt }
      );
      assertOk(result);
      assert.equal(git(wt, ["log", "-1", "--pretty=%s"]).stdout.trim(), "custom msg");
    });
  });

  test("appends agents.commitTrailer to the commit message when it is set", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      const trailer = "Co-Authored-By: Trailer Probe <probe-7f3@example.org>";
      fs.writeFileSync(
        require("path").join(cwd, "harness.config.json"),
        JSON.stringify({ agents: { baseBranch: "dev", commitTrailer: trailer } }, null, 2)
      );
      const wt = startWorktree(cwd, "011-trailer");
      writeFile(wt, "b.txt", "b\n");
      assertOk(
        runScript(
          "commit-task",
          ["011-trailer", "--message", "trailer subject", "--", "b.txt"],
          { cwd: wt }
        )
      );
      const body = git(wt, ["log", "-1", "--pretty=%B"]).stdout;
      assert.match(body, /^trailer subject\n\n/);
      assert.ok(body.includes(trailer), body);
    });
  });

  test("adds no trailer when agents.commitTrailer is absent", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      const wt = startWorktree(cwd, "012-plain");
      writeFile(wt, "c.txt", "c\n");
      assertOk(
        runScript(
          "commit-task",
          ["012-plain", "--message", "plain subject", "--", "c.txt"],
          { cwd: wt }
        )
      );
      assert.equal(git(wt, ["log", "-1", "--pretty=%B"]).stdout.trim(), "plain subject");
    });
  });

  test("UNCHANGED when listed paths have no staged diff", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      const wt = startWorktree(cwd, "001-feature");
      const sha = revParse(wt, "HEAD");
      const result = runScript("commit-task", ["001-feature", "README.md"], { cwd: wt });
      assertUnchanged(result, { branch: "001-feature", commit: "none" });
      assert.equal(revParse(wt, "HEAD"), sha);
    });
  });

  test("finishes a merge with --no-edit when MERGE_HEAD is present", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      const wt = startWorktree(cwd, "001-feature");
      writeFile(wt, "task-only.txt", "t\n");
      git(wt, ["add", "task-only.txt"]);
      git(wt, ["commit", "-m", "task"]);
      writeFile(cwd, "base-only.txt", "b\n");
      git(cwd, ["add", "base-only.txt"]);
      git(cwd, ["commit", "-m", "base"]);
      git(wt, ["merge", "--no-commit", "--no-ff", "dev"]);
      const editor = failingEditor(cwd);
      const result = runScript(
        "commit-task",
        ["001-feature", "task-only.txt", "base-only.txt"],
        { cwd: wt, env: editor.env }
      );
      const { fields } = assertOk(result, { branch: "001-feature" });
      assert.ok(fields.commit);
      assert.notEqual(fields.commit, "none");
      assert.equal(fs.existsSync(editor.stamp), false);
      const parents = git(wt, ["rev-list", "--parents", "-n", "1", "HEAD"])
        .stdout.trim()
        .split(" ");
      assert.ok(parents.length >= 3);
      const msg = git(wt, ["log", "-1", "--pretty=%s"]).stdout.trim();
      assert.match(msg, /Merge branch ['"]dev['"]/);
      assert.notEqual(msg, "001-feature");
    });
  });

  test("stays on the task branch after a successful commit", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      const wt = startWorktree(cwd, "001-feature");
      writeFile(wt, "a.txt", "a\n");
      assertOk(runScript("commit-task", ["001-feature", "a.txt"], { cwd: wt }));
      assert.equal(currentBranch(wt), "001-feature");
      assert.equal(currentBranch(cwd), "dev");
    });
  });
});
