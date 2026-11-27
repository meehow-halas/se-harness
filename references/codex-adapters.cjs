"use strict";

// Codex format adapters for /<prefix>setit-se. CommonJS on purpose: the file is
// copied to .seh/references/ inside a project whose package.json may say
// "type": "module", and a .cjs file is unaffected by that.
//
//   node .seh/references/codex-adapters.cjs agent <agent.md> [--model M] [--read-only]
//   node .seh/references/codex-adapters.cjs openai-yaml
//   node .seh/references/codex-adapters.cjs rules-section <AGENTS.md> <rulesDir> <rule.md>...
//
// agent / openai-yaml print the file body. rules-section prints the full new
// AGENTS.md text (input unchanged when the section is already current). It also
// lists the lesson-* rule files found in <rulesDir> (resolved from the
// AGENTS.md directory), so a regenerate that passes only seh-* files keeps them.

const fs = require("fs");
const path = require("path");

const READ_ONLY_SENTENCE =
  "Read-only role: do not create, edit, or delete any file, and do not run a command that changes the working tree, the index, or git state. The host does not enforce this for you; you must.";

function splitFrontmatter(md) {
  const text = md.replace(/\r\n/g, "\n");
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text);
  if (!m) throw new Error("agent file has no YAML frontmatter");
  const fields = {};
  for (const line of m[1].split("\n")) {
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (!kv) continue;
    let v = kv[2].trim();
    if (
      v.length >= 2 &&
      ((v[0] === '"' && v[v.length - 1] === '"') ||
        (v[0] === "'" && v[v.length - 1] === "'"))
    ) {
      v = v.slice(1, -1);
    }
    fields[kv[1]] = v;
  }
  return { fields, body: m[2] };
}

function escapeChar(ch) {
  const c = ch.charCodeAt(0);
  if (ch === "\\") return "\\\\";
  if (ch === '"') return '\\"';
  if (ch === "\n") return "\\n";
  if (ch === "\t") return "\\t";
  if (ch === "\r") return "\\r";
  return "\\u" + c.toString(16).padStart(4, "0");
}

