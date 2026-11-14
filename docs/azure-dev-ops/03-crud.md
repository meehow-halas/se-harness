# 03 — Read and write: `get`, `create`, `set`, `comment`

## Goal

Work item content I/O on the ADO tracker, same agent call pattern as `jira`.

## Scope in

Extend `scripts/ado` and `ado-json.js`:

| Verb | Behaviour |
|------|-----------|
| `get <id>` | Scalars + `BEGIN spec` / `prompt` / `log` from maps; honor `fetchFields` |
| `create --type feature\|bug --title` | POST `$Type`; print `id:` |
| `set <id> spec\|prompt\|log [--file]` | PATCH fields, or POST comment when map is `comment` |
| `comment <id> [--file]` | Comments API |

- `--file` / stdin for bodies (reuse `read_body_file` pattern from `lib-jira.sh`, shared lib or copy).
- `artifactsOnTrackerOnly` false: `get` reads repo files named by id; `set` on spec/prompt/log → `BLOCKED` (parity with Jira).
- Tests: each verb with stub routes; config-driven field names.

## Scope out

- `transition`, `link` (stage 04).
- HTML `get` stripping polish (stage 07). May return raw HTML here if documented in the report.

## Decisions taken

| Topic | Chosen (Recommended) |
|-------|----------------------|
| Unmapped field | `BLOCKED:` with setup hint |
| Rich text on set | Plain text → minimal HTML wrapper; full round-trip in stage 07 |
| Comment vs history map | Dedicated `comment` verb uses Comments API; `set` with `comment` map may POST comment |

Deviations recorded after the stage shipped (from the original implementation notes):

- Comments API version `7.1-preview.4` (`COMMENTS_API_VERSION` in `ado-json.js`), not `7.1`. Other WIT calls use `API_VERSION` (`7.1`). Both pinned in code, not config. An optional `agents.tracker.apiVersion` would need spec + PRD + setup change.
- Output key is `id:` (jira prints `key:`).
- `parse_file_opt` in `scripts/ado` blocks a missing file before `read_body_file` runs. In `jira` the check sits inside `$(...)`, so `exit` is swallowed there. Not fixed in jira.
- `get` returns raw HTML for description / custom fields / comments (stage 07 owns stripping).
- `get` fetches comments only when needed (tracker-only and any of spec/prompt/log is `comment`, or `log` unmapped). Unmapped `log` falls back to comments; unmapped `spec` falls back to `System.Description`.

Reusable pieces (for stages 04–07): `lib-ado.sh` `ado_http METHOD PATH [BODYFILE] [CONTENT_TYPE]`, `read_body_file`, `require_task`; `ado-json.js` `patch-content-type` (`application/json-patch+json`), `project-encoded`, `fetch-fields`, `mapped-field`, `artifacts-on-tracker-only`, `type-encoded`, `comments-api-version`, `extract-id`. Field refs: `description` → `System.Description`, `history` → `System.History`, `comment` → Comments API, else literal `referenceName`.

## Files likely touched

- `scripts/ado`, `scripts/ado-json.js`, `scripts/lib-ado.sh`, `scripts/ado.test.js`

## Acceptance criteria

- Tests would fail if URL, project, type names, or field refs were hardcoded.
- `create` / `get` / `set` / `comment` happy paths covered with varied fixtures (other org, project with spaces, odd type/field names).
- Output contract matches `jira` (`OK` lines, `BLOCKED:` prefix).

## Tests

- `scripts/ado.test.js`: `writeCurlStub(cwd, routes)` keys routes as `METHOD <pathname>` (percent-encoded). Stub logs argv and request body.
- `runAdo` asserts PAT absent from stdout, stderr and stub argv in every test.

## Known gaps (unverified)

- Comments pagination (`continuationToken`, `$top`) not handled: first page only (assumption: fine for typical items).
- No run against a live ADO organization; verified against the curl stub only.

## Versioning

Changes `scripts/` (shipped): minor bump, propose to user. Not recorded in the legacy plan.

## Depends on

- 02 = `done`.
