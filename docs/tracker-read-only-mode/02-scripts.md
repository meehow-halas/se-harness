# Phase 2 — `jira` / `ado` scripts

## Goal

Hard guard: with `agents.tracker.readOnly: true` the tracker scripts never write to the tracker, and `get` returns tracker scalars plus file bodies.

## In scope

- `scripts/jira-json.js`, `scripts/ado-json.js`: a `read-only` helper (prints `true` / `false`, missing = `false`), next to the existing `artifactsOnTrackerOnly` helper. `readOnly: true` forces the file-body path that `artifactsOnTrackerOnly: false` uses today.
- `scripts/jira`, `scripts/ado` (or shared check in `lib-jira.sh` / `lib-ado.sh`): at the top of `create`, `set`, `comment`, `transition`, `link` print `BLOCKED: tracker is read-only — edit repo files (agents.tracker.readOnly)` and exit non-zero. The check runs before credentials are loaded and before any `curl`.
- `get`: unchanged scalars (summary/title, status, type, description, `fetchFields`); `BEGIN spec` / `prompt` / `log` from `docs/features/<key>.feature.md`, `docs/prompt/<key>.prompt.md`, `docs/feature-log/<key>.log.md` (empty when missing). Confirm `status:` is printed for both Jira and ADO (needed by the Q2 `depends` gate).
- `meta`: unchanged.

## Tests (`scripts/jira.test.js`, `scripts/ado.test.js`)

- For each of `create`, `set spec|prompt|log`, `comment`, `transition`, `link`: `readOnly: true` → exit non-zero, stdout/stderr has `BLOCKED:` naming read-only, **zero requests** reached the HTTP stub, also when the credentials file is absent.
- Same verbs with `readOnly: false` and with the key missing → today's behaviour (existing tests stay; add one that the flag set to `false` explicitly still writes).
- `get` with `readOnly: true` and `artifactsOnTrackerOnly: true` (contradicting value on purpose) → bodies come from files, not issue fields; scalars still from the stubbed tracker response.
- `get` with `readOnly: true` and no local files → empty bodies, `OK`.

## Out of scope

- Setup skill, agents.
- Partial read-only.

## Done when

- All tests above exist and `npm test` passes.
- No write verb can reach `curl` when `readOnly` is `true` (proven by the request-count tests, not by reading the source).
