# Phase 9 — Cursor Agent CLI sessions

## Goal

Replace the phase 2 `@cursor/sdk` runtime with **N independent Cursor Agent CLI processes**. Keep the session registry (cap, planit lock, transcript, select does not dispose others). One CLI process per task, not one process recycled across tasks. No `CURSOR_API_KEY`.

## In scope

- Adapter: spawn the Cursor Agent CLI from `PATH` (the same `agent` binary the user already logs into in a terminal). `cwd` = Monitor’s project cwd. Model from `agents.roles.<role>.model.cursor` for the skill being launched (phase 6–7 pick the skill; this phase must accept a model id and keep N processes).
- Stream CLI stdout/events onto the existing per-session UI channel (`subscribe` / SSE or WebSocket). Phase 5 renders; this phase must expose the same event shape the chat binds to.
- Resume: stored CLI session id when that id is live; otherwise a new process, old UI chat stays readable.
- Cap `--max-agents` (default 4): refuse a new live process with a visible error. No silent queue.
- Files-tracker planit lock stays the phase 2 lock. Jira planit: no basename lock.
- Persist session id + messages under `.dhs/monitor/sessions/<task-key>/`.
- Dispose = kill the child on session close and on server exit. Switching the selected task must not dispose others.
- Missing CLI binary or not logged in: `BLOCKED:` with CLI login instructions. Do not call `Cursor.auth.login()`. Do not read `CURSOR_API_KEY`. Do not read Cursor desktop-app credentials.
- Stop vendoring `@cursor/sdk`: `dhs install` copies `monitor/` only; remove the SDK package dependency and the vendor copy in `src/cli.js` / tests; update repo `AGENTS.md` to match the Monitor PRD.
- Keep the phase 2 registry API: create, send, select, close, disposeAll, subscribe, snapshot, list, liveCount.
- Record in [09-n4-cli.md](09-n4-cli.md) what happens at N=4 (CI fake spawn). Do not promise unbounded N.

## Out of scope

- Layout, list, Add button, stage buttons
- Claude Code adapter
- Bridge to a live IDE or terminal session the user already has open
- Real skill prompts (stub `send` text is enough to prove N streams)

## Inputs

- Idea file §1 (parallelism), §4–5, §9
- Index decisions: Auth (CLI), On disk (no SDK vendor), N cap, planit lock, transcript, resume
- Phase 2 registry (keep); phase 2 SDK adapter (replace)

## Outputs

| Path | What |
|------|------|
| `monitor/` | CLI adapter behind the session registry; stream endpoint unchanged for phase 5; tests stub spawn |
| `src/cli.js`, `src/cli.test.js`, `package.json`, `AGENTS.md` | no `@cursor/sdk` vendor / dependency |
| [09-n4-cli.md](09-n4-cli.md) | N=4 note (CI fake; live CLI not measured in CI) |

## Behaviour

- Two sessions: both `send` without cancelling the other. Two task keys → two CLI processes.
- Selecting session A does not kill process B.
- Create beyond the cap: refused.
- Fake/stub only the process boundary (argv, `cwd`, env **without** `CURSOR_API_KEY`, spawn count, kill/dispose). Assert create count, dispose count, model, lock.
- Create must not load `@cursor/sdk` or call `Agent.create`.

## Done when

- Tests fail if create requires `CURSOR_API_KEY` or calls `Agent.create` / loads `@cursor/sdk`
- Tests fail if two task keys share one CLI process
- Tests fail if switching/selecting A disposes B
- Tests fail if the (N+1)th live agent is queued instead of refused
- Tests fail if a missing CLI binary or logged-out CLI still spawns a session process
- Dispose kills live children on server shutdown
- Install no longer vendors `@cursor/sdk`; `AGENTS.md` and Monitor PRD agree
- A measured note exists for N=4 (even if “not yet run against real CLI in CI”)
