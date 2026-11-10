# Product: Monitor

Addendum for the Monitor scope. Not a rewrite of [prd.md](../prd.md). dhs v1 CLI stays `install` / `uninstall`. Behaviour of the panel and of N agent runs is [ideas/monitor.md](../ideas/monitor.md); that file wins over this addendum if they conflict.

Bootstrap of a consuming project is unchanged: `npx -p dev-harness-layer dhs install`, then `/dhs-setup`. After install, Monitor runs **from that project**, not from the registry:

```text
node .dhs/monitor --host cursor
```

`--host` is required. No default. First delivery implements host id `cursor` only (models from `agents.roles.<role>.model.cursor`).

If the project root has `package.json` and no `scripts["dhs:monitor"]`, install may add `"dhs:monitor": "node .dhs/monitor"`. That is convenience, not the only start path. A project without `package.json` still runs via `node`. `--host` is still required (`npm run dhs:monitor -- --host cursor`).

`dhs uninstall` removes `.dhs/` (including Monitor). It removes the npm script only when the value is exactly what install wrote.

## What Monitor is

A localhost web UI in the project that already has dhs. The user sees tasks, starts N runs (spec, implement, review, close), and talks to **that task’s** agent in the right column without killing other runs.

Harness stays: skills, agents, `.dhs/scripts/`. Monitor does not replace the IDE. It does not sync with a live Cursor/Claude Code window. It does not write spec/prompt/log itself, does not `jira create` from the browser, does not set status, does not merge PRs.

## What install writes (Monitor delta)

In addition to the v1 payload, `dhs install` copies package `monitor/` to `.dhs/monitor/`. It does not vendor `@cursor/sdk`. It does not run `npm install` in the consumer project root. It does not copy `*.test.js`. First delivery runs host `cursor` as **Cursor Agent CLI** on `PATH` (terminal login). Not `CURSOR_API_KEY`.

## Guards

Before serving UI: `.dhs/` exists, `harness.config.json` exists, `.dhs/VERSION` matches `dhs.generatedFrom`. Otherwise print `dhs install` / `/dhs-setup` and exit nonzero (except the “already running in this cwd” case in the Monitor plan: print URL, exit 0).

## Trackers

Same rule as dhs: exactly one tracker. Monitor lists whichever is active.

- Files: glob specs using paths from config (skeleton `docs/features/<basename>.feature.md`). Key = basename. Title and status from frontmatter compared to `agents.statuses`.
- Jira: issues from `.dhs/scripts/jira search` (allowlisted; script builds JQL from `agents.tracker.projectKey` and `issueTypes`). Key = issue key. Credentials in `harness.credentials.local.json`. UI does not compose `curl`.

Both list paths are in the first Monitor delivery. A files-only Monitor is unfinished.

`jira search` is a conscious addition to the v1 Jira allowlist, implemented in Monitor phase 4.

## Chat and buttons

One Monitor agent session per task. Left column switches which session the right column shows. Add = `/dhs-planit` in a new session. Buttons (when conditions in the idea file hold): `/dhs-doit`, `/dhs-checkit` review, `/dhs-checkit` close with confirm. Close is per row, not a list. Buttons do not write status.

## Out of this addendum

Items listed in [monitor-plan.md](../monitor-plan.md) **Out of this Monitor delivery**. dhs v1 Deferred items stay Deferred unless a phase of this plan names them (only `jira search` is named).
