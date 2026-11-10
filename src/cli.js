#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const PACKAGE_ROOT = path.resolve(__dirname, "..");
const PAYLOAD_DIRS = [
  "agents",
  "packs",
  "skills",
  "brainstorm",
  "references",
  "scripts",
  "monitor",
];
const MONITOR_NPM_SCRIPT_KEY = "dhs:monitor";
const MONITOR_NPM_SCRIPT_VALUE = "node .dhs/monitor";
const CURSOR_SDK_PACKAGE = "@cursor/sdk";
const SETUP_SKILL = "dhs-setup";
const HOSTS_FILE = "hosts.json";
const CHECK_UPDATE_SCRIPT = ".dhs/scripts/check-update";
const OPENCODE_PLUGIN_SRC = path.join("references", "opencode-check-update.js");
const GITIGNORE_ENTRIES = [
  {
    line: ".dhs/",
    alreadyPresent: new Set([".dhs", ".dhs/", "/.dhs", "/.dhs/"]),
  },
  {
    line: "harness.credentials.local.json",
    alreadyPresent: new Set([
      "harness.credentials.local.json",
      "/harness.credentials.local.json",
    ]),
  },
];

function usage() {
  return "Usage: dhs <install|uninstall>";
}

function resolveCtx(ctx) {
  return {
    cwd: (ctx && ctx.cwd) || process.cwd(),
    packageRoot: (ctx && ctx.packageRoot) || PACKAGE_ROOT,
  };
}

function packageVersion(packageRoot) {
  const pkgPath = path.join(packageRoot, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  return String(pkg.version);
}

function posixJoin(rel) {
  return path.join(...String(rel).split("/").filter(Boolean));
}

function loadHosts(packageRoot) {
  const hostsPath = path.join(packageRoot, "references", HOSTS_FILE);
  if (!fs.existsSync(hostsPath)) {
    console.error("dhs: missing package file at references/hosts.json");
    process.exit(1);
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(hostsPath, "utf8"));
  } catch {
    console.error("dhs: invalid JSON at references/hosts.json");
    process.exit(1);
  }
  if (!Array.isArray(data.hosts) || data.hosts.length === 0) {
    console.error("dhs: references/hosts.json has no hosts");
    process.exit(1);
  }
  for (const host of data.hosts) {
    if (!host || typeof host.skillsDir !== "string" || host.skillsDir === "") {
      console.error("dhs: references/hosts.json host is missing skillsDir");
      process.exit(1);
    }
    if (host.hooksFile) {
      if (
        typeof host.hooksFile !== "string" ||
        typeof host.hooksShape !== "string" ||
        host.hooksFile === "" ||
        host.hooksShape === ""
      ) {
        console.error(
          "dhs: references/hosts.json host hooksFile needs hooksShape"
        );
        process.exit(1);
      }
      if (
        host.hooksShape !== "opencode-plugin" &&
        (typeof host.hooksEvent !== "string" || host.hooksEvent === "")
      ) {
        console.error(
          "dhs: references/hosts.json host hooksFile needs hooksEvent and hooksShape"
        );
        process.exit(1);
      }
    }
  }
  return data.hosts;
}

function setupSkillDir(cwd, host) {
  return path.join(cwd, posixJoin(host.skillsDir), SETUP_SKILL);
}

function isPackageTestFile(filePath) {
  return /\.test\.[cm]?js$/.test(filePath);
}

function copyTree(src, dest) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, {
    recursive: true,
    force: true,
    filter: (from) => !isPackageTestFile(from),
  });
}

function resolvePackageDir(name, resolvePaths) {
  try {
    return path.dirname(
      require.resolve(`${name}/package.json`, { paths: resolvePaths })
    );
  } catch {
    try {
      const entry = require.resolve(name, { paths: resolvePaths });
      let dir = path.dirname(entry);
      while (dir !== path.dirname(dir)) {
        const pkgFile = path.join(dir, "package.json");
        if (fs.existsSync(pkgFile)) {
          try {
            const pkg = JSON.parse(fs.readFileSync(pkgFile, "utf8"));
            if (pkg.name === name) {
              return dir;
            }
          } catch {
            break;
          }
        }
        dir = path.dirname(dir);
      }
    } catch {
      return null;
    }
  }
  return null;
}

function packageRuntimeDeps(pkg) {
  return {
    ...(pkg.dependencies || {}),
    ...(pkg.optionalDependencies || {}),
    ...(pkg.peerDependencies || {}),
  };
}

