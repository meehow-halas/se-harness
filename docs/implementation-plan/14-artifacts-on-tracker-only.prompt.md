# Prompt — implementation-plan stage 14: `artifactsOnTrackerOnly`

Implement stage `14` of `docs/implementation-plan` only. Requires stages `12` and `05` = `done`. Historical stage: status `done` in the original plan.

## Repo context

- Repo `se-harness`. Flag `agents.tracker.artifactsOnTrackerOnly` (default `true`). Jira only in this stage; no non-Jira tracker, no content migration on toggle, no README sync.
- Read `docs/prd.md` first (Feature tracking, script table).
- Versioning: shipped dirs → version bump in the same change (CLAUDE.md).

## Stage spec

### Goal

When Jira is connected, allow spec, prompt and log in repo files while Jira keeps issue key, workflow and metadata reads. Default stays full ticket storage.

### Scope in

- `agents.tracker.artifactsOnTrackerOnly` in `references/harness.tracker.json` and docs.
- `/<prefix>setit-se` question after `jira meta`.
- `jira get` reads file bodies when `false`; `jira set` spec/prompt/log → `BLOCKED` when `false`.
- Agent and work-skill instructions read the flag at run time.
- PRD feature-tracking and script table updated.

### Scope out

- Non-Jira trackers. Content migration on toggle. README sync.

### Acceptance criteria

- Default `true` preserves existing Jira behaviour and tests.
- `false` path covered by `jira.test.js` get/set tests.
- PRD, setup skill and consumer `references/AGENTS.md` match the behaviour.

### Depends on

- 05, 12 = `done`.

## Constraints

- Do not commit unless the user asks. Do not touch `.env` files. Do not weaken tests.
- Ask one question at a time; recommended option first, labelled **(Recommended)**.

## Definition of done

- Acceptance criteria PASS with `scripts/jira.test.js` output quoted; report changed files and deviations.
