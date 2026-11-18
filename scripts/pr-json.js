#!/usr/bin/env node
"use strict";
// Helper for merge-pr and pr-state: reads `gh pr list --json ...` output on
// stdin and prints `key: value` lines.
//   pr-json.js merge             -> state: open|merged|none, number, url, mergeable
//   pr-json.js state <task>      -> state: open|merged|none, url, merged_at, merge_commit
// Exit 2 on unreadable JSON.

const fs = require("fs");

function readList() {
  let list;
  try {
    list = JSON.parse(fs.readFileSync(0, "utf8") || "[]");
  } catch (e) {
    process.exit(2);
  }
  if (!Array.isArray(list)) process.exit(2);
  return list;
}

function newest(list) {
  return list.slice().sort((a, b) => (b.number || 0) - (a.number || 0))[0];
}

function decide(list) {
  const open = list.filter((p) => p.state === "OPEN");
  if (open.length) return { state: "open", pr: newest(open) };
  const merged = list.filter((p) => p.state === "MERGED");
  if (merged.length) return { state: "merged", pr: newest(merged) };
  return { state: "none" };
}

const mode = process.argv[2];
let lines = [];
if (mode === "merge") {
  const d = decide(readList());
  lines.push(`state: ${d.state}`);
  if (d.pr) {
    lines.push(`number: ${d.pr.number}`);
    lines.push(`url: ${d.pr.url}`);
    lines.push(`mergeable: ${d.pr.mergeable || ""}`);
  }
} else if (mode === "state") {
  const task = process.argv[3] || "";
  const esc = task.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^${esc}(-([2-9]|[1-9][0-9]+))?$`);
  const d = decide(readList().filter((p) => re.test(p.headRefName || "")));
  lines.push(`state: ${d.state}`);
  if (d.pr) {
    lines.push(`url: ${d.pr.url}`);
    if (d.state === "merged") {
      lines.push(`merged_at: ${d.pr.mergedAt || ""}`);
      lines.push(`merge_commit: ${(d.pr.mergeCommit && d.pr.mergeCommit.oid) || ""}`);
    }
  }
} else {
  process.exit(64);
}
process.stdout.write(lines.join("\n") + "\n");
