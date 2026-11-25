# Session fan-out

Shared procedure for work skills (`/{{prefix}}planit`, `/{{prefix}}doit`, `/{{prefix}}checkit`, `/{{prefix}}runit`) when the user names **two or more** keys. One key = run the skill in this session as before. Sessions are started only with git and the `worktree` operation enabled; with git or `worktree` disabled (`agents.git.worktree` off) the keys run sequentially in this session (section 2). `/{{prefix}}shipit` uses the same procedure with the differences marked `shipit` below; its own steps are in `.seh/skills/shipit/SKILL.md`.

Planner: `.seh/scripts/fanout-plan`. Host adapter: `sessionSpawn` in `.seh/references/hosts.json` for this host.

## 1. Guard and resolve (parent, once)

- Run the skill's own guard first (unchanged).
- Resolve each key (spec, status, `depends`, each read from its store) as the skill does for one key. Keys whose spec is missing are `BLOCKED` for that key only, except for `planit` (writing the spec is its job) and `runit`: a missing spec does not block the key, and its child starts at Architect (see Rules); for `runit` after the `pr-state` check in `runit` *Resolve the task* (an open or merged PR is reported, not started).

## 2. Plan

Call the planner. Pass `--depends KEY:DEP` only for dependencies between keys in this invocation. A dependency on a key outside the invocation must already pass the `depends` gate of the agent files (status read where it lives; pass it in `--done`), or that key stays blocked.

`runit` with `mode: parallel` (git and `worktree` enabled) does no dependency ordering: pass no `--depends`. A key whose spec already has a `depends` on a sibling key that is not `done` is not started; report it `BLOCKED: depends on <DEP> — rerun /{{prefix}}runit <KEY> after <DEP> is merged`. Full automation with dependencies is `/{{prefix}}shipit` with specs written beforehand.

`runit` with `mode: sequential` (git or `worktree` disabled) follows dependencies, never the order the keys were given: pass `--depends` as above and run the keys as the `sequential` bullet below says. When the *Dependency gate* in `runit` stops a key on a sibling key that is not `done` yet, that stop is not dropped: add `--depends KEY:DEP` and the key goes to `waiting` and runs again later in this session from the written spec.

```text
.seh/scripts/fanout-plan --skill <name> --keys <K1,K2,...> [--variant review] [--depends KEY:DEP,...] [--done <k,...>] [--running <k,...>] [--max <n>]
```

Output: `OK`, then `mode`, `max`, `ready` (comma list, may be empty), and optional `waiting`, `blocked`, `queued`, `stuck` lines. `BLOCKED: ...` means fix the arguments and retry.

- `mode` is `parallel`, or `sequential` (with `max: 1`) when git is disabled (`agents.baseBranch` empty) or the `worktree` operation is off in `agents.git`. On `sequential`, do not start sessions: run the keys one after another in this session, in the planner's order, never in the order the keys were given. Run the one `ready` key, then call the planner again: a key that finished goes to `--done`; a key that stopped on `BLOCKED:` is dropped from `--keys` together with its own `--depends` entries (its dependents then report `blocked`). A `Q<n>` is asked in this session: wait for the user's answer and continue the same key; it is not dropped. Git or `worktree` disabled means `sequential` on every host, `manual` included: no sessions, no `start-task`, no `Worktree:` line.
- Default `--max 4`. Above that, ask the user first.

## 3. Start sessions (desktop app host)

Only when `sessionSpawn` is `start_session`. For each key in `ready`, one `mcp__ccd_session__start_session` call:

- `initiation`: `user_asked` (the user asked for the fan-out)
- `context`: `fresh`
- `use_worktree`: `false`
- `cwd`: not passed. The app refuses a worktree path as `cwd` (observed: `cwd` under `.git/seh-worktrees/` is not in `list_start_targets`). The child starts in the launch checkout and works in the worktree named by the `Worktree:` line.
- `title`: `<skill> <KEY>` (under 60 chars)
- `prompt`: exactly these lines, in this order, and nothing else: the skill invocation for one key, for example `/{{prefix}}doit MT-01`; `Mode: <mode>`; `Conversation language: <language of the user's messages in this session, e.g. German>` (required: without it the child answers in a language of its own choice); `Fan-out child: yes` (marker, required); for a `doit` or `checkit` key only, `Worktree: <abs>`; for a `shipit` key, `/{{prefix}}runit <KEY>` as the invocation and a final `Auto-merge: yes` line (no `Worktree:`). Do not add folders, notes files, shared paths, or extra instructions to the prompt. Context for the child goes in `background` only.
- `Mode:` comes from the user's words, not a default. If the user asked for independent work (in any language, for example "don't ask me", `autonomous`), `autonomous`: no questions, a clean Reviewer run is acceptance and the feature ends with the PR. Otherwise `interactive`.
- `background`: at least 80 characters: the parent's goal, that this session is one of N parallel keys, the sibling keys, and what done looks like for this key.
- `model`: optional. The role model for this skill's main role from `harness.config.json` → `agents.roles.<role>.model["<host id>"]` (`architect` for planit, `implementer` for doit and runit, `reviewer` for checkit). Pass it only when the app accepts it; if the app ignores it, the child runs on the session's model.
- `wake_when_done`: `true`

