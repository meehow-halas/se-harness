# 01 — Fan-out decisions

## Goal

Record what was decided for session fan-out and why, from building and testing it in the Claude Code desktop app.

## Scope in

1. What fan-out is. One active session turns keys (`planit`, `doit`, `checkit`, and the single-task pipeline, then named `shipit`, now `runit`) into child sessions, one per key. Modes: `interactive` (asks), `critical`, `autonomous` (asks nothing). Each child runs the full skill for its one key; the parent only starts and reports. A child recognises itself by the launch line `Fan-out child: yes` and does not fan out again. Children share a notes folder; the parent gets results back as notes or events. Decision: the child runs the same skill as a standalone run; no second code path.
2. Host capability `sessionSpawn` in `references/hosts.json`: `start_session` (host can open child sessions; skill starts them) or `manual` (skill prints one `/seh-<skill> <KEY>` command per key and stops). Decision: no fake fan-out. Cursor and OpenCode start as `manual`.
3. Status flow: `todo → in progress → implemented → in review → done`. `close` removed. `code review` renamed to `implemented` (Reviewer uses `in review`; two names for one stage were ambiguous). Architect leaves `todo`; Implementer sets `in progress` and `implemented`; Reviewer sets `in review`, back to `in progress` after ❌, and `done` after acceptance and PR. `done` ends the feature: acceptance = commit, push, PR, `done`, return to base. The user merges the PR. Migration: `/<prefix>setit-se` "Status migration (later run, once)" renames `code review` → `implemented`.
4. Acceptance and approval. Acceptance is given by the user in the session and recorded by the Reviewer. A subagent's text is not the user's voice, so the launching skill passes the user's own words in the launch as `User acceptance: <words>` (or `User approval: <words>` for overwriting a spec), verbatim. Interactive approval for an existing spec: write the proposed spec into the log, ask once, overwrite only after approval. Autonomous: overwrite with the full spec and log the original text verbatim. Limitation: a relayed acceptance was refused once; the verbatim line fixed it; if it fails again, the parent asks the user in its own session.
5. Branches and PRs. New task branch cut from `origin/<base>` after `git fetch origin <base>`, not from the local base. Branch name = task key. If the branch exists and its PR is closed or merged with no open one, the branch becomes `<task>-N` (N ≥ 2, first free name). `open-pr` looks up open PRs only. `commit-task`, `push-task`, `open-pr`, `update-from-base` use the branch checked out in the task's worktree (`task_branch`). Worktrees under `$(git rev-parse --git-common-dir)/seh-worktrees/<task>`; `return-to-base` removes them. `Co-Authored-By` trailer comes from config.
6. Language. Reply in the language of the user's latest message, every message, including progress messages. The launch passes `Conversation language: <name>`. Spec, prompt, log, changelog and tracker text use `agents.contentLanguage`. Status strings stay English.
7. Models. Per-role models come from `agents.roles.<role>.model[<host>]` in config. Live agent files are copies written by setup. Decision: config wins over live copies; setup reports drift and asks.
8. Testing approach. Test project `seh-fanout-test` (see [manual-tests/session-fanout.md](../manual-tests/session-fanout.md)) with tasks 01–11; real PRs. Check per run: branch name, PR state, commit contents, spec status on branch and on base, language of every reply, `BLOCKED:` lines. Script tests: `node --test scripts/start-task.test.js scripts/open-pr.test.js`; CLI and agent-file changes: `src/cli.test.js`. Lesson: after changing `seh/scripts/` or `seh/agents/`, re-run `seh install` in the test project, or it keeps running the old copy.
9. Pitfalls found. `seh install` inside the seh repo itself created host folders and a `.gitignore` line: do not run it there. Architect overwrote a spec without reading it back: rule added — read back after every write, else `BLOCKED: spec write did not persist`. `start-task` once overwrote uncommitted worktree files: never overwrite uncommitted worktree content. Stale local base: cut from `origin/<base>`. Autonomous runs must not ask; contradictions follow the existing spec or the latest explicit sentence, and every choice is logged.
10. Out of scope for v1 (decided, not backlog): Cursor and OpenCode fan-out (they are `manual`); migration of existing projects without `/<prefix>setit-se`. Automatic PR merge was out of scope here; 1.3.0 added it as opt-in (`/<prefix>shipit`, launch line `Auto-merge: yes`, `merge-pr`).

## Scope out

- New fan-out mechanisms for other hosts (see `docs/v2-plan/` if ever opened).

## Decisions taken

- Items 1–10 above are the decisions. Normative text lives in `references/session-fanout.md`, `references/hosts.json` and the skills.

## Files likely touched

- None (knowledge record). Normative files: `references/session-fanout.md`, `references/hosts.json`, `skills/*`, `scripts/fanout-plan`.

## Acceptance criteria

- The record matches the normative files (checked when they change).

## Tests

- None (record). Behaviour tests live with the scripts.

## Versioning

None.

## Depends on

- None.
