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
const SETUP_SKILL = "dhs-setup";
const HOSTS_FILE = "hosts.json";

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
    copyTree(src, path.join(dhsDir, name));
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
  }

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
  for (const host of hosts) {
    const skillDir = setupSkillDir(cwd, host);
    fs.rmSync(skillDir, { recursive: true, force: true });
    pruneEmptyAncestors(path.dirname(skillDir), cwd);
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
