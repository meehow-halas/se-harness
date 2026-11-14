# Prompt — implementation-plan stage 10: Parallel worktrees

Implement stage `10` of `docs/implementation-plan` only. Requires stages `02`, `04`, `06` = `done`. Historical stage: status `done` in the original plan.

## Repo context

- Repo `se-harness`. Git helpers are POSIX `sh` in `scripts/`. No new CLI subcommands (`seh worktree` is out). No fifth agent, no new skill.
- Worktrees live at `$(git rev-parse --git-common-dir)/seh-worktrees/<task>`. The primary checkout is never switched.
- Architect uses no git and no worktrees.
- Read `docs/prd.md` first (Git, Agents, Skills `doit` / `checkit` / `shipit`, Stops, Decisions 2, 9, 20).
- Versioning: shipped dirs → version bump in the same change (CLAUDE.md).

## Stage spec

### Goal

Implementer and Reviewer always work in a git worktree for the task. `doit` and `checkit` accept a list of tasks and run in parallel when the runtime allows.

### Scope in

- `start-task`: create or reuse the worktree; reuse an existing checkout of the task branch (`UNCHANGED`, still prints `worktree:`); else `git worktree add` (`-b` from `agents.baseBranch` when new; existing local branch; or from `origin/<task>`); dirty primary is not a stop. Copy file-tracker files for the key from launch toplevel into the worktree; then drop this task's uncommitted copies on launch (untracked → delete; tracked dirty → restore; tracked clean → leave). `ln -s` `.seh/` and `harness.config.json` into the worktree when missing and present in launch. Success: `OK` or `UNCHANGED`, `branch:`, `base:`, `created:`, `worktree:`.
- `return-to-base`: from a seh worktree → unlink launch-only symlinks, `git worktree remove` when clean (dirty → `BLOCKED:`); from primary already on base → `UNCHANGED`; from primary on another branch → checkout base (legacy).
- Implementer and Reviewer: `Worktree:` payload. Architect unchanged.
- `doit` / `checkit`: one or many keys; parent resolves keys, `start-task` per task, passes `Worktree:`; N>1 in parallel when allowed; unmet `depends` blocks only that task.
- `shipit`: one task; list → `BLOCKED: /<prefix>shipit is one task — spec with /<prefix>planit, then /<prefix>doit with the list`.
- `references/AGENTS.md` git table and worktree notes; `references/BLOCKED.md` dirty-worktree and feature-list entries.

### Scope out

- `seh worktree` / `seh agent`. Fifth agent. `/seh-parallel`. Auto-merge. Windows `sh`. Copying `node_modules` or `.env`. Architect worktrees.

### Acceptance criteria

- `start-task` leaves the caller's branch unchanged and prints `worktree:`.
- Two `start-task` calls for different keys → two worktrees; primary stays put.
- Dirty primary does not block `start-task`.
- Launch-only file-tracker files appear in the worktree; uncommitted copies gone from launch.
- `return-to-base` from the worktree removes it; primary stays on its previous branch.
- Implementer/Reviewer mention `Worktree:`; Architect still forbids worktrees.
- `doit` and `checkit` describe a task list; `shipit` refuses a list.
- `npm test` passes.

### Tests

- `scripts/*.test.js` with real temp git repos.

### Depends on

- 02, 04, 06 = `done`.

## Constraints

- Do not commit unless the user asks. Do not overwrite uncommitted worktree content. Do not touch `.env` files.
- Ask one question at a time; recommended option first, labelled **(Recommended)**.

## Definition of done

- Acceptance criteria PASS with `npm test` output quoted; report changed files and deviations.
