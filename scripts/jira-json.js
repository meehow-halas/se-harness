#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

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
  return t;
}

function toAdf(text) {
  const lines = String(text).split("\n");
  const content =
    lines.length === 0
      ? [{ type: "paragraph", content: [] }]
      : lines.map((line) => ({
          type: "paragraph",
          content: line === "" ? [] : [{ type: "text", text: line }],
        }));
  return { type: "doc", version: 1, content };
}

function fromAdf(node) {
  if (node == null) {
    return "";
  }
  if (typeof node === "string") {
    return node;
  }
  if (typeof node !== "object") {
    return "";
  }
  if (node.type === "text") {
    return node.text || "";
  }
  const kids = Array.isArray(node.content) ? node.content : [];
  const inner = kids.map(fromAdf).join("");
  if (node.type === "paragraph" || node.type === "heading") {
    return inner + "\n";
  }
  if (node.type === "hardBreak") {
    return "\n";
  }
  return inner;
}

function fieldText(value) {
  if (value == null) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  return fromAdf(value).replace(/\n$/, "");
}

function commentsText(payload) {
  const comments = (payload && payload.comments) || [];
  return comments
    .map((c) => fieldText(c.body))
    .filter(Boolean)
    .join("\n\n");
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

function mapped(t, kind) {
  const fields = t.fields || {};
  const v = fields[kind];
  return typeof v === "string" ? v.trim() : "";
}

function readOnly(t) {
  return t.readOnly === true;
}

function readArtifactFile(root, rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) {
    return "";
  }
  return fs.readFileSync(p, "utf8").replace(/\n$/, "");
}

function stripYamlFrontmatter(text) {
  if (!text.startsWith("---")) {
    return text;
  }
  const end = text.indexOf("\n---", 3);
  if (end === -1) {
    return text;
  }
  return text.slice(end + 4).replace(/^\n/, "");
}

const cmd = process.argv[2];
if (!cmd) {
  fail("usage: jira-json.js <command>");
}

