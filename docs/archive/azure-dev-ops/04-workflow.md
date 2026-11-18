# 04 — Workflow: `transition`, `link`

## Goal

Status steps and dependencies on ADO, with Jira-like `UNCHANGED` semantics.

## Scope in

| Verb | Behaviour |
|------|-----------|
| `transition <id> <step>` | `null` map → `UNCHANGED`, no HTTP; fetch current `System.State`; equal → `UNCHANGED`; else PATCH state; illegal state → `BLOCKED:` |
| `link <id> depends\|relates <other>` | PATCH `/relations/-` with `System.LinkTypes.Dependency-Forward` / `-Reverse` (one convention, documented in code), or `System.LinkTypes.Related` |

- Both ids pass `require_task`.
- Link `relations` body needs the full work item URL (`{org}/_apis/wit/workItems/{id}`), not just the id.
- Tests: already-at-state, skip-null, invalid state from API, link success/failure message.

## Scope out

- `/<prefix>setit-se` mapping UI (stage 05).

## Decisions taken

| Topic | Chosen (Recommended) |
|-------|----------------------|
| Dependency direction | `depends`: child `Depends on` parent — match Jira `depends` model, explained in `ado-json.js` comments |
| Transition discovery | No transitions API; rely on mapped string + API error |

## Files likely touched

- `scripts/ado`, `scripts/ado-json.js`, `scripts/ado.test.js`

## Acceptance criteria

- Transition tests vary mapped status strings per fixture (no literals in script source).
- `link` failure surfaces `BLOCKED:` with the API fact. Architect may comment-and-continue (same as Jira link note; wired in stage 06).

## Tests

- `scripts/ado.test.js` with stubbed `curl`. Reuse JSON Patch + `patch-content-type`. Read current state with `fields=System.State`.

## Versioning

Changes `scripts/` (shipped): minor bump, propose to user. Not recorded in the legacy plan.

## Depends on

- 03 = `done`.
