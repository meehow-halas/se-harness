"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  PAYLOAD_DIRS,
  REPO_ROOT,
  makePackageRoot,
  runCli,
  withTempDir,
} = require("../test/helpers");

const USAGE = "Usage: dhs <install|uninstall>";

function read(p) {
  return fs.readFileSync(p, "utf8");
}

function exists(p) {
  return fs.existsSync(p);
}

describe("cli dispatch", () => {
  test("no args prints usage on stdout and exits 1", () => {
    const result = runCli([]);
    assert.equal(result.status, 1);
    assert.equal(result.stdout.trim(), USAGE);
  });

  test("-h prints usage and exits 0", () => {
    const result = runCli(["-h"]);
    assert.equal(result.status, 0);
    assert.equal(result.stdout.trim(), USAGE);
  });

  test("--help prints usage and exits 0", () => {
    const result = runCli(["--help"]);
    assert.equal(result.status, 0);
    assert.equal(result.stdout.trim(), USAGE);
  });

  test("extra args print usage on stderr and exit 1", () => {
    withTempDir((cwd) => {
      const result = runCli(["install", "extra"], { cwd });
      assert.equal(result.status, 1);
      assert.equal(result.stderr.trim(), USAGE);
      assert.equal(exists(path.join(cwd, ".dhs")), false);
    });
  });

  test("unknown command prints error and usage on stderr", () => {
    withTempDir((cwd) => {
      const result = runCli(["status"], { cwd });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /Unknown command: status/);
      assert.match(result.stderr, new RegExp(USAGE));
      assert.equal(exists(path.join(cwd, ".dhs")), false);
    });
  });
});

describe("dhs install", () => {
  test("copies payload dirs under the same names, VERSION, and project skill", () => {
    withTempDir((root) => {
      const pkg = path.join(root, "pkg");
      const project = path.join(root, "project");
      fs.mkdirSync(pkg);
      fs.mkdirSync(project);
      makePackageRoot(pkg, { version: "9.8.7" });

      const result = runCli(["install"], { cwd: project, packageRoot: pkg });
      assert.equal(result.status, 0, result.stderr);

      for (const name of PAYLOAD_DIRS) {
        assert.equal(
          read(path.join(project, ".dhs", name, "marker.txt")),
          `${name}\n`
        );
      }
      assert.equal(read(path.join(project, ".dhs", "VERSION")), "9.8.7\n");
      assert.equal(
        read(path.join(project, ".claude", "skills", "dhs-setup", "SKILL.md")),
        "# setup\n"
      );
    });
  });

  test("does not copy colocated *.test.js files into .dhs", () => {
    withTempDir((root) => {
      const pkg = path.join(root, "pkg");
      const project = path.join(root, "project");
      fs.mkdirSync(pkg);
      fs.mkdirSync(project);
      makePackageRoot(pkg);
      fs.writeFileSync(path.join(pkg, "scripts", "start-task.test.js"), "test\n");
      fs.writeFileSync(path.join(pkg, "scripts", "start-task.test.mjs"), "test\n");
      fs.writeFileSync(path.join(pkg, "scripts", "start-task.test.cjs"), "test\n");
      fs.writeFileSync(path.join(pkg, "agents", "architect.test.js"), "test\n");

      const result = runCli(["install"], { cwd: project, packageRoot: pkg });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(exists(path.join(project, ".dhs", "scripts", "marker.txt")), true);
      assert.equal(
        exists(path.join(project, ".dhs", "scripts", "start-task.test.js")),
        false
      );
      assert.equal(
        exists(path.join(project, ".dhs", "scripts", "start-task.test.mjs")),
        false
      );
      assert.equal(
        exists(path.join(project, ".dhs", "scripts", "start-task.test.cjs")),
        false
      );
      assert.equal(
        exists(path.join(project, ".dhs", "agents", "architect.test.js")),
        false
      );
    });
  });

  test("skips a missing payload directory without failing", () => {
    withTempDir((root) => {
      const pkg = path.join(root, "pkg");
      const project = path.join(root, "project");
      fs.mkdirSync(pkg);
      fs.mkdirSync(project);
      makePackageRoot(pkg, {
        payload: PAYLOAD_DIRS.filter((n) => n !== "packs"),
      });

      const result = runCli(["install"], { cwd: project, packageRoot: pkg });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(exists(path.join(project, ".dhs", "packs")), false);
      assert.equal(exists(path.join(project, ".dhs", "agents", "marker.txt")), true);
    });
  });

  test("fails when skills/dhs-setup is missing", () => {
    withTempDir((root) => {
      const pkg = path.join(root, "pkg");
      const project = path.join(root, "project");
      fs.mkdirSync(pkg);
      fs.mkdirSync(project);
      makePackageRoot(pkg, { setupSkill: false });

      const result = runCli(["install"], { cwd: project, packageRoot: pkg });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /missing package skill at skills\/dhs-setup/);
    });
  });

  test("second install replaces trees instead of duplicating", () => {
    withTempDir((root) => {
      const pkg = path.join(root, "pkg");
      const project = path.join(root, "project");
      fs.mkdirSync(pkg);
      fs.mkdirSync(project);
      makePackageRoot(pkg);

      assert.equal(runCli(["install"], { cwd: project, packageRoot: pkg }).status, 0);
      fs.writeFileSync(path.join(project, ".dhs", "agents", "stale.txt"), "old\n");
      fs.writeFileSync(path.join(pkg, "agents", "marker.txt"), "new\n");

      const result = runCli(["install"], { cwd: project, packageRoot: pkg });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(read(path.join(project, ".dhs", "agents", "marker.txt")), "new\n");
      assert.equal(exists(path.join(project, ".dhs", "agents", "stale.txt")), false);
    });
  });

  test("prints a /dhs-setup reminder when harness.config.json exists and does not generate live files", () => {
    withTempDir((root) => {
      const pkg = path.join(root, "pkg");
      const project = path.join(root, "project");
      fs.mkdirSync(pkg);
      fs.mkdirSync(project);
      makePackageRoot(pkg);
      fs.writeFileSync(
        path.join(project, "harness.config.json"),
        `${JSON.stringify({ agents: { baseBranch: "dev" } })}\n`
      );

      const result = runCli(["install"], { cwd: project, packageRoot: pkg });
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /Run \/dhs-setup to apply the new templates/);
      assert.equal(read(path.join(project, ".dhs", "VERSION")), "1.2.3\n");
      assert.equal(exists(path.join(project, ".dhs", "agents", "marker.txt")), true);
      assert.equal(exists(path.join(project, ".claude", "agents")), false);
      assert.equal(
        read(path.join(project, "harness.config.json")),
        `${JSON.stringify({ agents: { baseBranch: "dev" } })}\n`
      );
    });
  });

  test("copied git helpers stay executable", () => {
    withTempDir((project) => {
      const result = runCli(["install"], { cwd: project, packageRoot: REPO_ROOT });
      assert.equal(result.status, 0, result.stderr);
      for (const name of [
        "start-task",
        "commit-task",
        "push-task",
        "open-pr",
        "update-from-base",
        "return-to-base",
      ]) {
        const mode = fs.statSync(path.join(project, ".dhs", "scripts", name)).mode;
        assert.notEqual(mode & 0o111, 0, name);
      }
    });
  });
});

