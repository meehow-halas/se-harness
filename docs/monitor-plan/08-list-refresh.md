# Phase 8 — List refresh

## Goal

After an agent writes the tracker, the left column updates: new task after Architect, status changes, `done` hidden by the default filter.

## In scope

- Refresh after a run ends and after tool activity that likely wrote the tracker
- Files: watch the spec glob (or cheap poll)
- Jira: re-run `jira search` (poll; no extra REST from the UI)
- Do not invent a second tracker

## Out of scope

- Push/webhook from Jira Cloud
- Mirroring files ↔ Jira

## Inputs

- Idea §7 last paragraph; §14.8

## Outputs

| Path | What |
|------|------|
| `monitor/` | refresh/watch, tests with a fixture file or stubbed search |

## Done when

- Tests fail if a new spec file (or a stubbed new Jira row) never appears without a full process restart
- Tests fail if a status change on the active tracker never appears in the list payload
- Default `done` filter still hides the configured done string after refresh
- Jira refresh still goes through `jira search`, not `curl` from the server