if (cmd === "curl-config") {
  const cfgPath = process.argv[3];
  const credsPath = process.argv[4];
  const outPath = process.argv[5];
  const cfg = readJson(cfgPath);
  const t = trackerFrom(cfg);
  const url = typeof t.url === "string" ? t.url.trim().replace(/\/+$/, "") : "";
  const user = typeof t.user === "string" ? t.user.trim() : "";
  if (!url || !user) {
    fail("missing-url-user");
  }
  const creds = readJson(credsPath);
  const token =
    creds && typeof creds.jiraToken === "string" ? creds.jiraToken.trim() : "";
  if (!token) {
    fail("missing-token");
  }
  const userLine = `user = ${JSON.stringify(`${user}:${token}`)}\n`;
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

if (cmd === "project-key") {
  const t = trackerFrom(readJson(process.argv[3]));
  const key = typeof t.projectKey === "string" ? t.projectKey.trim() : "";
  if (!key) {
    fail("missing-project");
  }
  process.stdout.write(`${key}\n`);
  process.exit(0);
}

if (cmd === "issue-type") {
  const t = trackerFrom(readJson(process.argv[3]));
  const kind = process.argv[4];
  const name =
    t.issueTypes && typeof t.issueTypes[kind] === "string"
      ? t.issueTypes[kind].trim()
      : "";
  if (!name) {
    fail("missing-issue-type");
  }
  process.stdout.write(`${name}\n`);
  process.exit(0);
}

if (cmd === "mapped-field") {
  const t = trackerFrom(readJson(process.argv[3]));
  const loc = mapped(t, process.argv[4]);
  process.stdout.write(`${loc}\n`);
  process.exit(0);
}

if (cmd === "status-map") {
  const t = trackerFrom(readJson(process.argv[3]));
  const key = process.argv[4];
  const statuses = t.statuses || {};
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

if (cmd === "fetch-fields") {
  const t = trackerFrom(readJson(process.argv[3]));
  const extra = Array.isArray(t.fetchFields) ? t.fetchFields : [];
  const names = ["summary", "status", "issuetype", "description"];
  for (const kind of ["spec", "prompt", "log"]) {
    const loc = mapped(t, kind);
    if (loc && loc !== "comment" && loc !== "description") {
      names.push(loc);
    }
  }
  for (const f of extra) {
    if (typeof f === "string" && f.trim()) {
      names.push(f.trim());
    }
  }
  process.stdout.write(`${uniqueNames(names).join(",")}\n`);
  process.exit(0);
}

if (cmd === "create-body") {
  const t = trackerFrom(readJson(process.argv[3]));
  const kind = process.argv[4];
  const title = process.argv[5] || "";
  const projectKey =
    typeof t.projectKey === "string" ? t.projectKey.trim() : "";
  const issueType =
    t.issueTypes && typeof t.issueTypes[kind] === "string"
      ? t.issueTypes[kind].trim()
      : "";
  if (!projectKey || !issueType || !title) {
    fail("create-fields");
  }
  process.stdout.write(
    JSON.stringify({
      fields: {
        project: { key: projectKey },
        issuetype: { name: issueType },
        summary: title,
      },
    })
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
    process.stdout.write(JSON.stringify({ body: toAdf(text) }));
    process.exit(0);
  }
  if (loc === "description") {
    process.stdout.write(
      JSON.stringify({ fields: { description: toAdf(text) } })
    );
    process.exit(0);
  }
  let value = toAdf(text);
  if (kind === "log" && process.argv[6]) {
    const existing = readJson(process.argv[6]);
    const fields = (existing && existing.fields) || {};
    const prev = fieldText(fields[loc]);
    const next = prev ? `${prev}\n\n${text}` : text;
    value = toAdf(next);
  }
  process.stdout.write(JSON.stringify({ fields: { [loc]: value } }));
  process.exit(0);
}

if (cmd === "comment-body") {
  const text = fs.readFileSync(process.argv[3], "utf8");
  process.stdout.write(JSON.stringify({ body: toAdf(text) }));
  process.exit(0);
}

if (cmd === "link-body") {
  const thisKey = process.argv[3];
  const rel = process.argv[4];
  const other = process.argv[5];
  if (rel === "depends") {
    process.stdout.write(
      JSON.stringify({
        type: { name: "Blocks" },
        inwardIssue: { key: thisKey },
        outwardIssue: { key: other },
      })
    );
    process.exit(0);
  }
  if (rel === "relates") {
    process.stdout.write(
      JSON.stringify({
        type: { name: "Relates" },
        inwardIssue: { key: thisKey },
        outwardIssue: { key: other },
      })
    );
    process.exit(0);
  }
  fail("unknown-link");
}

if (cmd === "extract-key") {
  const body = readJson(process.argv[3]);
  const key = body && body.key;
  if (typeof key !== "string" || !key.trim()) {
    fail("missing-key");
  }
  process.stdout.write(`${key.trim()}\n`);
  process.exit(0);
}

if (cmd === "current-status") {
  const body = readJson(process.argv[3]);
  const name =
    body &&
    body.fields &&
    body.fields.status &&
    body.fields.status.name;
  process.stdout.write(`${name || ""}\n`);
  process.exit(0);
}

if (cmd === "pick-transition") {
  const body = readJson(process.argv[3]);
  const want = process.argv[4];
  const list = (body && body.transitions) || [];
  const hit = list.find(
    (tr) => tr && tr.to && tr.to.name === want && tr.id
  );
  if (!hit) {
    fail("missing-transition");
  }
  process.stdout.write(`${hit.id}\n`);
  process.exit(0);
}

if (cmd === "transition-body") {
  process.stdout.write(JSON.stringify({ transition: { id: process.argv[3] } }));
  process.exit(0);
}

if (cmd === "http-error") {
  const code = process.argv[3];
  let detail = "";
  try {
    const body = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
    if (Array.isArray(body.errorMessages) && body.errorMessages[0]) {
      detail = String(body.errorMessages[0]);
    } else if (body.message) {
      detail = String(body.message);
    }
  } catch {
    detail = "";
  }
  process.stdout.write(detail ? `${code}: ${detail}` : String(code));
  process.exit(0);
}

if (cmd === "issue-type-ids") {
  const body = readJson(process.argv[3]);
  const ids = (Array.isArray(body) ? body : [])
    .map((it) => (it && it.id != null ? String(it.id).trim() : ""))
    .filter((id) => /^[0-9]+$/.test(id));
  const out = uniqueNames(ids);
  process.stdout.write(out.length ? `${out.join("\n")}\n` : "");
  process.exit(0);
}

function createMetaFields(body) {
  if (body && Array.isArray(body.fields)) {
    return body.fields;
  }
  if (body && Array.isArray(body.results)) {
    return body.results;
  }
  return [];
}

if (cmd === "next-start") {
  const body = readJson(process.argv[3]);
  const start = Number(process.argv[4]) || 0;
  const items = createMetaFields(body);
  const next = start + items.length;
  const total = body && typeof body.total === "number" ? body.total : null;
  const max = body && typeof body.maxResults === "number" ? body.maxResults : 0;
  const more =
    items.length > 0 && (total !== null ? next < total : max > 0 && items.length >= max);
  process.stdout.write(more ? `${next}\n` : "");
  process.exit(0);
}

if (cmd === "format-meta") {
  const statusesBody = readJson(process.argv[3]);
  const pageDir = process.argv[4];
  const pages = fs
    .readdirSync(pageDir)
    .filter((n) => /^[0-9]+\.json$/.test(n))
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  const fieldsBody = [];
  for (const page of pages) {
    for (const f of createMetaFields(readJson(path.join(pageDir, page)))) {
      if (f && typeof f === "object") {
        fieldsBody.push({ id: f.fieldId || f.key, name: f.name });
      }
    }
  }
  const statusNames = [];
  const typeNames = [];
  const list = Array.isArray(statusesBody) ? statusesBody : [];
  for (const it of list) {
    if (it && typeof it.name === "string" && it.name.trim()) {
      typeNames.push(it.name.trim());
    }
    const sts = (it && it.statuses) || [];
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
  ];
  let fi = 0;
  for (const [id, name] of builtins) {
    fi += 1;
    lines.push(`field.${fi}: ${id} | ${name}`);
  }
  const seenFields = new Set();
  for (const f of fieldsBody) {
    if (typeof f.id !== "string" || !f.id.startsWith("customfield_")) {
      continue;
    }
    if (seenFields.has(f.id)) {
      continue;
    }
    seenFields.add(f.id);
    const name = typeof f.name === "string" ? f.name : f.id;
    fi += 1;
    lines.push(`field.${fi}: ${f.id} | ${name}`);
  }
  process.stdout.write(`${lines.join("\n")}\n`);
  process.exit(0);
}

if (cmd === "read-only") {
  let on = false;
  try {
    on = readOnly(trackerFrom(JSON.parse(fs.readFileSync(process.argv[3], "utf8"))));
  } catch {
    on = false;
  }
  process.stdout.write(on ? "true\n" : "false\n");
  process.exit(0);
}

if (cmd === "format-get") {
  const cfgPath = process.argv[3];
  const t = trackerFrom(readJson(cfgPath));
  const issue = readJson(process.argv[4]);
  const comments = process.argv[5] ? readJson(process.argv[5]) : { comments: [] };
  const fields = (issue && issue.fields) || {};
  const key = issue.key || "";
  const summary = fields.summary || "";
  const status = (fields.status && fields.status.name) || "";
  const issuetype = (fields.issuetype && fields.issuetype.name) || "";
  let spec;
  let prompt;
  let log;
  if (readOnly(t)) {
    const root = path.dirname(cfgPath);
    spec = stripYamlFrontmatter(
      readArtifactFile(root, `docs/features/${key}.feature.md`)
    ).trim();
    prompt = readArtifactFile(root, `docs/prompt/${key}.prompt.md`).trim();
    log = readArtifactFile(root, `docs/feature-log/${key}.log.md`).trim();
  } else {
    const locText = (kind) => {
      const loc = mapped(t, kind);
      if (!loc || loc === "comment") {
        return loc === "comment" ? commentsText(comments) : "";
      }
      if (loc === "description") {
        return fieldText(fields.description);
      }
      return fieldText(fields[loc]);
    };
    spec = locText("spec");
    prompt = locText("prompt");
    log = locText("log");
    if (!mapped(t, "spec") && fields.description) {
      spec = fieldText(fields.description);
    }
    if (!mapped(t, "log")) {
      log = commentsText(comments);
    }
  }
  const lines = [
    `key: ${key}`,
    `summary: ${summary}`,
    `status: ${status}`,
    `issuetype: ${issuetype}`,
    "BEGIN spec",
    spec,
    "END spec",
    "BEGIN prompt",
    prompt,
    "END prompt",
    "BEGIN log",
    log,
    "END log",
  ];
  process.stdout.write(`${lines.join("\n")}\n`);
  process.exit(0);
}

fail(`unknown command ${cmd}`);
