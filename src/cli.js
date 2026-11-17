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
];
const SETUP_SKILL = "setit-se";
const DEFAULT_PREFIX = "_";
const PREFIX_FILE = "PREFIX";
const PREFIX_TOKEN = "{{prefix}}";
const PREFIX_PATTERN = /^[A-Za-z0-9_-]*$/;
const HOSTS_FILE = "hosts.json";
const CHECK_UPDATE_SCRIPT = ".seh/scripts/check-update";
const OPENCODE_PLUGIN_SRC = path.join("references", "opencode-check-update.js");
const HOST_COMMAND_SRC = path.join("references", "host-command.md");
const GITIGNORE_ENTRIES = [
  {
    line: ".seh/",
    alreadyPresent: new Set([".seh", ".seh/", "/.seh", "/.seh/"]),
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
  return [
    "Usage: seh <install|uninstall> [--prefix P]",
    "  --prefix P   (install) prefix for installed skill names, default: .seh/PREFIX if present, else _ (/_setit-se). \"\" for none",
  ].join("\n");
}

function parseArgs(argv) {
  const out = { command: argv[0], prefix: undefined };
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--prefix" || arg.startsWith("--prefix=")) {
      let value;
      if (arg === "--prefix") {
        value = argv[++i];
        if (value === undefined) {
          return { error: 'seh: --prefix needs a value (use --prefix "" for no prefix)' };
        }
      } else {
        value = arg.slice("--prefix=".length);
      }
      if (!PREFIX_PATTERN.test(value)) {
        return { error: "seh: --prefix may contain only letters, digits, _ and -" };
      }
      out.prefix = value;
    } else {
      return { error: null };
    }
  }
  return out;
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
    console.error("seh: missing package file at references/hosts.json");
    process.exit(1);
  }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(hostsPath, "utf8"));
  } catch {
    console.error("seh: invalid JSON at references/hosts.json");
    process.exit(1);
  }
  if (!Array.isArray(data.hosts) || data.hosts.length === 0) {
    console.error("seh: references/hosts.json has no hosts");
    process.exit(1);
  }
  for (const host of data.hosts) {
    if (!host || typeof host.skillsDir !== "string" || host.skillsDir === "") {
      console.error("seh: references/hosts.json host is missing skillsDir");
      process.exit(1);
    }
    if (
      host.commandsDir !== undefined &&
      host.commandsDir !== null &&
      (typeof host.commandsDir !== "string" || host.commandsDir === "")
    ) {
      console.error(
        "seh: references/hosts.json host commandsDir must be a non-empty string or null"
      );
      process.exit(1);
    }
    if (
      host.hooksMatcher !== undefined &&
      (typeof host.hooksMatcher !== "string" || host.hooksMatcher === "")
    ) {
      console.error(
        "seh: references/hosts.json host hooksMatcher must be a non-empty string"
      );
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
          "seh: references/hosts.json host hooksFile needs hooksShape"
        );
        process.exit(1);
      }
      if (
        host.hooksShape !== "opencode-plugin" &&
        (typeof host.hooksEvent !== "string" || host.hooksEvent === "")
      ) {
        console.error(
          "seh: references/hosts.json host hooksFile needs hooksEvent and hooksShape"
        );
        process.exit(1);
      }
    }
  }
  return data.hosts;
}

function setupSkillDir(cwd, host, prefix) {
  return path.join(cwd, posixJoin(host.skillsDir), `${prefix}${SETUP_SKILL}`);
}

// Hosts whose slash commands are not skills (OpenCode) get a command file
// that loads the skill. Null when the row has no commandsDir.
function setupCommandFile(cwd, host, prefix) {
  if (!host.commandsDir) {
    return null;
  }
  return path.join(cwd, posixJoin(host.commandsDir), `${prefix}${SETUP_SKILL}.md`);
}

function frontmatterField(text, field) {
  const block = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!block) {
    return "";
  }
  const line = new RegExp(`^${field}:[ \\t]*(.*)$`, "m").exec(block[1]);
  return line ? line[1].trim() : "";
}

function renderHostCommand(template, { prefix, name, description, host }) {
  return template
    .split("{{host}}").join(host)
    .split("{{description}}").join(description)
    .split("{{name}}").join(name)
    .split(PREFIX_TOKEN).join(prefix);
}

function readHostCommandTemplate(packageRoot) {
  const src = path.join(packageRoot, HOST_COMMAND_SRC);
  if (!fs.existsSync(src)) {
    console.error("seh install: missing package file at references/host-command.md");
    process.exit(1);
  }
  return fs.readFileSync(src, "utf8");
}

