# 07 — HTML and body round-trip

## Goal

Stable plain-text `BEGIN spec` / `prompt` / `log` blocks for agents; predictable `set` from markdown/plain files.

## Scope in

- `ado-json.js`: HTML → text for `get` (strip tags, preserve paragraphs). Text → HTML for `set` on `System.Description` and configured HTML custom fields. Recommended: minimal `<p>` / `<br>` encoding, not a full markdown renderer.
- Log append on HTML fields: append with separator consistent with Jira log-append tests.
- Tests: fixtures with HTML descriptions; round-trip keeps the line breaks agents rely on.

## Scope out

- Rendering for human UI in Azure DevOps.
- WYSIWYG feature parity.

## Decisions taken

| Topic | Chosen (Recommended) |
|-------|----------------------|
| Markdown in ADO | No markdown engine; plain text + simple HTML wrapper |
| `history` map | Treat as plain text in `System.History` patch if mapped |

All conversion lives in `toHtml` (set/comment) and `scalar` / `format-get` (get).

## Files likely touched

- `scripts/ado-json.js`, `scripts/ado.test.js`

## Acceptance criteria

- Stage 03 `get` tests updated or superseded so HTML bodies decode to the expected plain text.
- No regression in token/argv security tests from stages 02–04.

## Tests

- `scripts/ado.test.js`, run narrowest first, then `npm test`.

## Versioning

Changes `scripts/` (shipped): minor or patch per CLAUDE.md, propose if minor.

## Depends on

- 03 = `done`.
