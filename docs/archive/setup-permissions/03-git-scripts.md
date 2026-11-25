# 03 — Git scripts

## Goal

Each git script honours its op in `agents.git` the same way all of them honour empty `agents.baseBranch` today.

## Scope

In:
- `scripts/lib.sh`: `git_op_enabled <op>` (missing `agents.git` = all `true`; an op is effective only when every op before it is `true`).
- `start-task` (`worktree`), `commit-task` (`commit`), `push-task` (`push`), `open-pr` and `merge-pr` (`pr`): op OFF without `--user-request` → `UNCHANGED`, `git: <op> disabled`, exit 0, no git / `gh` write. `start-task` OFF prints `worktree: <launch checkout>`.
- `--user-request "<words>"` on `start-task`, `commit-task`, `push-task`, `open-pr` (see Explicit user request).
- `docs/prd.md`, `references/AGENTS.md`, `references/harness.config.md`: add the explicit user request rule for git operations; drop "do not do that step another way" where it forbids a requested run (Q16).
- `return-to-base`: dirty worktree with `commit` OFF → `UNCHANGED`, `worktree: <abs>`, `branch: <task>` (no removal).
- `fanout-plan`: `worktree` OFF → sequential, max 1 (as git disabled).
- `CHANGELOG.md` `[2.0.0]` lines.

Out: `pr-state`, `update-from-base` (only reached with all ops ON), `record-change`: unchanged. Tracker scripts, skills, agents.

## Decisions

Q2, Q12, Q14, Q16.

## Detailed plan

| Op OFF | Script | Effect |
|--------|--------|--------|
| `worktree` | `start-task` → `UNCHANGED`, `git: worktree disabled`, `worktree: <launch checkout>` | Work in launch checkout, sequential, no fan-out (as git disabled). `pr-state` still works (read). |
| `commit` | `commit-task` → `UNCHANGED`, `git: commit disabled` | Accepted changes stay uncommitted in the worktree; `return-to-base` leaves the dirty worktree; Reviewer prints its path and branch. `record-change` still writes `CHANGELOG.md` when `reportChange` is `true`. |
| `push` | `push-task` → `UNCHANGED`, `git: push disabled` | Commit stays local. |
| `pr` | `open-pr`, `merge-pr` → `UNCHANGED`, `git: pr disabled` | Branch pushed, no PR. |

"Done" = accepted + every enabled op finished. `/<prefix>shipit` with any op OFF: `BLOCKED: /<prefix>shipit needs worktree, commit, push and pr enabled — change them in /<prefix>setit-se`.

### Explicit user request (Q12)

OFF means seh does not do it automatically where it normally would. On the user's explicit request seh still does it.

- The guarded script takes `--user-request "<the user's words>"`, which lifts the `agents.tracker.write` / `agents.git` guard for that call only. Empty value → `BLOCKED:`. **(A: flag name)**
- The words come from the user in this session, or from a launch line that carries them verbatim. seh never adds the flag for its own steps, in any mode. **(A)**
- Git (Q14): applies to `start-task`, `commit-task`, `push-task`, `open-pr`; the flag runs that one operation even when an earlier one in the chain is OFF. It does not override git disabled (empty `agents.baseBranch`), does not change who may merge (`merge-pr` only on a `/<prefix>shipit` run), and does not satisfy the `/<prefix>shipit` requirement. **(A)**

## Acceptance criteria

- [ ] Per script: op OFF → `UNCHANGED` + `git: <op> disabled`, git refs and remote state unchanged (assert refs, not only output).
- [ ] Chain: `commit: false, push: true` → `push-task` also disabled.
- [ ] Op ON with a later op OFF: the earlier script still acts (commit created, nothing pushed).
- [ ] `return-to-base` keeps a dirty worktree with `commit` OFF.
- [ ] `fanout-plan` is sequential with `worktree` OFF.
- [ ] Missing `agents.git` with base branch set: full flow as before (existing tests green).
- [ ] Per flagged script: op OFF with `--user-request` acts (assert refs / `gh` argv); empty words → `BLOCKED:`, nothing changed.
- [ ] The flag with empty `agents.baseBranch` still answers `git: disabled`; `merge-pr` with `pr` OFF stays disabled.
- [ ] PRD and `references/` state the explicit user request rule for git operations.

## Verification

`node --test` on each touched `scripts/*.test.js`.

## Files / materials

`scripts/`, `docs/prd.md`, `references/`, `CHANGELOG.md`

## Depends on

02 (`done`)
