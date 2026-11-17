---
name: shipit
description: Run many specced tasks in parallel, one session per task, each /{{prefix}}runit with auto-merge; a dependent task starts after its dependency is merged. Use when the user runs /{{prefix}}shipit.
---

# /{{prefix}}shipit

Fan-out run for **specced** tasks. For each task the parent starts one session that runs `/{{prefix}}runit <KEY>` with auto-merge into `agents.baseBranch`. A task that `depends` on another starts only after that one is **merged**. The parent plans, starts sessions, waits, and reports. It never specs, never implements, never reviews, and never merges (the child's Reviewer merges through `merge-pr`).

Missing spec or prompt: `shipit` never runs Architect. Use `/{{prefix}}planit <KEY>`.

Read `harness.config.json` at run time. Do not guess `agents.baseBranch`, status strings, tracker maps, content language, or the product line. Do not invent CLI commands.

Stops (not questions) are one line:

```text
BLOCKED: <what stopped> — <what the user or another skill must do>
```

Shape: `.seh/references/BLOCKED.md`. If a `.seh/scripts/` helper refuses, copy its `BLOCKED:` line, stop that path, and do not work around it with raw `git` or `gh`.

## Guard

Before any work. Compare `.seh/VERSION` and `seh.generatedFrom` after trimming whitespace.

1. If `.seh/` or `.seh/VERSION` is missing:

```text
BLOCKED: seh install has not been run here — run seh install (npx -p se-harness seh install or npx -p github:meehow-halas/se-harness seh install), then /{{prefix}}setit-se
```

2. If `harness.config.json` is missing:

```text
BLOCKED: setup is incomplete — run /{{prefix}}setit-se
```

3. If `.seh/VERSION` does not match `seh.generatedFrom` in `harness.config.json`:

```text
BLOCKED: generated files do not match the installed templates — run /{{prefix}}setit-se
```

If a live agent the children need is missing from **this host's** `agentsDir` in `.seh/references/hosts.json` (`architect.md`, `implementer.md`, `reviewer.md`):

```text
BLOCKED: live agents are missing — run /{{prefix}}setit-se
```

Git disabled (`agents.baseBranch` empty or `null`): there are no PRs to merge.

```text
BLOCKED: /{{prefix}}shipit needs git — set agents.baseBranch with /{{prefix}}setit-se
```

## Mode

From **intent**. If the user asked for the work to be done alone (`samodzielnie`, `sam`, `bez pytań`, `autonomicznie`, `autonomous`), `autonomous` for every child. Otherwise `interactive`. The same `Mode:` goes to every child. In any mode the merge happens after acceptance (interactive: after the user accepts in that child's session; `critical` / `autonomous`: a clean Reviewer run is acceptance).

Reply in the language of the user's latest message, every message. Pass that language to children as `Conversation language: <name>` (a Polish message gives `Polish`).

## Key selection

- `/{{prefix}}shipit K1 K2 …`: those keys (one key is allowed; it still runs as a child session).
- No keys: every task that has spec **and** prompt and status `todo` (the configured `agents.statuses` / mapped `todo` string):
  - files tracker (`agents.tracker` absent): scan `docs/features/` and `docs/prompt/`;
  - `agents.tracker.readOnly` is `true`: the same scan in repo files (status is spec frontmatter);
  - full-write Jira or ADO: there is no search verb, so stop:

```text
BLOCKED: /{{prefix}}shipit needs keys with a Jira/ADO tracker — name the keys
```

No tasks found: `BLOCKED: no todo tasks with spec and prompt — run /{{prefix}}planit first`.

## Resolve (parent, once)

Per key, from the active tracker, as `/{{prefix}}runit` resolves one key (spec, prompt, status, `depends`). Check PR state with `.seh/scripts/pr-state <KEY>` (`state: merged|open|none`, `merged_at:`, `merge_commit:`, `url:`).

- `pr-state` first. `merged`: pass in `--done`, no session, no spec check (after `return-to-base` the spec may exist only on the base branch, not in the launch checkout). Counts as "skipped (already merged)".
- No spec or prompt (worktree copy when a seh worktree exists for the key, else the launch checkout): `BLOCKED: run /{{prefix}}planit <KEY> first`. That key is not started; dependents are `blocked`.
- Status `done` and `pr-state` is `open`: `BLOCKED: <KEY> is done but its PR is not merged — merge it, then rerun /{{prefix}}shipit`. Not started; dependents wait.
- Status `in progress` / `implemented` / `in review`: started before. On the desktop host check `list_sessions`: a live session for the key → `--running`; none → the run was interrupted: plan the key as any other (not in `--running`); its new child resumes at the first missing stage and reuses the spec and worktree. On `manual` hosts → `--running` (see *Manual hosts*).
- `depends` between keys in this invocation: pass `--depends KEY:DEP`. The same key list is used for `--keys`.
- `depends` on a key **outside** the invocation: satisfied when `pr-state <DEP>` is `merged` (pass it in `--done`; it is not in `--keys`). For a read-only tracker key with no local spec: satisfied when its tracker status equals `agents.tracker.statuses.blocker`. Otherwise that key is `blocked`.

## Plan and go-ahead

Call the planner:

```text
.seh/scripts/fanout-plan --skill shipit --keys <K1,K2,...> [--depends KEY:DEP,...] [--done <k,...>] [--running <k,...>] [--max <n>]
```

Default `--max 4`; more needs the user's yes. Output: `mode`, `max`, `ready`, `waiting`, `blocked`, `queued`, `stuck` (procedure and field meanings: `.seh/references/session-fanout.md`). `mode: sequential` cannot occur here (git is enabled). A `BLOCKED:` from the planner: fix the arguments and retry.

Before starting anything, show the keys, the `depends` edges, the first wave (`ready`) and the rest (`waiting`, `blocked`, `queued`), and say that finished tasks are **merged into `agents.baseBranch`**. Ask **once** for the go-ahead. This is the only question the parent asks. No answer = start nothing. Reruns after a go-ahead (next waves) do not ask again.

Record the run start time, and `git rev-parse origin/<base>` (base commit before).

## Start sessions

Follow `.seh/references/session-fanout.md` (sections *Start sessions* and *Per-skill placement*, row `shipit`) with these specifics:

- `sessionSpawn` is `start_session` (Claude Code desktop app): one `start_session` per `ready` key, `title` `shipit <KEY>`.
- The child prompt is **exactly these five lines**, in this order, and nothing else:

```text
/{{prefix}}runit <KEY>
Mode: <mode>
Conversation language: <language>
Fan-out child: yes
Auto-merge: yes
```

- No `Worktree:` line. The parent does not run `start-task`: the child's Architect (if ever) uses the launch checkout and the Implementer / Reviewer create the worktree.
- Context goes in `background` (at least 80 characters: the run goal, the sibling keys, the `depends` edges, that done means merged into the base branch).
- `wake_when_done: true`. Record each session's start time and link.
- Do not start `waiting`, `blocked` or `queued` keys.

## Wake

When woken, read `list_sessions` / `get_session` for every started key.

1. A session that ended: run `.seh/scripts/pr-state <KEY>`.
   - `state: merged` → the key is finished: add it to `--done`. Record `merged_at:` and `merge_commit:`.
   - Not merged and the session waits on the user (open `Q<n>`, or interactive acceptance) → still running: keep it in `--keys` and `--running`; its dependents stay `waiting`. The user answers in that session; do not relay it.
   - Anything else (no PR, open PR, a final `BLOCKED:`) → the key did **not** finish. Remove it from `--keys` (and from `--running` unless its session is still alive) on the next planner call, so its dependents report `blocked`. Also drop that key's own `--depends KEY:DEP` entries (the planner refuses a `--depends` entry whose key is not in `--keys`); entries that name it as the dependency stay. Keep its `BLOCKED:` line and the session link for the report.
2. A session still running → `--running`.
3. Call `fanout-plan` again with the updated lists and start the next `ready` keys.

Stop when `ready` is empty and no session is running or waiting on the user (including after blocks). Then write the run report and the end report. When only sessions waiting on the user remain, end this turn with the interim end-report table (no run report); a later wake continues.

A child's `BLOCKED:` or `Q<n>` does not stop siblings.

## Manual hosts

`sessionSpawn` is `manual` (Codex, Cursor, OpenCode): print one command block per `ready` key, then stop:

````text
/{{prefix}}runit <KEY>
Mode: <mode>
Conversation language: <language>
Fan-out child: yes
Auto-merge: yes
````

Tell the user to paste each block in a new session. The parent keeps no state between runs: rerun `/{{prefix}}shipit` (same keys) later. The rerun recomputes from `pr-state` and the tracker status: `merged` → `--done`; status `in progress` / `implemented` / `in review` → `--running`; then it prints the next wave. When the rerun finds nothing left to start and nothing running, write the run report (this is the end of the fan-out). Times of sessions the parent did not start are `n/a`.

## Run report

Written by the parent when the fan-out ends: `ready` is empty and no session is running or waiting on the user, including a stop on blocks, and on the final `manual` rerun. Not written on an intermediate wave.

- Path: `docs/run-reports/<YYYY-MM-DD-HHMM>-shipit.md` in the launch checkout (local time of run start; add `-2`, `-3` … if the name exists). Create the directory if needed.
- Language: `agents.contentLanguage`.
- Always a file, regardless of tracker. **Never** written to Jira/ADO (trackers get only the normal per-task log/comments from the agents). **Never committed**: the user commits it if wanted.
- Timing: the parent records its own timestamps (run start, each session start, the wake on which it saw the session end). Merge time is `merged_at:` from `pr-state`. A value the parent cannot know (for example session times on a `manual` host) is written as `n/a`, never estimated.

Sections, in this order:

1. **Header**: run start / end, total duration, mode, host, `agents.baseBranch`, base commit before (`git rev-parse origin/<base>` at start) and after (at end), key selection (named keys or "all `todo`"), `--max`.
2. **Summary counts**: merged / blocked / not started (dependency blocked) / skipped (already merged before the run).
3. **Per-task table**: key, title (from spec), wave number, session link, start, end, duration, status, PR URL, merge commit, merged at, result (`merged` / `BLOCKED: …` / `Q<n>` / not started).
4. **Done**: per merged task, what was delivered (one or two lines from the spec goal / the CHANGELOG line the child added).
5. **Agent runs**: one line per task, counts only, read from the task log, plus the log path (do not copy log rows): `Implementer phases N · Consultant passes N (C items N, debt accepted N) · Reviewer rounds N (❌ N, ⚠️ N)`. Full-write Jira/ADO: Consultant `n/a` (not logged on the work item). Brainstorm personae are not reported (they do not run inside `/{{prefix}}shipit`).
6. **Not done and why**: per task not merged, the exact `BLOCKED:` line or open `Q<n>` and the session where it is; tasks never started and which dependency stopped them.
7. **Decisions taken by agents** (`autonomous` / `critical`): the `Q<n>` decisions recorded in each task log, as facts, so the user can review them.
8. **Open warnings**: ⚠️ items the Reviewer left (not blocking, not fixed).
9. **Dependency graph and actual order**: edges from `depends` and the waves as they ran.
10. **What is left**: tasks still `todo` / `in progress` / with an open PR, with their status.
11. **Next actions for the user**: concrete commands or steps (answer `Q<n>` in session X, `/{{prefix}}checkit update <KEY>`, merge PR Y by hand, `/{{prefix}}planit <KEY>`, rerun `/{{prefix}}shipit <keys>` for the rest, commit the report), most important first.

## End report (chat)

A short table plus the report path; the file holds the detail:

| Key | Session | State |
|-----|---------|-------|
| `<KEY>` | `[title](#local_<id>)` | `merged` / `BLOCKED: …` / `Q<n>` / waiting / not started |

Then: `Run report: docs/run-reports/<file>`. In `autonomous` mode the report asks nothing: no follow-up question, no choice buttons.

## Rules

- Children never spawn children. A session whose prompt has `Fan-out child: yes` runs exactly its one key in place (`/{{prefix}}runit`); it never runs this procedure and never calls `start_session`. Subagents inside a child are allowed.
- The parent never merges and never does a child's work (no specs, no implementation, no review, no `start-task`, no `merge-pr`).
- `Auto-merge: yes` goes only into the child prompt of this skill. It is never added for `/{{prefix}}doit`, `/{{prefix}}checkit` or a user-launched `/{{prefix}}runit`.
- Run only `/{{prefix}}runit` children. Never start another skill's session, for example `planit` for a missing spec.
- Children share no notes folder and no side channel. The parent does not create one.
- Do not add lines to the child prompt. A missing required line: do not spawn that key; report `BLOCKED: fan-out prompt incomplete for <KEY> — <missing line>`.