function vendorNpmPackage(name, destNm, resolvePaths, seen) {
  if (seen.has(name)) {
    return;
  }
  seen.add(name);
  const src = resolvePackageDir(name, resolvePaths);
  if (!src) {
    return;
  }
  const dest = path.join(destNm, name);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, {
    recursive: true,
    force: true,
    dereference: true,
    filter: (from) => {
      const rel = path.relative(src, from);
      if (rel === "") {
        return true;
      }
      return rel.split(path.sep)[0] !== "node_modules";
    },
  });
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(path.join(src, "package.json"), "utf8"));
  } catch {
    return;
  }
  const nextPaths = [src, ...resolvePaths];
  for (const dep of Object.keys(packageRuntimeDeps(pkg))) {
    vendorNpmPackage(dep, destNm, nextPaths, seen);
  }
}

function vendorCursorSdk(packageRoot, destMonitorDir) {
  const src = resolvePackageDir(CURSOR_SDK_PACKAGE, [packageRoot]);
  if (!src) {
    return;
  }
  const destNm = path.join(destMonitorDir, "node_modules");
  vendorNpmPackage(CURSOR_SDK_PACKAGE, destNm, [packageRoot], new Set());
}

function readConsumerPackage(cwd) {
  const pkgPath = path.join(cwd, "package.json");
  if (!fs.existsSync(pkgPath)) {
    return null;
  }
  try {
    return {
      path: pkgPath,
      data: JSON.parse(fs.readFileSync(pkgPath, "utf8")),
    };
  } catch {
    console.error("dhs install: invalid JSON at package.json");
    process.exit(1);
  }
}

function ensureMonitorNpmScript(cwd) {
  const loaded = readConsumerPackage(cwd);
  if (!loaded) {
    return;
  }
  const pkg = loaded.data;
  if (pkg.scripts == null) {
    pkg.scripts = {};
  }
  if (typeof pkg.scripts !== "object" || Array.isArray(pkg.scripts)) {
    return;
  }
  if (Object.prototype.hasOwnProperty.call(pkg.scripts, MONITOR_NPM_SCRIPT_KEY)) {
    return;
  }
  pkg.scripts[MONITOR_NPM_SCRIPT_KEY] = MONITOR_NPM_SCRIPT_VALUE;
  writeJsonFile(loaded.path, pkg);
}

function removeMonitorNpmScript(cwd) {
  const pkgPath = path.join(cwd, "package.json");
  if (!fs.existsSync(pkgPath)) {
    return;
  }
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  } catch {
    return;
  }
  if (!pkg.scripts || typeof pkg.scripts !== "object") {
    return;
  }
  if (pkg.scripts[MONITOR_NPM_SCRIPT_KEY] !== MONITOR_NPM_SCRIPT_VALUE) {
    return;
  }
  delete pkg.scripts[MONITOR_NPM_SCRIPT_KEY];
  if (Object.keys(pkg.scripts).length === 0) {
    delete pkg.scripts;
  }
  writeJsonFile(pkgPath, pkg);
}

function gitignorePattern(line) {
  const trimmed = String(line).trim();
  if (trimmed === "" || trimmed.startsWith("#")) {
    return "";
  }
  return trimmed;
}

function gitignoreHasEntry(contents, alreadyPresent) {
  return String(contents)
    .split(/\r?\n/)
    .some((line) => alreadyPresent.has(gitignorePattern(line)));
}

function gitignoreOwnedBody() {
  return GITIGNORE_ENTRIES.map((entry) => `${entry.line}\n`).join("");
}

function ensureGitignore(cwd) {
  const gitignorePath = path.join(cwd, ".gitignore");
  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, gitignoreOwnedBody());
    return;
  }
  const contents = fs.readFileSync(gitignorePath, "utf8");
  const missing = GITIGNORE_ENTRIES.filter(
    (entry) => !gitignoreHasEntry(contents, entry.alreadyPresent)
  );
  if (missing.length === 0) {
    return;
  }
  const prefix = contents.length === 0 || contents.endsWith("\n") ? "" : "\n";
  const added = missing.map((entry) => `${entry.line}\n`).join("");
  fs.writeFileSync(gitignorePath, `${contents}${prefix}${added}`);
}

function checkUpdateCommand(host) {
  const arg = host.hooksHostArg || host.id;
  return `${CHECK_UPDATE_SCRIPT} --host ${arg}`;
}

function commandLooksLikeCheckUpdate(command) {
  return String(command || "").includes(CHECK_UPDATE_SCRIPT);
}

