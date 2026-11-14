# Prompt — azure-dev-ops stage 07: HTML and body round-trip

Implement stage `07` of `docs/azure-dev-ops` only. Requires stage `03` = `done` in `docs/azure-dev-ops/README.md`. If not, stop and say so.

## Repo context

- Repo: `se-harness`. Scripts go to `scripts/`, installed as `.seh/scripts/`.
- ADO stores HTML in description and rich fields. Agents need stable plain-text `BEGIN spec` / `prompt` / `log` blocks.
- Recommended: minimal `<p>` / `<br>` encoding; no markdown engine.
- Tests: `npm test`; `*.test.js` next to the unit; stub `curl` only.
- Versioning (CLAUDE.md): `scripts/` change → version bump in same change; minor → propose to user.

## Stage spec

### Goal

Stable plain-text `BEGIN spec` / `prompt` / `log` blocks for agents; predictable `set` from markdown/plain files.

### Scope in

- `ado-json.js`: HTML → text for `get` (strip tags, preserve paragraphs). Text → HTML for `set` on `System.Description` and configured HTML custom fields. Recommended: minimal `<p>` / `<br>` encoding, not a full markdown renderer.
- Log append on HTML fields: append with separator consistent with Jira log-append tests.
- Tests: fixtures with HTML descriptions; round-trip keeps the line breaks agents rely on.

### Scope out

- Rendering for human UI in Azure DevOps.
- WYSIWYG feature parity.

### Decisions taken

| Topic | Chosen (Recommended) |
|-------|----------------------|
| Markdown in ADO | No markdown engine; plain text + simple HTML wrapper |
| `history` map | Treat as plain text in `System.History` patch if mapped |

All conversion lives in `toHtml` (set/comment) and `scalar` / `format-get` (get).

### Files likely touched

- `scripts/ado-json.js`, `scripts/ado.test.js`

### Acceptance criteria

- Stage 03 `get` tests updated or superseded so HTML bodies decode to the expected plain text.
- No regression in token/argv security tests from stages 02–04.

### Tests

- `scripts/ado.test.js`, narrowest first, then `npm test`.

### Versioning

`scripts/` (shipped): minor or patch per CLAUDE.md; propose if minor.

### Depends on

- 03 = `done`.

## Constraints

- Do not commit unless the user asks.
- Do not touch `.env` files. Do not write to `~/.claude/` or global npm.
- Do not weaken or delete tests to make them pass.
- Ask one question at a time; recommended option first, marked `(Recommended)`.

## Definition of done

- All acceptance criteria PASS with evidence.
- `npm test` for `scripts/ado.test.js` green (quote real output).
- `CHANGELOG.md` updated under the current version.
- Report: changed files, criteria PASS/GAP, deviations.