describe("dhs uninstall", () => {
  test("removes .dhs and the setup skill, keeps config and other .claude files, prunes empty dirs", () => {
    withTempDir((root) => {
      const pkg = path.join(root, "pkg");
      const project = path.join(root, "project");
      fs.mkdirSync(pkg);
      fs.mkdirSync(project);
      makePackageRoot(pkg);
      assert.equal(runCli(["install"], { cwd: project, packageRoot: pkg }).status, 0);
      fs.writeFileSync(
        path.join(project, "harness.config.json"),
        `${JSON.stringify({ keep: true })}\n`
      );
      fs.mkdirSync(path.join(project, ".claude", "agents"), { recursive: true });
      fs.writeFileSync(path.join(project, ".claude", "agents", "kept.md"), "live\n");
      fs.mkdirSync(path.join(project, ".claude", "skills", "other-skill"), {
        recursive: true,
      });
      fs.writeFileSync(
        path.join(project, ".claude", "skills", "other-skill", "SKILL.md"),
        "keep\n"
      );

      const result = runCli(["uninstall"], { cwd: project, packageRoot: pkg });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(exists(path.join(project, ".dhs")), false);
      assert.equal(
        exists(path.join(project, ".claude", "skills", "dhs-setup")),
        false
      );
      assert.equal(
        read(path.join(project, ".claude", "skills", "other-skill", "SKILL.md")),
        "keep\n"
      );
      assert.equal(exists(path.join(project, ".claude", "agents", "kept.md")), true);
      assert.equal(
        read(path.join(project, "harness.config.json")),
        `${JSON.stringify({ keep: true })}\n`
      );
    });
  });

  test("prunes empty .claude after removing the only skill", () => {
    withTempDir((root) => {
      const pkg = path.join(root, "pkg");
      const project = path.join(root, "project");
      fs.mkdirSync(pkg);
      fs.mkdirSync(project);
      makePackageRoot(pkg);
      assert.equal(runCli(["install"], { cwd: project, packageRoot: pkg }).status, 0);

      const result = runCli(["uninstall"], { cwd: project, packageRoot: pkg });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(exists(path.join(project, ".claude")), false);
    });
  });

  test("second uninstall is idempotent", () => {
    withTempDir((root) => {
      const pkg = path.join(root, "pkg");
      const project = path.join(root, "project");
      fs.mkdirSync(pkg);
      fs.mkdirSync(project);
      makePackageRoot(pkg);
      assert.equal(runCli(["install"], { cwd: project, packageRoot: pkg }).status, 0);
      assert.equal(runCli(["uninstall"], { cwd: project, packageRoot: pkg }).status, 0);
      const result = runCli(["uninstall"], { cwd: project, packageRoot: pkg });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(exists(path.join(project, ".dhs")), false);
      assert.equal(exists(path.join(project, ".claude")), false);
    });
  });
});
