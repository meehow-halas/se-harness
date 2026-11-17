# 10 — Parallel worktrees

## Goal

Implementer and Reviewer always work in a git worktree for the task, so the user's primary checkout is not switched. `/<prefix>doit` and `/<prefix>checkit` accept a list of tasks and run in parallel when the runtime allows. Architect stays independent. No fifth agent, no new skill.

## Scope in

- `start-task` creates or reuses `$(git rev-parse --git-common-dir)/seh-worktrees/<task>` and does not switch the caller. Reuses an existing checkout of the task branch (`UNCHANGED`, still prints `worktree:`). Otherwise `git worktree add` (`-b` from `agents.baseBranch` when new; existing local branch; or from `origin/<task>`). A dirty primary checkout is not a stop.
- File-tracker files for the key are copied from the launch toplevel into the worktree; then this task's uncommitted copies on launch are dropped (untracked → delete; tracked dirty → restore; tracked clean → leave). Other dirty files stay.
- If the worktree lacks `.seh/` or `harness.config.json` and the launch tree has them: `ln -s`.
- Success: `OK` or `UNCHANGED`, `branch:`, `base:`, `created:`, `worktree:`.
- `return-to-base`: from a path under `seh-worktrees/` unlink launch-only symlinks, then `git worktree remove` when clean (dirty → `BLOCKED:`). From primary already on base → `UNCHANGED`. From primary on another branch → `git checkout` base (legacy).
- Implementer and Reviewer receive a `Worktree:` payload. Architect still uses no git and no worktrees.
- `/<prefix>doit` and `/<prefix>checkit` take one or many keys; parent resolves keys, runs `start-task` per task, passes `Worktree:` to each child; unmet `depends` blocks only that task.
- `/<prefix>shipit` takes one task. A list is refused: `BLOCKED: /<prefix>shipit is one task — spec with /<prefix>planit, then /<prefix>doit with the list`.

## Scope out

- Extra CLI (`seh worktree`, `seh agent`). A fifth agent or `/seh-parallel`.
- Auto-merge, Windows `sh`, copying `node_modules` or `.env`. Architect using worktrees.

## Decisions taken

- Worktrees under the git common dir; primary checkout is never switched.
- Never overwrite uncommitted worktree content (rule from later findings).

## Files likely touched

- `scripts/start-task`, `scripts/return-to-base`, `scripts/lib.sh`, `scripts/*.test.js`, `agents/implementer.md`, `agents/reviewer.md`, `skills/doit/`, `skills/checkit/`, `skills/shipit/`, `references/AGENTS.md`, `references/BLOCKED.md`

## Acceptance criteria

- `start-task` leaves the caller's branch unchanged and prints `worktree:`.
- Two `start-task` calls for different keys produce two worktrees; the primary checkout stays put.
- A dirty primary does not block `start-task`.
- File-tracker files present only on the launch tree appear in the worktree; uncommitted copies of those paths are gone from launch.
- `return-to-base` from the worktree removes it and leaves the primary on its previous branch.
- Implementer and Reviewer markdown mention `Worktree:`; Architect still forbids worktrees.
- `doit` and `checkit` describe a task list; `shipit` refuses a list.

## Tests

- `scripts/*.test.js` with real git temp repos; `npm test`.

## Versioning

Not recorded in the legacy plan.

## Depends on

- 02, 04, 06 = `done`.
