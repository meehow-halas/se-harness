# Phase 14 — `artifactsOnTrackerOnly`

## Goal

When Jira is connected, allow spec, prompt, and log in repo files while Jira keeps issue key, workflow, and metadata reads. Default remains full ticket storage (`artifactsOnTrackerOnly: true`).

## In scope

- `agents.tracker.artifactsOnTrackerOnly` in [`references/harness.tracker.json`](../../references/harness.tracker.json) and docs.
- `/seh-setup` question after `jira meta` (PL/EN per product plan).
- `jira get` reads file bodies when `false`; `jira set` spec/prompt/log `BLOCKED` when `false`.
- Agent and work-skill runtime instructions (read config at run time).
- PRD feature-tracking and script table.

## Out of scope

- Non-Jira trackers, content migration when toggling the flag, README sync.

## Done when

- Default `true` preserves existing Jira behaviour and tests.
- `false` path covered by `jira.test.js` get/set tests.
- PRD, setup skill, and consumer `references/AGENTS.md` match behaviour.

## Handoff

Same flag shape for future external trackers without renaming the key.

## Status

`done` (landed in package sources and tests).
