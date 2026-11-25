# 03 — Git scripts

## Goal

Each git script honours its op in `agents.git` the same way all of them honour empty `agents.baseBranch` today.

## Scope

In:
- `scripts/lib.sh`: `git_op_enabled <op>` (missing `agents.git` = all `true`; an op is effective only when every op before it is `true`).
- `start-task` (`worktree`), `commit-task` (`commit`), `push-task` (`push`), `open-pr` and `merge-pr` (`pr`): op OFF → `UNCHANGED`, `git: <op> disabled`, exit 0, no git / `gh` write. `start-task` OFF prints `worktree: <launch checkout>`.
- `return-to-base`: dirty worktree with `commit` OFF → `UNCHANGED`, `worktree: <abs>`, `branch: <task>` (no removal).
- `fanout-plan`: `worktree` OFF → sequential, max 1 (as git disabled).
- `CHANGELOG.md` `[2.0.0]` lines.

Out: `pr-state`, `update-from-base` (only reached with all ops ON), `record-change`: unchanged. Tracker scripts, skills, agents.

## Decisions

Q2.

## Detailed plan

| Op OFF | Script | Effect |
|--------|--------|--------|
| `worktree` | `start-task` → `UNCHANGED`, `git: worktree disabled`, `worktree: <launch checkout>` | Work in launch checkout, sequential, no fan-out (as git disabled). `pr-state` still works (read). |
| `commit` | `commit-task` → `UNCHANGED`, `git: commit disabled` | Accepted changes stay uncommitted in the worktree; `return-to-base` leaves the dirty worktree; Reviewer prints its path and branch. `record-change` still writes `CHANGELOG.md` when `reportChange` is `true`. |
| `push` | `push-task` → `UNCHANGED`, `git: push disabled` | Commit stays local. |
| `pr` | `open-pr`, `merge-pr` → `UNCHANGED`, `git: pr disabled` | Branch pushed, no PR. |

"Done" = accepted + every enabled op finished. `/<prefix>shipit` with any op OFF: `BLOCKED: /<prefix>shipit needs worktree, commit, push and pr enabled — change them in /<prefix>setit-se`.

## Acceptance criteria

- [ ] Per script: op OFF → `UNCHANGED` + `git: <op> disabled`, git refs and remote state unchanged (assert refs, not only output).
- [ ] Chain: `commit: false, push: true` → `push-task` also disabled.
- [ ] Op ON with a later op OFF: the earlier script still acts (commit created, nothing pushed).
- [ ] `return-to-base` keeps a dirty worktree with `commit` OFF.
- [ ] `fanout-plan` is sequential with `worktree` OFF.
- [ ] Missing `agents.git` with base branch set: full flow as before (existing tests green).

## Verification

`node --test` on each touched `scripts/*.test.js`.

## Files / materials

`scripts/`, `CHANGELOG.md`

## Depends on

02 (`done`)
