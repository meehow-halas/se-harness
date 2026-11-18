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

const USAGE_FIRST_LINE = "Usage: seh <install|uninstall> [--prefix P]";
const USAGE = USAGE_FIRST_LINE;

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
    assert.equal(result.stdout.split("\n")[0], USAGE);
  });

  test("-h prints usage and exits 0", () => {
    const result = runCli(["-h"]);
    assert.equal(result.status, 0);
    assert.equal(result.stdout.split("\n")[0], USAGE);
  });

  test("--help prints usage and exits 0", () => {
    const result = runCli(["--help"]);
    assert.equal(result.status, 0);
    assert.equal(result.stdout.split("\n")[0], USAGE);
  });

  test("extra args print usage on stderr and exit 1", () => {
    withTempDir((cwd) => {
      const result = runCli(["install", "extra"], { cwd });
      assert.equal(result.status, 1);
      assert.equal(result.stderr.split("\n")[0], USAGE);
      assert.equal(exists(path.join(cwd, ".seh")), false);
    });
  });

  test("unknown command prints error and usage on stderr", () => {
    withTempDir((cwd) => {
      const result = runCli(["status"], { cwd });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /Unknown command: status/);
      assert.ok(result.stderr.includes(USAGE), result.stderr);
      assert.equal(exists(path.join(cwd, ".seh")), false);
    });
  });
});

