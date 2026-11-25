# 03 — git scripts

## Goal

Each git script honours its op in `agents.git` the same way all of them honour empty `agents.baseBranch` today.

## Scope in

- `scripts/lib.sh`: `git_op_enabled <op>` (missing `agents.git` = all `true`; chain enforced: an op is effective only when every op before it is `true`).
- `start-task` (`worktree`), `commit-task` (`commit`), `push-task` (`push`), `open-pr` and `merge-pr` (`pr`): op OFF → `UNCHANGED`, `git: <op> disabled`, exit 0, no git/`gh` call. `start-task` OFF prints `worktree: <launch checkout>`.
- `return-to-base`: dirty worktree with `commit` OFF → `UNCHANGED`, `worktree: <abs>`, `branch: <task>` (no removal).
- `fanout-plan`: `worktree` OFF → sequential plan (as git disabled).
- `pr-state`: unaffected.

## Acceptance criteria (tests)

- Per script: op OFF → `UNCHANGED` + `git: <op> disabled`, git ref and remote state unchanged (assert refs, not output only).
- Chain: `commit: false, push: true` → `push-task` also disabled.
- Op ON with a later op OFF: earlier script still acts (e.g. commit created, nothing pushed).
- Missing `agents.git` with base branch set: full flow as before (existing tests stay green).
