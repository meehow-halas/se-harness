# Prompt — azure-dev-ops stage 03: Read and write (`get`, `create`, `set`, `comment`)

Implement stage `03` of `docs/azure-dev-ops` only. Requires stage `02` = `done` in `docs/azure-dev-ops/README.md`. If not, stop and say so.

## Repo context

- Repo: `se-harness`. Scripts go to `scripts/`, installed as `.seh/scripts/`. CLI in v1: `seh install` and `seh uninstall` only.
- Recommended architecture: REST `api-version=7.1` (Comments API pinned in code); POSIX `sh` + `curl` + Node helper (`scripts/ado`, `lib-ado.sh`, `ado-json.js`); PAT in `harness.credentials.local.json` as `adoPat`; transient `curl --config`; numeric work item id.
- Contract: `OK` / `UNCHANGED` / `BLOCKED:`. Token never in argv, stdout, chat, or git.
- Tests: `npm test`; `*.test.js` next to the unit; stub `curl` only; fixtures must differ from defaults so hardcoding fails.
- Versioning (CLAUDE.md): `scripts/` change → version bump in same change; minor → propose to user.

## Stage spec

### Goal

Work item content I/O on the ADO tracker, same agent call pattern as `jira`.

### Scope in

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

### Scope out

- `transition`, `link` (stage 04).
- HTML `get` stripping polish (stage 07). May return raw HTML here if documented in the report.

### Decisions taken

| Topic | Chosen (Recommended) |
|-------|----------------------|
| Unmapped field | `BLOCKED:` with setup hint |
| Rich text on set | Plain text → minimal HTML wrapper; full round-trip in stage 07 |
| Comment vs history map | Dedicated `comment` verb uses Comments API; `set` with `comment` map may POST comment |

Implementation facts from the original stage (keep to these; deviate only with a reason in the report):

- Comments API version `7.1-preview.4` (`COMMENTS_API_VERSION` in `ado-json.js`); other WIT calls use `API_VERSION` (`7.1`).
- Output key is `id:` (jira prints `key:`).
- `parse_file_opt` in `scripts/ado` blocks a missing file before `read_body_file` runs.
- `get` fetches comments only when needed (tracker-only and any of spec/prompt/log is `comment`, or `log` unmapped). Unmapped `log` → comments; unmapped `spec` → `System.Description`.
- Reusable: `ado_http METHOD PATH [BODYFILE] [CONTENT_TYPE]`, `read_body_file`, `require_task`; `ado-json.js` `patch-content-type` (`application/json-patch+json`), `project-encoded`, `fetch-fields`, `mapped-field`, `artifacts-on-tracker-only`, `type-encoded`, `comments-api-version`, `extract-id`. Field refs: `description` → `System.Description`, `history` → `System.History`, `comment` → Comments API, else literal `referenceName`.

### Files likely touched

- `scripts/ado`, `scripts/ado-json.js`, `scripts/lib-ado.sh`, `scripts/ado.test.js`

### Acceptance criteria

- Tests would fail if URL, project, type names, or field refs were hardcoded.
- `create` / `get` / `set` / `comment` happy paths covered with varied fixtures (other org, project with spaces, odd type/field names).
- Output contract matches `jira` (`OK` lines, `BLOCKED:` prefix).

### Tests

- `scripts/ado.test.js`: `writeCurlStub(cwd, routes)` keys routes as `METHOD <pathname>`; stub logs argv and request body.
- `runAdo` asserts PAT absent from stdout, stderr and stub argv in every test.

### Known gaps (unverified)

- Comments pagination not handled (first page only).
- No run against a live ADO organization; curl stub only.

### Versioning

`scripts/` (shipped): minor bump, propose to user.

### Depends on

- 02 = `done`.

## Constraints

- Do not commit unless the user asks.
- Do not touch `.env` files. Do not write to `~/.claude/` or global npm.
- Do not implement `transition` / `link` (stage 04).
- Ask one question at a time; recommended option first, marked `(Recommended)`.

## Definition of done

- All acceptance criteria PASS with evidence.
- `npm test` for `scripts/ado.test.js` green (quote real output).
- `CHANGELOG.md` updated under the current version.
- Report: changed files, criteria PASS/GAP, deviations.
