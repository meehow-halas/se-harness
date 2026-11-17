"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const {
  argvLogArgv,
  assertBlocked,
  assertOk,
  assertUnchanged,
  initGitRepo,
  pathHidingCommand,
  runScript,
  withTempDir,
  writeGhPrStub,
  writeHarnessConfig,
} = require("../test/helpers");

function withGh(cwd, stubOpts) {
  const bin = path.join(cwd, ".bin");
  const { logFile } = writeGhPrStub(bin, stubOpts);
  return {
    logFile,
    env: { PATH: `${bin}${path.delimiter}${process.env.PATH}` },
  };
}

function pr(over) {
  return {
    number: 1,
    state: "OPEN",
    url: "https://example.com/pr/1",
    headRefName: "ABC-1",
    baseRefName: "dev",
    mergedAt: null,
    mergeCommit: null,
    ...over,
  };
}

function run(prs, { base = "dev", task = "ABC-1" } = {}) {
  return withTempDir((cwd) => {
    initGitRepo(cwd, { baseBranch: base });
    const { env, logFile } = withGh(cwd, { prs });
    const result = runScript("pr-state", [task], { cwd, env });
    return { result, log: argvLogArgv(logFile) };
  });
}

describe("pr-state", () => {
  test("open PR", () => {
    const { result } = run([pr({ url: "https://example.com/pr/4" })]);
    assertOk(result, { task: "ABC-1", state: "open", url: "https://example.com/pr/4" });
  });

  test("merged PR reports merged_at and merge_commit from gh", () => {
    const { result } = run([
      pr({
        state: "MERGED",
        url: "https://example.com/pr/5",
        mergedAt: "2026-11-17T10:11:12Z",
        mergeCommit: { oid: "abc123def456" },
      }),
    ]);
    assertOk(result, {
      state: "merged",
      url: "https://example.com/pr/5",
      merged_at: "2026-11-17T10:11:12Z",
      merge_commit: "abc123def456",
    });
  });

  test("no PR: state none, no url", () => {
    const { result } = run([]);
    const parsed = assertOk(result, { task: "ABC-1", state: "none" });
    assert.equal(parsed.fields.url, undefined);
  });

  test("closed-only is none", () => {
    const { result } = run([pr({ state: "CLOSED" })]);
    assertOk(result, { state: "none" });
  });

  test("open beats merged", () => {
    const { result } = run([
      pr({ number: 1, state: "MERGED", url: "https://example.com/pr/1", mergedAt: "2026-01-01T00:00:00Z" }),
      pr({ number: 2, headRefName: "ABC-1-2", url: "https://example.com/pr/2" }),
    ]);
    const parsed = assertOk(result, { state: "open", url: "https://example.com/pr/2" });
    assert.equal(parsed.fields.merged_at, undefined);
  });

  test("<task>-2 head counts", () => {
    const { result } = run([
      pr({ state: "MERGED", headRefName: "ABC-1-2", mergeCommit: { oid: "ff" }, mergedAt: "2026-02-02T00:00:00Z" }),
    ]);
    assertOk(result, { state: "merged", merge_commit: "ff" });
  });

  test("PR into another base is ignored; configured base used in lookup", () => {
    const { result, log } = run(
      [pr({ baseRefName: "dev" })],
      { base: "release-x" }
    );
    assertOk(result, { state: "none" });
    const list = log.find((a) => a[1] === "list");
    assert.equal(list[list.indexOf("--base") + 1], "release-x");
  });

  test("lookalike heads are ignored", () => {
    for (const head of ["ABC-1x", "ABC-1-abc", "ABC-1-1", "ABC-1-", "XABC-1", "ABC-1-2-3"]) {
      const { result } = run([pr({ headRefName: head })]);
      assertOk(result, { state: "none" });
    }
  });

  test("task name with regex characters is matched literally", () => {
    const { result } = run([pr({ headRefName: "ABCx1" })], { task: "ABC.1" });
    assertOk(result, { state: "none" });
  });

  test("read-only: only gh pr list is called", () => {
    const { log } = run([pr()]);
    assert.ok(log.length > 0);
    for (const args of log) {
      assert.deepEqual(args.slice(0, 2), ["pr", "list"]);
    }
  });

  test("git disabled: UNCHANGED git: disabled, no gh call", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      writeHarnessConfig(cwd, "");
      const { env, logFile } = withGh(cwd, { prs: [pr()] });
      const parsed = assertUnchanged(runScript("pr-state", ["ABC-1"], { cwd, env }));
      assert.equal(parsed.fields.git, "disabled");
      assert.deepEqual(argvLogArgv(logFile), []);
    });
  });

  test("BLOCKED when gh is not on PATH", () => {
    withTempDir((cwd) => {
      initGitRepo(cwd);
      const result = runScript("pr-state", ["ABC-1"], {
        cwd,
        env: { PATH: pathHidingCommand(cwd, "gh") },
      });
      assertBlocked(result, /gh is not available/);
    });
  });
});
