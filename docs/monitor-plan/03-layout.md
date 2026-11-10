# Phase 3 — Layout

## Goal

Full-viewport two-column shell with persisted width and filters, matching idea §6. Placeholders are enough; real rows come in phase 4.

## In scope

- Left: min 350px, max 25% of viewport, drag the divider, width in `localStorage`
- Left: list region, filters (status, name, …), default hide the configured `done` string (read from config when present; placeholder list may hardcode only if config is missing in the stub — prefer reading config)
- Filters in `localStorage`
- Button **Add** (no planit wiring yet)
- Right: remaining width; chat column + composer stub; chat+input in a narrow center column (pick px in implementation, ~680–760 like Claude Code, document the number in this file when chosen)
- Composer at the bottom; Send; Enter to send (no-op or local echo until phase 5)

## Implementation notes

Chat + composer column width: **720px** (within ~680–760, similar to Claude Code). CSS variable `--chat-width`.

`localStorage` keys: `dhs.monitor.leftWidth` (px), `dhs.monitor.filters` (`name`, `status`, `hideDone`). Default `hideDone` is true. Hidden status string is `agents.tracker.statuses.done` when that map is present, otherwise `agents.statuses.done`.

## Out of scope

- Tracker glob / Jira
- SDK streaming
- Stage buttons

## Inputs

- Idea §6; [monitor.txt](../ideas/monitor.txt) for the raw layout sketch only (the idea file names this `web-panel.txt`; that path is not in the repo) — idea file wins

## Outputs

| Path | What |
|------|------|
| `monitor/` UI | layout CSS/JS, localStorage keys, tests if layout rules are assertable |

## Done when

- Left pane cannot shrink below 350px or grow beyond 25%
- Reloading the stub restores width and filters from `localStorage`
- Default filter hides `done` (the string from config when the fixture config uses a non-literal value — do not bake `"done"` as the only compared string)
- Add and the two-column chrome are visible without an agent
