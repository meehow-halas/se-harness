"use strict";

// Helper of .seh/scripts/lessons-render. CommonJS on purpose: it runs from
// .seh/scripts/ inside a project whose package.json may say "type": "module".
// Everything is read and checked first; files change only when nothing blocks.

const fs = require("fs");
const path = require("path");
const codex = require("../references/codex-adapters.cjs");

const NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const OPENCODE_CONFIG = ".opencode/opencode.json";

class Blocked extends Error {
  constructor(reason, action) {
    super(reason + " — " + action);
  }
}

function readIfExists(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw err;
  }
}

function list(dir) {
  try {
    return fs.readdirSync(dir).filter((n) => !n.startsWith(".")).sort();
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

function unquote(value) {
  const v = value.trim();
  if (v.length >= 2 && v[0] === '"' && v[v.length - 1] === '"') {
    try {
      return JSON.parse(v);
    } catch {
      return v.slice(1, -1);
    }
  }
  if (v.length >= 2 && v[0] === "'" && v[v.length - 1] === "'") return v.slice(1, -1);
  return v;
}

function parseLesson(text, rel, group, topic) {
  const bad = (reason) =>
    new Blocked(`invalid frontmatter in ${rel}: ${reason}`, "fix the file (shape: .seh/references/lesson.md), then rerun lessons-render");
  const m = /^---\n([\s\S]*?)\n---(?:\n|$)([\s\S]*)$/.exec(text.replace(/^﻿/, "").replace(/\r\n/g, "\n"));
  if (!m) throw bad("no frontmatter block");
  const fields = {};
  let paths = null;
  let inPaths = false;
  for (const line of m[1].split("\n")) {
    if (/^\s*(#.*)?$/.test(line)) continue;
    const item = /^\s*-\s+(.+)$/.exec(line);
    if (item && inPaths) {
      const glob = unquote(item[1]);
      if (!glob) throw bad("empty path");
      paths.push(glob);
      continue;
    }
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!kv) throw bad(`unreadable line "${line.trim()}"`);
    const [, key, value] = kv;
    if (!["group", "topic", "paths"].includes(key)) throw bad(`unknown key ${key}`);
    if (key in fields) throw bad(`duplicate key ${key}`);
    fields[key] = unquote(value);
    inPaths = key === "paths";
    if (inPaths) {
      if (value.trim()) throw bad("paths must be a list with one \"- <glob>\" per line");
      paths = [];
    }
  }
  if (fields.group !== group) throw bad(`group must be ${group}, the folder name`);
  if (fields.topic !== topic) throw bad(`topic must be ${topic}, the file name`);
  if (paths && group === "general") {
    throw new Blocked(`paths in a general lesson (${rel})`, "remove paths or move the lesson to a scoped group");
  }
  if (paths && paths.length === 0) throw bad("paths is empty; omit the key");
  const body = m[2].replace(/^\n+/, "").replace(/\n*$/, "\n");
  const title = /^# +(.+?)\s*$/m.exec(body);
  return { paths: paths || [], body, description: title ? title[1] : topic };
}

function readLessons(root) {
  const base = path.join(root, "docs", "lessons");
  const lessons = new Map();
  for (const group of list(base)) {
    const dir = path.join(base, group);
    if (!fs.statSync(dir).isDirectory()) continue;
    for (const entry of list(dir)) {
      const rel = `docs/lessons/${group}/${entry}`;
      const file = path.join(dir, entry);
      const isDir = fs.statSync(file).isDirectory();
      if (!isDir && !entry.endsWith(".md")) continue;
      const topic = entry.slice(0, -3);
      if (!NAME.test(group)) {
        throw new Blocked(`bad group name ${group}`, "rename the folder to lowercase words joined by -");
      }
      if (isDir || !NAME.test(topic)) {
        throw new Blocked(`bad topic name ${rel}`, "use <group>/<topic>.md with lowercase words joined by -");
      }
      const name = `lesson-${group}-${topic}`;
      if (lessons.has(name)) {
        throw new Blocked(`${rel} and ${lessons.get(name).rel} both render as ${name}`, "rename one topic");
      }
      lessons.set(name, { rel, ...parseLesson(fs.readFileSync(file, "utf8"), rel, group, topic) });
    }
  }
  return lessons;
}

function readHosts(root) {
  const text = readIfExists(path.join(root, ".seh", "references", "hosts.json"));
  const fix = "run seh install in this project";
  if (text === null) throw new Blocked(".seh/references/hosts.json is missing", fix);
  let hosts;
  try {
    hosts = JSON.parse(text).hosts;
  } catch {
    hosts = null;
  }
  if (!Array.isArray(hosts) || !hosts.every((h) => h && h.rulesDir && h.rulesExt)) {
    throw new Blocked(".seh/references/hosts.json has no usable hosts table", fix);
  }
  return hosts;
}

function renderRule(lesson, ext) {
  const { paths, body, description } = lesson;
  let head;
  if (ext === ".mdc") {
    head = ["description: " + JSON.stringify(description)];
    if (paths.length) head.push("globs: " + paths.join(","), "alwaysApply: false");
    else head.push("alwaysApply: true");
  } else {
    if (!paths.length) return body;
    head = ["paths:", ...paths.map((p) => "  - " + JSON.stringify(p))];
  }
  return "---\n" + head.join("\n") + "\n---\n\n" + body;
}

function openCodeConfig(root, globs) {
  const current = readIfExists(path.join(root, OPENCODE_CONFIG));
  const bad = new Blocked(`invalid JSON at ${OPENCODE_CONFIG}`, "fix the file, then rerun lessons-render");
  let config = {};
  if (current !== null) {
    try {
      config = JSON.parse(current);
    } catch {
      throw bad;
    }
    if (!config || typeof config !== "object" || Array.isArray(config)) throw bad;
  }
  let instructions = config.instructions === undefined ? [] : config.instructions;
  if (typeof instructions === "string") instructions = [instructions];
  if (!Array.isArray(instructions)) throw bad;
  const next = instructions.filter((v, i) => !globs.includes(v) || instructions.indexOf(v) === i);
  for (const glob of globs) if (!next.includes(glob)) next.push(glob);
  if (JSON.stringify(next) === JSON.stringify(config.instructions)) return null;
  config.instructions = next;
  return JSON.stringify(config, null, 2) + "\n";
}

// Pointers for one agents-md rules directory as it will be after this run.
function sectionEntries(root, rulesDir, planned) {
  const dir = rulesDir.replace(/\/+$/, "");
  const entries = [];
  for (const name of list(path.join(root, dir))) {
    if (!/^seh-.*\.mdc?$/.test(name)) continue;
    entries.push({ file: `${dir}/${name}`, paths: codex.parseRulePaths(fs.readFileSync(path.join(root, dir, name), "utf8")) });
  }
  for (const [name, content] of planned) {
    entries.push({ file: `${dir}/${name}`, paths: codex.parseRulePaths(content) });
  }
  return entries;
}

function plan(root) {
  const hosts = readHosts(root);
  const lessons = readLessons(root);

  // rulesDir -> file name -> content; rows may share a directory.
  const dirs = new Map();
  for (const host of hosts) {
    const dir = host.rulesDir.replace(/\/+$/, "");
    if (!dirs.has(dir)) dirs.set(dir, { files: new Map(), exts: new Set() });
    const target = dirs.get(dir);
    target.exts.add(host.rulesExt);
    for (const [name, lesson] of lessons) {
      target.files.set(name + host.rulesExt, renderRule(lesson, host.rulesExt));
    }
  }

  const writes = [];
  const removes = [];
  for (const [dir, { files, exts }] of dirs) {
    for (const [name, content] of files) {
      const rel = `${dir}/${name}`;
      if (readIfExists(path.join(root, rel)) !== content) writes.push([rel, content]);
    }
    for (const name of list(path.join(root, dir))) {
      if (!name.startsWith("lesson-") || files.has(name)) continue;
      if (![...exts].some((ext) => name.endsWith(ext))) continue;
      if (fs.lstatSync(path.join(root, dir, name)).isDirectory()) continue;
      removes.push(`${dir}/${name}`);
    }
  }

  const globs = hosts
    .filter((h) => h.id === "opencode")
    .map((h) => `${h.rulesDir.replace(/\/+$/, "")}/*${h.rulesExt}`);
  if (globs.length && lessons.size) {
    const next = openCodeConfig(root, globs);
    if (next !== null) writes.push([OPENCODE_CONFIG, next]);
  }

  const indexDirs = [...new Set(hosts.filter((h) => h.rulesIndex === "agents-md").map((h) => h.rulesDir.replace(/\/+$/, "")))];
  if (indexDirs.length) {
    const current = readIfExists(path.join(root, "AGENTS.md")) || "";
    // Without lessons, and none listed yet, the section is setup's business
    // (it writes it only after the user accepts it).
    if (lessons.size || indexDirs.some((d) => current.includes(`\`${d}/lesson-`))) {
      const entries = indexDirs.flatMap((d) => sectionEntries(root, d, dirs.get(d).files));
      let next;
      try {
        next = codex.upsertRulesSection(current, entries);
      } catch (err) {
        throw new Blocked(err.message, "fix the markers, then rerun lessons-render");
      }
      if (next !== current) writes.push(["AGENTS.md", next]);
    }
  }

  return { writes, removes };
}

function main(root) {
  const { writes, removes } = plan(root);
  for (const [rel, content] of writes) {
    const file = path.join(root, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  }
  for (const rel of removes) fs.unlinkSync(path.join(root, rel));
  const lines = [...writes.map(([rel]) => "written: " + rel), ...removes.map((rel) => "removed: " + rel)];
  process.stdout.write((lines.length ? ["OK", ...lines] : ["UNCHANGED"]).join("\n") + "\n");
}

try {
  main(process.argv[2]);
} catch (err) {
  const message = err instanceof Blocked ? err.message : `${err.message} — fix it, then rerun lessons-render`;
  process.stdout.write("BLOCKED: " + message + "\n");
  process.exit(1);
}
