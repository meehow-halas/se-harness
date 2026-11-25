#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const API_VERSION = "7.1";
// MS docs list the Comments API only as 7.1-preview.4.
const COMMENTS_API_VERSION = "7.1-preview.4";

function fail(msg) {
  process.stderr.write(`${msg}\n`);
  process.exit(1);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    fail(`cannot parse ${file}: ${err.message}`);
  }
}

function trackerFrom(cfg) {
  const t = cfg && cfg.agents && cfg.agents.tracker;
  if (!t || typeof t !== "object") {
    fail("missing");
  }
  if (t.kind !== "ado") {
    fail("wrong-kind");
  }
  return t;
}

function uniqueNames(values) {
  const seen = new Set();
  const out = [];
  for (const v of values) {
    if (!v || seen.has(v)) {
      continue;
    }
    seen.add(v);
    out.push(v);
  }
  return out;
}

const PATCH_CT = "application/json-patch+json";

function mapped(t, kind) {
  const v = (t.fields || {})[kind];
  return typeof v === "string" ? v.trim() : "";
}

function fieldRef(loc) {
  if (loc === "description") {
    return "System.Description";
  }
  if (loc === "history") {
    return "System.History";
  }
  return loc;
}

// Tracker write action ON. Anything but true is OFF.
function writes(t, action) {
  return Boolean(t.write) && t.write[action] === true;
}

function readArtifactFile(root, rel) {
  const p = path.join(root, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, "utf8").replace(/\n$/, "") : "";
}

function stripYamlFrontmatter(text) {
  if (!text.startsWith("---")) {
    return text;
  }
  const end = text.indexOf("\n---", 3);
  return end === -1 ? text : text.slice(end + 4).replace(/^\n/, "");
}

