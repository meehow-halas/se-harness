#!/usr/bin/env node
"use strict";

const fs = require("fs");

const API_VERSION = "7.1";

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

const cmd = process.argv[2];
if (!cmd) {
  fail("usage: ado-json.js <command>");
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
  const fieldsBody = readJson(process.argv[4]);
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
  const fields = Array.isArray(fieldsBody.value) ? fieldsBody.value : [];
  for (const f of fields) {
    if (!f || typeof f.referenceName !== "string") {
      continue;
    }
    if (!f.referenceName.startsWith("Custom.")) {
      continue;
    }
    const name = typeof f.name === "string" ? f.name : f.referenceName;
    fi += 1;
    lines.push(`field.${fi}: ${f.referenceName} | ${name}`);
  }
  process.stdout.write(`${lines.join("\n")}\n`);
  process.exit(0);
}

fail(`unknown command ${cmd}`);
