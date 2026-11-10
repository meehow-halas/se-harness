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
