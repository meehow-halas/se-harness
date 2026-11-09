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
      fs.mkdirSync(path.join(pkg, "agents", "nested"), { recursive: true });
      fs.writeFileSync(path.join(pkg, "agents", "nested", "deep.txt"), "nested\n");

      const result = runCli(["install"], { cwd: project, packageRoot: pkg });
      assert.equal(result.status, 0, result.stderr);

      for (const name of PAYLOAD_DIRS) {
        assert.equal(
          read(path.join(project, ".dhs", name, "marker.txt")),
          `${name}\n`
        );
      }
      assert.equal(
        read(path.join(project, ".dhs", "agents", "nested", "deep.txt")),
        "nested\n"
      );
      assert.equal(read(path.join(project, ".dhs", "VERSION")), "9.8.7\n");
      assert.equal(
        read(path.join(project, ".claude", "skills", "dhs-setup", "SKILL.md")),
        "# setup\n"
      );
      assert.equal(
        read(path.join(project, ".cursor", "skills", "dhs-setup", "SKILL.md")),
        "# setup\n"
      );
      assert.equal(
        exists(path.join(project, ".dhs", "references", "hosts.json")),
        true
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

  test("fails when references/hosts.json is missing", () => {
    withTempDir((root) => {
      const pkg = path.join(root, "pkg");
      const project = path.join(root, "project");
      fs.mkdirSync(pkg);
      fs.mkdirSync(project);
      makePackageRoot(pkg);
      fs.rmSync(path.join(pkg, "references", "hosts.json"));

      const result = runCli(["install"], { cwd: project, packageRoot: pkg });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /missing package file at references\/hosts\.json/);
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
      assert.equal(exists(path.join(project, ".cursor", "agents")), false);
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
        "check-update",
      ]) {
        const mode = fs.statSync(path.join(project, ".dhs", "scripts", name)).mode;
        assert.notEqual(mode & 0o111, 0, name);
      }
      assert.equal(
        exists(path.join(project, ".dhs", "scripts", "start-task.test.js")),
        false
      );
      assert.equal(
        exists(path.join(project, ".dhs", "scripts", "lib.test.js")),
        false
      );
    });
  });

  test("creates .gitignore with .dhs/ and credentials when the file is missing", () => {
    withTempDir((root) => {
      const pkg = path.join(root, "pkg");
      const project = path.join(root, "project");
      fs.mkdirSync(pkg);
      fs.mkdirSync(project);
      makePackageRoot(pkg);

      const result = runCli(["install"], { cwd: project, packageRoot: pkg });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(
        read(path.join(project, ".gitignore")),
        ".dhs/\nharness.credentials.local.json\n"
      );
    });
  });

  test("appends missing gitignore entries without rewriting other lines", () => {
    withTempDir((root) => {
      const pkg = path.join(root, "pkg");
      const project = path.join(root, "project");
      fs.mkdirSync(pkg);
      fs.mkdirSync(project);
      makePackageRoot(pkg);
      fs.writeFileSync(path.join(project, ".gitignore"), "node_modules/\n*.log");

      const result = runCli(["install"], { cwd: project, packageRoot: pkg });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(
        read(path.join(project, ".gitignore")),
        "node_modules/\n*.log\n.dhs/\nharness.credentials.local.json\n"
      );
    });
  });

  test("appends credentials when .gitignore already ignores .dhs", () => {
    withTempDir((root) => {
      const pkg = path.join(root, "pkg");
      const project = path.join(root, "project");
      fs.mkdirSync(pkg);
      fs.mkdirSync(project);
      makePackageRoot(pkg);

      for (const existing of [".dhs", ".dhs/", "/.dhs", "/.dhs/"]) {
        const body = `node_modules/\n${existing}\n`;
        fs.writeFileSync(path.join(project, ".gitignore"), body);
        const result = runCli(["install"], { cwd: project, packageRoot: pkg });
        assert.equal(result.status, 0, result.stderr);
        assert.equal(
          read(path.join(project, ".gitignore")),
          `${body}harness.credentials.local.json\n`,
          existing
        );
      }
    });
  });

  test("appends .dhs/ when .gitignore already ignores credentials", () => {
    withTempDir((root) => {
      const pkg = path.join(root, "pkg");
      const project = path.join(root, "project");
      fs.mkdirSync(pkg);
      fs.mkdirSync(project);
      makePackageRoot(pkg);
      const body = "node_modules/\nharness.credentials.local.json\n";
      fs.writeFileSync(path.join(project, ".gitignore"), body);

      const result = runCli(["install"], { cwd: project, packageRoot: pkg });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(read(path.join(project, ".gitignore")), `${body}.dhs/\n`);
    });
  });

  test("does not duplicate credentials when already ignored with a leading slash", () => {
    withTempDir((root) => {
      const pkg = path.join(root, "pkg");
      const project = path.join(root, "project");
      fs.mkdirSync(pkg);
      fs.mkdirSync(project);
      makePackageRoot(pkg);
      const body = "node_modules/\n/harness.credentials.local.json\n";
      fs.writeFileSync(path.join(project, ".gitignore"), body);

      const result = runCli(["install"], { cwd: project, packageRoot: pkg });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(read(path.join(project, ".gitignore")), `${body}.dhs/\n`);
    });
  });

  test("does not rewrite .gitignore when both owned entries are already present", () => {
    withTempDir((root) => {
      const pkg = path.join(root, "pkg");
      const project = path.join(root, "project");
      fs.mkdirSync(pkg);
      fs.mkdirSync(project);
      makePackageRoot(pkg);
      const body = "/.dhs/\n/harness.credentials.local.json\nnode_modules/\n";
      fs.writeFileSync(path.join(project, ".gitignore"), body);

      const result = runCli(["install"], { cwd: project, packageRoot: pkg });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(read(path.join(project, ".gitignore")), body);
    });
  });

  test("merges a session-start check-update hook into each host hooks file", () => {
    withTempDir((root) => {
      const pkg = path.join(root, "pkg");
      const project = path.join(root, "project");
      fs.mkdirSync(pkg);
      fs.mkdirSync(project);
      makePackageRoot(pkg);

      const result = runCli(["install"], { cwd: project, packageRoot: pkg });
      assert.equal(result.status, 0, result.stderr);

      const claude = JSON.parse(read(path.join(project, ".claude", "settings.json")));
      assert.equal(claude.hooks.SessionStart.length, 1);
      assert.equal(claude.hooks.SessionStart[0].matcher, "startup");
      assert.equal(
        claude.hooks.SessionStart[0].hooks[0].command,
        ".dhs/scripts/check-update --host claude-code"
      );

      const cursor = JSON.parse(read(path.join(project, ".cursor", "hooks.json")));
      assert.equal(cursor.version, 1);
      assert.equal(cursor.hooks.sessionStart.length, 1);
      assert.equal(
        cursor.hooks.sessionStart[0].command,
        ".dhs/scripts/check-update --host cursor"
      );
      assert.equal(cursor.hooks.sessionStart[0].timeout, 5);
    });
  });

  test("second install does not duplicate the check-update hook", () => {
    withTempDir((root) => {
      const pkg = path.join(root, "pkg");
      const project = path.join(root, "project");
      fs.mkdirSync(pkg);
      fs.mkdirSync(project);
      makePackageRoot(pkg);
      assert.equal(runCli(["install"], { cwd: project, packageRoot: pkg }).status, 0);
      const result = runCli(["install"], { cwd: project, packageRoot: pkg });
      assert.equal(result.status, 0, result.stderr);
      const claude = JSON.parse(read(path.join(project, ".claude", "settings.json")));
      assert.equal(claude.hooks.SessionStart.length, 1);
      const cursor = JSON.parse(read(path.join(project, ".cursor", "hooks.json")));
      assert.equal(cursor.hooks.sessionStart.length, 1);
    });
  });

  test("merges check-update into existing host hooks without dropping them", () => {
    withTempDir((root) => {
      const pkg = path.join(root, "pkg");
      const project = path.join(root, "project");
      fs.mkdirSync(pkg);
      fs.mkdirSync(project);
      makePackageRoot(pkg);
      fs.mkdirSync(path.join(project, ".claude"), { recursive: true });
      fs.writeFileSync(
        path.join(project, ".claude", "settings.json"),
        `${JSON.stringify({
          permissions: { allow: ["Bash"] },
          hooks: {
            SessionStart: [
              {
                matcher: "startup",
                hooks: [{ type: "command", command: "echo keep-claude" }],
              },
            ],
          },
        })}\n`
      );
      fs.mkdirSync(path.join(project, ".cursor"), { recursive: true });
      fs.writeFileSync(
        path.join(project, ".cursor", "hooks.json"),
        `${JSON.stringify({
          hooks: {
            sessionStart: [{ command: "echo keep-cursor" }],
          },
        })}\n`
      );

      const result = runCli(["install"], { cwd: project, packageRoot: pkg });
      assert.equal(result.status, 0, result.stderr);

      const claude = JSON.parse(read(path.join(project, ".claude", "settings.json")));
      assert.deepEqual(claude.permissions, { allow: ["Bash"] });
      const claudeCmds = claude.hooks.SessionStart.flatMap((entry) =>
        (entry.hooks || []).map((hook) => hook.command)
      );
      assert.ok(claudeCmds.includes("echo keep-claude"));
      assert.ok(
        claudeCmds.includes(".dhs/scripts/check-update --host claude-code")
      );

      const cursor = JSON.parse(read(path.join(project, ".cursor", "hooks.json")));
      assert.equal(cursor.version, 1);
      const cursorCmds = cursor.hooks.sessionStart.map((entry) => entry.command);
      assert.ok(cursorCmds.includes("echo keep-cursor"));
      assert.ok(cursorCmds.includes(".dhs/scripts/check-update --host cursor"));
    });
  });
});