// TOML single-line basic string.
function tomlBasic(value) {
  // eslint-disable-next-line no-control-regex
  return '"' + String(value).replace(/[\\"\u0000-\u001f\u007f]/g, escapeChar) + '"';
}

// TOML multi-line string. A literal ''' string is used only when it round-trips
// byte for byte; otherwise a basic """ string with escapes.
function tomlMultiline(value) {
  const s = String(value).replace(/\r\n/g, "\n");
  // eslint-disable-next-line no-control-regex
  const hasControl = /[\u0000-\u0008\u000b-\u001f\u007f]/.test(s);
  if (!hasControl && !s.includes("'''") && !s.endsWith("'")) {
    return "'''\n" + s + "'''";
  }
  const escaped = s.replace(/[\\"\u0000-\u0008\u000b-\u001f\u007f]/g, escapeChar);
  return '"""\n' + escaped + '"""';
}

function agentToToml(md, opts = {}) {
  const { fields, body } = splitFrontmatter(md);
  if (!fields.name) throw new Error("agent frontmatter has no name");
  if (!fields.description) throw new Error("agent frontmatter has no description");
  const model = typeof opts.model === "string" ? opts.model.trim() : "";
  let instructions = body.replace(/^\n+/, "");
  if (opts.readOnly) instructions = READ_ONLY_SENTENCE + "\n\n" + instructions;
  if (!instructions.endsWith("\n")) instructions += "\n";
  const lines = [
    "name = " + tomlBasic(fields.name),
    "description = " + tomlBasic(fields.description),
  ];
  if (model) lines.push("model = " + tomlBasic(model));
  lines.push("developer_instructions = " + tomlMultiline(instructions));
  return lines.join("\n") + "\n";
}

function openaiYaml() {
  return "policy:\n  allow_implicit_invocation: false\n";
}

// ---- rules section in AGENTS.md ----

const START = "<!-- seh:rules:start -->";
const END = "<!-- seh:rules:end -->";

function parseRulePaths(md) {
  const m = /^---\n([\s\S]*?)\n---/.exec(md.replace(/\r\n/g, "\n"));
  if (!m) return [];
  const paths = [];
  let inPaths = false;
  for (const line of m[1].split("\n")) {
    if (/^paths:\s*$/.test(line)) {
      inPaths = true;
      continue;
    }
    if (inPaths) {
      const item = /^\s*-\s*(.*?)\s*$/.exec(line);
      if (!item) break;
      let v = item[1];
      if (v.length >= 2 && (v[0] === '"' || v[0] === "'") && v[v.length - 1] === v[0]) {
        v = v.slice(1, -1);
      }
      paths.push(v);
    }
  }
  return paths;
}

function buildRulesSection(entries) {
  if (entries.length === 0) return "";
  const sorted = entries.slice().sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));
  const out = [START, "## seh rules", ""];
  out.push("Rule files written by seh. Read a file before working on the paths it names. Scope is advisory.", "");
  for (const e of sorted) {
    const where = e.paths.length
      ? "when working on " + e.paths.map((p) => "`" + p + "`").join(", ")
      : "for all work";
    out.push("- Read `" + e.file + "` " + where + ".");
  }
  out.push(END);
  return out.join("\n");
}

// Replace, insert, or remove the seh-managed section. Text outside the markers
// is returned untouched. No entries removes the section.
function upsertRulesSection(agentsMd, entries) {
  const crlf = agentsMd.includes("\r\n");
  const out = upsertLf(agentsMd.replace(/\r\n/g, "\n"), entries);
  return crlf ? out.replace(/\n/g, "\r\n") : out;
}

function upsertLf(text, entries) {
  const s = text.indexOf(START);
  const e = text.indexOf(END);
  const count = (m) => text.split(m).length - 1;
  if (count(START) !== count(END) || count(START) > 1 || (s !== -1 && e < s)) {
    throw new Error("AGENTS.md has an unbalanced seh:rules marker");
  }
  const section = buildRulesSection(entries);
  if (s !== -1) {
    const before = text.slice(0, s);
    const after = text.slice(e + END.length);
    if (section) return before + section + after;
    const b = before.replace(/\n+$/, "");
    const a = after.replace(/^\n+/, "");
    const joined = b && a ? b + "\n\n" + a : b || a;
    return joined ? joined.replace(/\n*$/, "\n") : "";
  }
  if (!section) return text;
  const base = text.replace(/\n+$/, "");
  return (base ? base + "\n\n" : "") + section + "\n";
}

function main(argv) {
  const [cmd, ...rest] = argv;
  if (cmd === "agent") {
    const file = rest[0];
    const mi = rest.indexOf("--model");
    const model = mi !== -1 ? rest[mi + 1] : "";
    process.stdout.write(agentToToml(fs.readFileSync(file, "utf8"), { model, readOnly: rest.includes("--read-only") }));
  } else if (cmd === "openai-yaml") {
    process.stdout.write(openaiYaml());
  } else if (cmd === "rules-section") {
    const [agentsFile, rulesDir, ...rules] = rest;
    const current = fs.existsSync(agentsFile) ? fs.readFileSync(agentsFile, "utf8") : "";
    const dir = path.resolve(path.dirname(agentsFile), rulesDir);
    const files = new Map(rules.map((f) => [path.basename(f), f]));
    for (const name of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
      if (/^lesson-.*\.mdc?$/.test(name) && !files.has(name)) files.set(name, path.join(dir, name));
    }
    const entries = [...files].map(([name, f]) => ({
      file: rulesDir.replace(/\/+$/, "") + "/" + name,
      paths: parseRulePaths(fs.readFileSync(f, "utf8")),
    }));
    process.stdout.write(upsertRulesSection(current, entries));
  } else {
    process.stderr.write("usage: codex-adapters.cjs agent|openai-yaml|rules-section ...\n");
    process.exit(2);
  }
}

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (err) {
    process.stderr.write("BLOCKED: " + err.message + "\n");
    process.exit(1);
  }
}

module.exports = { agentToToml, openaiYaml, parseRulePaths, buildRulesSection, upsertRulesSection, READ_ONLY_SENTENCE };
