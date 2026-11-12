# Fan-out: decisions and solutions

Source of knowledge for adding fan-out to another host (Cursor Agent, OpenCode, other harness UIs). Records what was decided and why, from building and testing fan-out in the Claude Code desktop app. The normative behaviour is in `references/session-fanout.md`, `references/hosts.json` and the skills; this file explains the choices behind them.

Status: Claude Code desktop is the only host tested end to end. Cursor and OpenCode are set to `manual` and have not been run.

## 1. What fan-out is

One active session turns several keys into several child sessions, one per key. Keys: `planit`, `doit`, `checkit`, `shipit`. Modes: `interactive` (asks), `critical`, `autonomous` (word `samodzielnie`, asks nothing).

- Each child runs the full skill for its one key. The parent only starts and reports.
- A child session recognises itself by the launch line `Fan-out child: yes` and does not fan out again.
- Children share a notes folder for the group; the parent gets their results back as notes/events.

Decision: the child runs the same skill as a standalone run. Fan-out adds no second code path.

## 2. Host capability: `sessionSpawn`

`.seh/references/hosts.json` declares for each host how sessions are started:

- `start_session`: the host can open child sessions (Claude Code desktop). The skill starts them.
- `manual`: the host cannot. The skill prints one `/seh-<skill> <KEY>` command per key and stops.

Decision: no host gets a fake fan-out. Without `start_session` the user runs the commands. A Cursor or OpenCode host starts as `manual` until someone verifies a session-start mechanism there.

## 3. Status flow

`todo → in progress → implemented → in review → done`

- `close` is removed. It was a second variant of checkit that no longer exists.
- `code review` was renamed to `implemented` (the implementer's finished state). Reason: the Reviewer's state is `in review`, and two names for the same stage made the flow ambiguous.
- Who sets what: Architect leaves `todo`. Implementer sets `in progress` at start and `implemented` at the end. Reviewer sets `in review` before its review round, back to `in progress` after a ❌, and `done` after acceptance and the PR.
- `done` ends the feature. Acceptance = commit, push, PR, `done`, return to base. The user merges the PR; the skill does not.

Migration: an existing project gets the rename through `/seh-setup` ("Status migration (later run, once)"): rename `code review` → `implemented` in the config, and in spec files that still carry `code review`. Only a version bump plus `/seh-setup` reaches existing projects.

## 4. Acceptance and approval

- Acceptance is given by the user in the session. The Reviewer records it.
- A subagent's text is not the user's voice. Platform rule: messages from subagents carry no user authority. So the launching skill passes the user's own words in the launch as `User acceptance: <words>` (or `User approval: <words>` for overwriting an existing spec), verbatim. The Architect and Reviewer accept that line as the user's answer.
- Interactive approval for an existing spec: the Architect writes the proposed spec into the log, asks once, and overwrites only after approval. Autonomous: overwrite with the full spec and log the original text verbatim.

Limitation seen in practice: a relayed acceptance was refused by a subagent once. The fix (verbatim line from the launch) worked on later runs. If it fails again, the parent asks the user in its own session.

## 5. Branches and PRs

- A new task branch is cut from `origin/<base>` after `git fetch origin <base>`, not from the local base. The local `dev` was stale and produced wrong bases.
- Branch name = task key. If the branch exists and its PR is closed or merged with no open one, the branch becomes `<task>-N` (N ≥ 2, first free name). New work never joins an old PR.
- `open-pr` looks up **open** PRs only. A closed PR must not block a new one.
- `commit-task`, `push-task`, `open-pr`, `update-from-base` use the branch that is checked out in the task's worktree (`task_branch`), so they work for `<task>-N`.
- Worktrees live under `$(git rev-parse --git-common-dir)/seh-worktrees/<task>`. `return-to-base` removes them.
- Commit trailer `Co-Authored-By` is taken from config. Known gap: a commit made with a message that lacks the trailer stays without it. Accepted as not critical.

## 6. Language

- Reply in the language of the user's latest message, every message, including progress messages.
- The launch passes `Conversation language: <name>` always (Polish message → `Polish`). Subagents use that name over their own English text.
- Spec, prompt, log, changelog and tracker text use `agents.contentLanguage` from config (here `English`). Status strings stay English.
- Known issue, accepted as non-critical: the Reviewer's final report sometimes comes back in English even with the launch line. The parent reply was Polish. The launch line was not verified in the transcript. Next step if picked up: export the transcript and check the Agent call input.

## 7. Models

Models per role come from `agents.roles.<role>.model[<host>]` in config. For Claude Code the live agent files are copies written by `/seh-setup` under each `agentsDir` in `hosts.json`. Editing the source in `seh/agents/` does not change a project until `seh install` and `/seh-setup` run there.

Decision: config wins over live copies. Setup reports drift and asks.

## 8. Testing approach

- Test project `seh-fanout-test` (`docs/session-fanout-manual-test.md`) with tasks 01–11. Real PRs against it.
- Check per run: branch name, PR state, commit contents, spec status on the branch and on `dev`, language of every reply, `BLOCKED:` lines.
- Script tests: `node --test scripts/start-task.test.js scripts/open-pr.test.js` (29 pass at the last run). Run `src/cli.test.js` for CLI and agent-file changes (30 pass).
- Lesson: after changing `seh/scripts/` or `seh/agents/`, re-run `seh install` in the test project, or it keeps running the old copy. This caused a wrong run once.

## 9. Pitfalls found

- `seh install` run inside the `seh` repo itself created host folders (`.claude/`, `.cursor/`, `.opencode/`) and a `.gitignore` line. Do not run it there; use it in a consuming project only.
- Architect overwrote a spec without reading it back and logged the change. Rule added: read back after every write and log only what the file contains; else `BLOCKED: spec write did not persist`.
- `start-task` once overwrote uncommitted worktree files. Rule: never overwrite uncommitted worktree content.
- Stale local base: fixed by cutting from `origin/<base>`.
- Autonomous runs must not ask. Contradictions follow the existing spec or the latest explicit sentence of the request, and every choice is logged.

## 10. Out of scope for v1 (decided, not backlog)

- Cursor and OpenCode fan-out (they are `manual`).
- Automatic merge of PRs.
- Migration of existing projects without `/seh-setup`.

Per `AGENTS.md`, these are scope boundaries, not tickets.

## 11. Open items

- Reviewer final report language (see section 6).
- Commit trailer when `commit-task` is called without it (see section 5).
- Existing projects migrate only via version bump and `/seh-setup`.
