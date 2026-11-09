"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { runScript, withTempDir, writeFile } = require("../test/helpers");

const NOTICE =
  /dhs 1\.0\.0 is installed; 1\.2\.0 is available \(GitHub tag\)/;

function writeStub(dir, { tags = [], fail = false, countFile } = {}) {
  const script = path.join(dir, "git-ls-remote-stub");
  const lines = ["#!/bin/sh", "set -eu"];
  if (countFile) {
    lines.push(`printf called\\\\n >> ${JSON.stringify(countFile)}`);
  }
  if (fail) {
    lines.push("exit 1");
  } else {
    for (const tag of tags) {
      lines.push(`printf '%s\\t%s\\n' abc refs/tags/${tag}`);
    }
  }
  fs.writeFileSync(script, `${lines.join("\n")}\n`, { mode: 0o755 });
  return script;
}

function runCheck(cwd, args, env) {
  return runScript("check-update", args, {
    cwd,
    env: {
      DHS_CHECK_ROOT: cwd,
      ...env,
    },
  });
}

describe("check-update", () => {
  test("prints a Claude notice when a GitHub tag is strictly newer", () => {
    withTempDir((cwd) => {
      writeFile(cwd, ".dhs/VERSION", "1.0.0\n");
      const stub = writeStub(cwd, { tags: ["v0.9.0", "1.2.0", "not-a-version"] });
      const result = runCheck(cwd, ["--host", "claude-code"], {
        DHS_GIT_LS_REMOTE: stub,
        DHS_CHECK_NOW: "1000",
      });
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, NOTICE);
      assert.equal(result.stdout.includes("additional_context"), false);
    });
  });

  test("prints Cursor JSON when --host is cursor", () => {
    withTempDir((cwd) => {
      writeFile(cwd, ".dhs/VERSION", "1.0.0\n");
      const stub = writeStub(cwd, { tags: ["v1.2.0"] });
      const result = runCheck(cwd, ["--host", "cursor"], {
        DHS_GIT_LS_REMOTE: stub,
        DHS_CHECK_NOW: "1000",
      });
      assert.equal(result.status, 0, result.stderr);
      const payload = JSON.parse(result.stdout);
      assert.match(payload.additional_context, NOTICE);
    });
  });

  test("is silent when the installed version equals the highest tag", () => {
    withTempDir((cwd) => {
      writeFile(cwd, ".dhs/VERSION", "1.2.0\n");
      const stub = writeStub(cwd, { tags: ["v1.2.0"] });
      const result = runCheck(cwd, ["--host", "claude-code"], {
        DHS_GIT_LS_REMOTE: stub,
        DHS_CHECK_NOW: "1000",
      });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout, "");
    });
  });

  test("is silent when the installed version is already higher than tags", () => {
    withTempDir((cwd) => {
      writeFile(cwd, ".dhs/VERSION", "2.0.0\n");
      const stub = writeStub(cwd, { tags: ["1.9.9"] });
      const result = runCheck(cwd, ["--host", "claude-code"], {
        DHS_GIT_LS_REMOTE: stub,
        DHS_CHECK_NOW: "1000",
      });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout, "");
    });
  });

  test("is silent when .dhs/VERSION is missing", () => {
    withTempDir((cwd) => {
      const stub = writeStub(cwd, { tags: ["1.2.0"] });
      const result = runCheck(cwd, ["--host", "claude-code"], {
        DHS_GIT_LS_REMOTE: stub,
      });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout, "");
    });
  });

  test("is silent when git ls-remote fails", () => {
    withTempDir((cwd) => {
      writeFile(cwd, ".dhs/VERSION", "1.0.0\n");
      const stub = writeStub(cwd, { fail: true });
      const result = runCheck(cwd, ["--host", "claude-code"], {
        DHS_GIT_LS_REMOTE: stub,
        DHS_CHECK_NOW: "1000",
      });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stdout, "");
    });
  });

  test("reuses a fresh cache and does not call git ls-remote again", () => {
    withTempDir((cwd) => {
      writeFile(cwd, ".dhs/VERSION", "1.0.0\n");
      const countFile = path.join(cwd, "ls-remote-count");
      const stub = writeStub(cwd, { tags: ["1.2.0"], countFile });
      const first = runCheck(cwd, ["--host", "claude-code"], {
        DHS_GIT_LS_REMOTE: stub,
        DHS_CHECK_NOW: "1000",
        DHS_CHECK_TTL: "100",
      });
      assert.equal(first.status, 0, first.stderr);
      assert.match(first.stdout, NOTICE);

      const failing = writeStub(cwd, { fail: true, countFile });
      const second = runCheck(cwd, ["--host", "claude-code"], {
        DHS_GIT_LS_REMOTE: failing,
        DHS_CHECK_NOW: "1050",
        DHS_CHECK_TTL: "100",
      });
      assert.equal(second.status, 0, second.stderr);
      assert.match(second.stdout, NOTICE);
      assert.equal(fs.readFileSync(countFile, "utf8").trim(), "called");
    });
  });

  test("ignores non-semver tags when picking the highest", () => {
    withTempDir((cwd) => {
      writeFile(cwd, ".dhs/VERSION", "1.0.0\n");
      const stub = writeStub(cwd, { tags: ["nightly", "v1.0.10", "1.0.9"] });
      const result = runCheck(cwd, ["--host", "claude-code"], {
        DHS_GIT_LS_REMOTE: stub,
        DHS_CHECK_NOW: "1000",
      });
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /1\.0\.10 is available/);
    });
  });
});
