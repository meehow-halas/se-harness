# Phase 4 — Tracker list (files and Jira)

## Goal

The left column lists the **active** tracker. Files glob and Jira search ship in this same phase. A files-only Monitor is not done.

## In scope

- Files: glob specs using `agents.docs` / configured paths (skeleton `docs/features/<basename>.feature.md`). Key = basename. `title` and `status` from frontmatter. Compare status to `agents.statuses` keys’ **values**, never to hardcoded `todo`.
- Jira: new verb `jira search` in [`scripts/jira`](../../scripts/jira) (+ json helper + tests). Script builds JQL from `agents.tracker.projectKey` and `issueTypes` (feature and bug). Print `OK` then rows: key, status, title (same family as other verbs). UI/server calls the script; does not compose `curl` or JQL.
- Same JSON shape to the UI for both trackers.
- If `agents.tracker` is present: do not glob leftover `docs/features`. If absent: do not call `jira search`.
- Unmet `depends`: badge on the row; other rows still list.
- Session run-state (idle / running / waiting) may be a placeholder until phase 2+5 are both present; if phase 2 already landed, show it.
- Add a row to the Jira table in [prd.md](../prd.md) for `jira search` (this is the named v1 allowlist extension). Do not change other v1 Deferred items. Do not edit README.

## Out of scope

- Creating issues or files from the UI
- Chat, Add→planit, stage buttons

## Inputs

- Idea §§3, 7, 12
- Existing `jira` contract in dhs PRD and [`scripts/jira.test.js`](../../scripts/jira.test.js)

## Outputs

| Path | What |
|------|------|
| `scripts/jira` | `search` verb |
| `scripts/jira-json.js` | JQL + format list |
| `scripts/jira.test.js` | stub curl; unique fixtures (not `PROJ` / `Bug`) |
| `monitor/` | list API + left column bind |
| `docs/prd.md` | one table row for `jira search` |

## Done when

- Tests fail if `jira search` uses a hardcoded project key, issue type, URL, or token instead of config
- Tests fail if the Monitor server invokes `curl` for Jira
- Tests fail if Jira mode still lists leftover feature files
- Tests fail if files mode compares status to a literal `"todo"` when the fixture mapped that key to another string
- Left column shows title + status from the active tracker in a fixture project