describe("seh install", () => {
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
          read(path.join(project, ".seh", name, "marker.txt")),
          `${name}\n`
        );
      }
      assert.equal(
        read(path.join(project, ".seh", "agents", "nested", "deep.txt")),
        "nested\n"
      );
      assert.equal(read(path.join(project, ".seh", "VERSION")), "9.8.7\n");
      assert.equal(
        read(path.join(project, ".claude", "skills", "_setit-se", "SKILL.md")),
        "# setup\n"
      );
      assert.equal(
        read(path.join(project, ".cursor", "skills", "_setit-se", "SKILL.md")),
        "# setup\n"
      );
      assert.equal(
        read(path.join(project, ".opencode", "skills", "_setit-se", "SKILL.md")),
        "# setup\n"
      );
      assert.equal(
        exists(path.join(project, ".seh", "references", "hosts.json")),
        true
      );
      assert.equal(
        exists(
          path.join(project, ".seh", "references", "opencode-check-update.js")
        ),
        true
      );
    });
  });

  test("does not copy colocated *.test.js files into .seh", () => {
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
      assert.equal(exists(path.join(project, ".seh", "scripts", "marker.txt")), true);
      assert.equal(
        exists(path.join(project, ".seh", "scripts", "start-task.test.js")),
        false
      );
      assert.equal(
        exists(path.join(project, ".seh", "scripts", "start-task.test.mjs")),
        false
      );
      assert.equal(
        exists(path.join(project, ".seh", "scripts", "start-task.test.cjs")),
        false
      );
      assert.equal(
        exists(path.join(project, ".seh", "agents", "architect.test.js")),
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
      assert.equal(exists(path.join(project, ".seh", "packs")), false);
      assert.equal(exists(path.join(project, ".seh", "agents", "marker.txt")), true);
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

  test("fails when references/opencode-check-update.js is missing", () => {
    withTempDir((root) => {
      const pkg = path.join(root, "pkg");
      const project = path.join(root, "project");
      fs.mkdirSync(pkg);
      fs.mkdirSync(project);
      makePackageRoot(pkg);
      fs.rmSync(path.join(pkg, "references", "opencode-check-update.js"));

      const result = runCli(["install"], { cwd: project, packageRoot: pkg });
      assert.equal(result.status, 1);
      assert.match(
        result.stderr,
        /missing package file at references\/opencode-check-update\.js/
      );
    });
  });

  test("fails when skills/setit-se is missing", () => {
    withTempDir((root) => {
      const pkg = path.join(root, "pkg");
      const project = path.join(root, "project");
      fs.mkdirSync(pkg);
      fs.mkdirSync(project);
      makePackageRoot(pkg, { setupSkill: false });

      const result = runCli(["install"], { cwd: project, packageRoot: pkg });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /missing package skill at skills\/setit-se/);
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
      fs.writeFileSync(path.join(project, ".seh", "agents", "stale.txt"), "old\n");
      fs.writeFileSync(path.join(pkg, "agents", "marker.txt"), "new\n");

      const result = runCli(["install"], { cwd: project, packageRoot: pkg });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(read(path.join(project, ".seh", "agents", "marker.txt")), "new\n");
      assert.equal(exists(path.join(project, ".seh", "agents", "stale.txt")), false);
    });
  });

  test("prints a /_setit-se reminder when harness.config.json exists and does not generate live files", () => {
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
      assert.match(result.stdout, /Run \/_setit-se to apply the new templates/);
      assert.equal(read(path.join(project, ".seh", "VERSION")), "1.2.3\n");
      assert.equal(exists(path.join(project, ".seh", "agents", "marker.txt")), true);
      assert.equal(exists(path.join(project, ".claude", "agents")), false);
      assert.equal(exists(path.join(project, ".cursor", "agents")), false);
      assert.equal(exists(path.join(project, ".opencode", "agents")), false);
      assert.equal(
        read(path.join(project, "harness.config.json")),
        `${JSON.stringify({ agents: { baseBranch: "dev" } })}\n`
      );
    });
  });

  test("copies the session fan-out reference and host spawn adapters unchanged", () => {
    withTempDir((project) => {
      const result = runCli(["install"], { cwd: project, packageRoot: REPO_ROOT });
      assert.equal(result.status, 0, result.stderr);
      const refDir = path.join(project, ".seh", "references");
      assert.equal(exists(path.join(refDir, "session-fanout.md")), true);
      const copied = fs.readFileSync(path.join(refDir, "hosts.json"), "utf8");
      const source = fs.readFileSync(path.join(REPO_ROOT, "references", "hosts.json"), "utf8");
      assert.equal(copied, source);
      const spawn = Object.fromEntries(
        JSON.parse(copied).hosts.map((h) => [h.id, h.sessionSpawn])
      );
      assert.deepEqual(spawn, {
        "claude-code": "start_session",
        cursor: "manual",
        opencode: "manual",
        codex: "manual",
      });
    });
  });

  test("installs the Designer agent and ships hosts.json designer suggestions equal to the implementer's", () => {
    withTempDir((project) => {
      const result = runCli(["install"], { cwd: project, packageRoot: REPO_ROOT });
      assert.equal(result.status, 0, result.stderr);
      const installed = path.join(project, ".seh", "agents", "designer.md");
      assert.equal(exists(installed), true);
      const source = read(path.join(REPO_ROOT, "agents", "designer.md"));
      assert.ok(source.includes("{{prefix}}"));
      assert.equal(read(installed), source.replaceAll("{{prefix}}", "_"));
      const hosts = JSON.parse(
        read(path.join(project, ".seh", "references", "hosts.json"))
      ).hosts;
      assert.ok(hosts.length >= 4);
      for (const h of hosts) {
        assert.ok(h.modelSuggest.implementer, `${h.id} has an implementer suggestion`);
        assert.equal(h.modelSuggest.designer, h.modelSuggest.implementer, h.id);
      }
    });
  });

  test("config skeleton lists the designer role for every host and ships the Designer off", () => {
    const cfg = JSON.parse(read(path.join(REPO_ROOT, "references", "harness.config.json")));
    const hosts = JSON.parse(read(path.join(REPO_ROOT, "references", "hosts.json"))).hosts;
    assert.deepEqual(
      Object.keys(cfg.agents.roles.designer.model).sort(),
      hosts.map((h) => h.id).sort()
    );
    assert.equal(cfg.agents.designer.enabled, false);
  });

  test("installs the ux-a11y pack: every rule file scoped by paths, no test files", () => {
    withTempDir((project) => {
      const result = runCli(["install"], { cwd: project, packageRoot: REPO_ROOT });
      assert.equal(result.status, 0, result.stderr);
      const dir = path.join(project, ".seh", "packs", "ux-a11y");
      const files = fs.readdirSync(dir).sort();
      assert.deepEqual(files, ["a11y.md", "states.md", "touch-i18n.md"]);
      for (const f of files) {
        const body = read(path.join(dir, f));
        assert.match(body, /^---\npaths:\n(  - ".+"\n)+---\n/, f);
        assert.equal(body, read(path.join(REPO_ROOT, "packs", "ux-a11y", f)), f);
      }
    });
  });

  test("install prints a confirmation naming the project folder and the next step", () => {
    withTempDir((project) => {
      const result = runCli(["install"], { cwd: project, packageRoot: REPO_ROOT });
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /seh install: OK \S+ in .*/);
      assert.ok(result.stdout.includes(path.basename(project)), result.stdout);
      assert.match(result.stdout, /\/_setit-se/);
    });
  });

  test("installed fanout-plan runs from .seh/scripts and plans a fan-out", () => {
    withTempDir((project) => {
      const result = runCli(["install"], { cwd: project, packageRoot: REPO_ROOT });
      assert.equal(result.status, 0, result.stderr);
      const planner = path.join(project, ".seh", "scripts", "fanout-plan");
      const run = require("child_process").spawnSync(
        "sh",
        [planner, "--skill", "doit", "--keys", "IN-7,IN-9", "--depends", "IN-9:IN-7"],
        { cwd: project, encoding: "utf8" }
      );
      assert.equal(run.status, 0, run.stderr);
      assert.match(run.stdout, /^OK\nmode: parallel\nmax: 4\nready: IN-7\nwaiting: IN-9 after IN-7\n/);
    });
  });

  test("copied entry-point scripts stay executable", () => {
    withTempDir((project) => {
      const result = runCli(["install"], { cwd: project, packageRoot: REPO_ROOT });
      assert.equal(result.status, 0, result.stderr);
      // Every extensionless file in scripts/ is a command skills invoke directly.
      const entryPoints = fs
        .readdirSync(path.join(REPO_ROOT, "scripts"))
        .filter((name) => !name.includes("."));
      for (const name of ["start-task", "jira", "ado", "check-update"]) {
        assert.ok(entryPoints.includes(name), name);
      }
      for (const name of entryPoints) {
        const mode = fs.statSync(path.join(project, ".seh", "scripts", name)).mode;
        assert.notEqual(mode & 0o111, 0, name);
      }
      assert.equal(
        exists(path.join(project, ".seh", "scripts", "start-task.test.js")),
        false
      );
      assert.equal(
        exists(path.join(project, ".seh", "scripts", "lib.test.js")),
        false
      );
    });
  });

  test("creates .gitignore with .seh/ and credentials when the file is missing", () => {
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
        ".seh/\nharness.credentials.local.json\n"
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
        "node_modules/\n*.log\n.seh/\nharness.credentials.local.json\n"
      );
    });
  });

  test("appends credentials when .gitignore already ignores .seh", () => {
    withTempDir((root) => {
      const pkg = path.join(root, "pkg");
      const project = path.join(root, "project");
      fs.mkdirSync(pkg);
      fs.mkdirSync(project);
      makePackageRoot(pkg);

      for (const existing of [".seh", ".seh/", "/.seh", "/.seh/"]) {
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

  test("appends .seh/ when .gitignore already ignores credentials", () => {
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
      assert.equal(read(path.join(project, ".gitignore")), `${body}.seh/\n`);
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
      assert.equal(read(path.join(project, ".gitignore")), `${body}.seh/\n`);
    });
  });

  test("does not rewrite .gitignore when both owned entries are already present", () => {
    withTempDir((root) => {
      const pkg = path.join(root, "pkg");
      const project = path.join(root, "project");
      fs.mkdirSync(pkg);
      fs.mkdirSync(project);
      makePackageRoot(pkg);
      const body = "/.seh/\n/harness.credentials.local.json\nnode_modules/\n";
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
        ".seh/scripts/check-update --host claude-code"
      );

      const cursor = JSON.parse(read(path.join(project, ".cursor", "hooks.json")));
      assert.equal(cursor.version, 1);
      assert.equal(cursor.hooks.sessionStart.length, 1);
      assert.equal(
        cursor.hooks.sessionStart[0].command,
        ".seh/scripts/check-update --host cursor"
      );
      assert.equal(cursor.hooks.sessionStart[0].timeout, 5);

      const plugin = read(
        path.join(project, ".opencode", "plugins", "seh-check-update.js")
      );
      assert.match(plugin, /check-update/);
      assert.match(plugin, /"--host", "opencode"/);
      assert.match(plugin, /session\.created/);
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
      assert.equal(
        exists(path.join(project, ".opencode", "plugins", "seh-check-update.js")),
        true
      );
      const pluginDir = path.join(project, ".opencode", "plugins");
      assert.deepEqual(fs.readdirSync(pluginDir), ["seh-check-update.js"]);
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
        claudeCmds.includes(".seh/scripts/check-update --host claude-code")
      );

      const cursor = JSON.parse(read(path.join(project, ".cursor", "hooks.json")));
      assert.equal(cursor.version, 1);
      const cursorCmds = cursor.hooks.sessionStart.map((entry) => entry.command);
      assert.ok(cursorCmds.includes("echo keep-cursor"));
      assert.ok(cursorCmds.includes(".seh/scripts/check-update --host cursor"));
    });
  });
});

