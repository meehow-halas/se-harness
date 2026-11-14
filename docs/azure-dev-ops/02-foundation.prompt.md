# Prompt — azure-dev-ops stage 02: Foundation (auth, HTTP, `meta`)

Implement stage `02` of `docs/azure-dev-ops` only. Requires stage `01` = `done` in `docs/azure-dev-ops/README.md`. If not, stop and say so.

## Repo context

- Repo: `se-harness`. Product sources: `agents/`, `packs/`, `skills/`, `brainstorm/`, `references/`, `scripts/`, `src/`. Scripts go to `scripts/`, installed as `.seh/scripts/`. CLI in v1: `seh install` and `seh uninstall` only.
- Recommended architecture: REST `api-version=7.1`; POSIX `sh` + `curl` + Node helper (`scripts/ado`, `scripts/lib-ado.sh`, `scripts/ado-json.js`); PAT in `harness.credentials.local.json` as `adoPat`; transient `curl --config` (`mktemp`, mode `600`, `trap` remove); numeric work item id as task key. Mirror `scripts/jira` layout and tone.
- Contract: `OK` / `UNCHANGED` / `BLOCKED:`. Token never in argv, stdout, chat, or git.
- Tests: `npm test`; `*.test.js` next to the unit; `seh install` must not copy them into `.seh/`. Stub `curl` only.
- Read `docs/prd.md` first. PRD wins over this file.
- Versioning (CLAUDE.md): changes to `scripts/` need a version bump in the same change; minor → propose the level and wait for the user.

## Stage spec

### Goal

POSIX `scripts/ado` with `meta` only, plus shared helpers: load config, PAT via transient `curl --config`, `OK` / `BLOCKED:` output.

### Scope in

| Path | What |
|------|------|
| `scripts/ado` | Dispatcher; `meta` verb; usage / `BLOCKED:` for bad argv |
| `scripts/lib-ado.sh` | `load_ado`, `ado_http`, `require_task` (numeric id), credential path (same rules as Jira) |
| `scripts/ado-json.js` | `curl-config`, `project`, `trackerFrom`, `organizationUrl`, HTTP error formatting, `format-meta` |
| `scripts/ado.test.js` | Stub `curl`; `meta` lists types/states/fields; token not in stdout/argv |

- `load_ado`: requires `agents.tracker.kind === "ado"`, `adoPat` in credentials, `curl`, `node`, git (same as Jira).
- `api-version=7.1` constant in `ado-json.js`.
- `meta`: same UX shape as `jira meta` (`OK`, `project:`, numbered status/type/field lines) for `/<prefix>setit-se` parsing.

### Scope out

- `get`, `create`, `set`, `comment`, `transition`, `link` (stages 03–04).
- `/<prefix>setit-se` skill changes (stage 05).

### Decisions taken

| Topic | Chosen (Recommended) |
|-------|----------------------|
| HTTP client | `curl` + temp config file |
| PAT on wire | Basic `:{pat}` in curl config |
| Jira coexistence in code | Shared `lib.sh` patterns; separate `lib-ado.sh` |

### Files likely touched

- `scripts/ado`, `scripts/lib-ado.sh`, `scripts/ado-json.js`, `scripts/ado.test.js` (new)

### Acceptance criteria

- `npm test` passes new `ado.test.js` cases for `meta` and for missing-token / wrong-kind `BLOCKED`.
- Fixtures use non-obvious org/project/token strings (no hardcoded defaults passing by accident).
- Token absent from stdout and from stub `curl` argv.

### Tests

- `scripts/ado.test.js` with stubbed `curl` only. Run the single file first, then `npm test`.

### Versioning

Changes `scripts/` (shipped). Minor bump (new behaviour) → propose the level and wait for the user.

### Depends on

- 01 = `done`.

## Constraints

- Do not commit unless the user asks.
- Do not touch `.env` files. Do not write to `~/.claude/` or global npm.
- Do not weaken or delete tests to make them pass.
- Ask one question at a time if a design choice is not covered; recommended option first, marked `(Recommended)`.

## Definition of done

- All acceptance criteria PASS with evidence (file:line, command output).
- `npm test` for `scripts/ado.test.js` green (quote real output).
- `CHANGELOG.md` updated under the current version.
- Report: changed files, criteria PASS/GAP, deviations.
