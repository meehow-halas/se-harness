# 02 — Foundation: auth, HTTP, `meta`

## Goal

POSIX `scripts/ado` with `meta` only, plus shared helpers: load config, PAT via transient `curl --config`, `OK` / `BLOCKED:` output.

## Scope in

| Path | What |
|------|------|
| `scripts/ado` | Dispatcher; `meta` verb; usage / `BLOCKED:` for bad argv |
| `scripts/lib-ado.sh` | `load_ado`, `ado_http`, `require_task` (numeric id), credential path (same rules as Jira) |
| `scripts/ado-json.js` | `curl-config`, `project`, `trackerFrom`, `organizationUrl`, HTTP error formatting, `format-meta` |
| `scripts/ado.test.js` | Stub `curl`; `meta` lists types/states/fields; token not in stdout/argv |

Behaviour:

- `load_ado`: requires `agents.tracker.kind === "ado"`, `adoPat` in credentials, `curl`, `node`, git (same as Jira).
- `api-version=7.1` constant in `ado-json.js`.
- `meta`: same UX shape as `jira meta` (`OK`, `project:`, numbered status/type/field lines) for `/<prefix>setit-se` parsing.

## Scope out

- `get`, `create`, `set`, `comment`, `transition`, `link` (stages 03–04).
- `/<prefix>setit-se` skill changes (stage 05).

## Decisions taken

| Topic | Chosen (Recommended) |
|-------|----------------------|
| HTTP client | `curl` + temp config file |
| PAT on wire | Basic `:{pat}` in curl config |
| Jira coexistence in code | Shared `lib.sh` patterns; separate `lib-ado.sh` |

## Files likely touched

- `scripts/ado`, `scripts/lib-ado.sh`, `scripts/ado-json.js`, `scripts/ado.test.js` (new)

## Acceptance criteria

- `npm test` passes new `ado.test.js` cases for `meta` and for missing-token / wrong-kind `BLOCKED`.
- Fixtures use non-obvious org/project/token strings (no hardcoded defaults passing by accident).
- Token absent from stdout and from stub `curl` argv.

## Tests

- `scripts/ado.test.js` with stubbed `curl` only. Run the single file first, then `npm test`.

## Versioning

Changes `scripts/` (shipped). Minor bump (new behaviour) → propose level to the user. Not recorded in the legacy plan.

## Depends on

- 01 = `done`.
