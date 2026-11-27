"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const SCRIPT = path.join(__dirname, "codex-adapters.cjs");
const AGENTS_DIR = path.join(__dirname, "..", "agents");
const lib = require(SCRIPT);

const py = spawnSync("python3", ["-c", "import tomllib"]);
const HAVE_TOML = py.status === 0;

// Parse TOML with Python's tomllib; returns the JSON object.
function parseToml(text) {
  const r = spawnSync(
    "python3",
    ["-c", "import sys,json,tomllib;print(json.dumps(tomllib.loads(sys.stdin.read())))"],
    { input: text, encoding: "utf8" }
  );
  assert.equal(r.status, 0, "TOML did not parse: " + r.stderr + "\n" + text);
  return JSON.parse(r.stdout);
}

function agentMd(name, desc, body) {
  return `---\nname: ${name}\ndescription: ${desc}\nmodel: haiku\ntools: Read, Bash\n---\n${body}`;
}

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "seh-codex-ad-"));
}

describe("agentToToml", { skip: !HAVE_TOML && "python3 tomllib unavailable" }, () => {
  const bodies = [
    "plain body\n",
    "back\\slash \\n \\u00e9 C:\\dir\\\n",
    "has ''' triple quotes ''' inside\n",
    "ends with a quote'\n",
    "ends with quotes and no newline''",
    'double "quotes" and """ triple double\n',
    "tab\there\n\nblank line above\n",
    "unicode ł 日本 ✓\n",
    "\nleading blank line\n",
  ];
  for (const body of bodies) {
    test(`round-trips body ${JSON.stringify(body)}`, () => {
      const out = lib.agentToToml(agentMd("x", "d", body), { model: "gpt-9" });
      const parsed = parseToml(out);
      // Leading blank lines after the frontmatter are dropped on purpose.
      const trimmed = body.replace(/^\n+/, "");
      const expected = trimmed.endsWith("\n") ? trimmed : trimmed + "\n";
      assert.equal(parsed.developer_instructions, expected);
      assert.equal(parsed.name, "x");
    });
  }

  test("name and description come from frontmatter, not constants", () => {
    const out = lib.agentToToml(
      agentMd("zed", 'Says "hi" with a \\ and \'quote\'', "b\n"),
      {}
    );
    const p = parseToml(out);
    assert.equal(p.name, "zed");
    assert.equal(p.description, 'Says "hi" with a \\ and \'quote\'');
  });

  test("model is written verbatim when set", () => {
    for (const m of ["gpt-6.1-sol", "some/odd-model:v2"]) {
      assert.equal(parseToml(lib.agentToToml(agentMd("a", "d", "b\n"), { model: m })).model, m);
    }
  });

  test("model key is absent when unset or blank; template model is not leaked", () => {
    for (const opts of [{}, { model: "" }, { model: "   " }]) {
      const out = lib.agentToToml(agentMd("a", "d", "b\n"), opts);
      assert.equal("model" in parseToml(out), false);
      assert.doesNotMatch(out, /haiku/);
    }
  });

  test("tools line is not emitted", () => {
    const out = lib.agentToToml(agentMd("a", "d", "b\n"), {});
    assert.deepEqual(Object.keys(parseToml(out)).sort(), ["description", "developer_instructions", "name"]);
  });

  test("readOnly prepends the read-only sentence only when asked", () => {
    const ro = parseToml(lib.agentToToml(agentMd("c", "d", "body\n"), { readOnly: true }));
    assert.ok(ro.developer_instructions.startsWith(lib.READ_ONLY_SENTENCE));
    assert.ok(ro.developer_instructions.endsWith("body\n"));
    const rw = parseToml(lib.agentToToml(agentMd("c", "d", "body\n"), {}));
    assert.equal(rw.developer_instructions, "body\n");
  });

  test("all shipped agent templates convert", () => {
    for (const role of ["architect", "designer", "implementer", "consultant", "reviewer"]) {
      const md = fs.readFileSync(path.join(AGENTS_DIR, role + ".md"), "utf8");
      const p = parseToml(lib.agentToToml(md, { model: "m" }));
      assert.equal(p.name, role);
      assert.ok(p.description.length > 0);
      assert.ok(p.developer_instructions.includes("You are the"));
    }
  });

  test("designer template: given model is written, empty model omits the key", () => {
    const md = fs.readFileSync(path.join(AGENTS_DIR, "designer.md"), "utf8");
    const withModel = parseToml(lib.agentToToml(md, { model: "gpt-designer-x" }));
    assert.equal(withModel.model, "gpt-designer-x");
    assert.equal(withModel.name, "designer");
    const without = parseToml(lib.agentToToml(md, { model: "" }));
    assert.equal("model" in without, false);
    assert.doesNotMatch(without.developer_instructions, /^model:/m);
  });

  test("rejects a file without frontmatter or name", () => {
    assert.throws(() => lib.agentToToml("no frontmatter\n"));
    assert.throws(() => lib.agentToToml("---\ndescription: d\n---\nb\n"));
  });
});

