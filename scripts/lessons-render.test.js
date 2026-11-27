"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const { REPO_ROOT, assertBlocked, assertOk, assertUnchanged, git, runScript, withTempDir, writeFile } = require("../test/helpers");

// Made-up directories: a value hardcoded from the real table fails these tests.
const HOSTS = [
  { id: "alpha", rulesDir: ".alpha/guides", rulesExt: ".md" },
  { id: "beta", rulesDir: ".beta/guides", rulesExt: ".mdc" },
  { id: "opencode", rulesDir: ".opencode/lore", rulesExt: ".md" },
  { id: "delta", rulesDir: ".delta/guides", rulesExt: ".md", rulesIndex: "agents-md" },
];

const GLOB_A = "src/**/*.cs";
const GLOB_B = "tests/**/*.cs";
const SCOPED_BODY = "# Async calls\n\n## Rule\n\n- Await every task.\n";
const GENERAL_BODY = "# Commit: language\n\n## Rule\n\n- Write commits in English.\n";
const SCOPED = `---\n# comment\ngroup: csharp\ntopic: async-calls\npaths:\n  - "${GLOB_A}"\n  - '${GLOB_B}'\n---\n\n${SCOPED_BODY}`;
const GENERAL = `---\ngroup: general\ntopic: commit-language\n---\n\n${GENERAL_BODY}`;
const SCOPED_SRC = "docs/lessons/csharp/async-calls.md";
const GENERAL_SRC = "docs/lessons/general/commit-language.md";

function project(dir, { hosts = HOSTS, lessons = true } = {}) {
  writeFile(dir, ".seh/references/hosts.json", JSON.stringify({ hosts }));
  if (lessons) {
    writeFile(dir, SCOPED_SRC, SCOPED);
    writeFile(dir, GENERAL_SRC, GENERAL);
    writeFile(dir, "docs/lessons/LESSONS.md", "# Lessons\n");
  }
  return dir;
}

function render(dir, args = ["--root", dir]) {
  return runScript("lessons-render", args, { cwd: dir });
}

function read(dir, rel) {
  return fs.readFileSync(path.join(dir, rel), "utf8");
}

function exists(dir, rel) {
  return fs.existsSync(path.join(dir, rel));
}

function snapshot(dir) {
  const out = {};
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else out[path.relative(dir, full)] = `${fs.statSync(full).mtimeMs}:${fs.readFileSync(full, "utf8")}`;
    }
  };
  walk(dir);
  return out;
}

function lines(result, kind) {
  return result.stdout
    .split("\n")
    .filter((l) => l.startsWith(`${kind}: `))
    .map((l) => l.slice(kind.length + 2))
    .sort();
}