// Scalar value of a top-level frontmatter key, or "".
function frontmatterValue(text, key) {
  const block = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  const line = block && new RegExp(`^${key}:[ \\t]*(.*)$`, "m").exec(block[1]);
  if (!line) {
    return "";
  }
  const raw = line[1].trim();
  const quoted = /^(["'])(.*?)\1/.exec(raw);
  return quoted ? quoted[2] : raw.replace(/(^|\s+)#.*$/, "");
}

function localSpec(root, base) {
  return readArtifactFile(root, `docs/features/${base}.feature.md`);
}

// A local spec holds a key as its basename or in tracker:.
function heldLocally(root, key) {
  const dir = path.join(root, "docs/features");
  if (!fs.existsSync(dir)) {
    return false;
  }
  return fs
    .readdirSync(dir)
    .filter((n) => n.endsWith(".feature.md"))
    .some(
      (n) =>
        n === `${key}.feature.md` ||
        frontmatterValue(fs.readFileSync(path.join(dir, n), "utf8"), "tracker") === key
    );
}

// get: each body and the status from the store its write action names.
// requested (--user-request) reads every part from the tracker.
function assemble(t, root, base, key, requested, fromTracker) {
  const fromFile = {
    spec: () => stripYamlFrontmatter(localSpec(root, base)).trim(),
    prompt: () => readArtifactFile(root, `docs/prompt/${base}.prompt.md`).trim(),
    log: () => readArtifactFile(root, `docs/feature-log/${base}.log.md`).trim(),
  };
  const out = {};
  for (const kind of ["spec", "prompt", "log"]) {
    out[kind] = requested || writes(t, kind) ? fromTracker[kind]() : fromFile[kind]();
  }
  out.status =
    requested || writes(t, "status") || !heldLocally(root, key)
      ? fromTracker.status()
      : frontmatterValue(localSpec(root, base), "status");
  return out;
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Plain text -> minimal HTML: <p> per blank-line paragraph, <br> per newline.
function toHtml(text) {
  const t = text.replace(/\r\n/g, "\n").replace(/\n+$/, "");
  if (!t.trim()) {
    return "";
  }
  return t
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

// Inverse of toHtml, tolerant of what ADO's editor stores (div/li/nbsp...).
function htmlToText(html) {
  if (!html) {
    return "";
  }
  return html
    .replace(/\r\n/g, "\n")
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|ul|ol|pre|blockquote|table)>/gi, "\n\n")
    .replace(/<\/(li|tr)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
      if (e[0] === "#") {
        const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : m;
      }
      const v = ENTITIES[e.toLowerCase()];
      return v === undefined ? m : v;
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function scalar(v) {
  if (v == null) {
    return "";
  }
  if (typeof v === "object") {
    return typeof v.displayName === "string" ? v.displayName : "";
  }
  return String(v);
}

const cmd = process.argv[2];
if (!cmd) {
  fail("usage: ado-json.js <command>");
}

if (cmd === "api-version") {
  process.stdout.write(`${API_VERSION}\n`);
  process.exit(0);
}

if (cmd === "curl-config") {
  const cfgPath = process.argv[3];
  const credsPath = process.argv[4];
  const outPath = process.argv[5];
  const cfg = readJson(cfgPath);
  const t = trackerFrom(cfg);
  const url =
    typeof t.organizationUrl === "string"
      ? t.organizationUrl.trim().replace(/\/+$/, "")
      : "";
  const project = typeof t.project === "string" ? t.project.trim() : "";
  if (!url || !project) {
    fail("missing-url-project");
  }
  const creds = readJson(credsPath);
  const token =
    creds && typeof creds.adoPat === "string" ? creds.adoPat.trim() : "";
  if (!token) {
    fail("missing-token");
  }
  const userLine = `user = ${JSON.stringify(`:${token}`)}\n`;
  const body = [
    "silent",
    "show-error",
    userLine.trim(),
    'header = "Accept: application/json"',
    'header = "Content-Type: application/json"',
    "",
  ].join("\n");
  fs.writeFileSync(outPath, body, { mode: 0o600 });
  process.stdout.write(`${url}\n`);
  process.exit(0);
}

if (cmd === "organization-url") {
  const t = trackerFrom(readJson(process.argv[3]));
  const url =
    typeof t.organizationUrl === "string"
      ? t.organizationUrl.trim().replace(/\/+$/, "")
      : "";
  if (!url) {
    fail("missing-url");
  }
  process.stdout.write(`${url}\n`);
  process.exit(0);
}

if (cmd === "project") {
  const t = trackerFrom(readJson(process.argv[3]));
  const project = typeof t.project === "string" ? t.project.trim() : "";
  if (!project) {
    fail("missing-project");
  }
  process.stdout.write(`${project}\n`);
  process.exit(0);
}

if (cmd === "project-encoded") {
  const t = trackerFrom(readJson(process.argv[3]));
  const project = typeof t.project === "string" ? t.project.trim() : "";
  if (!project) {
    fail("missing-project");
  }
  process.stdout.write(encodeURIComponent(project));
  process.exit(0);
}

if (cmd === "http-error") {
  const code = process.argv[3];
  let detail = "";
  try {
    const body = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
    if (typeof body.message === "string" && body.message.trim()) {
      detail = body.message.trim();
    } else if (Array.isArray(body.value) && body.value[0] && body.value[0].message) {
      detail = String(body.value[0].message);
    }
  } catch {
    detail = "";
  }
  process.stdout.write(detail ? `${code}: ${detail}` : String(code));
  process.exit(0);
}

if (cmd === "format-meta") {
  const typesBody = readJson(process.argv[3]);
  const statusNames = [];
  const typeNames = [];
  const types = Array.isArray(typesBody.value) ? typesBody.value : [];
  for (const it of types) {
    if (it && typeof it.name === "string" && it.name.trim()) {
      typeNames.push(it.name.trim());
    }
    const sts = (it && it.states) || [];
    for (const st of sts) {
      if (st && typeof st.name === "string" && st.name.trim()) {
        statusNames.push(st.name.trim());
      }
    }
  }
  const lines = [];
  uniqueNames(statusNames).forEach((name, i) => {
    lines.push(`status.${i + 1}: ${name}`);
  });
  uniqueNames(typeNames).forEach((name, i) => {
    lines.push(`issueType.${i + 1}: ${name}`);
  });
  const builtins = [
    ["description", "Description"],
    ["comment", "Comment"],
    ["history", "History"],
  ];
  let fi = 0;
  for (const [id, name] of builtins) {
    fi += 1;
    lines.push(`field.${fi}: ${id} | ${name}`);
  }
  const fields = [];
  for (const it of types) {
    const own = (it && (Array.isArray(it.fields) ? it.fields : it.fieldInstances)) || [];
    if (Array.isArray(own)) {
      fields.push(...own);
    }
  }
  const seenFields = new Set();
  for (const f of fields) {
    if (!f || typeof f.referenceName !== "string") {
      continue;
    }
    if (!f.referenceName.startsWith("Custom.")) {
      continue;
    }
    if (seenFields.has(f.referenceName)) {
      continue;
    }
    seenFields.add(f.referenceName);
    const name = typeof f.name === "string" ? f.name : f.referenceName;
    fi += 1;
    lines.push(`field.${fi}: ${f.referenceName} | ${name}`);
  }
  process.stdout.write(`${lines.join("\n")}\n`);
  process.exit(0);
}

if (cmd === "comments-api-version") {
  process.stdout.write(`${COMMENTS_API_VERSION}\n`);
  process.exit(0);
}

if (cmd === "needs-comments") {
  const t = trackerFrom(readJson(process.argv[3]));
  const requested = Boolean(process.argv[4]);
  const need = ["spec", "prompt", "log"].some(
    (k) =>
      (requested || writes(t, k)) &&
      (mapped(t, k) === "comment" || (k === "log" && !mapped(t, k)))
  );
  process.stdout.write(need ? "true\n" : "false\n");
  process.exit(0);
}

if (cmd === "patch-content-type") {
  process.stdout.write(PATCH_CT);
  process.exit(0);
}

if (cmd === "mapped-field") {
  const t = trackerFrom(readJson(process.argv[3]));
  process.stdout.write(`${mapped(t, process.argv[4])}\n`);
  process.exit(0);
}

if (cmd === "write") {
  const t = trackerFrom(readJson(process.argv[3]));
  if (!t.write || typeof t.write !== "object") {
    fail("no-write");
  }
  process.stdout.write(`${writes(t, process.argv[4])}\n`);
  process.exit(0);
}

if (cmd === "resolve-key") {
  const arg = process.argv[4] || "";
  const root = path.dirname(process.argv[3]);
  process.stdout.write(`${frontmatterValue(localSpec(root, arg), "tracker") || arg}\n`);
  process.exit(0);
}

if (cmd === "type-encoded") {
  const t = trackerFrom(readJson(process.argv[3]));
  const name =
    t.workItemTypes && typeof t.workItemTypes[process.argv[4]] === "string"
      ? t.workItemTypes[process.argv[4]].trim()
      : "";
  if (!name) {
    fail("missing-type");
  }
  process.stdout.write(`%24${encodeURIComponent(name)}`);
  process.exit(0);
}

if (cmd === "fetch-fields") {
  const t = trackerFrom(readJson(process.argv[3]));
  const names = [
    "System.Id",
    "System.Title",
    "System.State",
    "System.WorkItemType",
    "System.Description",
  ];
  for (const kind of ["spec", "prompt", "log"]) {
    const loc = mapped(t, kind);
    if (loc && loc !== "comment") {
      names.push(fieldRef(loc));
    }
  }
  for (const f of Array.isArray(t.fetchFields) ? t.fetchFields : []) {
    if (typeof f === "string" && f.trim()) {
      names.push(fieldRef(f.trim()));
    }
  }
  process.stdout.write(`${uniqueNames(names).join(",")}\n`);
  process.exit(0);
}

if (cmd === "create-body") {
  const title = process.argv[3] || "";
  if (!title) {
    fail("create-fields");
  }
  process.stdout.write(
    JSON.stringify([{ op: "add", path: "/fields/System.Title", value: title }])
  );
  process.exit(0);
}

if (cmd === "extract-id") {
  const body = readJson(process.argv[3]);
  const id = body && body.id;
  if (typeof id !== "number" && typeof id !== "string") {
    fail("missing-id");
  }
  process.stdout.write(`${id}\n`);
  process.exit(0);
}

if (cmd === "comment-body") {
  process.stdout.write(
    JSON.stringify({ text: toHtml(fs.readFileSync(process.argv[3], "utf8")) })
  );
  process.exit(0);
}

if (cmd === "set-body") {
  const t = trackerFrom(readJson(process.argv[3]));
  const kind = process.argv[4];
  const loc = mapped(t, kind);
  const text = fs.readFileSync(process.argv[5], "utf8");
  if (!loc) {
    fail("unmapped-field");
  }
  if (loc === "comment") {
    process.stdout.write(JSON.stringify({ text: toHtml(text) }));
    process.exit(0);
  }
  const ref = fieldRef(loc);
  // System.History is plain text in ADO; every other field is HTML.
  let value =
    ref === "System.History"
      ? text.replace(/\r\n/g, "\n").replace(/\n+$/, "")
      : toHtml(text);
  if (kind === "log" && process.argv[6]) {
    const existing = readJson(process.argv[6]);
    const prev = scalar(((existing && existing.fields) || {})[ref]);
    if (prev && value) {
      // New entry is a new paragraph; keep a blank-line gap even when the
      // old value is plain text or ends mid-line.
      const sep = /<\/(p|div|h[1-6]|ul|ol|pre|blockquote|table)>\s*$/i.test(prev)
        ? ""
        : "<br><br>";
      value = `${prev}${sep}${value}`;
    } else if (prev) {
      value = prev;
    }
  }
  process.stdout.write(
    JSON.stringify([{ op: "add", path: `/fields/${ref}`, value }])
  );
  process.exit(0);
}

if (cmd === "status-map") {
  const t = trackerFrom(readJson(process.argv[3]));
  const statuses = t.statuses || {};
  const key = process.argv[4];
  if (!Object.prototype.hasOwnProperty.call(statuses, key)) {
    fail("unknown-status-key");
  }
  const v = statuses[key];
  if (v == null) {
    process.stdout.write("NULL\n");
    process.exit(0);
  }
  if (typeof v !== "string" || !v.trim()) {
    fail("invalid-status-map");
  }
  process.stdout.write(`${v.trim()}\n`);
  process.exit(0);
}

if (cmd === "current-state") {
  const item = readJson(process.argv[3]);
  process.stdout.write(`${scalar(((item && item.fields) || {})["System.State"])}\n`);
  process.exit(0);
}

if (cmd === "state-body") {
  process.stdout.write(
    JSON.stringify([
      { op: "add", path: "/fields/System.State", value: process.argv[3] },
    ])
  );
  process.exit(0);
}

// Link direction: "A depends B" is stored on A as Dependency-Reverse
// (Predecessor): B must finish before A. Same mental model as jira-json.js
// link-body, where depends = "this issue is blocked by other".
if (cmd === "link-body") {
  const rel = process.argv[3];
  const base = process.argv[4].replace(/\/+$/, "");
  const other = process.argv[5];
  const types = {
    depends: "System.LinkTypes.Dependency-Reverse",
    relates: "System.LinkTypes.Related",
  };
  if (!types[rel]) {
    fail("unknown-link");
  }
  process.stdout.write(
    JSON.stringify([
      {
        op: "add",
        path: "/relations/-",
        value: {
          rel: types[rel],
          url: `${base}/_apis/wit/workItems/${other}`,
        },
      },
    ])
  );
  process.exit(0);
}

if (cmd === "format-get") {
  const cfgPath = process.argv[3];
  const t = trackerFrom(readJson(cfgPath));
  const item = readJson(process.argv[4]);
  const comments = readJson(process.argv[5]);
  const fields = (item && item.fields) || {};
  const id = String(item.id != null ? item.id : fields["System.Id"] || "");
  const commentsText = () =>
    (Array.isArray(comments.comments) ? comments.comments : [])
      .map((c) => htmlToText(scalar(c && c.text)))
      .filter(Boolean)
      .join("\n\n");
  const text = (kind) => {
    const loc = mapped(t, kind);
    if (!loc) {
      return "";
    }
    return loc === "comment"
      ? commentsText()
      : htmlToText(scalar(fields[fieldRef(loc)]));
  };
  const { spec, prompt, log, status } = assemble(
    t,
    path.dirname(cfgPath),
    process.argv[6] || id,
    id,
    Boolean(process.argv[7]),
    {
      spec: () =>
        mapped(t, "spec")
          ? text("spec")
          : htmlToText(scalar(fields["System.Description"])),
      prompt: () => text("prompt"),
      log: () => (mapped(t, "log") ? text("log") : commentsText()),
      status: () => scalar(fields["System.State"]),
    }
  );
  const lines = [
    `id: ${id}`,
    `title: ${scalar(fields["System.Title"])}`,
    `status: ${status}`,
    `type: ${scalar(fields["System.WorkItemType"])}`,
  ];
  const shown = new Set();
  const core = new Set([
    "System.Id",
    "System.Title",
    "System.State",
    "System.WorkItemType",
    "System.Description",
  ]);
  const mappedRefs = new Set(
    ["spec", "prompt", "log"].map((k) => fieldRef(mapped(t, k)))
  );
  for (const f of Array.isArray(t.fetchFields) ? t.fetchFields : []) {
    const ref = typeof f === "string" ? fieldRef(f.trim()) : "";
    if (!ref || core.has(ref) || mappedRefs.has(ref) || shown.has(ref)) {
      continue;
    }
    shown.add(ref);
    lines.push(`${ref}: ${scalar(fields[ref])}`);
  }
  lines.push(
    "BEGIN spec",
    spec,
    "END spec",
    "BEGIN prompt",
    prompt,
    "END prompt",
    "BEGIN log",
    log,
    "END log"
  );
  process.stdout.write(`${lines.join("\n")}\n`);
  process.exit(0);
}

fail(`unknown command ${cmd}`);
