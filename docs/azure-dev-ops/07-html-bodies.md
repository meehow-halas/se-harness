# Phase 7 — HTML and body round-trip

## Goal

Stable plain-text `BEGIN spec` / `prompt` / `log` blocks for agents; predictable `set` from markdown/plain files.

## In scope

- `ado-json.js`: HTML → text for `get` (strip tags, preserve paragraphs); text → HTML for `set` on `System.Description` and configured HTML custom fields **(Recommended:** minimal `<p>` / `<br>` encoding, not full markdown renderer).
- Log append on HTML fields: append with separator consistent with Jira log-append tests.
- Tests: fixtures with HTML descriptions; round-trip does not lose line breaks agents rely on.

## Options

| Topic | Recommended |
|-------|-------------|
| Markdown in ADO | Do not add a markdown engine; plain text + simple HTML wrapper |
| `history` map | Treat as plain text in `System.History` patch if mapped |

## Out of scope

- Rendering for human UI in Azure DevOps.
- WYSIWYG feature parity.

## Done when

- Phase 3 `get` tests updated or superseded so HTML bodies decode to expected plain text.
- No regression in token/argv security tests from phases 2–4.
