# Prompt — azure-dev-ops stage 04: Workflow (`transition`, `link`)

Implement stage `04` of `docs/azure-dev-ops` only. Requires stage `03` = `done` in `docs/azure-dev-ops/README.md`. If not, stop and say so.

## Repo context

- Repo: `se-harness`. Scripts go to `scripts/`, installed as `.seh/scripts/`. CLI in v1: `seh install` and `seh uninstall` only.
- Recommended architecture: REST `api-version=7.1`; POSIX `sh` + `curl` + Node helper; PAT in `harness.credentials.local.json` as `adoPat`; transient `curl --config`; numeric work item id.
- Contract: `OK` / `UNCHANGED` / `BLOCKED:`. Token never in argv, stdout, chat, or git.
- Tests: `npm test`; `*.test.js` next to the unit; stub `curl` only; vary fixtures.
- Versioning (CLAUDE.md): `scripts/` change → version bump in same change; minor → propose to user.

## Stage spec

### Goal

Status steps and dependencies on ADO, with Jira-like `UNCHANGED` semantics.

### Scope in

| Verb | Behaviour |
|------|-----------|
| `transition <id> <step>` | `null` map → `UNCHANGED`, no HTTP; fetch current `System.State`; equal → `UNCHANGED`; else PATCH state; illegal state → `BLOCKED:` |
| `link <id> depends\|relates <other>` | PATCH `/relations/-` with `System.LinkTypes.Dependency-Forward` / `-Reverse` (one convention, documented in code), or `System.LinkTypes.Related` |

- Both ids pass `require_task`.
- Link `relations` body needs the full work item URL (`{org}/_apis/wit/workItems/{id}`), not just the id.
- Tests: already-at-state, skip-null, invalid state from API, link success/failure message.

### Scope out

- `/<prefix>setit-se` mapping UI (stage 05).

### Decisions taken

| Topic | Chosen (Recommended) |
|-------|----------------------|
| Dependency direction | `depends`: child `Depends on` parent — match Jira `depends` model, explained in `ado-json.js` comments |
| Transition discovery | No transitions API; rely on mapped string + API error |

### Files likely touched

- `scripts/ado`, `scripts/ado-json.js`, `scripts/ado.test.js`

### Acceptance criteria

- Transition tests vary mapped status strings per fixture (no literals in script source).
- `link` failure surfaces `BLOCKED:` with the API fact. Architect may comment-and-continue (wired in stage 06).

### Tests

- `scripts/ado.test.js` with stubbed `curl`. Reuse JSON Patch + `patch-content-type`. Read current state with `fields=System.State`.

### Versioning

`scripts/` (shipped): minor bump, propose to user.

### Depends on

- 03 = `done`.

## Constraints

- Do not commit unless the user asks.
- Do not touch `.env` files. Do not write to `~/.claude/` or global npm.
- Ask one question at a time; recommended option first, marked `(Recommended)`.

## Definition of done

- All acceptance criteria PASS with evidence.
- `npm test` for `scripts/ado.test.js` green (quote real output).
- `CHANGELOG.md` updated under the current version.
- Report: changed files, criteria PASS/GAP, deviations.
