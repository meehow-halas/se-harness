# 14 — `artifactsOnTrackerOnly`

## Goal

When Jira is connected, allow spec, prompt and log in repo files while Jira keeps issue key, workflow and metadata reads. Default stays full ticket storage (`artifactsOnTrackerOnly: true`).

## Scope in

- `agents.tracker.artifactsOnTrackerOnly` in `references/harness.tracker.json` and docs.
- `/<prefix>setit-se` question after `jira meta`.
- `jira get` reads file bodies when `false`; `jira set` spec/prompt/log → `BLOCKED` when `false`.
- Agent and work-skill runtime instructions read the config at run time.
- PRD feature-tracking and script table.

## Scope out

- Non-Jira trackers. Content migration when toggling the flag. README sync.

## Decisions taken

- Same flag shape can serve future external trackers without renaming the key.

## Files likely touched

- `references/harness.tracker.json`, `scripts/jira`, `scripts/jira-json.js`, `scripts/jira.test.js`, `skills/setit-se/SKILL.md`, `references/AGENTS.md`, `docs/prd.md`

## Acceptance criteria

- Default `true` preserves existing Jira behaviour and tests.
- `false` path covered by `jira.test.js` get/set tests.
- PRD, setup skill and consumer `references/AGENTS.md` match the behaviour.

## Tests

- `scripts/jira.test.js`.

## Versioning

Landed in package sources and tests (status `done`). Not recorded in the legacy plan.

## Depends on

- 12, 05 = `done`.
