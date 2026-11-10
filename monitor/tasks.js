"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const JIRA_REL = path.join(".dhs", "scripts", "jira");

function readHarness(cwd) {
  const file = path.join(cwd, "harness.config.json");
  if (!fs.existsSync(file)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function jiraTrackerActive(config) {
  const tracker = config && config.agents && config.agents.tracker;
  return tracker != null && typeof tracker === "object";
}

function doneStatusFrom(config) {
  if (jiraTrackerActive(config)) {
    const mapped =
      config.agents.tracker.statuses && config.agents.tracker.statuses.done;
    return typeof mapped === "string" && mapped.trim() ? mapped.trim() : null;
  }
  const statuses = config && config.agents && config.agents.statuses;
  const mapped = statuses && statuses.done;
  return typeof mapped === "string" && mapped.trim() ? mapped.trim() : null;
}

function docsParentDir(cwd, config) {
  const docs = config && config.agents && config.agents.docs;
  const first = Array.isArray(docs)
    ? docs.find((row) => typeof row === "string" && row.trim())
    : docs;
  if (typeof first === "string" && first.trim()) {
    const rel = first.trim();
    const abs = path.resolve(cwd, rel);
    return /\.[A-Za-z0-9]+$/.test(path.basename(rel))
      ? path.dirname(abs)
      : abs;
  }
  return path.join(cwd, "docs");
}

function featuresDir(cwd, config) {
  return path.join(docsParentDir(cwd, config), "features");
}

function promptDir(cwd, config) {
  return path.join(docsParentDir(cwd, config), "prompt");
}

function gitCommonDir(cwd) {
  const marker = path.join(cwd, ".git");
  if (!fs.existsSync(marker)) {
    return null;
  }
  const st = fs.statSync(marker);
  if (st.isDirectory()) {
    return marker;
  }
  let text;
  try {
    text = fs.readFileSync(marker, "utf8");
  } catch {
    return null;
  }
  const match = text.match(/^gitdir:\s*(.+)$/m);
  if (!match) {
    return null;
  }
  const gitdir = path.resolve(cwd, match[1].trim());
  const commondirFile = path.join(gitdir, "commondir");
  if (fs.existsSync(commondirFile)) {
    try {
      const rel = fs.readFileSync(commondirFile, "utf8").trim();
      return path.resolve(gitdir, rel);
    } catch {
      return gitdir;
    }
  }
  return gitdir;
}

function dhsWorktreeExists(cwd, taskKey) {
  if (!cwd || typeof taskKey !== "string" || taskKey.trim() === "") {
    return false;
  }
  const common = gitCommonDir(cwd);
  if (!common) {
    return false;
  }
  return fs.existsSync(path.join(common, "dhs-worktrees", taskKey));
}

function parseDepends(value) {
  if (Array.isArray(value)) {
    return value
      .map((row) => (typeof row === "string" ? row.trim() : ""))
      .filter(Boolean);
  }
  if (typeof value !== "string") {
    return [];
  }
  const trimmed = value.trim();
  if (!trimmed || trimmed === "[]") {
    return [];
  }
  return trimmed
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .split(",")
    .map((row) => row.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);
}

function unquote(value) {
  if (typeof value !== "string") {
    return "";
  }
  const trimmed = value.trim();
  const match = trimmed.match(/^['"]([\s\S]*)['"]$/);
  return match ? match[1] : trimmed;
}

function parseFrontmatter(raw) {
  const text = String(raw);
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) {
    return {};
  }
  const fields = {};
  const lines = match[1].split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith("#")) {
      i += 1;
      continue;
    }
    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!kv) {
      i += 1;
      continue;
    }
    const key = kv[1];
    const rest = kv[2];
    if (rest === "" && (key === "depends" || key === "relates")) {
      const items = [];
      i += 1;
      while (i < lines.length && /^\s+-\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s+-\s+/, "").trim());
        i += 1;
      }
      fields[key] = items;
      continue;
    }
    fields[key] = rest;
    i += 1;
  }
  return fields;
}

function markDependsUnmet(tasks, doneStatus) {
  const byKey = new Map(tasks.map((task) => [task.key, task]));
  for (const task of tasks) {
    const deps = Array.isArray(task.depends) ? task.depends : [];
    task.dependsUnmet = deps.some((key) => {
      const other = byKey.get(key);
      if (!other) {
        return true;
      }
      if (!doneStatus) {
        return false;
      }
      return other.status !== doneStatus;
    });
  }
  return tasks;
}

