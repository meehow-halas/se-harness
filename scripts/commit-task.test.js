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

  function committedFiles(wt) {
    return git(wt, ["show", "--name-only", "--pretty=format:", "HEAD"])
      .stdout.split("\n")
      .filter(Boolean);
  }

  function setReportChange(cwd, value) {
    fs.writeFileSync(
      require("path").join(cwd, "harness.config.json"),
      JSON.stringify({ agents: { baseBranch: "dev", reportChange: value } }, null, 2)
    );
  }

  test("reportChange true: a changed CHANGELOG.md is committed without being listed", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      setReportChange(cwd, true);
      const wt = startWorktree(cwd, "021-report-on");
      writeFile(wt, "feature.txt", "feature body\n");
      writeFile(wt, "CHANGELOG.md", "# Changelog\n\n## [Unreleased]\n\n### Changed\n\n- 021 change\n");
      assertOk(
        runScript("commit-task", ["021-report-on", "--message", "on", "--", "feature.txt"], { cwd: wt })
      );
      assert.deepEqual(committedFiles(wt).sort(), ["CHANGELOG.md", "feature.txt"].sort());
    });
  });

  test("reportChange false: a changed CHANGELOG.md is not added unless listed", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      setReportChange(cwd, false);
      const wt = startWorktree(cwd, "022-report-off");
      writeFile(wt, "feature.txt", "feature body two\n");
      writeFile(wt, "CHANGELOG.md", "# Changelog\n\n- 022 should stay out\n");
      assertOk(
        runScript("commit-task", ["022-report-off", "--message", "off", "--", "feature.txt"], { cwd: wt })
      );
      assert.deepEqual(committedFiles(wt), ["feature.txt"]);
      assert.notEqual(git(wt, ["status", "--porcelain", "--", "CHANGELOG.md"]).stdout.trim(), "");
    });
  });

  test("reportChange false: a listed CHANGELOG.md is committed like any listed path", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      setReportChange(cwd, false);
      const wt = startWorktree(cwd, "025-human-log");
      writeFile(wt, "CHANGELOG.md", "# Changelog\n\n- 025 written by a human\n");
      assertOk(
        runScript("commit-task", ["025-human-log", "--message", "log", "--", "CHANGELOG.md"], { cwd: wt })
      );
      assert.deepEqual(committedFiles(wt), ["CHANGELOG.md"]);
    });
  });

  test("reportChange absent: a changed CHANGELOG.md is committed like reportChange true", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      const wt = startWorktree(cwd, "023-report-default");
      writeFile(wt, "tool.txt", "tool body\n");
      writeFile(wt, "CHANGELOG.md", "# Changelog\n\n- 023 default\n");
      assertOk(
        runScript("commit-task", ["023-report-default", "--message", "def", "--", "tool.txt"], { cwd: wt })
      );
      assert.deepEqual(committedFiles(wt).sort(), ["CHANGELOG.md", "tool.txt"].sort());
    });
  });

  test("reportChange not a boolean: listed paths are committed, CHANGELOG.md is not added", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      fs.writeFileSync(
        require("path").join(cwd, "harness.config.json"),
        '{"agents":{"baseBranch":"dev","reportChange":"maybe"}}\n'
      );
      const wt = startWorktree(cwd, "024-report-bad");
      writeFile(wt, "x.txt", "x\n");
      writeFile(wt, "CHANGELOG.md", "# Changelog\n\n- 024 stays out\n");
      assertOk(runScript("commit-task", ["024-report-bad", "--message", "bad", "--", "x.txt"], { cwd: wt }));
      assert.deepEqual(committedFiles(wt), ["x.txt"]);
    });
  });
});
