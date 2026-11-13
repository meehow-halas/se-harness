# Session fan-out

Shared procedure for work skills (`/{{prefix}}planit`, `/{{prefix}}doit`, `/{{prefix}}checkit`, `/{{prefix}}shipit`) when the user names **two or more** keys. One key = run the skill in this session as before.

Planner: `.seh/scripts/fanout-plan`. Host adapter: `sessionSpawn` in `.seh/references/hosts.json` for this host.

## 1. Guard and resolve (parent, once)

- Run the skill's own guard first (unchanged).
- Resolve each key (spec, status, `depends`) as the skill does for one key. Keys whose spec is missing are `BLOCKED` for that key only.

## 2. Plan

Call the planner. Pass `--depends KEY:DEP` only for dependencies between keys in this invocation. A dependency on a key outside the invocation must already be `done` (pass it in `--done`), or that key stays blocked.

```text
.seh/scripts/fanout-plan --skill <name> --keys <K1,K2,...> [--variant review|update] [--depends KEY:DEP,...] [--done <k,...>] [--running <k,...>] [--max <n>]
```

Output: `OK`, then `mode`, `max`, `ready` (comma list, may be empty), and optional `waiting`, `blocked`, `queued`, `stuck` lines. `BLOCKED: ...` means fix the arguments and retry.

- `mode` is `parallel`, or `sequential` (with `max: 1`) when git is disabled (`agents.baseBranch` empty). On `sequential`, do not start sessions: run the keys one after another in this session.
- Default `--max 4`. Above that, ask the user first.

## 3. Start sessions (desktop app host)

Only when `sessionSpawn` is `start_session`. For each key in `ready`, one `mcp__ccd_session__start_session` call:

- `initiation`: `user_asked` (the user asked for the fan-out)
- `context`: `fresh`
- `use_worktree`: `false`
- `cwd`: not passed. The app refuses a worktree path as `cwd` (observed: `cwd` under `.git/seh-worktrees/` is not in `list_start_targets`). The child starts in the launch checkout and works in the worktree named by the `Worktree:` line.
- `title`: `<skill> <KEY>` (under 60 chars)
- `prompt`: exactly these lines, in this order, and nothing else: the skill invocation for one key, for example `/{{prefix}}doit MT-01`; `Mode: <mode>`; `Conversation language: <language of the user's messages in this session, e.g. Polish>` (required: without it the child answers in a language of its own choice); `Fan-out child: yes` (marker, required); for a `doit` or `checkit` key only, `Worktree: <abs>`. Do not add folders, notes files, shared paths, or extra instructions to the prompt. Context for the child goes in `background` only.
- `Mode:` comes from the user's words, not a default. If the user asked for independent work (for example `samodzielnie`, `autonomous`, `bez pytań`), `autonomous`: no questions, a clean Reviewer run is acceptance and the feature ends with the PR. Otherwise `interactive`.
- `background`: at least 80 characters: the parent's goal, that this session is one of N parallel keys, the sibling keys, and what done looks like for this key.
- `model`: optional. The role model for this skill's main role from `harness.config.json` → `agents.roles.<role>.model["<host id>"]` (`architect` for planit, `implementer` for doit and shipit, `reviewer` for checkit). Pass it only when the app accepts it; if the app ignores it, the child runs on the session's model.
- `wake_when_done`: `true`

**Prompt check (before every `start_session` call).** Write the prompt as a list of lines and check each line against this list: the skill invocation, `Mode: …`, `Conversation language: …`, `Fan-out child: yes`, and `Worktree: …` (doit and checkit only). Any other line, including a shared folder, notes file, path, or extra instruction, is deleted before the call. Nothing is written to a file or folder outside the spawn itself. If a required line cannot be filled, do not spawn that key; report `BLOCKED: fan-out prompt incomplete for <KEY> — <missing line>`.

Do not start sessions for keys in `waiting`, `blocked`, or `queued`.

For `manual` (other hosts): print one block per ready key with the exact command to run in a new session, and stop. Do not guess a host API.

## 4. Per-skill placement

| Skill | Placement | Notes |
|---|---|---|
| `/{{prefix}}planit` | launch checkout, `use_worktree: false` | Architect is spec-only, no git. Parallel specs must write disjoint files. |
| `/{{prefix}}doit` | worktree from `.seh/scripts/start-task <KEY>` run by the parent; child starts in the launch checkout | Parent runs `start-task` before spawning. Prompt carries `Worktree: <abs>`. The child cds there. |
| `/{{prefix}}checkit` review or update | as `/{{prefix}}doit` | Safe in parallel. |
| `/{{prefix}}shipit` | Architect in launch checkout; Implementer and Reviewer in the worktree | One key per session by definition. |

Do not use app-created worktrees (`use_worktree: true`) for seh tasks: they would sit outside `seh-worktrees/<task>`.

## 5. Between waves

When woken, read `list_sessions` / `get_session` for each started key. A key that finished is added to `--done`, a key still running to `--running`. Call the planner again with those lists and start the next `ready` keys.

Stop the whole fan-out and report when `ready` is empty and nothing is running.

## 6. Report

One table: key, session link (`[title](#local_<id>)`), state (done, `BLOCKED: ...`, `Q<n>`, waiting, queued). Do not relay `Q<n>` answers: the user answers in that session.

## Rules

- Children never spawn children. A session whose prompt has the line `Fan-out child: yes` runs exactly its one key in place: it never runs this procedure and never calls `start_session`. Subagents (Architect, Implementer, Consultant, Reviewer, brainstorm personae launched as subagents) are not sessions and are allowed inside a child, as in a normal single-key run.
- The parent does not do the children's work and does not merge PRs.
- Run only the skill the user named. The parent never starts another skill's session, for example `planit` for a missing spec. A missing spec or prompt is `BLOCKED` for that key, with the one-line fix (`run /{{prefix}}planit <KEY> first`).
- A child's `BLOCKED:` or `Q<n>` does not stop siblings.
- Children share no notes folder and no side channel. The parent does not create one. Coordination goes through the user and the repo's own tracker files.
- Shared files (tracker, log, status) written by parallel children need the skill's own locking or per-key files; a shared-file collision is a stop for that key, not a silent overwrite.
