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
const HOST_SKILL_REL = path.join(".claude", "skills", SETUP_SKILL);

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

function pruneEmpty(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }
  const entries = fs.readdirSync(dir);
  if (entries.length === 0) {
    fs.rmdirSync(dir);
  }
}

function install(ctx) {
  const { cwd, packageRoot } = resolveCtx(ctx);
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
  copyTree(skillSrc, path.join(cwd, HOST_SKILL_REL));

  if (fs.existsSync(path.join(cwd, "harness.config.json"))) {
    console.log(
      "harness.config.json is present. Run /dhs-setup to apply the new templates."
    );
  }
}

function uninstall(ctx) {
  const { cwd } = resolveCtx(ctx);
  fs.rmSync(path.join(cwd, ".dhs"), { recursive: true, force: true });
  fs.rmSync(path.join(cwd, HOST_SKILL_REL), { recursive: true, force: true });
  pruneEmpty(path.join(cwd, ".claude", "skills"));
  pruneEmpty(path.join(cwd, ".claude"));
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

module.exports = { main, install, uninstall };