describe("codex-adapters CLI", { skip: !HAVE_TOML && "python3 tomllib unavailable" }, () => {
  test("agent prints valid TOML with the given model", () => {
    const dir = tmp();
    try {
      const f = path.join(dir, "a.md");
      fs.writeFileSync(f, agentMd("r", "d", "it's \\ ''' fine\n"));
      const r = spawnSync("node", [SCRIPT, "agent", f, "--model", "gpt-x", "--read-only"], { encoding: "utf8" });
      assert.equal(r.status, 0, r.stderr);
      const p = parseToml(r.stdout);
      assert.equal(p.model, "gpt-x");
      assert.ok(p.developer_instructions.includes("it's \\ ''' fine"));
      assert.ok(p.developer_instructions.startsWith(lib.READ_ONLY_SENTENCE));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("agent on a bad file exits non-zero with BLOCKED", () => {
    const dir = tmp();
    try {
      const f = path.join(dir, "a.md");
      fs.writeFileSync(f, "nothing\n");
      const r = spawnSync("node", [SCRIPT, "agent", f], { encoding: "utf8" });
      assert.notEqual(r.status, 0);
      assert.match(r.stderr, /^BLOCKED:/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("openaiYaml", () => {
  test("disables implicit invocation", () => {
    assert.equal(lib.openaiYaml(), "policy:\n  allow_implicit_invocation: false\n");
    const r = spawnSync("node", [SCRIPT, "openai-yaml"], { encoding: "utf8" });
    assert.equal(r.stdout, lib.openaiYaml());
  });
});

describe("rules section", () => {
  const entries = [
    { file: ".codex/rules/seh-python-tests.md", paths: ["**/test_*.py", "**/*_test.py"] },
    { file: ".codex/rules/seh-python-modules.md", paths: ["**/*.py"] },
  ];

  test("parseRulePaths reads the paths list, quoted or not", () => {
    assert.deepEqual(lib.parseRulePaths('---\npaths:\n  - "src/**/*.ts"\n  - lib/**\n---\n# T\n'), ["src/**/*.ts", "lib/**"]);
    assert.deepEqual(lib.parseRulePaths("# no frontmatter\n"), []);
  });

  test("inserts into an empty file and into existing text, keeping outside text byte for byte", () => {
    const fresh = lib.upsertRulesSection("", entries);
    assert.match(fresh, /`\.codex\/rules\/seh-python-modules\.md`.*`\*\*\/\*\.py`/);
    const existing = "# Project\n\nKeep me.\n\n## Other\n- x\n";
    const out = lib.upsertRulesSection(existing, entries);
    assert.ok(out.startsWith(existing.trimEnd() + "\n\n"));
    assert.equal(out.match(/seh:rules:start/g).length, 1);
  });

  test("idempotent: second run is identical, entry order does not matter", () => {
    const once = lib.upsertRulesSection("# P\n\ntext\n", entries);
    assert.equal(lib.upsertRulesSection(once, entries), once);
    assert.equal(lib.upsertRulesSection(once, entries.slice().reverse()), once);
  });

  test("replaces a stale section and leaves text before and after it alone", () => {
    const start = "before\n\n" + lib.buildRulesSection([{ file: "old/x.md", paths: [] }]) + "\n\nafter\n";
    const out = lib.upsertRulesSection(start, entries);
    assert.ok(out.startsWith("before\n\n"));
    assert.ok(out.endsWith("\n\nafter\n"));
    assert.doesNotMatch(out, /old\/x\.md/);
    assert.match(out, /seh-python-tests\.md/);
  });

  test("no entries removes the section and nothing else", () => {
    const withSec = lib.upsertRulesSection("keep A\n\nkeep B\n", entries);
    assert.equal(lib.upsertRulesSection(withSec, []), "keep A\n\nkeep B\n");
    assert.equal(lib.upsertRulesSection("keep\n", []), "keep\n");
    assert.equal(lib.upsertRulesSection(lib.upsertRulesSection("", entries), []), "");
  });

  test("keeps CRLF line endings of a CRLF file, including the outside text", () => {
    const crlf = "# A\r\n\r\nline\r\n";
    const out = lib.upsertRulesSection(crlf, entries);
    assert.ok(out.startsWith(crlf));
    assert.equal(out.replace(/\r\n/g, "").includes("\n"), false);
    assert.equal(lib.upsertRulesSection(out, entries), out);
    assert.equal(lib.upsertRulesSection(out, []), crlf);
  });

  test("a rule without paths applies to all work", () => {
    assert.match(lib.upsertRulesSection("", [{ file: "r/a.md", paths: [] }]), /`r\/a\.md` for all work/);
  });

  test("unbalanced or doubled markers are refused, not guessed", () => {
    assert.throws(() => lib.upsertRulesSection("<!-- seh:rules:start -->\nx\n", entries));
    assert.throws(() => lib.upsertRulesSection("x\n<!-- seh:rules:end -->\n", entries));
    const s = lib.buildRulesSection(entries);
    assert.throws(() => lib.upsertRulesSection(s + "\n" + s, entries));
  });

  test("CLI: builds the section from real rule files using the given rulesDir", () => {
    const dir = tmp();
    try {
      const rule = path.join(dir, "seh-go-core.md");
      fs.writeFileSync(rule, '---\npaths:\n  - "cmd/**/*.go"\n---\n# Go\n');
      const agents = path.join(dir, "AGENTS.md");
      fs.writeFileSync(agents, "# Mine\n");
      const r = spawnSync("node", [SCRIPT, "rules-section", agents, "custom/rulesdir/", rule], { encoding: "utf8" });
      assert.equal(r.status, 0, r.stderr);
      assert.ok(r.stdout.startsWith("# Mine\n\n"));
      assert.match(r.stdout, /`custom\/rulesdir\/seh-go-core\.md`.*`cmd\/\*\*\/\*\.go`/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  test("CLI: lesson files in rulesDir stay listed when only seh-* files are passed", () => {
    const dir = tmp();
    try {
      const rules = path.join(dir, "my", "rules");
      fs.mkdirSync(rules, { recursive: true });
      const seh = path.join(rules, "seh-go-core.md");
      const scoped = path.join(rules, "lesson-go-errors.md");
      fs.writeFileSync(seh, '---\npaths:\n  - "cmd/**/*.go"\n---\n# Go\n');
      fs.writeFileSync(scoped, '---\npaths:\n  - "pkg/**/*.go"\n---\n\n# Errors\n');
      fs.writeFileSync(path.join(rules, "lesson-general-naming.md"), "# Naming\n");
      fs.writeFileSync(path.join(rules, "own-rule.md"), "# Own\n");
      const agents = path.join(dir, "AGENTS.md");
      fs.writeFileSync(agents, "# Mine\n");
      const run = (...files) =>
        spawnSync("node", [SCRIPT, "rules-section", agents, "my/rules", ...files], { encoding: "utf8" });

      const r = run(seh);
      assert.equal(r.status, 0, r.stderr);
      assert.ok(r.stdout.startsWith("# Mine\n\n"));
      assert.match(r.stdout, /`my\/rules\/seh-go-core\.md`.*`cmd\/\*\*\/\*\.go`/);
      assert.match(r.stdout, /`my\/rules\/lesson-go-errors\.md`.*`pkg\/\*\*\/\*\.go`/);
      assert.match(r.stdout, /`my\/rules\/lesson-general-naming\.md` for all work/);
      assert.doesNotMatch(r.stdout, /own-rule/);

      // Passing a lesson file too does not list it twice.
      fs.writeFileSync(agents, r.stdout);
      const again = run(seh, scoped);
      assert.equal(again.stdout, r.stdout);

      // No rule file passed: the lessons alone keep the section.
      const none = run();
      assert.match(none.stdout, /lesson-go-errors/);
      assert.doesNotMatch(none.stdout, /seh-go-core/);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