describe("seh uninstall", () => {
  test("removes .seh and the setup skill, keeps config and other host files, prunes empty dirs", () => {
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
      fs.mkdirSync(path.join(project, ".opencode", "skills", "other-skill"), {
        recursive: true,
      });
      fs.writeFileSync(
        path.join(project, ".opencode", "skills", "other-skill", "SKILL.md"),
        "keep-opencode\n"
      );
      fs.mkdirSync(path.join(project, ".opencode", "agents"), { recursive: true });
      fs.writeFileSync(path.join(project, ".opencode", "agents", "kept.md"), "live\n");
      fs.mkdirSync(path.join(project, ".opencode", "plugins"), { recursive: true });
      fs.writeFileSync(
        path.join(project, ".opencode", "plugins", "keep-other.js"),
        "keep-plugin\n"
      );

      const result = runCli(["uninstall"], { cwd: project, packageRoot: pkg });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(exists(path.join(project, ".seh")), false);
      assert.equal(
        exists(path.join(project, ".claude", "skills", "_setit-se")),
        false
      );
      assert.equal(
        exists(path.join(project, ".cursor", "skills", "_setit-se")),
        false
      );
      assert.equal(
        exists(path.join(project, ".opencode", "skills", "_setit-se")),
        false
      );
      assert.equal(
        exists(path.join(project, ".opencode", "plugins", "seh-check-update.js")),
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
      assert.equal(
        read(path.join(project, ".opencode", "skills", "other-skill", "SKILL.md")),
        "keep-opencode\n"
      );
      assert.equal(
        read(path.join(project, ".opencode", "plugins", "keep-other.js")),
        "keep-plugin\n"
      );
      assert.equal(exists(path.join(project, ".claude", "agents", "kept.md")), true);
      assert.equal(exists(path.join(project, ".cursor", "agents", "kept.md")), true);
      assert.equal(exists(path.join(project, ".opencode", "agents", "kept.md")), true);
      assert.equal(
        read(path.join(project, "harness.config.json")),
        `${JSON.stringify({ keep: true })}\n`
      );
      assert.equal(
        read(path.join(project, ".gitignore")),
        ".seh/\nharness.credentials.local.json\n"
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
      assert.equal(exists(path.join(project, ".opencode")), false);
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
      assert.equal(
        exists(path.join(project, ".opencode", "plugins", "seh-check-update.js")),
        false
      );
    });
  });

  describe("codex host", () => {
    function setup(root) {
      const pkg = path.join(root, "pkg");
      const project = path.join(root, "project");
      fs.mkdirSync(pkg);
      fs.mkdirSync(project);
      makePackageRoot(pkg);
      return { pkg, project };
    }
    const hooksPath = (project) => path.join(project, ".codex", "hooks.json");

    test("install writes the setup skill under .agents/skills with the stored prefix, no commands dir", () => {
      withTempDir((root) => {
        const { pkg, project } = setup(root);
        const result = runCli(["install", "--prefix", "zx_"], { cwd: project, packageRoot: pkg });
        assert.equal(result.status, 0, result.stderr);
        const skill = path.join(project, ".agents", "skills", "zx_setit-se", "SKILL.md");
        assert.equal(exists(skill), true);
        assert.equal(exists(path.join(project, ".agents", "skills", "_setit-se")), false);
        assert.equal(exists(path.join(project, ".codex", "commands")), false);
        assert.equal(exists(path.join(project, ".codex", "skills")), false);
      });
    });

    test("hook is SessionStart with matcher startup|resume; Claude keeps matcher startup", () => {
      withTempDir((root) => {
        const { pkg, project } = setup(root);
        assert.equal(runCli(["install"], { cwd: project, packageRoot: pkg }).status, 0);
        const codex = JSON.parse(read(hooksPath(project)));
        assert.deepEqual(codex, {
          hooks: {
            SessionStart: [
              {
                matcher: "startup|resume",
                hooks: [{ type: "command", command: ".seh/scripts/check-update --host codex" }],
              },
            ],
          },
        });
        const claude = JSON.parse(read(path.join(project, ".claude", "settings.json")));
        assert.equal(claude.hooks.SessionStart[0].matcher, "startup");
      });
    });

    test("setup skill text and next-step line use the row's invokePrefix; other hosts keep /", () => {
      withTempDir((root) => {
        const { pkg, project } = setup(root);
        fs.writeFileSync(
          path.join(pkg, "skills", "setit-se", "SKILL.md"),
          "---\nname: setit-se\ndescription: x\n---\nRun /{{prefix}}doit, see .seh/x/{{prefix}}doit, /skills, /other.\n"
        );
        const hostsFile = path.join(pkg, "references", "hosts.json");
        const table = JSON.parse(read(hostsFile));
        for (const h of table.hosts) if (h.id === "codex") h.invokePrefix = "%";
        fs.writeFileSync(hostsFile, JSON.stringify(table));
        const result = runCli(["install", "--prefix", "zx_"], { cwd: project, packageRoot: pkg });
        assert.equal(result.status, 0, result.stderr);
        assert.match(
          read(path.join(project, ".agents", "skills", "zx_setit-se", "SKILL.md")),
          /Run %zx_doit, see \.seh\/x\/zx_doit, \/skills, \/other\./
        );
        assert.match(
          read(path.join(project, ".claude", "skills", "zx_setit-se", "SKILL.md")),
          /Run \/zx_doit, see/
        );
        assert.match(result.stdout, /Next: run \/zx_setit-se in the project\. In codex type %zx_setit-se instead\./);
      });
    });

    test("designit is an invoke skill: its slash form gets the row's invokePrefix; plain words stay", () => {
      withTempDir((root) => {
        const { pkg, project } = setup(root);
        fs.writeFileSync(
          path.join(pkg, "skills", "setit-se", "SKILL.md"),
          "---\nname: setit-se\ndescription: x\n---\nRun /{{prefix}}designit then /{{prefix}}planit; not /{{prefix}}designitx or /designit-x.\n"
        );
        const hostsFile = path.join(pkg, "references", "hosts.json");
        const table = JSON.parse(read(hostsFile));
        for (const h of table.hosts) if (h.id === "codex") h.invokePrefix = "$";
        fs.writeFileSync(hostsFile, JSON.stringify(table));
        const result = runCli(["install", "--prefix", "q_"], { cwd: project, packageRoot: pkg });
        assert.equal(result.status, 0, result.stderr);
        assert.match(
          read(path.join(project, ".agents", "skills", "q_setit-se", "SKILL.md")),
          /Run \$q_designit then \$q_planit; not \/q_designitx or \/designit-x\./
        );
        assert.match(
          read(path.join(project, ".claude", "skills", "q_setit-se", "SKILL.md")),
          /Run \/q_designit then \/q_planit;/
        );
      });
    });

    test("hook matcher comes from the row, not a hardcoded value", () => {
      withTempDir((root) => {
        const { pkg, project } = setup(root);
        const hostsFile = path.join(pkg, "references", "hosts.json");
        const table = JSON.parse(read(hostsFile));
        for (const h of table.hosts) if (h.id === "codex") h.hooksMatcher = "clear|fork";
        fs.writeFileSync(hostsFile, JSON.stringify(table));
        assert.equal(runCli(["install"], { cwd: project, packageRoot: pkg }).status, 0);
        assert.equal(JSON.parse(read(hooksPath(project))).hooks.SessionStart[0].matcher, "clear|fork");
      });
    });

    test("merges beside a foreign hook and keeps unrelated keys; second install is idempotent", () => {
      withTempDir((root) => {
        const { pkg, project } = setup(root);
        fs.mkdirSync(path.join(project, ".codex"));
        fs.writeFileSync(
          hooksPath(project),
          JSON.stringify({
            description: "mine",
            hooks: {
              SessionStart: [
                { matcher: "clear", hooks: [{ type: "command", command: "echo foreign" }] },
              ],
              Stop: [{ hooks: [{ type: "command", command: "echo stop" }] }],
            },
          })
        );
        assert.equal(runCli(["install"], { cwd: project, packageRoot: pkg }).status, 0);
        assert.equal(runCli(["install"], { cwd: project, packageRoot: pkg }).status, 0);
        const data = JSON.parse(read(hooksPath(project)));
        assert.equal(data.description, "mine");
        assert.equal(data.hooks.Stop[0].hooks[0].command, "echo stop");
        assert.equal(data.hooks.SessionStart.length, 2);
        assert.equal(data.hooks.SessionStart[0].hooks[0].command, "echo foreign");
        assert.equal(data.hooks.SessionStart[1].hooks[0].command, ".seh/scripts/check-update --host codex");
      });
    });

    test("uninstall removes only seh entries: foreign hook and foreign skills survive", () => {
      withTempDir((root) => {
        const { pkg, project } = setup(root);
        fs.mkdirSync(path.join(project, ".codex"));
        fs.writeFileSync(
          hooksPath(project),
          JSON.stringify({
            hooks: {
              SessionStart: [
                { matcher: "clear", hooks: [{ type: "command", command: "echo foreign" }] },
              ],
            },
          })
        );
        const foreign = path.join(project, ".agents", "skills", "other-tool", "SKILL.md");
        fs.mkdirSync(path.dirname(foreign), { recursive: true });
        fs.writeFileSync(foreign, "keep me\n");
        assert.equal(runCli(["install"], { cwd: project, packageRoot: pkg }).status, 0);
        const result = runCli(["uninstall"], { cwd: project, packageRoot: pkg });
        assert.equal(result.status, 0, result.stderr);
        assert.equal(read(foreign), "keep me\n");
        assert.equal(exists(path.join(project, ".agents", "skills", "_setit-se")), false);
        const data = JSON.parse(read(hooksPath(project)));
        assert.equal(data.hooks.SessionStart.length, 1);
        assert.equal(data.hooks.SessionStart[0].hooks[0].command, "echo foreign");
      });
    });

    test("uninstall in a clean project leaves no .agents or .codex dirs", () => {
      withTempDir((root) => {
        const { pkg, project } = setup(root);
        assert.equal(runCli(["install"], { cwd: project, packageRoot: pkg }).status, 0);
        assert.equal(runCli(["uninstall"], { cwd: project, packageRoot: pkg }).status, 0);
        assert.equal(exists(path.join(project, ".agents")), false);
        assert.equal(exists(path.join(project, ".codex")), false);
      });
    });

    test("rejects an empty hooksMatcher in the host table", () => {
      withTempDir((root) => {
        const { pkg, project } = setup(root);
        const hostsFile = path.join(pkg, "references", "hosts.json");
        const table = JSON.parse(read(hostsFile));
        for (const h of table.hosts) if (h.id === "codex") h.hooksMatcher = "";
        fs.writeFileSync(hostsFile, JSON.stringify(table));
        const result = runCli(["install"], { cwd: project, packageRoot: pkg });
        assert.equal(result.status, 1);
        assert.match(result.stderr, /hooksMatcher/);
      });
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
      assert.equal(exists(path.join(project, ".seh")), false);
      assert.equal(exists(path.join(project, ".claude")), false);
      assert.equal(exists(path.join(project, ".cursor")), false);
      assert.equal(exists(path.join(project, ".opencode")), false);
    });
  });
});

