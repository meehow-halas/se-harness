"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  assertBlocked,
  assertOk,
  assertUnchanged,
  runScript,
  withTempDir,
  writeFile,
} = require("../test/helpers");

function localDate() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function writeConfig(cwd, body) {
  writeFile(cwd, "harness.config.json", body);
}

function readChangelog(cwd) {
  return fs.readFileSync(path.join(cwd, "CHANGELOG.md"), "utf8");
}

const EXISTING = [
  "# Changelog",
  "",
  "All notable changes.",
  "",
  "## [Unreleased]",
  "",
  "### Changed",
  "",
  "- earlier pending note",
  "",
  "## [2.0.1] - 2026-01-02",
  "",
  "### Fixed",
  "",
  "- old fix",
  "",
].join("\n");

describe("record-change", () => {
  test("agents.reportChange true appends one entry under Unreleased Changed", () => {
    withTempDir((cwd) => {
      writeConfig(cwd, JSON.stringify({ agents: { baseBranch: "trunk", reportChange: true } }));
      writeFile(cwd, "CHANGELOG.md", EXISTING);
      const result = runScript(
        "record-change",
        ["077-invoice-export", "--text", "export invoices as CSV"],
        { cwd }
      );
      assertOk(result, { task: "077-invoice-export", changelog: "CHANGELOG.md" });
      const body = readChangelog(cwd);
      assert.ok(
        body.includes(`- 077-invoice-export (${localDate()}): export invoices as CSV`),
        body
      );
      assert.ok(body.indexOf("export invoices as CSV") < body.indexOf("## [2.0.1]"), body);
      assert.ok(body.includes("- earlier pending note"), body);
      assert.ok(body.includes("- old fix"), body);
    });
  });

  test("agents.reportChange false writes nothing and reports the disabled state", () => {
    withTempDir((cwd) => {
      writeConfig(cwd, JSON.stringify({ agents: { reportChange: false, commitTrailer: "" } }));
      writeFile(cwd, "CHANGELOG.md", EXISTING);
      const before = readChangelog(cwd);
      const result = runScript(
        "record-change",
        ["laptop-stand-9", "--text", "should never be written"],
        { cwd }
      );
      assertUnchanged(result, { report: "disabled", task: "laptop-stand-9" });
      assert.equal(readChangelog(cwd), before);
      assert.equal(result.status, 0);
    });
  });

  test("a missing agents.reportChange key behaves as true", () => {
    withTempDir((cwd) => {
      writeConfig(cwd, JSON.stringify({ product: "x", agents: { baseBranch: "" } }));
      writeFile(cwd, "CHANGELOG.md", EXISTING);
      const result = runScript(
        "record-change",
        ["credit-memo-3", "--text", "add credit memo lookup"],
        { cwd }
      );
      assertOk(result);
      assert.ok(
        readChangelog(cwd).includes(`- credit-memo-3 (${localDate()}): add credit memo lookup`)
      );
    });
  });

  test("a missing harness.config.json behaves as true", () => {
    withTempDir((cwd) => {
      writeFile(cwd, "CHANGELOG.md", EXISTING);
      const result = runScript(
        "record-change",
        ["no-config-7", "--text", "no config file here"],
        { cwd }
      );
      assertOk(result);
      assert.ok(readChangelog(cwd).includes("no config file here"));
    });
  });

  for (const [label, value] of [
    ["string", '"yes"'],
    ["number", "1"],
    ["null", "null"],
  ]) {
    test(`a non-boolean agents.reportChange (${label}) is BLOCKED and writes nothing`, () => {
      withTempDir((cwd) => {
        writeConfig(cwd, `{"agents":{"reportChange":${value}}}`);
        writeFile(cwd, "CHANGELOG.md", EXISTING);
        const before = readChangelog(cwd);
        assertBlocked(
          runScript("record-change", ["bad-flag-1", "--text", "text"], { cwd }),
          /reportChange/
        );
        assert.equal(readChangelog(cwd), before);
      });
    });
  }

  test("unreadable harness.config.json is BLOCKED and writes nothing", () => {
    withTempDir((cwd) => {
      writeConfig(cwd, "{not json\n");
      writeFile(cwd, "CHANGELOG.md", EXISTING);
      const before = readChangelog(cwd);
      assertBlocked(
        runScript("record-change", ["broken-json-2", "--text", "text"], { cwd }),
        /unreadable|not a boolean/
      );
      assert.equal(readChangelog(cwd), before);
    });
  });

  test("missing --text is BLOCKED", () => {
    withTempDir((cwd) => {
      writeFile(cwd, "CHANGELOG.md", EXISTING);
      assertBlocked(runScript("record-change", ["no-text-4"], { cwd }), /no text/);
    });
  });

  test("multi-line --text is BLOCKED and writes nothing", () => {
    withTempDir((cwd) => {
      writeFile(cwd, "CHANGELOG.md", EXISTING);
      const before = readChangelog(cwd);
      assertBlocked(
        runScript("record-change", ["multi-line-5", "--text", "first\nsecond"], { cwd }),
        /one line/
      );
      assert.equal(readChangelog(cwd), before);
    });
  });

  test("creates the Unreleased Changed section when the file has none", () => {
    withTempDir((cwd) => {
      writeFile(cwd, "CHANGELOG.md", "# Changelog\n\n## [0.9.0] - 2025-12-01\n\n### Added\n\n- first\n");
      assertOk(runScript("record-change", ["new-section-6", "--text", "new section"], { cwd }));
      const body = readChangelog(cwd);
      const unreleased = body.indexOf("## [Unreleased]");
      const old = body.indexOf("## [0.9.0]");
      assert.ok(unreleased >= 0 && unreleased < old, body);
      assert.ok(body.slice(unreleased, old).includes("- new-section-6"), body);
    });
  });

  test("headings without brackets: the entry goes above the newest version, not to the end", () => {
    withTempDir((cwd) => {
      writeFile(cwd, "CHANGELOG.md", "# Changelog\n\n## v2.1.0\n\n- newer\n\n## v2.0.0\n\n- older\n");
      assertOk(runScript("record-change", ["plain-heads-7", "--text", "plain heading change"], { cwd }));
      const body = readChangelog(cwd);
      const entry = body.indexOf("- plain-heads-7");
      assert.ok(entry >= 0 && entry < body.indexOf("## v2.1.0"), body);
    });
  });

  test("an existing plain Unreleased heading is reused", () => {
    withTempDir((cwd) => {
      writeFile(cwd, "CHANGELOG.md", "# Changelog\n\n## Unreleased\n\n### Changed\n\n- earlier\n\n## 3.0.0\n\n- shipped\n");
      assertOk(runScript("record-change", ["plain-unrel-9", "--text", "reuse plain unreleased"], { cwd }));
      const body = readChangelog(cwd);
      assert.equal(body.split(/^## \[?Unreleased/im).length - 1, 1, body);
      const entry = body.indexOf("- plain-unrel-9");
      assert.ok(entry > body.indexOf("## Unreleased") && entry < body.indexOf("## 3.0.0"), body);
    });
  });

  test("creates CHANGELOG.md when it does not exist", () => {
    withTempDir((cwd) => {
      assertOk(runScript("record-change", ["fresh-file-8", "--text", "first ever entry"], { cwd }));
      const body = readChangelog(cwd);
      assert.ok(body.includes("## [Unreleased]"), body);
      assert.ok(body.includes("first ever entry"), body);
    });
  });

  test("two runs add two bullets under one Changed heading", () => {
    withTempDir((cwd) => {
      writeFile(cwd, "CHANGELOG.md", EXISTING);
      assertOk(runScript("record-change", ["run-a-10", "--text", "alpha change"], { cwd }));
      assertOk(runScript("record-change", ["run-b-11", "--text", "beta change"], { cwd }));
      const body = readChangelog(cwd);
      assert.equal(body.split("### Changed").length - 1, 1, body);
      assert.ok(body.includes("alpha change") && body.includes("beta change"), body);
    });
  });
});
