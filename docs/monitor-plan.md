# Monitor implementation plan

Build order for **Monitor** (new product scope, not dhs CLI v1). **Not a second spec.** Behaviour is defined in [ideas/monitor.md](ideas/monitor.md). Product facts for this scope: [monitor-plan/prd.md](monitor-plan/prd.md). dhs v1 remains [prd.md](prd.md). When this plan or chat history disagrees with the idea file, the idea file wins. When Monitor facts disagree with dhs v1 CLI-only rules, this scope wins **only** for Monitor (payload `monitor/`, `jira search`, optional `package.json` script).

An agent implementing a phase must read **this file and that phase file**. Do not implement other phases in the same pass unless the user names them. The Phase index **Status** column is the record of which slices have landed; later phases read it as a dependency check, not chat history.

Do not mix these rows into [implementation-plan.md](implementation-plan.md).

## How to use these files

To commission a phase, attach or mention that phase’s `.prompt.md` file. If the implementing agent must ask a question, it keeps the question short and always labels the recommended option.

When that phase’s “Done when” checklist and the shared done rules are true, the implementing agent sets that row’s **Status** to `done` in the Phase index below. Do not mark it `done` if any item is still false. Do not start a phase whose **Depends on** rows are still `todo`.

| Slice | Plan | Prompt |
|-------|------|--------|
| This file | Invariants, layout, decisions, phase index | — |
| Monitor PRD | [monitor-plan/prd.md](monitor-plan/prd.md) | — |
| Phase 0 | [monitor-plan/00-docs.md](monitor-plan/00-docs.md) | [monitor-plan/00-docs.prompt.md](monitor-plan/00-docs.prompt.md) |
| Phase 1 | [monitor-plan/01-payload-and-server.md](monitor-plan/01-payload-and-server.md) | [monitor-plan/01-payload-and-server.prompt.md](monitor-plan/01-payload-and-server.prompt.md) |
| Phase 2 | [monitor-plan/02-cursor-sdk-sessions.md](monitor-plan/02-cursor-sdk-sessions.md) | [monitor-plan/02-cursor-sdk-sessions.prompt.md](monitor-plan/02-cursor-sdk-sessions.prompt.md) |
| Phase 3 | [monitor-plan/03-layout.md](monitor-plan/03-layout.md) | [monitor-plan/03-layout.prompt.md](monitor-plan/03-layout.prompt.md) |
| Phase 4 | [monitor-plan/04-tracker-list.md](monitor-plan/04-tracker-list.md) | [monitor-plan/04-tracker-list.prompt.md](monitor-plan/04-tracker-list.prompt.md) |
| Phase 5 | [monitor-plan/05-chat.md](monitor-plan/05-chat.md) | [monitor-plan/05-chat.prompt.md](monitor-plan/05-chat.prompt.md) |
| Phase 6 | [monitor-plan/06-add-planit.md](monitor-plan/06-add-planit.md) | [monitor-plan/06-add-planit.prompt.md](monitor-plan/06-add-planit.prompt.md) |
| Phase 7 | [monitor-plan/07-stage-buttons.md](monitor-plan/07-stage-buttons.md) | [monitor-plan/07-stage-buttons.prompt.md](monitor-plan/07-stage-buttons.prompt.md) |
| Phase 8 | [monitor-plan/08-list-refresh.md](monitor-plan/08-list-refresh.md) | [monitor-plan/08-list-refresh.prompt.md](monitor-plan/08-list-refresh.prompt.md) |
| Phase 9 | [monitor-plan/09-cursor-agent-cli.md](monitor-plan/09-cursor-agent-cli.md) | [monitor-plan/09-cursor-agent-cli.prompt.md](monitor-plan/09-cursor-agent-cli.prompt.md) |

Cite the idea file and Monitor PRD instead of copying long procedure.

Repo [AGENTS.md](../AGENTS.md) still describes dhs v1 (six payload dirs, CLI `install` / `uninstall`) until phase 1 updates it. For Monitor slices, this file and [monitor-plan/prd.md](monitor-plan/prd.md) override that six-dir list: `monitor/` is the seventh payload. Do not add a `dhs monitor` CLI subcommand.

## Accepted decisions

From the commissioning conversation. Do not reopen them in a phase.

- **Start:** after `dhs install`, run locally from the project: `node .dhs/monitor --host cursor`. Not `npx` on every open.
- **Models:** reuse `hosts.json` id `cursor`. Role models from `agents.roles.<role>.model.cursor`. No new host row.
- **Add** starts only `/dhs-planit`. Not `/dhs-shipit`. Full path = planit, then stage buttons.
- **`jira search`:** new allowlisted verb. The script builds JQL from `agents.tracker.projectKey` and `issueTypes` (feature + bug). UI does not compose `curl` or JQL.
- **Transcript:** `.dhs/monitor/sessions/<task-key>/` (CLI session id + UI messages). Restart resumes the CLI session when that id is live; otherwise a new process, old chat stays readable.
- **Port:** `127.0.0.1:7310`, override `--port`. Lock `.dhs/monitor/instance.lock` per cwd. Second start in the same checkout prints the URL and exits 0. Another checkout is another instance.
- **Ceiling N:** start at 4, flag `--max-agents`. Above the cap: visible refusal, not a silent queue. Measure CLI behaviour at N=4 in phase 9 docs; do not promise infinity.
- **Architect lock (files tracker):** one `/dhs-planit` per checkout (`flock` on `.dhs/monitor/planit.lock`). Second attempt: `BLOCKED:` that an Architect is already writing a spec. Jira: no basename lock (Jira assigns the key).
- **IDE + Monitor on the same key:** warn in UI if a worktree already exists; do not hard-block (`start-task` reuses).
- **Auth:** Cursor Agent CLI already on `PATH`, using the same login as the user’s terminal `agent`. Missing binary or not logged in: `BLOCKED:` with CLI login instructions, not a chat guess. Not `CURSOR_API_KEY`. Not `Cursor.auth.login()`. Not credentials from the Cursor desktop app.
- **npm convenience:** if cwd has `package.json`, install adds only `"dhs:monitor": "node .dhs/monitor"` when that key is absent. Does not touch `dependencies`. Does not overwrite an existing key. `--host` stays required: `npm run dhs:monitor -- --host cursor`. Uninstall removes the script only when the value is exactly what install wrote.
- **On disk:** `dhs install` copies package `monitor/` into `.dhs/monitor/`. No `@cursor/sdk` vendor. No second `npm install` in the consumer project. `*.test.js` are not copied. (Phase 1 vendored the SDK; phase 9 removes that.)