function isPackageTestFile(filePath) {
  return /\.test\.[cm]?js$/.test(filePath);
}

function renderTokens(tree, prefix) {
  for (const entry of fs.readdirSync(tree, { withFileTypes: true })) {
    const full = path.join(tree, entry.name);
    if (entry.isDirectory()) {
      renderTokens(full, prefix);
    } else if (entry.isFile()) {
      const buf = fs.readFileSync(full);
      if (buf.includes(0)) {
        continue;
      }
      const text = buf.toString("utf8");
      if (text.includes(PREFIX_TOKEN)) {
        fs.writeFileSync(full, text.split(PREFIX_TOKEN).join(prefix));
      }
    }
  }
}

const INVOKE_SKILLS = ["setit-se", "planit", "doit", "checkit", "runit", "shipit", "grillit"];

// Skills and messages name what the user types as `/<prefix><skill>`. A host
// whose row has another `invokePrefix` (Codex: `$`) gets that character instead.
function rewriteInvocations(tree, prefix, invokePrefix) {
  if (!invokePrefix || invokePrefix === "/") {
    return;
  }
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(^|[^A-Za-z0-9_.\\-/])/(${escaped}(?:${INVOKE_SKILLS.join("|")}))(?![A-Za-z0-9_-])`, "gm");
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && /\.(md|yaml|yml|toml)$/.test(entry.name)) {
        const text = fs.readFileSync(full, "utf8");
        const next = text.replace(pattern, (_m, lead, name) => `${lead}${invokePrefix}${name}`);
        if (next !== text) {
          fs.writeFileSync(full, next);
        }
      }
    }
  };
  walk(tree);
}

function copyTree(src, dest, prefix) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, {
    recursive: true,
    force: true,
    filter: (from) => !isPackageTestFile(from),
  });
  if (prefix !== undefined) {
    renderTokens(dest, prefix);
  }
}

// Frontmatter `name` becomes the slash command, so it must be prefix + name.
function renameSkill(skillDir, installedName) {
  const file = path.join(skillDir, "SKILL.md");
  if (!fs.existsSync(file)) {
    return;
  }
  const text = fs.readFileSync(file, "utf8");
  fs.writeFileSync(
    file,
    text.replace(/^(---\r?\n[\s\S]*?^name:)[^\n]*$/m, `$1 ${installedName}`)
  );
}

function readPrefix(sehDir) {
  try {
    return fs.readFileSync(path.join(sehDir, PREFIX_FILE), "utf8").split(/\r?\n/)[0];
  } catch {
    return DEFAULT_PREFIX;
  }
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

function ensureClaudeHook(data, eventName, command, matcher) {
  const list = eventList(data, eventName);
  if (list.some(claudeEntryHasCheckUpdate)) {
    return;
  }
  list.push({
    matcher: matcher || "startup",
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
      "seh install: missing package file at references/opencode-check-update.js"
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
    console.error(`seh install: invalid JSON at ${host.hooksFile}`);
    process.exit(1);
  }
  const command = checkUpdateCommand(host);
  if (host.hooksShape === "cursor-flat") {
    ensureCursorHook(data, host.hooksEvent, command);
  } else if (host.hooksShape === "claude-nested") {
    ensureClaudeHook(data, host.hooksEvent, command, host.hooksMatcher);
  } else {
    console.error(
      `seh: references/hosts.json unknown hooksShape ${host.hooksShape}`
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

function install(ctx, prefixArg) {
  const { cwd, packageRoot } = resolveCtx(ctx);
  const hosts = loadHosts(packageRoot);
  const sehDir = path.join(cwd, ".seh");
  const previousPrefix = fs.existsSync(path.join(sehDir, PREFIX_FILE))
    ? readPrefix(sehDir)
    : undefined;
  // A reinstall without --prefix keeps the stored prefix, so an update does
  // not silently rename the project's skills back to the default.
  const storedPrefix =
    previousPrefix !== undefined && PREFIX_PATTERN.test(previousPrefix)
      ? previousPrefix
      : DEFAULT_PREFIX;
  const prefix = prefixArg === undefined ? storedPrefix : prefixArg;
  fs.mkdirSync(sehDir, { recursive: true });
  if (previousPrefix !== undefined && PREFIX_PATTERN.test(previousPrefix) && previousPrefix !== prefix) {
    for (const host of hosts) {
      const old = setupSkillDir(cwd, host, previousPrefix);
      fs.rmSync(old, { recursive: true, force: true });
      pruneEmptyAncestors(path.dirname(old), cwd);
      const oldCommand = setupCommandFile(cwd, host, previousPrefix);
      if (oldCommand) {
        fs.rmSync(oldCommand, { force: true });
        pruneEmptyAncestors(path.dirname(oldCommand), cwd);
      }
    }
  }

  for (const name of PAYLOAD_DIRS) {
    const src = path.join(packageRoot, name);
    if (!fs.existsSync(src)) {
      continue;
    }
    copyTree(src, path.join(sehDir, name), prefix);
  }
  fs.writeFileSync(path.join(sehDir, PREFIX_FILE), `${prefix}\n`);

  const version = packageVersion(packageRoot);
  fs.writeFileSync(path.join(sehDir, "VERSION"), `${version}\n`);

  const skillSrc = path.join(packageRoot, "skills", SETUP_SKILL);
  if (!fs.existsSync(skillSrc)) {
    console.error(
      `seh install: missing package skill at skills/${SETUP_SKILL}`
    );
    process.exit(1);
  }
  const commandTemplate = hosts.some((host) => host.commandsDir)
    ? readHostCommandTemplate(packageRoot)
    : null;
  for (const host of hosts) {
    const dest = setupSkillDir(cwd, host, prefix);
    copyTree(skillSrc, dest, prefix);
    rewriteInvocations(dest, prefix, host.invokePrefix);
    renameSkill(dest, `${prefix}${SETUP_SKILL}`);
    const commandFile = setupCommandFile(cwd, host, prefix);
    if (commandFile) {
      const description = frontmatterField(
        fs.readFileSync(path.join(dest, "SKILL.md"), "utf8"),
        "description"
      );
      fs.mkdirSync(path.dirname(commandFile), { recursive: true });
      fs.writeFileSync(
        commandFile,
        renderHostCommand(commandTemplate, { prefix, name: SETUP_SKILL, description, host: host.id })
      );
    }
    ensureHostHook(cwd, host, packageRoot);
  }

  ensureGitignore(cwd);

  console.log(`seh install: OK ${version} in ${cwd}`);
  const invokeOf = (host) => host.invokePrefix || "/";
  const slashHosts = hosts.filter((host) => invokeOf(host) === "/");
  const otherPrefixes = [...new Set(hosts.map(invokeOf).filter((p) => p !== "/"))];
  const primary = slashHosts.length > 0 ? "/" : otherPrefixes.shift();
  const alternates = otherPrefixes.map((p) => {
    const ids = hosts.filter((host) => invokeOf(host) === p).map((host) => host.id);
    return `In ${ids.join(", ")} type ${p}${prefix}${SETUP_SKILL} instead.`;
  });
  const alsoText = alternates.length > 0 ? ` ${alternates.join(" ")}` : "";
  console.log(`Next: run ${primary}${prefix}${SETUP_SKILL} in the project.${alsoText}`);

  if (fs.existsSync(path.join(cwd, "harness.config.json"))) {
    console.log(
      `harness.config.json is present. Run ${primary}${prefix}${SETUP_SKILL} to apply the new templates.${alsoText}`
    );
  }
}

function uninstall(ctx) {
  const { cwd, packageRoot } = resolveCtx(ctx);
  const hosts = loadHosts(packageRoot);
  const prefix = readPrefix(path.join(cwd, ".seh"));
  fs.rmSync(path.join(cwd, ".seh"), { recursive: true, force: true });
  for (const host of hosts) {
    const skillDir = setupSkillDir(cwd, host, prefix);
    fs.rmSync(skillDir, { recursive: true, force: true });
    pruneEmptyAncestors(path.dirname(skillDir), cwd);
    const commandFile = setupCommandFile(cwd, host, prefix);
    if (commandFile) {
      fs.rmSync(commandFile, { force: true });
      pruneEmptyAncestors(path.dirname(commandFile), cwd);
    }
    removeHostHook(cwd, host);
  }
}

function main(argv, ctx) {
  const command = argv[0];

  if (command === undefined || command === "-h" || command === "--help") {
    console.log(usage());
    process.exit(command === undefined ? 1 : 0);
  }

  const parsed = parseArgs(argv);
  if (parsed.error !== undefined) {
    if (parsed.error) {
      console.error(parsed.error);
    }
    console.error(usage());
    process.exit(1);
  }
  if (command === "uninstall" && parsed.prefix !== undefined) {
    console.error("seh uninstall: --prefix is not accepted (the prefix is read from .seh/PREFIX)");
    process.exit(1);
  }

  if (command === "install") {
    install(ctx, parsed.prefix);
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
