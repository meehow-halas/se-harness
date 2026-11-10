# Phase 2 — Foundation: auth, HTTP, `meta`

## Goal

POSIX `scripts/ado` with **`meta`** only, plus shared helpers: load config, PAT via transient `curl --config`, `OK` / `BLOCKED:` output.

## In scope

| Path | What |
|------|------|
| `scripts/ado` | Dispatcher; `meta` verb; usage / `BLOCKED:` for bad argv |
| `scripts/lib-ado.sh` | `load_ado`, `ado_http`, `require_task` (numeric id), credential path (same rules as Jira) |
| `scripts/ado-json.js` | `curl-config`, `project`, `trackerFrom`, `organizationUrl`, HTTP error formatting, `format-meta` |
| `scripts/ado.test.js` | Stub `curl`; `meta` lists types/states/fields; token not in stdout/argv |

## Behaviour

- `load_ado`: requires `agents.tracker.kind === "ado"` (or configured ADO shape), `adoPat` in credentials, `curl`, `node`, git (if same as Jira).
- **(Recommended)** `api-version=7.1` constant in `ado-json.js`.
- `meta`: same UX shape as `jira meta` (`OK`, `project:`, numbered status/type/field lines) for `/dhs-setup` parsing.

## Options

| Topic | Recommended |
|-------|-------------|
| HTTP client | `curl` + temp config file |
| PAT on wire | Basic `:{pat}` in curl config |
| Jira coexistence in code | Shared `lib.sh` patterns; separate `lib-ado.sh` |

## Out of scope

- `get`, `create`, `set`, `comment`, `transition`, `link` (phases 3–4).
- `/dhs-setup` skill changes (phase 5).

## Done when

- `npm test` passes new `ado.test.js` cases for `meta` and missing-token / wrong-kind `BLOCKED`.
- Fixtures use non-obvious org/project/token strings (no hardcoded defaults passing by accident).
- Token absent from stdout and stub `curl` argv.
