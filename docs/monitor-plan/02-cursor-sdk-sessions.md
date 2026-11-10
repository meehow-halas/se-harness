# Phase 2 — Cursor SDK sessions

**Superseded by phase 9** for the session runtime and auth: N sessions stay, but the adapter is Cursor Agent CLI, not `@cursor/sdk` / `CURSOR_API_KEY`. The checklist below is what phase 2 landed. Status stays `done`. Do not re-open this phase to swap the adapter — that is phase 9.

## Goal

N independent Cursor Agent sessions in one Monitor process. This is the product goal; it is not optional later work. One `Agent.create` per task (not one agent recycled across tasks).

## In scope

- Adapter over `@cursor/sdk`: `Agent.create` / `send` / `stream` / `wait` / dispose; `Agent.resume` when a stored id is live.
- `local.cwd` = Monitor’s project cwd. Model from `agents.roles.<role>.model.cursor` for the skill being launched (phase 6–7 pick the skill; this phase must accept a model id and keep N agents).
- Stream to the UI channel (SSE or WebSocket). Phase 5 renders; this phase exposes per-session events.
- Cap `--max-agents` (default 4): refuse a new live agent with a visible error. No silent queue.
- Files-tracker planit lock: `flock` on `.dhs/monitor/planit.lock`. Second concurrent planit: `BLOCKED:` an Architect is already writing a spec. Jira planit: no basename lock.
- Persist session id + messages under `.dhs/monitor/sessions/<task-key>/`.
- Dispose on session close and on server exit. Switching the selected task must not dispose others (API here; UI in phase 5).
- Missing `CURSOR_API_KEY`: stop that create with instructions, not a chat guess.
- Record in this file or a short note under `docs/monitor-plan/` what happens at N=4 (RAM, errors). Do not promise unbounded N.

## Out of scope

- Layout, list, Add button, stage buttons
- Claude Code adapter
- Real skill prompts (stub `send` text is enough to prove N streams)

## Inputs

- Idea file §1 (parallelism), §5, §9
- Index decisions: N cap, planit lock, transcript, auth

## Outputs

| Path | What |
|------|------|
| `monitor/` | session registry, SDK adapter, stream endpoint, lock, tests with a fake Agent |
| [02-n4-sdk.md](02-n4-sdk.md) | N=4 note (CI fake; live SDK not measured in CI) |

## Behaviour

- Two sessions: both `send` without cancelling the other.
- Selecting session A does not call dispose on B.
- Create beyond the cap: refused.
- Fake/stub only the SDK boundary. Assert create count, dispose count, argv/model, lock.

## Done when

- Tests fail if one Agent is reused for two task keys
- Tests fail if switching/selecting A disposes B
- Tests fail if the (N+1)th live agent is queued instead of refused
- Tests fail if two overlapping files-tracker planit runs both proceed
- Tests fail if a missing API key still calls `Agent.create`
- Dispose runs on server shutdown for live agents
- A measured note exists for N=4 (even if “not yet run against real SDK in CI”)
