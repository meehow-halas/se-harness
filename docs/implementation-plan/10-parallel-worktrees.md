# Phase 10 — Parallel worktrees

## Goal

Implementer and Reviewer always work in a git worktree for the task so the user’s primary checkout is not switched. `/dhs-doit` and `/dhs-checkit` accept a list of tasks and run in parallel when the runtime allows. Architect stays independent. No fifth agent and no new skill.

## In scope

- `start-task` creates or reuses `$(git rev-parse --git-common-dir)/dhs-worktrees/<task>` and does not switch the caller.
- `return-to-base` removes a dhs worktree when invoked from one; legacy checkout of base from the primary checkout.
- File-tracker copy from the launch working tree; symlink `.dhs/` and `harness.config.json` when missing in the worktree.
- Implementer and Reviewer: `Worktree:` payload; Architect still no git / no worktrees.
- `/dhs-doit` and `/dhs-checkit`: one or many keys; per-task `depends` / `Q<n>`.
- `/dhs-feature`: one task; a list is `BLOCKED:`.

## Out of scope

- Extra CLI (`dhs worktree`, `dhs agent`).
- A fifth product agent or `/dhs-parallel`.
- Auto-merge, Windows `sh`, copying `node_modules` / `.env`.
- README sync unless the user asks.
- Architect using worktrees.

## Inputs

- PRD: Git; Agents (Implementer, Reviewer, Architect); Skills `/dhs-doit`, `/dhs-checkit`, `/dhs-feature`; Stops; Decisions 2, 9, 20.

## Outputs

| Path | What |
|------|------|
| `scripts/start-task` | worktree add/reuse; `worktree: <abs>`; tracker copy |
| `scripts/return-to-base` | remove dhs worktree, or checkout base on primary |
| `scripts/lib.sh` | shared worktree helpers |
| `scripts/*.test.js` | caller stays on previous branch; scripts that need the task run in the worktree |
| `agents/implementer.md` | `Worktree:`; drop “No worktrees” |
| `agents/reviewer.md` | `Worktree:`; `return-to-base` removes worktree |
| `agents/architect.md` | still no worktrees |
| `skills/dhs-doit/SKILL.md` | list of tasks; parallel when allowed |
| `skills/dhs-checkit/SKILL.md` | list; one variant; parallel when allowed |
| `skills/dhs-feature/SKILL.md` | one task; worktree for Implementer/Reviewer |
| `references/AGENTS.md` | Git table + worktree |
| `references/BLOCKED.md` | dirty worktree / feature list |
| `docs/prd.md` | already the spec for this phase |

## Behaviour

### `start-task`

- Path: `$(git rev-parse --git-common-dir)/dhs-worktrees/<task>`.
- If `<task>` is already checked out in some worktree (including the caller already on that branch), reuse it. `UNCHANGED` when that checkout is already the worktree in use; still print `worktree:`.
- Else `git worktree add` (`-b` from `agents.baseBranch` when the branch is new; existing local branch; or `-b` from `origin/<task>`).
- Do not `git checkout` in the caller. A dirty primary checkout is not a stop.
- Copy `docs/features|prompt|feature-log/<task>.*` from the launch toplevel into the worktree when those files exist in the launch tree.
- If the worktree lacks `.dhs/` or `harness.config.json` and the launch tree has them, `ln -s`.
- Success: `OK` or `UNCHANGED`, `branch:`, `base:`, `created:`, `worktree:`.

### `return-to-base`

- From a path under `dhs-worktrees/`: unlink launch-only `.dhs` / `harness.config.json` symlinks, then `git worktree remove` when clean. Do not switch the primary checkout. Dirty → `BLOCKED:`.
- From the primary checkout already on base → `UNCHANGED`.
- From the primary checkout on another branch → `git checkout` base (legacy).

### Skills

Parent session: resolve keys, `start-task` per task, pass `Worktree:` to the child. N>1 in parallel when the runtime allows; otherwise sequential worktrees. Unmet `depends` blocks that task only. `/dhs-checkit` one variant for the invocation. `/dhs-feature` with multiple keys:

```text
BLOCKED: /dhs-feature is one task — spec with /dhs-planit, then /dhs-doit with the list
```

## Done when

- `start-task` leaves the caller’s branch unchanged and prints `worktree:`.
- Two `start-task` calls for different keys produce two worktrees; the primary checkout stays put.
- Dirty primary does not block `start-task`.
- File-tracker files present only on the launch tree appear in the worktree.
- `return-to-base` from the worktree removes it and leaves the primary checkout on its previous branch.
- Implementer/Reviewer markdown mention `Worktree:`; Architect still forbids worktrees.
- `/dhs-doit` and `/dhs-checkit` describe a task list; `/dhs-feature` refuses a list.
- `npm test` passes.
- Phase 10 Status in the index is set to `done` only after this checklist is true.
