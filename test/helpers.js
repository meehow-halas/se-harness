"use strict";

const { spawnSync } = require("child_process");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..");
const CLI_PATH = path.join(REPO_ROOT, "src", "cli.js");
const { PAYLOAD_DIRS } = require("../src/cli");

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
    fs.rmSync(`${dir}-bare.git`, { recursive: true, force: true });
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

function which(cmd, env = process.env) {
  const result = spawnSync("sh", ["-c", 'command -v "$1"', "sh", cmd], {
    encoding: "utf8",
    env,
  });
  return (result.stdout || "").trim();
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

function pathHidingCommand(cwd, command) {
  const shimDir = path.join(cwd, `.dhs-hide-${command}`);
  fs.mkdirSync(shimDir, { recursive: true });
  const essentials = [
    "git",
    "sh",
    "node",
    "python3",
    "tr",
    "wc",
    "grep",
    "sed",
    "dirname",
    "basename",
    "uname",
  ];
  for (const name of essentials) {
    if (name === command) {
      continue;
    }
    const found = which(name);
    if (!found) {
      continue;
    }
    const dest = path.join(shimDir, name);
    if (!fs.existsSync(dest)) {
      fs.symlinkSync(found, dest);
    }
  }
  const kept = (process.env.PATH || "")
    .split(path.delimiter)
    .filter((dir) => dir && !fs.existsSync(path.join(dir, command)));
  return [shimDir, ...kept].join(path.delimiter);
}

function argvLogCommand(logFile) {
  return `node -e 'require("fs").appendFileSync(process.argv[1], JSON.stringify(process.argv.slice(2)) + "\\n")' -- ${JSON.stringify(logFile)} "$@"`;
}

function writeGhStub(binDir, { existingUrl, createFails = false, prStates = "" } = {}) {
  fs.mkdirSync(binDir, { recursive: true });
  const logFile = path.join(binDir, "gh-argv.log");
  const gh = path.join(binDir, "gh");
  const existing = existingUrl ? JSON.stringify(existingUrl) : "''";
  const createBranch = createFails
    ? `printf 'gh create failed\\n' >&2
  exit 1`
    : `printf '%s\\n' "https://example.com/pr/1"
  exit 0`;
  fs.writeFileSync(
    gh,
    `#!/bin/sh
${argvLogCommand(logFile)}
if [ "$1" = "pr" ] && [ "$2" = "view" ]; then
  existing=${existing}
  if [ -n "$existing" ]; then
    printf '%s\\n' "$existing"
    exit 0
  fi
  exit 1
fi
if [ "$1" = "pr" ] && [ "$2" = "list" ]; then
  case "$*" in
    *"--state all"*) printf '%s\\n' ${JSON.stringify(prStates)} ;;
    *) printf '%s\\n' ${JSON.stringify(existingUrl || "")} ;;
  esac
  exit 0
fi
if [ "$1" = "pr" ] && [ "$2" = "create" ]; then
  ${createBranch}
fi
printf 'unexpected gh invocation\\n' >&2
exit 1
`
  );
  fs.chmodSync(gh, 0o755);
  return { gh, logFile };
}

function writeGitLogger(binDir) {
  fs.mkdirSync(binDir, { recursive: true });
  const realGit = which("git");
  if (!realGit) {
    throw new Error("git is not on PATH");
  }
  const logFile = path.join(binDir, "git-argv.log");
  const gitBin = path.join(binDir, "git");
  fs.writeFileSync(
    gitBin,
    `#!/bin/sh
${argvLogCommand(logFile)}
exec ${JSON.stringify(realGit)} "$@"
`
  );
  fs.chmodSync(gitBin, 0o755);
  return { logFile };
}

function failingEditor(cwd) {
  const editor = path.join(cwd, ".dhs-editor-fail");
  const stamp = path.join(cwd, ".dhs-editor-called");
  fs.writeFileSync(
    editor,
    `#!/bin/sh
printf 'called\\n' > ${JSON.stringify(stamp)}
exit 1
`
  );
  fs.chmodSync(editor, 0o755);
  return {
    stamp,
    env: {
      GIT_EDITOR: editor,
      EDITOR: editor,
      VISUAL: editor,
      GIT_SEQUENCE_EDITOR: editor,
    },
  };
}

function envWithGh(cwd, stubOpts) {
  const bin = path.join(cwd, ".bin");
  const stub = writeGhStub(bin, stubOpts);
  return {
    ...stub,
    env: { PATH: `${bin}${path.delimiter}${process.env.PATH}` },
  };
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
  const hostsSrc = path.join(REPO_ROOT, "references", "hosts.json");
  const refsDir = path.join(dir, "references");
  fs.mkdirSync(refsDir, { recursive: true });
  fs.copyFileSync(hostsSrc, path.join(refsDir, "hosts.json"));
  const pluginSrc = path.join(REPO_ROOT, "references", "opencode-check-update.js");
  if (fs.existsSync(pluginSrc)) {
    fs.copyFileSync(
      pluginSrc,
      path.join(refsDir, "opencode-check-update.js")
    );
  }
}

function blockedMessage(result) {
  const text = `${result.stdout}\n${result.stderr}`;
  const idx = text.indexOf("BLOCKED: ");
  if (idx === -1) {
    return "";
  }
  return text.slice(idx).trim();
}

function assertBlocked(result, expected) {
  assert.equal(result.status, 1, result.stdout + result.stderr);
  const message = blockedMessage(result);
  assert.ok(message, `expected a BLOCKED line, got: ${result.stdout}\n${result.stderr}`);
  assert.match(message, / — /);
  if (expected !== undefined) {
    assert.match(message, expected);
  }
}

function scriptOutputLines(result) {
  const lines = result.stdout.split(/\r?\n/);
  const fields = {};
  for (const line of lines.slice(1)) {
    if (!line) {
      continue;
    }
    const idx = line.indexOf(": ");
    if (idx === -1) {
      continue;
    }
    fields[line.slice(0, idx)] = line.slice(idx + 2);
  }
  return { statusLine: lines[0], fields };
}

function assertOk(result, expectedFields) {
  assert.equal(result.status, 0, result.stderr + result.stdout);
  const parsed = scriptOutputLines(result);
  assert.equal(parsed.statusLine, "OK");
  if (expectedFields) {
    for (const [key, value] of Object.entries(expectedFields)) {
      assert.equal(parsed.fields[key], value, result.stdout);
    }
  }
  return parsed;
}

function assertUnchanged(result, expectedFields) {
  assert.equal(result.status, 0, result.stderr + result.stdout);
  const parsed = scriptOutputLines(result);
  assert.equal(parsed.statusLine, "UNCHANGED");
  if (expectedFields) {
    for (const [key, value] of Object.entries(expectedFields)) {
      assert.equal(parsed.fields[key], value, result.stdout);
    }
  }
  return parsed;
}

function currentBranch(cwd) {
  return git(cwd, ["rev-parse", "--abbrev-ref", "HEAD"]).stdout.trim();
}

function revParse(cwd, rev) {
  return git(cwd, ["rev-parse", rev]).stdout.trim();
}

function writeFile(cwd, rel, body) {
  const full = path.join(cwd, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, body);
}

function startTask(cwd, task) {
  return runScript("start-task", [task], { cwd });
}

function startWorktree(cwd, task) {
  const parsed = assertOk(startTask(cwd, task));
  const wt = parsed.fields.worktree;
  assert.ok(wt, `start-task must print worktree:, got:\n${parsed.statusLine}`);
  return wt;
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

function cloneFrom(bare, dest) {
  const cloned = spawnSync("git", ["clone", bare, dest], {
    env: { ...process.env, ...GIT_ENV },
    encoding: "utf8",
  });
  if (cloned.status !== 0) {
    throw new Error(`git clone failed: ${cloned.stderr || cloned.stdout}`);
  }
  git(dest, ["config", "user.name", "dhs-test"]);
  git(dest, ["config", "user.email", "dhs-test@example.com"]);
  return dest;
}

function argvLogLines(logFile) {
  if (!fs.existsSync(logFile)) {
    return [];
  }
  return fs
    .readFileSync(logFile, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);
}

function argvLogArgv(logFile) {
  return argvLogLines(logFile).map((line) => JSON.parse(line));
}

module.exports = {
  PAYLOAD_DIRS,
  REPO_ROOT,
  addBareOrigin,
  argvLogArgv,
  argvLogLines,
  assertBlocked,
  assertOk,
  assertUnchanged,
  cloneFrom,
  currentBranch,
  envWithGh,
  failingEditor,
  git,
  initGitRepo,
  makePackageRoot,
  pathHidingCommand,
  revParse,
  runCli,
  runScript,
  scriptOutputLines,
  startTask,
  startWorktree,
  withTempDir,
  writeFile,
  writeGhStub,
  writeGitLogger,
  writeHarnessConfig,
};