## Product invariants

- Monitor is UI + **N agent processes** (one live run per task/stage). Not one global session. Switching the left row does not kill other runs.
- `--host` is always required. No default. First delivery implements `cursor` only; any other id stops clearly (no silent fallback).
- Bind loopback only (`127.0.0.1`), never LAN.
- Never global install. Never write to `~/.claude/`, `~/.cursor/`, or other machine-wide paths.
- Setup remains `/dhs-setup`. Monitor is not `/dhs-setup`.
- Exactly one tracker, read from config: files **or** Jira. Both list implementations ship in the same Monitor delivery (phase 4). No mirroring.
- UI does not guess `main`/`dev`, status strings, or doc paths. Read `harness.config.json`.
- UI does not set tracker `status`, does not call `jira create`, does not merge PRs, does not bypass `BLOCKED:` with raw `git`/`gh`/`curl`.
- Stage buttons start a skill on that task’s session. They do not write status.
- Mode for first delivery: `interactive`.
- Tests: `npm test` stays `node:test`. Monitor tests live next to the unit (`monitor/*.test.js` and existing `src/` / `scripts/` tests). Install must not copy `*.test.js` into `.dhs/`.
- Do not commit unless the user asks.
- Do not edit `README.md` unless the user asks.

## Package layout (Monitor delta)

Published sources stay at the package root. Monitor adds a seventh payload directory.

| Directory | Role | Copied into `.dhs/`? |
|-----------|------|----------------------|
| `agents/` … `scripts/` | unchanged v1 payload | yes |
| `monitor/` | Monitor server + UI | yes (`.dhs/monitor/`) |
| `src/` | `dhs` CLI (`install` / `uninstall` only) | no |

`docs/` is not copied into a consuming project.

Daily Monitor start is `node .dhs/monitor --host <id>`, not a new `dhs` subcommand and not `npx`.

## Architecture

```text
User (browser, 127.0.0.1)
  → UI in .dhs/monitor (list, chat, buttons)
  → Node server in the project cwd
  → N × Cursor Agent CLI (cwd = project)
       skills + agents + harness.config.json + .dhs/scripts/
  → tracker: files XOR Jira (agents write; UI does not)
```

## Start guards

Same idea as work skills. Missing `.dhs/`, missing `harness.config.json`, or `.dhs/VERSION` ≠ `dhs.generatedFrom`: do not serve the UI; tell the user to run `dhs install` and/or `/dhs-setup`.

## Shared stops

```text
BLOCKED: <what stopped> — <what the user or another skill must do>
```

Do not use `BLOCKED: rule=<id>`.

## Phase index

Status is `todo` or `done`. Update only the row just completed, and only after the shared done rules hold.

Phase 2 landed the N-session registry on `@cursor/sdk`. **Phase 9 replaces that runtime** with Cursor Agent CLI (same N-session contract, no `CURSOR_API_KEY`). Phase 2 stays `done`. Files and Jira lists are the same phase 4. Phases 3 and 4 may run in parallel with 9; chat (5) must not start until 9 is `done`.

| Phase | Slice | Depends on | Status |
|-------|--------|------------|--------|
| 0 | Plan tree + Monitor PRD | — | done |
| 1 | Payload `.dhs/monitor`, launcher, `--host`, loopback server, guards, lock/port, npm script | 0 | done |
| 2 | Cursor SDK: N sessions, stream, dispose, N cap, planit lock | 1 | done |
| 3 | Two-column layout + localStorage | 1 | done |
| 4 | Task list: file glob **and** `jira search` | 1 | todo |
| 5 | Chat for the selected session (switch does not kill others) | 9, 3 | todo |
| 6 | Add → `/dhs-planit` in chat | 9, 5 | todo |
| 7 | Stage buttons doit / review / close+confirm; `depends` visible | 4, 5, 6 | todo |
| 8 | List refresh after tracker writes | 4, 7 | todo |
| 9 | Cursor Agent CLI: replace SDK runtime, N processes, stream, dispose, no API key | 2 | todo |

## Shared done rules

A phase is done when its phase file checklist is true **and**:

- No global install, no machine-wide paths, no `dhs monitor` npx daily path.
- Idea-file out of scope and **Out of this Monitor delivery** were not implemented “while here”.
- README was not edited unless the user asked.

Then set that phase’s **Status** to `done` in the Phase index. That write is part of finishing the phase.

## Out of this Monitor delivery

Claude Code adapter; OpenCode adapter; brainstorm UI; `/dhs-monitor` skill; checkit update-from-base button; bridge to a live IDE session; watching JSONL under home; tracker CRUD from the UI; auto-merge; auto-install; a new “implementation finished” status; global install.

When Architect asks for a brainstorm round: chat text only, no extra screen.

This list is a **scope boundary**, not a backlog.