function applyRunState(tasks, sessions) {
  const live = new Set();
  if (sessions && typeof sessions.list === "function") {
    for (const row of sessions.list()) {
      if (row && typeof row.taskKey === "string") {
        live.add(row.taskKey);
      }
    }
  }
  for (const task of tasks) {
    task.runState = live.has(task.key) ? "running" : "idle";
  }
  return tasks;
}

function publicTask(task) {
  return {
    key: task.key,
    title: task.title,
    status: task.status,
    depends: task.depends,
    dependsUnmet: Boolean(task.dependsUnmet),
    runState: task.runState || "idle",
    hasSpecPrompt: Boolean(task.hasSpecPrompt),
    worktreeExists: Boolean(task.worktreeExists),
  };
}

function listFilesTasks(cwd, config) {
  const dir = featuresDir(cwd, config);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    return [];
  }
  const prompts = promptDir(cwd, config);
  const names = fs.readdirSync(dir).filter((name) => name.endsWith(".feature.md"));
  const tasks = [];
  for (const name of names) {
    const raw = fs.readFileSync(path.join(dir, name), "utf8");
    const fields = parseFrontmatter(raw);
    const key = name.replace(/\.feature\.md$/, "");
    tasks.push({
      key,
      title: unquote(fields.title),
      status: unquote(fields.status),
      depends: parseDepends(fields.depends),
      hasSpecPrompt: fs.existsSync(path.join(prompts, `${key}.prompt.md`)),
    });
  }
  return markDependsUnmet(tasks, doneStatusFrom(config));
}

function parseSearchStdout(stdout) {
  const text = String(stdout || "");
  const lines = text.split(/\r?\n/);
  if (lines[0] !== "OK") {
    return [];
  }
  const tasks = [];
  let current = null;
  const push = () => {
    if (current) {
      tasks.push(current);
      current = null;
    }
  };
  for (const line of lines.slice(1)) {
    const idx = line.indexOf(": ");
    const colonEnd = idx === -1 && line.endsWith(":") ? line.length - 1 : idx;
    if (colonEnd === -1) {
      continue;
    }
    const field = idx === -1 ? line.slice(0, colonEnd) : line.slice(0, idx);
    const value = idx === -1 ? "" : line.slice(idx + 2);
    if (field === "key") {
      push();
      current = {
        key: value,
        title: "",
        status: "",
        depends: [],
        hasSpecPrompt: true,
      };
      continue;
    }
    if (!current) {
      continue;
    }
    if (field === "title") {
      current.title = value;
    } else if (field === "status") {
      current.status = value;
    } else if (field === "depends") {
      current.depends = parseDepends(value);
    }
  }
  push();
  return tasks;
}

function runJiraSearch(cwd, env) {
  const script = path.join(cwd, JIRA_REL);
  if (!fs.existsSync(script)) {
    return {
      error: "BLOCKED: .dhs/scripts/jira is missing — run dhs install",
      stdout: "",
      status: 1,
    };
  }
  const result = spawnSync(script, ["search"], {
    cwd,
    encoding: "utf8",
    env: env || process.env,
  });
  const stdout = result.stdout || "";
  const stderr = result.stderr || "";
  if (result.status !== 0) {
    const message = (stdout.trim() || stderr.trim() || "jira search failed");
    return { error: message, stdout, status: result.status };
  }
  return { stdout, status: 0 };
}

function listJiraTasks(cwd, config, env) {
  const ran = runJiraSearch(cwd, env);
  if (ran.error) {
    return { tasks: [], error: ran.error };
  }
  const tasks = markDependsUnmet(
    parseSearchStdout(ran.stdout),
    doneStatusFrom(config)
  );
  return { tasks };
}

function listTasks(cwd, { sessions, env } = {}) {
  if (!cwd) {
    return { tasks: [] };
  }
  const config = readHarness(cwd);
  if (!config) {
    return { tasks: [], error: "missing harness.config.json" };
  }
  let listed;
  if (jiraTrackerActive(config)) {
    listed = listJiraTasks(cwd, config, env);
  } else {
    listed = { tasks: listFilesTasks(cwd, config) };
  }
  applyRunState(listed.tasks, sessions);
  for (const task of listed.tasks) {
    task.worktreeExists = dhsWorktreeExists(cwd, task.key);
  }
  return {
    tasks: listed.tasks.map(publicTask),
    ...(listed.error ? { error: listed.error } : {}),
  };
}

module.exports = {
  dhsWorktreeExists,
  featuresDir,
  jiraTrackerActive,
  listTasks,
  promptDir,
  readHarness,
};