describe("lessons-render", () => {
  test("renders every lesson for every host row with that row's frontmatter", () => {
    withTempDir((dir) => {
      project(dir);
      const result = render(dir);
      assertOk(result);

      const paths = `---\npaths:\n  - "${GLOB_A}"\n  - "${GLOB_B}"\n---\n\n${SCOPED_BODY}`;
      for (const d of [".alpha/guides", ".opencode/lore", ".delta/guides"]) {
        assert.equal(read(dir, `${d}/lesson-csharp-async-calls.md`), paths, d);
        assert.equal(read(dir, `${d}/lesson-general-commit-language.md`), GENERAL_BODY, d);
      }
      assert.equal(
        read(dir, ".beta/guides/lesson-csharp-async-calls.mdc"),
        `---\ndescription: "Async calls"\nglobs: ${GLOB_A},${GLOB_B}\nalwaysApply: false\n---\n\n${SCOPED_BODY}`
      );
      assert.equal(
        read(dir, ".beta/guides/lesson-general-commit-language.mdc"),
        `---\ndescription: "Commit: language"\nalwaysApply: true\n---\n\n${GENERAL_BODY}`
      );
      assert.equal(exists(dir, ".beta/guides/lesson-csharp-async-calls.md"), false);

      assert.deepEqual(JSON.parse(read(dir, ".opencode/opencode.json")), { instructions: [".opencode/lore/*.md"] });
      const agents = read(dir, "AGENTS.md");
      assert.match(agents, new RegExp("`\\.delta/guides/lesson-csharp-async-calls\\.md` when working on `src"));
      assert.match(agents, /`\.delta\/guides\/lesson-general-commit-language\.md` for all work/);
      assert.doesNotMatch(agents, /\.alpha/);

      const rules = [".alpha/guides", ".opencode/lore", ".delta/guides"].flatMap((d) => [
        `${d}/lesson-csharp-async-calls.md`,
        `${d}/lesson-general-commit-language.md`,
      ]);
      assert.deepEqual(
        lines(result, "written"),
        [
          ...rules,
          ".beta/guides/lesson-csharp-async-calls.mdc",
          ".beta/guides/lesson-general-commit-language.mdc",
          ".opencode/opencode.json",
          "AGENTS.md",
        ].sort()
      );
    });
  });

  test("a second run is UNCHANGED and touches no file", () => {
    withTempDir((dir) => {
      project(dir);
      assertOk(render(dir));
      const before = snapshot(dir);
      assertUnchanged(render(dir));
      assert.deepEqual(snapshot(dir), before);
    });
  });

  test("a changed source rewrites only the files it affects", () => {
    withTempDir((dir) => {
      project(dir);
      assertOk(render(dir));
      writeFile(dir, GENERAL_SRC, GENERAL.replace("in English", "in Polish"));
      const result = render(dir);
      assertOk(result);
      assert.equal(lines(result, "written").length, 4, result.stdout);
      assert.ok(lines(result, "written").every((p) => p.includes("lesson-general-")), result.stdout);
      assert.match(read(dir, ".beta/guides/lesson-general-commit-language.mdc"), /in Polish/);
    });
  });

  test("removing a source removes only its lesson files and its pointer", () => {
    withTempDir((dir) => {
      project(dir);
      writeFile(dir, ".alpha/guides/seh-csharp-language.md", "# pack\n");
      writeFile(dir, ".alpha/guides/own.md", "# own\n");
      writeFile(dir, ".alpha/guides/lesson-notes.txt", "not a rule\n");
      writeFile(dir, ".delta/guides/seh-csharp-language.md", "# pack\n");
      assertOk(render(dir));
      fs.rmSync(path.join(dir, SCOPED_SRC));

      const result = render(dir);
      assertOk(result);
      assert.deepEqual(lines(result, "removed"), [
        ".alpha/guides/lesson-csharp-async-calls.md",
        ".beta/guides/lesson-csharp-async-calls.mdc",
        ".delta/guides/lesson-csharp-async-calls.md",
        ".opencode/lore/lesson-csharp-async-calls.md",
      ]);
      for (const p of lines(result, "removed")) assert.equal(exists(dir, p), false, p);
      assert.deepEqual(fs.readdirSync(path.join(dir, ".alpha/guides")).sort(), [
        "lesson-general-commit-language.md",
        "lesson-notes.txt",
        "own.md",
        "seh-csharp-language.md",
      ]);
      const agents = read(dir, "AGENTS.md");
      assert.doesNotMatch(agents, /async-calls/);
      assert.match(agents, /seh-csharp-language/);
      assert.match(agents, /lesson-general-commit-language/);
    });
  });

  test("removing every lesson clears rule files and the section, keeping other text", () => {
    withTempDir((dir) => {
      project(dir);
      writeFile(dir, "AGENTS.md", "# Mine\n\nkeep\n");
      assertOk(render(dir));
      fs.rmSync(path.join(dir, "docs/lessons"), { recursive: true });
      assertOk(render(dir));
      assert.equal(read(dir, "AGENTS.md"), "# Mine\n\nkeep\n");
      assert.deepEqual(fs.readdirSync(path.join(dir, ".beta/guides")), []);
      assertUnchanged(render(dir));
    });
  });

  test("without lessons nothing is created and the seh section is left to setup", () => {
    withTempDir((dir) => {
      project(dir, { lessons: false });
      writeFile(dir, ".delta/guides/seh-csharp-language.md", "# pack\n");
      writeFile(dir, "AGENTS.md", "# Mine\n");
      const before = snapshot(dir);
      assertUnchanged(render(dir));
      assert.deepEqual(snapshot(dir), before);
    });
  });

  test("Codex section lists seh-* and lesson-* files and keeps text outside the markers", () => {
    withTempDir((dir) => {
      project(dir);
      writeFile(dir, ".delta/guides/seh-go-core.md", '---\npaths:\n  - "cmd/**/*.go"\n---\n# Go\n');
      writeFile(dir, "AGENTS.md", "# Mine\n\n<!-- seh:rules:start -->\nold\n<!-- seh:rules:end -->\n\ntail\n");
      assertOk(render(dir));
      const agents = read(dir, "AGENTS.md");
      assert.ok(agents.startsWith("# Mine\n\n<!-- seh:rules:start -->\n"));
      assert.ok(agents.endsWith("<!-- seh:rules:end -->\n\ntail\n"));
      assert.doesNotMatch(agents, /^old$/m);
      assert.match(agents, /seh-go-core\.md` when working on `cmd/);
      assert.match(agents, /lesson-csharp-async-calls/);
      assert.match(agents, /lesson-general-commit-language/);
    });
  });

  test("the OpenCode glob is added once and other settings are kept", () => {
    withTempDir((dir) => {
      project(dir);
      writeFile(
        dir,
        ".opencode/opencode.json",
        JSON.stringify({ model: "x/y", instructions: ["docs/a.md", ".opencode/lore/*.md", ".opencode/lore/*.md"] })
      );
      writeFile(dir, "opencode.json", "{ not touched");
      assertOk(render(dir));
      assert.deepEqual(JSON.parse(read(dir, ".opencode/opencode.json")), {
        model: "x/y",
        instructions: ["docs/a.md", ".opencode/lore/*.md"],
      });
      assert.equal(read(dir, "opencode.json"), "{ not touched");
    });
  });

  test("an OpenCode config that already has the glob keeps its formatting", () => {
    withTempDir((dir) => {
      project(dir);
      const body = '{"instructions":[".opencode/lore/*.md","b.md"]}';
      writeFile(dir, ".opencode/opencode.json", body);
      assertOk(render(dir));
      assert.equal(read(dir, ".opencode/opencode.json"), body);
    });
  });

  const blockers = [
    ["paths in a general lesson", GENERAL_SRC, GENERAL.replace("topic: commit-language\n", 'topic: commit-language\npaths:\n  - "**"\n'), /general/],
    ["no frontmatter", SCOPED_SRC, "# Async\n", /frontmatter/],
    ["group not matching the folder", SCOPED_SRC, SCOPED.replace("group: csharp", "group: angular"), /group must be csharp/],
    ["topic not matching the file", SCOPED_SRC, SCOPED.replace("topic: async-calls", "topic: other"), /topic must be async-calls/],
    ["inline paths", SCOPED_SRC, '---\ngroup: csharp\ntopic: async-calls\npaths: ["a"]\n---\n# A\n', /paths must be a list/],
    ["empty paths", SCOPED_SRC, "---\ngroup: csharp\ntopic: async-calls\npaths:\n---\n# A\n", /paths is empty/],
    ["unknown key", SCOPED_SRC, SCOPED.replace("paths:", "path:"), /unknown key path|unreadable/],
    ["bad group name", "docs/lessons/C_Sharp/x.md", "---\ngroup: C_Sharp\ntopic: x\n---\n", /bad group name/],
    ["bad topic name", "docs/lessons/csharp/Bad Name.md", "---\ngroup: csharp\ntopic: Bad Name\n---\n", /bad topic name/],
    ["nested folder", "docs/lessons/csharp/deep/x.md", "x\n", /bad topic name/],
    ["colliding rule names", "docs/lessons/csharp-async/calls.md", "---\ngroup: csharp-async\ntopic: calls\n---\n", /both render as/],
    ["invalid OpenCode JSON", ".opencode/opencode.json", "{ nope", /invalid JSON at \.opencode\/opencode\.json/],
    ["unbalanced marker", "AGENTS.md", "<!-- seh:rules:start -->\n", /unbalanced/],
  ];

  for (const [name, rel, body, expected] of blockers) {
    test(`BLOCKED on ${name}, writing and removing nothing`, () => {
      withTempDir((dir) => {
        project(dir);
        writeFile(dir, ".alpha/guides/lesson-old-gone.md", "stale\n");
        writeFile(dir, rel, body);
        const before = snapshot(dir);
        assertBlocked(render(dir), expected);
        assert.deepEqual(snapshot(dir), before);
      });
    });
  }

  test("BLOCKED when hosts.json is missing, and on bad arguments", () => {
    withTempDir((dir) => {
      assertBlocked(render(dir), /hosts\.json is missing/);
      project(dir);
      assertBlocked(render(dir, ["--root"]), /--root/);
      assertBlocked(render(dir, ["--force"]), /unknown argument/);
      assertBlocked(render(dir, ["--root", path.join(dir, "nope")]), /not a directory/);
    });
  });

  test("without --root it renders the git toplevel; --root wins over the current directory", () => {
    withTempDir((dir) => {
      project(dir);
      git(dir, ["init"]);
      const sub = path.join(dir, "docs");
      assertOk(runScript("lessons-render", [], { cwd: sub }));
      assert.ok(exists(dir, ".alpha/guides/lesson-general-commit-language.md"));
      withTempDir((other) => {
        project(other);
        assertOk(runScript("lessons-render", ["--root", other], { cwd: dir }));
        assert.ok(exists(other, ".alpha/guides/lesson-general-commit-language.md"));
      });
    });
  });

  test("installed under .seh/ it runs in an ES module project and ignores lessons.enabled", () => {
    withTempDir((dir) => {
      writeFile(dir, "package.json", '{"type":"module"}\n');
      writeFile(dir, "harness.config.json", '{"agents":{"lessons":{"enabled":false}}}\n');
      project(dir);
      for (const rel of ["scripts/lessons-render", "scripts/lessons-render.cjs", "scripts/lib.sh", "references/codex-adapters.cjs"]) {
        writeFile(dir, `.seh/${rel}`, fs.readFileSync(path.join(REPO_ROOT, rel), "utf8"));
      }
      const r = spawnSync("sh", [".seh/scripts/lessons-render"], { cwd: dir, encoding: "utf8" });
      assert.equal(r.status, 0, r.stdout + r.stderr);
      assert.match(r.stdout, /^OK\n/);
      assert.ok(exists(dir, ".delta/guides/lesson-csharp-async-calls.md"));
    });
  });
});
