# 02 — `jira` / `ado` scripts

## Goal

Hard guard: with `agents.tracker.readOnly: true` the tracker scripts never write to the tracker, and `get` returns tracker scalars plus file bodies.

## Scope in

- `scripts/jira-json.js`, `scripts/ado-json.js`: a `read-only` helper (prints `true` / `false`, missing = `false`), next to the existing `artifactsOnTrackerOnly` helper. `readOnly: true` forces the file-body path that `artifactsOnTrackerOnly: false` uses today.
- `scripts/jira`, `scripts/ado` (or a shared check in `lib-jira.sh` / `lib-ado.sh`): at the top of `create`, `set`, `comment`, `transition`, `link` print `BLOCKED: tracker is read-only — edit repo files (agents.tracker.readOnly)` and exit non-zero. The check runs before credentials are loaded and before any `curl`.
- `get`: scalars unchanged (summary/title, status, type, description, `fetchFields`); `BEGIN spec` / `prompt` / `log` from `docs/features/<key>.feature.md`, `docs/prompt/<key>.prompt.md`, `docs/feature-log/<key>.log.md` (empty when missing). Confirm `status:` is printed for both Jira and ADO (needed by the Q2 `depends` gate).
- `meta`: unchanged.

## Scope out

- Setup skill, agents.
- Partial read-only.

## Decisions taken

- One shared helper where it fits both scripts without breaking the layout; otherwise duplicate the small guard (Recommended: shared helper).
- `get` reuses the existing `artifactsOnTrackerOnly: false` file-reading path.

## Files likely touched

- `scripts/jira`, `scripts/ado`, `scripts/lib-jira.sh`, `scripts/lib-ado.sh`, `scripts/jira-json.js`, `scripts/ado-json.js`, `scripts/jira.test.js`, `scripts/ado.test.js`

## Acceptance criteria

- For each of `create`, `set spec|prompt|log`, `comment`, `transition`, `link`: `readOnly: true` → exit non-zero, output has `BLOCKED:` naming read-only, zero requests reached the HTTP stub, also when the credentials file is absent.
- Same verbs with `readOnly: false` and with the key missing → today's behaviour (existing tests stay; one added test that explicit `false` still writes).
- `get` with `readOnly: true` and `artifactsOnTrackerOnly: true` (contradicting on purpose) → bodies from files, scalars from the stubbed tracker response.
- `get` with `readOnly: true` and no local files → empty bodies, `OK`.
- No write verb can reach `curl` when `readOnly` is `true` (proven by request-count tests, not by reading the source).

## Tests

- `scripts/jira.test.js`, `scripts/ado.test.js`. Run `node --test scripts/jira.test.js scripts/ado.test.js`, then `npm test`.

## Versioning

`scripts/` (shipped): minor bump, propose to user.

## Depends on

- 01 = `done`.
