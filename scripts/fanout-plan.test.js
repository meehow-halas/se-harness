"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");

const { runScript, withTempDir, writeHarnessConfig } = require("../test/helpers");

function plan(args) {
  return runScript("fanout-plan", args);
}

function fields(result) {
  assert.equal(result.status, 0, result.stderr + result.stdout);
  const lines = result.stdout.split("\n");
  assert.equal(lines[0], "OK", result.stdout);
  const out = { mode: null, max: null, ready: null, lines: [] };
  for (const line of lines.slice(1)) {
    if (line === "") continue;
    const m = line.match(/^(mode|max|ready): ?(.*)$/);
    if (m) {
      out[m[1]] = m[2];
    } else {
      out.lines.push(line);
    }
  }
  out.ready = out.ready === "" ? [] : out.ready.split(",");
  return out;
}

function blockedResult(args) {
  const result = plan(args);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout, /^BLOCKED: .* — /);
  return result.stdout;
}

describe("fanout-plan", () => {
  test("parallel skill starts up to max keys and queues the rest", () => {
    const out = fields(plan(["--skill", "doit", "--keys", "QA-11,QB-22,QC-33", "--max", "2"]));
    assert.equal(out.mode, "parallel");
    assert.equal(out.max, "2");
    assert.deepEqual(out.ready, ["QA-11", "QB-22"]);
    assert.deepEqual(out.lines, ["queued: QC-33 (max 2 reached)"]);
  });

  test("planit runs all independent keys in parallel under default max", () => {
    const keys = "PL-1,PL-2,PL-3,PL-4";
    const out = fields(plan(["--skill", "planit", "--keys", keys]));
    assert.equal(out.mode, "parallel");
    assert.equal(out.max, "4");
    assert.deepEqual(out.ready, ["PL-1", "PL-2", "PL-3", "PL-4"]);
  });

  test("checkit review stays parallel", () => {
    const out = fields(plan(["--skill", "checkit", "--variant", "review", "--keys", "RV-5,RW-6"]));
    assert.equal(out.mode, "parallel");
    assert.deepEqual(out.ready, ["RV-5", "RW-6"]);
  });

  test("checkit update stays parallel", () => {
    const out = fields(plan(["--skill", "checkit", "--variant", "update", "--keys", "UP-5,UQ-6"]));
    assert.equal(out.mode, "parallel");
    assert.deepEqual(out.ready, ["UP-5", "UQ-6"]);
  });

  test("checkit close is no longer a variant", () => {
    const out = blockedResult([
      "--skill", "checkit", "--variant", "close", "--keys", "CL-8,CM-9", "--max", "5",
    ]);
    assert.match(out, /unknown variant close/);
  });

  test("dependent key waits for its in-invocation dependency, sibling still starts", () => {
    const out = fields(
      plan(["--skill", "doit", "--keys", "XY-7,ZQ-42,AB-3", "--depends", "ZQ-42:XY-7"])
    );
    assert.deepEqual(out.ready, ["XY-7", "AB-3"]);
    assert.deepEqual(out.lines, ["waiting: ZQ-42 after XY-7"]);
  });

  test("dependency done unblocks the waiting key", () => {
    const out = fields(
      plan(["--skill", "doit", "--keys", "XY-7,ZQ-42", "--depends", "ZQ-42:XY-7", "--done", "XY-7"])
    );
    assert.deepEqual(out.ready, ["ZQ-42"]);
    assert.deepEqual(out.lines, []);
  });

  test("unmet dependency outside the invocation blocks only that key", () => {
    const out = fields(
      plan(["--skill", "shipit", "--keys", "MK-1,MK-2", "--depends", "MK-2:EXT-99"])
    );
    assert.deepEqual(out.ready, ["MK-1"]);
    assert.deepEqual(out.lines, ["blocked: MK-2 needs EXT-99 (not done)"]);
  });

  test("external dependency marked done does not block", () => {
    const out = fields(
      plan([
        "--skill", "shipit", "--keys", "MK-1,MK-2", "--depends", "MK-2:EXT-99", "--done", "EXT-99",
      ])
    );
    assert.deepEqual(out.ready, ["MK-1", "MK-2"]);
  });

  test("running sessions count against max", () => {
    const out = fields(
      plan(["--skill", "doit", "--keys", "R-1,R-2,R-3", "--running", "R-0", "--max", "2"])
    );
    assert.deepEqual(out.ready, ["R-1"]);
    assert.deepEqual(out.lines, [
      "queued: R-2 (max 2 reached)",
      "queued: R-3 (max 2 reached)",
    ]);
  });

  test("running and done keys are not planned again", () => {
    const out = fields(
      plan([
        "--skill", "doit", "--keys", "D-1,D-2,D-3", "--running", "D-2", "--done", "D-1", "--max", "4",
      ])
    );
    assert.deepEqual(out.ready, ["D-3"]);
    assert.deepEqual(out.lines, []);
  });

  test("cycle reports stuck when nothing is ready or running", () => {
    const result = plan(["--skill", "doit", "--keys", "CY-1,CY-2", "--depends", "CY-1:CY-2,CY-2:CY-1"]);
    const out = fields(result);
    assert.deepEqual(out.ready, []);
    assert.ok(
      out.lines.some((l) => /^stuck: /.test(l)),
      result.stdout
    );
  });

  test("cycle is not reported stuck while a key is running", () => {
    const result = plan([
      "--skill", "doit", "--keys", "CY-1,CY-2,CY-3", "--depends", "CY-1:CY-2,CY-2:CY-1", "--running", "CY-3",
    ]);
    const out = fields(result);
    assert.ok(!out.lines.some((l) => /^stuck: /.test(l)), result.stdout);
  });

  test("runit plans like the other skills: dependent waits, then starts once its dependency is done", () => {
    const out = fields(plan(["--skill", "runit", "--keys", "RU-1,RU-2,RU-3", "--depends", "RU-3:RU-1"]));
    assert.equal(out.mode, "parallel");
    assert.deepEqual(out.ready, ["RU-1", "RU-2"]);
    assert.deepEqual(out.lines, ["waiting: RU-3 after RU-1"]);

    const next = fields(
      plan(["--skill", "runit", "--keys", "RU-1,RU-2,RU-3", "--depends", "RU-3:RU-1", "--done", "RU-1"])
    );
    assert.deepEqual(next.ready, ["RU-2", "RU-3"]);
    assert.deepEqual(next.lines, []);
  });

  test("runit with git disabled plans sequentially with max 1", () => {
    withTempDir((dir) => {
      writeHarnessConfig(dir, "");
      const out = fields(
        runScript("fanout-plan", ["--skill", "runit", "--keys", "GD-1,GD-2", "--max", "3"], { cwd: dir })
      );
      assert.equal(out.mode, "sequential");
      assert.equal(out.max, "1");
      assert.deepEqual(out.ready, ["GD-1"]);
      assert.deepEqual(out.lines, ["queued: GD-2 (max 1 reached)"]);
    });
  });

  test("unknown skill hint lists runit", () => {
    const stdout = blockedResult(["--skill", "ship", "--keys", "NS-1"]);
    assert.match(stdout, /use planit, doit, checkit, shipit or runit/);
  });

  test("missing --skill hint lists runit", () => {
    assert.match(blockedResult(["--keys", "NS-1"]), /runit/);
  });

  test("missing --skill is blocked", () => {
    const stdout = blockedResult(["--keys", "NS-1"]);
    assert.match(stdout, /missing --skill/);
  });

  test("unknown skill is blocked and names it", () => {
    const stdout = blockedResult(["--skill", "seh-feature", "--keys", "NS-1"]);
    assert.match(stdout, /unknown skill seh-feature/);
  });

  test("missing --keys is blocked", () => {
    const stdout = blockedResult(["--skill", "doit"]);
    assert.match(stdout, /missing --keys/);
  });

  test("duplicate key is blocked", () => {
    const stdout = blockedResult(["--skill", "doit", "--keys", "DU-1,DU-2,DU-1"]);
    assert.match(stdout, /duplicate key DU-1/);
  });

  test("empty key entry is blocked", () => {
    const stdout = blockedResult(["--skill", "doit", "--keys", "EM-1,,EM-2"]);
    assert.match(stdout, /empty key/);
  });

  test("non-positive max is blocked", () => {
    const stdout = blockedResult(["--skill", "doit", "--keys", "MX-1", "--max", "0"]);
    assert.match(stdout, /max is not a positive integer: 0/);
  });

  test("non-numeric max is blocked", () => {
    const stdout = blockedResult(["--skill", "doit", "--keys", "MX-1", "--max", "many"]);
    assert.match(stdout, /max is not a positive integer: many/);
  });

  test("depends naming a key outside --keys is blocked", () => {
    const stdout = blockedResult(["--skill", "doit", "--keys", "DP-1", "--depends", "GHOST-5:DP-1"]);
    assert.match(stdout, /names GHOST-5 which is not in --keys/);
  });

  test("malformed depends entry is blocked", () => {
    const stdout = blockedResult(["--skill", "doit", "--keys", "DP-1,DP-2", "--depends", "DP-2"]);
    assert.match(stdout, /bad --depends entry DP-2/);
  });

  test("unknown argument is blocked", () => {
    const stdout = blockedResult(["--skill", "doit", "--keys", "DP-1", "--bogus"]);
    assert.match(stdout, /unknown argument --bogus/);
  });

  test("unknown variant is blocked", () => {
    const stdout = blockedResult(["--skill", "checkit", "--variant", "merge", "--keys", "VA-1"]);
    assert.match(stdout, /unknown variant merge/);
  });
});