describe("seh install --prefix", () => {
  const HOST_DIRS = [".claude", ".cursor", ".opencode"];

  function setupPackage(root) {
    const pkg = path.join(root, "pkg");
    const project = path.join(root, "project");
    fs.mkdirSync(pkg);
    fs.mkdirSync(project);
    makePackageRoot(pkg, { version: "1.2.3" });
    fs.writeFileSync(
      path.join(pkg, "skills", "setit-se", "SKILL.md"),
      "---\nname: setit-se\ndescription: x\n---\nRun /{{prefix}}doit then /{{prefix}}setit-se.\n"
    );
    fs.rmSync(path.join(pkg, "skills", "setit-se", "marker.txt"), { force: true });
    fs.writeFileSync(
      path.join(pkg, "agents", "a.md"),
      "go: /{{prefix}}runit\n"
    );
    return { pkg, project };
  }

  test("default prefix is _ : skill dir, frontmatter name, rendered text, PREFIX file", () => {
    withTempDir((root) => {
      const { pkg, project } = setupPackage(root);
      const result = runCli(["install"], { cwd: project, packageRoot: pkg });
      assert.equal(result.status, 0, result.stderr);
      for (const host of HOST_DIRS) {
        const file = path.join(project, host, "skills", "_setit-se", "SKILL.md");
        assert.equal(
          read(file),
          "---\nname: _setit-se\ndescription: x\n---\nRun /_doit then /_setit-se.\n"
        );
        assert.equal(exists(path.join(project, host, "skills", "setit-se")), false);
      }
      assert.equal(read(path.join(project, ".seh", "PREFIX")), "_\n");
      assert.equal(read(path.join(project, ".seh", "agents", "a.md")), "go: /_runit\n");
      assert.match(result.stdout, /Next: run \/_setit-se in the project/);
    });
  });

  test("custom prefix (both flag forms) names dir, name, text and next-step line", () => {
    for (const args of [["install", "--prefix", "my-"], ["install", "--prefix=my-"]]) {
      withTempDir((root) => {
        const { pkg, project } = setupPackage(root);
        const result = runCli(args, { cwd: project, packageRoot: pkg });
        assert.equal(result.status, 0, result.stderr);
        for (const host of HOST_DIRS) {
          const file = path.join(project, host, "skills", "my-setit-se", "SKILL.md");
          assert.match(read(file), /^---\nname: my-setit-se\n/);
          assert.match(read(file), /Run \/my-doit then \/my-setit-se\./);
          assert.equal(exists(path.join(project, host, "skills", "_setit-se")), false);
        }
        assert.equal(read(path.join(project, ".seh", "PREFIX")), "my-\n");
        assert.equal(read(path.join(project, ".seh", "agents", "a.md")), "go: /my-runit\n");
        assert.match(result.stdout, /Next: run \/my-setit-se in the project/);
      });
    }
  });

  test('--prefix "" installs unprefixed skill', () => {
    withTempDir((root) => {
      const { pkg, project } = setupPackage(root);
      const result = runCli(["install", "--prefix", ""], { cwd: project, packageRoot: pkg });
      assert.equal(result.status, 0, result.stderr);
      const file = path.join(project, ".claude", "skills", "setit-se", "SKILL.md");
      assert.match(read(file), /^---\nname: setit-se\n/);
      assert.match(read(file), /Run \/doit then \/setit-se\./);
      assert.equal(read(path.join(project, ".seh", "PREFIX")), "\n");
      assert.equal(exists(path.join(project, ".claude", "skills", "_setit-se")), false);
    });
  });

  test("invalid prefix or missing value fails and writes nothing", () => {
    for (const args of [["install", "--prefix", "a b"], ["install", "--prefix", "../x"], ["install", "--prefix"]]) {
      withTempDir((root) => {
        const { pkg, project } = setupPackage(root);
        const result = runCli(args, { cwd: project, packageRoot: pkg });
        assert.equal(result.status, 1);
        assert.match(result.stderr, /--prefix/);
        assert.equal(exists(path.join(project, ".seh")), false);
        assert.equal(exists(path.join(project, ".claude")), false);
      });
    }
  });

  test("uninstall removes the skill made with the stored prefix and rejects --prefix", () => {
    withTempDir((root) => {
      const { pkg, project } = setupPackage(root);
      assert.equal(runCli(["install", "--prefix", "zz_"], { cwd: project, packageRoot: pkg }).status, 0);
      const rejected = runCli(["uninstall", "--prefix", "_"], { cwd: project, packageRoot: pkg });
      assert.equal(rejected.status, 1);
      assert.equal(exists(path.join(project, ".seh")), true);
      const result = runCli(["uninstall"], { cwd: project, packageRoot: pkg });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(exists(path.join(project, ".seh")), false);
      for (const host of HOST_DIRS) {
        assert.equal(exists(path.join(project, host, "skills", "zz_setit-se")), false);
      }
    });
  });

  test("reinstall with another prefix rewrites PREFIX and installs the new-name skill", () => {
    withTempDir((root) => {
      const { pkg, project } = setupPackage(root);
      runCli(["install", "--prefix", "a_"], { cwd: project, packageRoot: pkg });
      runCli(["install", "--prefix", "b_"], { cwd: project, packageRoot: pkg });
      assert.equal(read(path.join(project, ".seh", "PREFIX")), "b_\n");
      assert.equal(exists(path.join(project, ".claude", "skills", "b_setit-se")), true);
      for (const host of HOST_DIRS) {
        assert.equal(exists(path.join(project, host, "skills", "a_setit-se")), false);
      }
    });
  });

  test("reinstall without --prefix keeps the stored prefix, including empty", () => {
    for (const stored of ["my-", ""]) {
      withTempDir((root) => {
        const { pkg, project } = setupPackage(root);
        assert.equal(runCli(["install", "--prefix", stored], { cwd: project, packageRoot: pkg }).status, 0);
        const result = runCli(["install"], { cwd: project, packageRoot: pkg });
        assert.equal(result.status, 0);
        assert.equal(read(path.join(project, ".seh", "PREFIX")), `${stored}\n`);
        assert.match(result.stdout, new RegExp(`run /${stored}setit-se`));
        assert.equal(read(path.join(project, ".seh", "agents", "a.md")), `go: /${stored}runit\n`);
        for (const host of HOST_DIRS) {
          assert.equal(exists(path.join(project, host, "skills", `${stored}setit-se`)), true, host);
          assert.equal(exists(path.join(project, host, "skills", "_setit-se")), false, host);
        }
      });
    }
  });

  test("reinstall without --prefix falls back to _ when stored PREFIX is invalid", () => {
    withTempDir((root) => {
      const { pkg, project } = setupPackage(root);
      runCli(["install", "--prefix", "a_"], { cwd: project, packageRoot: pkg });
      fs.writeFileSync(path.join(project, ".seh", "PREFIX"), "../x\n");
      assert.equal(runCli(["install"], { cwd: project, packageRoot: pkg }).status, 0);
      assert.equal(read(path.join(project, ".seh", "PREFIX")), "_\n");
      assert.equal(exists(path.join(project, ".claude", "skills", "_setit-se")), true);
    });
  });

  const COMMAND_DIRS = { ".claude": false, ".cursor": false, ".opencode": true };

  function commandFile(project, host, prefix) {
    return path.join(project, host, "commands", `${prefix}setit-se.md`);
  }

  test("install writes the setup command only for hosts with commandsDir, named and pointing by prefix", () => {
    for (const prefix of ["_", "my-", ""]) {
      withTempDir((root) => {
        const { pkg, project } = setupPackage(root);
        fs.writeFileSync(
          path.join(pkg, "skills", "setit-se", "SKILL.md"),
          "---\nname: setit-se\ndescription: Configure seh; run /{{prefix}}setit-se again later.\n---\nbody\n"
        );
        const result = runCli(["install", "--prefix", prefix], { cwd: project, packageRoot: pkg });
        assert.equal(result.status, 0, result.stderr);
        for (const [host, has] of Object.entries(COMMAND_DIRS)) {
          assert.equal(exists(commandFile(project, host, prefix)), has, `${host} ${prefix}`);
          if (!has) {
            assert.equal(exists(path.join(project, host, "commands")), false, host);
          }
        }
        const text = read(commandFile(project, ".opencode", prefix));
        assert.match(
          text,
          new RegExp(`^---\\ndescription: Configure seh; run /${prefix}setit-se again later\\.\\n---\\n`)
        );
        assert.ok(text.includes(`skill \`${prefix}setit-se\``), text);
        assert.match(text, /\$ARGUMENTS/);
        assert.doesNotMatch(text, /\{\{/);
      });
    }
  });

  test("each host command names its own host row id", () => {
    withTempDir((root) => {
      const { pkg, project } = setupPackage(root);
      const hostsFile = path.join(pkg, "references", "hosts.json");
      const table = JSON.parse(read(hostsFile));
      for (const host of table.hosts) {
        if (host.id === "cursor") host.commandsDir = ".cursor/cmds";
      }
      fs.writeFileSync(hostsFile, `${JSON.stringify(table, null, 2)}\n`);
      assert.equal(runCli(["install"], { cwd: project, packageRoot: pkg }).status, 0);
      const cursorCmd = read(path.join(project, ".cursor", "cmds", "_setit-se.md"));
      const opencodeCmd = read(commandFile(project, ".opencode", "_"));
      assert.match(cursorCmd, /^Host: `cursor` /m);
      assert.match(opencodeCmd, /^Host: `opencode` /m);
      assert.equal(exists(path.join(project, ".claude", "commands")), false);
    });
  });

  test("second install rewrites the setup command in place and keeps other commands", () => {
    withTempDir((root) => {
      const { pkg, project } = setupPackage(root);
      assert.equal(runCli(["install"], { cwd: project, packageRoot: pkg }).status, 0);
      const first = read(commandFile(project, ".opencode", "_"));
      fs.writeFileSync(path.join(project, ".opencode", "commands", "mine.md"), "keep\n");
      assert.equal(runCli(["install"], { cwd: project, packageRoot: pkg }).status, 0);
      assert.equal(read(commandFile(project, ".opencode", "_")), first);
      assert.deepEqual(
        fs.readdirSync(path.join(project, ".opencode", "commands")).sort(),
        ["_setit-se.md", "mine.md"]
      );
    });
  });

  test("reinstall with another prefix moves the setup command and keeps other commands", () => {
    withTempDir((root) => {
      const { pkg, project } = setupPackage(root);
      assert.equal(runCli(["install", "--prefix", "a_"], { cwd: project, packageRoot: pkg }).status, 0);
      fs.writeFileSync(path.join(project, ".opencode", "commands", "a_mine.md"), "keep\n");
      assert.equal(runCli(["install", "--prefix", "b_"], { cwd: project, packageRoot: pkg }).status, 0);
      assert.equal(exists(commandFile(project, ".opencode", "a_")), false);
      assert.match(read(commandFile(project, ".opencode", "b_")), /skill `b_setit-se`/);
      assert.equal(read(path.join(project, ".opencode", "commands", "a_mine.md")), "keep\n");
    });
  });

  test("uninstall removes the setup command, keeps other commands, prunes an empty commands dir", () => {
    withTempDir((root) => {
      const { pkg, project } = setupPackage(root);
      assert.equal(runCli(["install", "--prefix", "zz_"], { cwd: project, packageRoot: pkg }).status, 0);
      fs.writeFileSync(path.join(project, ".opencode", "commands", "mine.md"), "keep\n");
      assert.equal(runCli(["uninstall"], { cwd: project, packageRoot: pkg }).status, 0);
      assert.equal(exists(commandFile(project, ".opencode", "zz_")), false);
      assert.equal(read(path.join(project, ".opencode", "commands", "mine.md")), "keep\n");

      fs.rmSync(path.join(project, ".opencode", "commands", "mine.md"));
      assert.equal(runCli(["install"], { cwd: project, packageRoot: pkg }).status, 0);
      assert.equal(runCli(["uninstall"], { cwd: project, packageRoot: pkg }).status, 0);
      assert.equal(exists(path.join(project, ".opencode", "commands")), false);
    });
  });

  test("fails when references/host-command.md is missing", () => {
    withTempDir((root) => {
      const { pkg, project } = setupPackage(root);
      fs.rmSync(path.join(pkg, "references", "host-command.md"));
      const result = runCli(["install"], { cwd: project, packageRoot: pkg });
      assert.equal(result.status, 1);
      assert.match(result.stderr, /missing package file at references\/host-command\.md/);
    });
  });

  test("real package: no unrendered token left, work-skill templates keep source names", () => {
    withTempDir((project) => {
      const result = runCli(["install", "--prefix", "q_"], { cwd: project });
      assert.equal(result.status, 0, result.stderr);
      const walk = (d) =>
        fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
          e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]
        );
      for (const f of walk(path.join(project, ".seh"))) {
        assert.equal(read(f).includes("{{prefix}}"), false, f);
      }
      for (const name of ["planit", "designit", "doit", "checkit", "runit", "shipit", "grillit", "setit-se"]) {
        assert.equal(exists(path.join(project, ".seh", "skills", name, "SKILL.md")), true, name);
      }
      assert.match(read(path.join(project, ".claude", "skills", "q_setit-se", "SKILL.md")), /^---\nname: q_setit-se\n/);
      const runit = read(path.join(project, ".seh", "skills", "runit", "SKILL.md"));
      assert.match(runit, /^---\nname: runit\n/);
      assert.match(runit, /\/q_doit/);
      assert.match(runit, /Full path for \*\*one task\*\*/);
      assert.doesNotMatch(runit, /fanout-plan --skill/);
      assert.match(runit, /Fan-out child: yes/);
      const designit = read(path.join(project, ".seh", "skills", "designit", "SKILL.md"));
      assert.match(designit, /^---\nname: designit\n/);
      assert.match(designit, /\/q_designit/);
      assert.match(designit, /\/q_planit/);
      assert.match(designit, /BLOCKED: the Designer is disabled — enable it in \/q_setit-se/);
      assert.equal(exists(path.join(project, ".seh", "references", "design.design.md")), true);
      assert.match(designit, /Conventions file: docs\/designs\/ux-conventions\.md/);
      assert.equal(exists(path.join(project, ".seh", "references", "ux-conventions.md")), true);
      assert.match(read(path.join(project, ".seh", "references", "ux-conventions.md")), /## Deviations from ux-a11y/);
      assert.match(read(path.join(project, ".seh", "agents", "designer.md")), /Conventions-file contract/);
      assert.match(read(path.join(project, ".seh", "agents", "consultant.md")), /Deviations from ux-a11y/);
      const shipit = read(path.join(project, ".seh", "skills", "shipit", "SKILL.md"));
      assert.match(shipit, /^---\nname: shipit\n/);
      assert.match(shipit, /\/q_shipit/);
      assert.match(shipit, /\/q_runit/);
      assert.match(shipit, /fanout-plan --skill shipit/);
      assert.doesNotMatch(shipit, /Full path for \*\*one task\*\*/);
      assert.match(shipit, /-shipit\.md/);
      const walkNames = (d) =>
        fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
          e.isDirectory() ? walkNames(path.join(d, e.name)) : [e.name]
        );
      assert.deepEqual(walkNames(path.join(project, ".seh", "skills", "shipit")).filter((n) => /\.test\.js$/.test(n)), []);
    });
  });
});
