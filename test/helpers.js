"use strict";

const { spawnSync } = require("child_process");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..");
const CLI_PATH = path.join(REPO_ROOT, "src", "cli.js");
const PAYLOAD_DIRS = [
  "agents",
  "packs",
  "skills",
  "brainstorm",
  "references",
  "scripts",
];

const GIT_ENV = {
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_AUTHOR_NAME: "dhs-test",
  GIT_AUTHOR_EMAIL: "dhs-test@example.com",
  GIT_COMMITTER_NAME: "dhs-test",
  GIT_COMMITTER_EMAIL: "dhs-test@example.com",
};

function withTempDir(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dhs-test-"));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function runCli(args, { cwd, packageRoot } = {}) {
  const script = `
    const { main } = require(${JSON.stringify(CLI_PATH)});
    const args = JSON.parse(process.env.DHS_TEST_ARGS);
    const ctx = {};
    if (process.env.DHS_TEST_CWD) ctx.cwd = process.env.DHS_TEST_CWD;
    if (process.env.DHS_TEST_PACKAGE_ROOT) {
      ctx.packageRoot = process.env.DHS_TEST_PACKAGE_ROOT;
    }
    main(args, ctx);
  `;
  const env = {
    ...process.env,
    ...GIT_ENV,
    DHS_TEST_ARGS: JSON.stringify(args),
  };
  if (cwd) {
    env.DHS_TEST_CWD = cwd;
  }
  if (packageRoot) {
    env.DHS_TEST_PACKAGE_ROOT = packageRoot;
  }
  const result = spawnSync(process.execPath, ["-e", script], {
    cwd: cwd || process.cwd(),
    env,
    encoding: "utf8",
  });
  return {
    status: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function git(cwd, args, extraEnv) {
  const result = spawnSync("git", args, {
    cwd,
    env: { ...process.env, ...GIT_ENV, ...extraEnv },
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed (${result.status}): ${result.stderr || result.stdout}`
    );
  }
  return result;
}

function writeHarnessConfig(cwd, baseBranch) {
  const body = JSON.stringify(
    { agents: { baseBranch } },
    null,
    2
  );
  fs.writeFileSync(path.join(cwd, "harness.config.json"), `${body}\n`);
}

function initGitRepo(cwd, { baseBranch = "dev", config = true } = {}) {
  git(cwd, ["init", "-b", baseBranch]);
  git(cwd, ["config", "user.name", "dhs-test"]);
  git(cwd, ["config", "user.email", "dhs-test@example.com"]);
  fs.writeFileSync(path.join(cwd, "README.md"), "fixture\n");
  git(cwd, ["add", "README.md"]);
  git(cwd, ["commit", "-m", "init"]);
  if (config) {
    writeHarnessConfig(cwd, baseBranch);
  }
  return { baseBranch };
}

function runScript(name, args, { cwd, env } = {}) {
  const script = path.join(REPO_ROOT, "scripts", name);
  const result = spawnSync("sh", [script, ...args], {
    cwd,
    env: { ...process.env, ...GIT_ENV, ...env },
    encoding: "utf8",
  });
  return {
    status: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function pathWithoutCommand(command) {
  return (process.env.PATH || "")
    .split(path.delimiter)
    .filter((dir) => dir && !fs.existsSync(path.join(dir, command)))
    .join(path.delimiter);
}

function writeGhStub(binDir, { existingUrl } = {}) {
  fs.mkdirSync(binDir, { recursive: true });
  const logFile = path.join(binDir, "gh-argv.log");
  const gh = path.join(binDir, "gh");
  const existing = existingUrl ? JSON.stringify(existingUrl) : "''";
  fs.writeFileSync(
    gh,
    `#!/bin/sh
printf '%s\\n' "$*" >> ${JSON.stringify(logFile)}
if [ "$1" = "pr" ] && [ "$2" = "view" ]; then
  existing=${existing}
  if [ -n "$existing" ]; then
    printf '%s\\n' "$existing"
    exit 0
  fi
  exit 1
fi
if [ "$1" = "pr" ] && [ "$2" = "create" ]; then
  printf '%s\\n' "https://example.com/pr/1"
  exit 0
fi
printf 'unexpected gh invocation\\n' >&2
exit 1
`
  );
  fs.chmodSync(gh, 0o755);
  return { gh, logFile };
}

function makePackageRoot(dir, { payload, setupSkill = true, version = "1.2.3" } = {}) {
  const names = payload || PAYLOAD_DIRS;
  fs.writeFileSync(
    path.join(dir, "package.json"),
    `${JSON.stringify({ name: "dev-harness-layer", version })}\n`
  );
  for (const name of names) {
    const folder = path.join(dir, name);
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, "marker.txt"), `${name}\n`);
  }
  if (setupSkill) {
    const skill = path.join(dir, "skills", "dhs-setup");
    fs.mkdirSync(skill, { recursive: true });
    fs.writeFileSync(path.join(skill, "SKILL.md"), "# setup\n");
  }
}

function assertBlocked(result) {
  assert.equal(result.status, 1, result.stdout + result.stderr);
  const text = (result.stdout || result.stderr).trim();
  assert.match(text, /^BLOCKED: /);
  assert.match(text, / — /);
}

function assertOk(result) {
  assert.equal(result.status, 0, result.stderr + result.stdout);
  assert.equal(result.stdout.split(/\r?\n/)[0], "OK");
}

function assertUnchanged(result) {
  assert.equal(result.status, 0, result.stderr + result.stdout);
  assert.equal(result.stdout.split(/\r?\n/)[0], "UNCHANGED");
}

function currentBranch(cwd) {
  return git(cwd, ["rev-parse", "--abbrev-ref", "HEAD"]).stdout.trim();
}

function writeFile(cwd, rel, body) {
  const full = path.join(cwd, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, body);
}

function startTask(cwd, task) {
  return runScript("start-task", [task], { cwd });
}

function addBareOrigin(repoDir, remoteName = "origin") {
  const bare = `${repoDir}-bare.git`;
  const cloned = spawnSync("git", ["clone", "--bare", repoDir, bare], {
    env: { ...process.env, ...GIT_ENV },
    encoding: "utf8",
  });
  if (cloned.status !== 0) {
    throw new Error(`git clone --bare failed: ${cloned.stderr || cloned.stdout}`);
  }
  git(repoDir, ["remote", "add", remoteName, bare]);
  return bare;
}

module.exports = {
  PAYLOAD_DIRS,
  REPO_ROOT,
  addBareOrigin,
  assertBlocked,
  assertOk,
  assertUnchanged,
  currentBranch,
  git,
  initGitRepo,
  makePackageRoot,
  pathWithoutCommand,
  runCli,
  runScript,
  startTask,
  withTempDir,
  writeFile,
  writeGhStub,
  writeHarnessConfig,
};
