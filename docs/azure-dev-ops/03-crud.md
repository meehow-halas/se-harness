# Phase 3 — Read and write: `get`, `create`, `set`, `comment`

## Goal

Work item content I/O on the ADO tracker, same agent call pattern as `jira`.

## In scope

Extend `scripts/ado` and `ado-json.js`:

| Verb | Behaviour |
|------|-----------|
| `get <id>` | Scalars + `BEGIN spec` / `prompt` / `log` from maps; honor `fetchFields` |
| `create --type feature\|bug --title` | POST `$Type`; print `id:` |
| `set <id> spec\|prompt\|log [--file]` | PATCH fields or POST comment when map is `comment` |
| `comment <id> [--file]` | Comments API 7.1 |

- **`--file` / stdin** for bodies (reuse `read_body_file` pattern from `lib-jira.sh` via shared lib or copy).
- **`artifactsOnTrackerOnly` false:** `get` reads repo files named by id; `set` on spec/prompt/log → `BLOCKED` (parity with Jira).
- Tests: each verb with stub routes; config-driven field names.

## Options

| Topic | Recommended |
|-------|-------------|
| Unmapped field | `BLOCKED:` with setup hint |
| Rich text on set (phase 3) | Plain text → minimal HTML wrapper; full round-trip in phase 7 |
| Comment vs history map | Dedicated `comment` verb uses Comments API; `set` with `comment` map may POST comment |

## Out of scope

- `transition`, `link` (phase 4).
- HTML get stripping polish (phase 7) — may return raw HTML in phase 3 if documented in report.

## Done when

- Tests would fail if URL, project, type names, or field refs were hardcoded.
- `create`/`get`/`set`/`comment` happy paths covered with varied fixtures.
- Output contract matches `jira` (`OK` lines, `BLOCKED:` prefix).

## Implementation notes (for phases 4–7)

Written after phase 3 shipped. Facts are from code/tests unless marked *assumption*.

### Deviations from spec/jira

- **Comments API version:** `7.1-preview.4` (`COMMENTS_API_VERSION` in `ado-json.js`), not `7.1`. MS docs list Comments only as preview. Other WIT calls use `API_VERSION` (`7.1`). Both pinned in code, not config (spec: "pin in code"); add optional `agents.tracker.apiVersion` only if Azure DevOps Server enters scope (spec + PRD + setup change).
- **Output key:** `id:` (jira prints `key:`).
- **`--file` check:** `parse_file_opt` in `scripts/ado` blocks a missing file before `read_body_file` runs. In `jira` the same check sits inside `$(...)`, so `exit` is swallowed there. Not fixed in jira.
- **`get` returns raw HTML** for description/custom fields/comments. Phase 7 owns stripping.
- **`get` fetches comments only when needed** (`needs-comments`: tracker-only and (any of spec/prompt/log is `comment` or `log` unmapped)). An unmapped `log` falls back to comments; an unmapped `spec` falls back to `System.Description`.

### Reusable pieces

- `lib-ado.sh`: `ado_http METHOD PATH [BODYFILE] [CONTENT_TYPE]` (4th arg adds `-H Content-Type`, overriding the config-file default; keeps secrets out of argv). `read_body_file`, `require_task`.
- `ado-json.js`: `patch-content-type` (`application/json-patch+json`, required for every work item PATCH/create), `project-encoded`, `fetch-fields`, `mapped-field`, `artifacts-on-tracker-only`, `type-encoded` (`%24` + encoded type for create path), `comments-api-version`, `extract-id`.
- Field refs: map value `description`→`System.Description`, `history`→`System.History`, `comment`→Comments API, else literal `referenceName` (`fieldRef`).
- Phase 4 (`transition`/`link`): reuse JSON Patch + `patch-content-type`; `statuses.*` null → `UNCHANGED ... status: skipped` as in jira; read current `System.State` with `fields=System.State`. Link `relations` body needs full work item URL (`{org}/_apis/wit/workItems/{id}`), not just id.
- Phase 7 (HTML): all conversion lives in `toHtml` (set/comment, plain→`<p>`/`<br>`, escaped) and `scalar`/`format-get` (get). Log append on a custom field concatenates new HTML after existing HTML. Comments from the API carry HTML in `text`.

### Tests

- `scripts/ado.test.js`: `writeCurlStub(cwd, routes)` keys routes as `METHOD <pathname>` (pathname stays percent-encoded: `%24Type`, `%20`). Stub logs argv (`logFile`) and request body (`dataFile`).
- `runAdo` asserts PAT is absent from stdout, stderr and stub argv in every test. New verbs inherit this.
- Use fixtures that differ from defaults (other org, project with spaces, odd type/field names) so hardcoding fails.

### Not handled / unverified

- Comments pagination (`continuationToken`, `$top`): `get` reads the first page only. *Assumption:* fine for typical work items. A REST comment limit of 1000 per item was reported on Q&A (dated).
- `get` of `System.History` through `fields=` returns what ADO returns for that field. *Assumption:* the latest entry only, not full history; unverified on a live org.
- No run against a live ADO organization; behaviour is verified against the curl stub only.
