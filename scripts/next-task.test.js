"use strict";

const { describe, test } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const {
  REPO_ROOT,
  assertBlocked,
  assertOk,
  git,
  initGitRepo,
  runScript,
  startWorktree,
  withTempDir,
  writeFile,
  writeHarnessConfig,
} = require("../test/helpers");

const counterPath = (cwd) => path.join(cwd, ".git", "seh-next-task");
const lockPath = (cwd) => path.join(cwd, ".git", "seh-next-task.lock");
const readCounter = (cwd) => fs.readFileSync(counterPath(cwd), "utf8").trim();
const next = (cwd) => runScript("next-task", [], { cwd });

function withRepo(fn) {
  return withTempDir((cwd) => {
    initGitRepo(cwd);
    return fn(cwd);
  });
}

function assertNumber(result, number) {
  const parsed = assertOk(result, { number });
  assert.equal(parsed.fields.git, undefined, result.stdout);
}

describe("next-task", () => {
  test("empty repo: 001, counter holds 1, lock released", () => {
    withRepo((cwd) => {
      assertNumber(next(cwd), "001");
      assert.equal(readCounter(cwd), "1");
      assert.equal(fs.existsSync(lockPath(cwd)), false);
    });
  });

  test("max + 1 across directories: a gap is not reused", () => {
    withRepo((cwd) => {
      writeFile(cwd, "docs/features/001-a.feature.md", "a\n");
      writeFile(cwd, "docs/features/003-c.feature.md", "c\n");
      assertNumber(next(cwd), "004");
    });
  });

  for (const dir of ["docs/features", "docs/prompt", "docs/feature-log"]) {
    test(`reads ${dir}`, () => {
      withRepo((cwd) => {
        writeFile(cwd, `${dir}/021-x.md`, "x\n");
        assertNumber(next(cwd), "022");
      });
    });
  }

  test("ignores names without a leading NNN-", () => {
    withRepo((cwd) => {
      writeFile(cwd, "docs/features/PROJ-90.feature.md", "x\n");
      writeFile(cwd, "docs/features/90.feature.md", "x\n");
      writeFile(cwd, "docs/features/v90-x.feature.md", "x\n");
      assertNumber(next(cwd), "001");
    });
  });

  test("leading zeros are decimal", () => {
    withRepo((cwd) => {
      writeFile(cwd, "docs/features/008-a.feature.md", "a\n");
      writeFile(cwd, "docs/prompt/009-b.prompt.md", "b\n");
      assertNumber(next(cwd), "010");
    });
  });

  test("more than three digits stay as they are", () => {
    withRepo((cwd) => {
      writeFile(cwd, "docs/features/999-a.feature.md", "a\n");
      assertNumber(next(cwd), "1000");
    });
  });

  test("local branch without files", () => {
    withRepo((cwd) => {
      git(cwd, ["branch", "005-login"]);
      assertNumber(next(cwd), "006");
    });
  });

  for (const remote of ["origin", "upstream"]) {
    test(`remote-tracking ref only (${remote})`, () => {
      withRepo((cwd) => {
        git(cwd, ["update-ref", `refs/remotes/${remote}/007-pay`, "HEAD"]);
        assertNumber(next(cwd), "008");
      });
    });
  }

  test("ADO keys, suffix branches and tracker keys are ignored", () => {
    withRepo((cwd) => {
      for (const name of ["1234-2", "1234", "PROJ-12", "feature/90-x"]) {
        git(cwd, ["branch", name]);
      }
      git(cwd, ["update-ref", "refs/remotes/origin/4321-3", "HEAD"]);
      assertNumber(next(cwd), "001");
    });
  });

  test("a files suffix branch counts by its basename number", () => {
    withRepo((cwd) => {
      git(cwd, ["branch", "042-login-2"]);
      assertNumber(next(cwd), "043");
    });
  });

  test("counter alone, and every call allocates", () => {
    withRepo((cwd) => {
      fs.writeFileSync(counterPath(cwd), "010\n");
      assertNumber(next(cwd), "011");
      assertNumber(next(cwd), "012");
      assert.equal(readCounter(cwd), "12");
    });
  });

  test("the higher of directories and counter wins", () => {
    withRepo((cwd) => {
      writeFile(cwd, "docs/features/030-a.feature.md", "a\n");
      fs.writeFileSync(counterPath(cwd), "5\n");
      assertNumber(next(cwd), "031");
      fs.writeFileSync(counterPath(cwd), "50\n");
      assertNumber(next(cwd), "051");
      assert.equal(readCounter(cwd), "51");
    });
  });

  test("a seh worktree shares the main checkout's counter", () => {
    withRepo((cwd) => {
      const wt = startWorktree(cwd, "003-x");
      assertNumber(next(wt), "004");
      assert.equal(readCounter(cwd), "4");
      assertNumber(next(cwd), "005");
      assertNumber(next(wt), "006");
    });
  });

  for (const baseBranch of ["", null]) {
    test(`git disabled (baseBranch ${JSON.stringify(baseBranch)}): directories only`, () => {
      withRepo((cwd) => {
        writeHarnessConfig(cwd, baseBranch);
        git(cwd, ["branch", "050-x"]);
        writeFile(cwd, "docs/features/002-a.feature.md", "a\n");
        assertOk(next(cwd), { number: "003", git: "disabled" });
        assert.equal(fs.existsSync(counterPath(cwd)), false);
      });
    });
  }

  test("git disabled neither reads the counter nor waits for the lock", () => {
    withRepo((cwd) => {
      writeHarnessConfig(cwd, "");
      fs.writeFileSync(counterPath(cwd), "abc\n");
      fs.mkdirSync(lockPath(cwd));
      assertOk(next(cwd), { number: "001", git: "disabled" });
      assert.equal(readCounter(cwd), "abc");
    });
  });

  test("not a git repository: directories only", () => {
    withTempDir((cwd) => {
      writeFile(cwd, "docs/feature-log/014-a.log.md", "a\n");
      assertOk(next(cwd), { number: "015", git: "disabled" });
    });
  });

  test("held lock: BLOCKED naming it, lock and counter untouched", () => {
    withRepo((cwd) => {
      fs.writeFileSync(counterPath(cwd), "7\n");
      fs.mkdirSync(lockPath(cwd));
      const result = next(cwd);
      assertBlocked(result, /another next-task is running/);
      assert.match(result.stdout, /seh-next-task\.lock/);
      assert.equal(fs.existsSync(lockPath(cwd)), true);
      assert.equal(readCounter(cwd), "7");
    });
  });

  for (const bad of ["abc", "0", "-3", "12x", "", "4\n5"]) {
    test(`counter ${JSON.stringify(bad)}: BLOCKED naming the file`, () => {
      withRepo((cwd) => {
        fs.writeFileSync(counterPath(cwd), bad);
        const result = next(cwd);
        assertBlocked(result, /seh-next-task does not hold a positive integer/);
        assert.equal(fs.readFileSync(counterPath(cwd), "utf8"), bad);
        assert.equal(fs.existsSync(lockPath(cwd)), false);
      });
    });
  }

  test("an argument is refused without allocating", () => {
    withRepo((cwd) => {
      assertBlocked(runScript("next-task", ["login"], { cwd }), /no arguments/);
      assert.equal(fs.existsSync(counterPath(cwd)), false);
    });
  });

  test("5 parallel calls get 5 distinct numbers", async () => {
    const cwd = fs.mkdtempSync(path.join(require("os").tmpdir(), "seh-next-"));
    try {
      initGitRepo(cwd);
      const script = path.join(REPO_ROOT, "scripts", "next-task");
      const results = await Promise.all(
        Array.from(
          { length: 5 },
          () =>
            new Promise((resolve, reject) => {
              const child = spawn("sh", [script], { cwd });
              let stdout = "";
              child.stdout.on("data", (chunk) => (stdout += chunk));
              child.on("error", reject);
              child.on("close", (status) =>
                resolve({ status, stdout, stderr: "" })
              );
            })
        )
      );
      const numbers = results.map((r) => assertOk(r).fields.number).sort();
      assert.deepEqual(numbers, ["001", "002", "003", "004", "005"]);
      assert.equal(readCounter(cwd), "5");
    } finally {
      fs.rmSync(cwd, { recursive: true, force: true });
    }
  });
});