describe("dhs uninstall", () => {
  test("removes .dhs and the setup skill, keeps config and other host files, prunes empty dirs", () => {
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
      fs.mkdirSync(path.join(project, ".cursor", "skills", "other-skill"), {
        recursive: true,
      });
      fs.writeFileSync(
        path.join(project, ".cursor", "skills", "other-skill", "SKILL.md"),
        "keep-cursor\n"
      );
      fs.mkdirSync(path.join(project, ".cursor", "agents"), { recursive: true });
      fs.writeFileSync(path.join(project, ".cursor", "agents", "kept.md"), "live\n");

      const result = runCli(["uninstall"], { cwd: project, packageRoot: pkg });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(exists(path.join(project, ".dhs")), false);
      assert.equal(
        exists(path.join(project, ".claude", "skills", "dhs-setup")),
        false
      );
      assert.equal(
        exists(path.join(project, ".cursor", "skills", "dhs-setup")),
        false
      );
      assert.equal(
        read(path.join(project, ".claude", "skills", "other-skill", "SKILL.md")),
        "keep\n"
      );
      assert.equal(
        read(path.join(project, ".cursor", "skills", "other-skill", "SKILL.md")),
        "keep-cursor\n"
      );
      assert.equal(exists(path.join(project, ".claude", "agents", "kept.md")), true);
      assert.equal(exists(path.join(project, ".cursor", "agents", "kept.md")), true);
      assert.equal(
        read(path.join(project, "harness.config.json")),
        `${JSON.stringify({ keep: true })}\n`
      );
      assert.equal(
        read(path.join(project, ".gitignore")),
        ".dhs/\nharness.credentials.local.json\n"
      );
    });
  });

  test("prunes empty host dirs after removing the only skill", () => {
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
      assert.equal(exists(path.join(project, ".cursor")), false);
    });
  });

  test("removes only the check-update hook and keeps other host hook commands", () => {
    withTempDir((root) => {
      const pkg = path.join(root, "pkg");
      const project = path.join(root, "project");
      fs.mkdirSync(pkg);
      fs.mkdirSync(project);
      makePackageRoot(pkg);
      fs.mkdirSync(path.join(project, ".claude"), { recursive: true });
      fs.writeFileSync(
        path.join(project, ".claude", "settings.json"),
        `${JSON.stringify({
          permissions: { defaultMode: "acceptEdits" },
          hooks: {
            SessionStart: [
              {
                matcher: "startup",
                hooks: [{ type: "command", command: "echo keep-claude" }],
              },
            ],
          },
        })}\n`
      );
      fs.mkdirSync(path.join(project, ".cursor"), { recursive: true });
      fs.writeFileSync(
        path.join(project, ".cursor", "hooks.json"),
        `${JSON.stringify({
          version: 1,
          hooks: {
            sessionStart: [{ command: "echo keep-cursor" }],
          },
        })}\n`
      );
      assert.equal(runCli(["install"], { cwd: project, packageRoot: pkg }).status, 0);

      const result = runCli(["uninstall"], { cwd: project, packageRoot: pkg });
      assert.equal(result.status, 0, result.stderr);

      const claude = JSON.parse(read(path.join(project, ".claude", "settings.json")));
      assert.equal(claude.permissions.defaultMode, "acceptEdits");
      assert.equal(
        claude.hooks.SessionStart[0].hooks[0].command,
        "echo keep-claude"
      );
      const claudeDump = JSON.stringify(claude);
      assert.equal(claudeDump.includes("check-update"), false);

      const cursor = JSON.parse(read(path.join(project, ".cursor", "hooks.json")));
      assert.equal(cursor.hooks.sessionStart[0].command, "echo keep-cursor");
      assert.equal(JSON.stringify(cursor).includes("check-update"), false);
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
      assert.equal(exists(path.join(project, ".cursor")), false);
    });
  });
});