function hooksFilePath(cwd, host) {
  return path.join(cwd, posixJoin(host.hooksFile));
}

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const raw = fs.readFileSync(filePath, "utf8").trim();
  if (raw === "") {
    return {};
  }
  return JSON.parse(raw);
}

function writeJsonFile(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function eventList(data, eventName) {
  if (!data.hooks || typeof data.hooks !== "object" || Array.isArray(data.hooks)) {
    data.hooks = {};
  }
  if (!Array.isArray(data.hooks[eventName])) {
    data.hooks[eventName] = [];
  }
  return data.hooks[eventName];
}

function claudeEntryHasCheckUpdate(entry) {
  if (!entry || typeof entry !== "object") {
    return false;
  }
  if (commandLooksLikeCheckUpdate(entry.command)) {
    return true;
  }
  if (!Array.isArray(entry.hooks)) {
    return false;
  }
  return entry.hooks.some(
    (hook) => hook && commandLooksLikeCheckUpdate(hook.command)
  );
}

function ensureClaudeHook(data, eventName, command) {
  const list = eventList(data, eventName);
  if (list.some(claudeEntryHasCheckUpdate)) {
    return;
  }
  list.push({
    matcher: "startup",
    hooks: [{ type: "command", command }],
  });
}

function stripClaudeCheckUpdate(entry) {
  if (!entry || typeof entry !== "object") {
    return entry;
  }
  if (commandLooksLikeCheckUpdate(entry.command)) {
    return null;
  }
  if (!Array.isArray(entry.hooks)) {
    return entry;
  }
  const hooks = entry.hooks.filter(
    (hook) => !(hook && commandLooksLikeCheckUpdate(hook.command))
  );
  if (hooks.length === 0) {
    return null;
  }
  return { ...entry, hooks };
}

function removeClaudeHook(data, eventName) {
  if (!data.hooks || typeof data.hooks !== "object") {
    return;
  }
  if (!Array.isArray(data.hooks[eventName])) {
    return;
  }
  data.hooks[eventName] = data.hooks[eventName]
    .map(stripClaudeCheckUpdate)
    .filter(Boolean);
}

function ensureCursorHook(data, eventName, command) {
  if (data.version == null) {
    data.version = 1;
  }
  const list = eventList(data, eventName);
  if (list.some((entry) => commandLooksLikeCheckUpdate(entry && entry.command))) {
    return;
  }
  list.push({ command, timeout: 5 });
}

function removeCursorHook(data, eventName) {
  if (data.version == null) {
    data.version = 1;
  }
  if (!data.hooks || typeof data.hooks !== "object") {
    return;
  }
  if (!Array.isArray(data.hooks[eventName])) {
    return;
  }
  data.hooks[eventName] = data.hooks[eventName].filter(
    (entry) => !commandLooksLikeCheckUpdate(entry && entry.command)
  );
}

function pruneEmptyHookLists(data) {
  if (!data.hooks || typeof data.hooks !== "object") {
    return;
  }
  for (const key of Object.keys(data.hooks)) {
    if (Array.isArray(data.hooks[key]) && data.hooks[key].length === 0) {
      delete data.hooks[key];
    }
  }
  if (Object.keys(data.hooks).length === 0) {
    delete data.hooks;
  }
}

function hooksFileIsDisposable(data, shape) {
  const keys = Object.keys(data);
  if (shape === "cursor-flat") {
    return keys.every((key) => key === "hooks" || key === "version");
  }
  return keys.every((key) => key === "hooks");
}

function opencodePluginSource(packageRoot) {
  return path.join(packageRoot, OPENCODE_PLUGIN_SRC);
}

function ensureOpencodePlugin(cwd, host, packageRoot) {
  const src = opencodePluginSource(packageRoot);
  if (!fs.existsSync(src)) {
    console.error(
      "dhs install: missing package file at references/opencode-check-update.js"
    );
    process.exit(1);
  }
  const dest = hooksFilePath(cwd, host);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function ensureHostHook(cwd, host, packageRoot) {
  if (!host.hooksFile) {
    return;
  }
  if (host.hooksShape === "opencode-plugin") {
    ensureOpencodePlugin(cwd, host, packageRoot);
    return;
  }
  const filePath = hooksFilePath(cwd, host);
  let data;
  try {
    data = readJsonFile(filePath) || {};
  } catch {
    console.error(`dhs install: invalid JSON at ${host.hooksFile}`);
    process.exit(1);
  }
  const command = checkUpdateCommand(host);
  if (host.hooksShape === "cursor-flat") {
    ensureCursorHook(data, host.hooksEvent, command);
  } else if (host.hooksShape === "claude-nested") {
    ensureClaudeHook(data, host.hooksEvent, command);
  } else {
    console.error(
      `dhs: references/hosts.json unknown hooksShape ${host.hooksShape}`
    );
    process.exit(1);
  }
  writeJsonFile(filePath, data);
}

function removeHostHook(cwd, host) {
  if (!host.hooksFile) {
    return;
  }
  const filePath = hooksFilePath(cwd, host);
  if (!fs.existsSync(filePath)) {
    return;
  }
  if (host.hooksShape === "opencode-plugin") {
    fs.rmSync(filePath, { force: true });
    pruneEmptyAncestors(path.dirname(filePath), cwd);
    return;
  }
  let data;
  try {
    data = readJsonFile(filePath) || {};
  } catch {
    return;
  }
  if (host.hooksShape === "cursor-flat") {
    removeCursorHook(data, host.hooksEvent);
  } else if (host.hooksShape === "claude-nested") {
    removeClaudeHook(data, host.hooksEvent);
  }
  pruneEmptyHookLists(data);
  if (hooksFileIsDisposable(data, host.hooksShape) && !data.hooks) {
    fs.rmSync(filePath, { force: true });
    pruneEmptyAncestors(path.dirname(filePath), cwd);
    return;
  }
  writeJsonFile(filePath, data);
}

function pruneEmptyAncestors(startDir, cwd) {
  const root = path.resolve(cwd);
  let dir = path.resolve(startDir);
  while (dir.startsWith(root + path.sep) && dir !== root) {
    if (!fs.existsSync(dir)) {
      dir = path.dirname(dir);
      continue;
    }
    const entries = fs.readdirSync(dir);
    if (entries.length > 0) {
      break;
    }
    fs.rmdirSync(dir);
    dir = path.dirname(dir);
  }
}

function install(ctx) {
  const { cwd, packageRoot } = resolveCtx(ctx);
  const hosts = loadHosts(packageRoot);
  const dhsDir = path.join(cwd, ".dhs");
  fs.mkdirSync(dhsDir, { recursive: true });

  for (const name of PAYLOAD_DIRS) {
    const src = path.join(packageRoot, name);
    if (!fs.existsSync(src)) {
      continue;
    }
    const dest = path.join(dhsDir, name);
    copyTree(src, dest);
    if (name === "monitor") {
      vendorCursorSdk(packageRoot, dest);
    }
  }

  const version = packageVersion(packageRoot);
  fs.writeFileSync(path.join(dhsDir, "VERSION"), `${version}\n`);

  const skillSrc = path.join(packageRoot, "skills", SETUP_SKILL);
  if (!fs.existsSync(skillSrc)) {
    console.error(
      `dhs install: missing package skill at skills/${SETUP_SKILL}`
    );
    process.exit(1);
  }
  for (const host of hosts) {
    copyTree(skillSrc, setupSkillDir(cwd, host));
    ensureHostHook(cwd, host, packageRoot);
  }

  ensureGitignore(cwd);
  ensureMonitorNpmScript(cwd);

  if (fs.existsSync(path.join(cwd, "harness.config.json"))) {
    console.log(
      "harness.config.json is present. Run /dhs-setup to apply the new templates."
    );
  }
}

function uninstall(ctx) {
  const { cwd, packageRoot } = resolveCtx(ctx);
  const hosts = loadHosts(packageRoot);
  fs.rmSync(path.join(cwd, ".dhs"), { recursive: true, force: true });
  removeMonitorNpmScript(cwd);
  for (const host of hosts) {
    const skillDir = setupSkillDir(cwd, host);
    fs.rmSync(skillDir, { recursive: true, force: true });
    pruneEmptyAncestors(path.dirname(skillDir), cwd);
    removeHostHook(cwd, host);
  }
}

function main(argv, ctx) {
  const command = argv[0];

  if (command === undefined || command === "-h" || command === "--help") {
    console.log(usage());
    process.exit(command === undefined ? 1 : 0);
  }

  if (argv.length !== 1) {
    console.error(usage());
    process.exit(1);
  }

  if (command === "install") {
    install(ctx);
    return;
  }

  if (command === "uninstall") {
    uninstall(ctx);
    return;
  }

  console.error(`Unknown command: ${command}`);
  console.error(usage());
  process.exit(1);
}

if (require.main === module) {
  main(process.argv.slice(2));
}

module.exports = { main, install, uninstall, PAYLOAD_DIRS, loadHosts };