**Prompt check (before every `start_session` call).** Write the prompt as a list of lines and check each line against this list: the skill invocation, `Mode: …`, `Conversation language: …`, `Fan-out child: yes`, `Worktree: …` (doit and checkit only), and `Auto-merge: yes` (`shipit` only; never for another skill). Any other line, including a shared folder, notes file, path, or extra instruction, is deleted before the call. Nothing is written to a file or folder outside the spawn itself. If a required line cannot be filled, do not spawn that key; report `BLOCKED: fan-out prompt incomplete for <KEY> — <missing line>`.

Do not start sessions for keys in `waiting`, `blocked`, or `queued`.

For `manual` (other hosts, Codex included: it has no host API to start a session): print one block per ready key with the exact command to run in a new session, and stop. Each command carries the user's mode words from this request (for example `/{{prefix}}runit MT-01 don't ask me`), so the new session runs in the same mode. Do not guess a host API.

## 4. Per-skill placement

| Skill | Placement | Notes |
|---|---|---|
| `/{{prefix}}planit` | launch checkout, `use_worktree: false` | Architect is spec-only, no git. Parallel specs must write disjoint files. |
| `/{{prefix}}doit` | worktree from `.seh/scripts/start-task <KEY>` run by the parent; child starts in the launch checkout | Parent runs `start-task` before spawning. Prompt carries `Worktree: <abs>`. The child cds there. |
| `/{{prefix}}checkit` review or update | as `/{{prefix}}doit` | Safe in parallel. |
| `/{{prefix}}runit` | Architect in launch checkout; Implementer and Reviewer in the worktree | One key per session by definition. |
| `/{{prefix}}shipit` | as `/{{prefix}}runit` (child runs `/{{prefix}}runit <KEY>`); no `Worktree:` line | Child prompt carries `Auto-merge: yes`. Parent never runs `start-task`. |

Do not use app-created worktrees (`use_worktree: true`) for seh tasks: they would sit outside `seh-worktrees/<task>`.

## 5. Between waves

When woken, read `list_sessions` / `get_session` for each started key. A key that finished is added to `--done`, a key still running to `--running`. A session that waits on the user (open `Q<n>`, interactive acceptance) counts as running. A session that ended on a final `BLOCKED:` did not finish: drop the key from `--keys` with its own `--depends` entries (its dependents then report `blocked`). `shipit`: a key finishes for dependents only when `.seh/scripts/pr-state <KEY>` prints `state: merged`; a child that ended on a final `BLOCKED:` without a merged PR is dropped from `--keys` (its dependents then report `blocked`); a child waiting on the user is still running. Call the planner again with those lists and start the next `ready` keys.

Stop the whole fan-out and report when `ready` is empty and no session is running or waiting on the user. When only waiting sessions remain, end this turn with the interim table; a later wake continues.

## 6. Report

One table: key, session link (`[title](#local_<id>)`), state (done, `BLOCKED: ...`, `Q<n>`, waiting, queued). Do not relay `Q<n>` answers: the user answers in that session. In `autonomous` mode the report asks nothing: no follow-up question, no choice buttons.

## Rules

- Children never spawn children. A session whose prompt has the line `Fan-out child: yes` runs exactly its one key in place: it never runs this procedure and never calls `start_session`. Subagents (Architect, Designer, Implementer, Consultant, Reviewer, brainstorm personae launched as subagents) are not sessions and are allowed inside a child, as in a normal single-key run.
- The parent does not do the children's work and does not merge PRs.
- Run only the skill the user named. The parent never starts another skill's session, for example `planit` for a missing spec. For `doit`, `checkit` and `shipit` a missing spec or prompt is `BLOCKED` for that key, with the one-line fix (`run /{{prefix}}planit <KEY> first`). `planit` writes the spec in its child. `runit` is the other exception: the child starts at the first missing stage, so a key with no spec runs Architect inside the child (the parent still never starts `planit`).
- `runit` with `mode: parallel`, `depends` between sibling keys found by a child's Architect: the child stops after the Architect stage with `BLOCKED: depends on <KEY> — rerun /{{prefix}}runit <this key> after <KEY> is merged` (spec stays `todo`). The parent lists it in the report table; there is no waiting, no side channel, and no new wave (same for a `depends` already in the spec, see section 2). The rerun reuses the written spec.
- A child's `BLOCKED:` or `Q<n>` does not stop siblings.
- A disabled tracker action or git operation runs only on the user's explicit request, made in the session that does it. The parent never adds `--user-request` and never adds a line to a child prompt for it.
- Children share no notes folder and no side channel. The parent does not create one. Coordination goes through the user and the repo's own tracker files.
- Shared files (tracker, log, status) written by parallel children need the skill's own locking or per-key files; a shared-file collision is a stop for that key, not a silent overwrite.
