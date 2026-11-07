---
name: dhs-checkit
description: This skill should be used when the user invokes /dhs-checkit or asks to review one implemented task without the whole path. It launches the project's reviewer for one review round, reports the result, and offers the next step without launching it.
harness: dev-harness
---

# Review one task with the reviewer

Read `references/launch.md` first. It holds the shared launch rules: the start checks, the task state, what a launch contains, the languages, the `[<short key>]` prefix, the modes and the stops. Follow them.

This skill launches exactly one agent, the project's reviewer, for one task and runs one review round, with no loop. It does not write the review or the feature files itself. Acceptance stays with the reviewer, as its mode allows.

## Entry checks

Do not launch in these cases. Report and point to the skill:

- No implementation: point to `/dhs-doit`, or `/dhs-fixit` for a bug.
- The status is the in-review status or the done status: stop, the review already passed. This check does not apply in the update mode and in the close mode.

## Scope line

Print the scope line from `references/launch.md` "Announce and launch" with `<stages>` = `reviewer`, `reviewer (update from base)` in the update mode or `reviewer (close task)` in the close mode. `<condition>` is `review report`, `user acceptance` in `Mode: interactive`, or `pull request` when step 6 runs. The run-mode token from `references/launch.md` "Mode" applies and combines with `update` and `close`, for example `/dhs-checkit 022 close auto`.

## Launch

Launch the reviewer once, with the mode, the language lines, the task and the decisions already recorded. Use a description such as `[015] review`.

## Update mode

`/dhs-checkit <PR|task> update` brings the pull request branch up to date with the base. It runs the reviewer's "Update from base" once and no review round.

- The argument is a PR number (`#11` or `11`) or a task key or basename, followed by `update`.
- A PR number: run `gh pr view <n> --json headRefName,baseRefName,state`. A task key: derive the task branch from the basename or key, then run `gh pr list --head <branch> --json number,baseRefName,state`.
- Stop and report when the PR is not open, or when its base is not `agents.baseBranch` (the update always merges `agents.baseBranch`).
- Find the worktree of the branch with `git worktree list` and pass `Worktree: <path>` to the reviewer. When there is none, say so in the launch; the reviewer then follows "Update from base" (`dhs agent worktree add`, then continues in the printed path).
- The in-review and done status checks do not apply. The check for no implementation still applies.
- The launch names "Update from base" explicitly, with the task, the branch, the PR number and the worktree path. Run the reviewer once, with no review round.
- Report the reviewer's merge result (merge commit, conflicted files, verification, final branch) in one message. Offer no next step.

## Close mode

`/dhs-checkit <task|PR> close` marks a merged task as done. It runs the reviewer's "Close task" once and no review round.

- The argument is a task key or basename, or a PR number (`#11` or `11`), followed by `close`.
- Close mode is also reached by intent, in any language and any wording: the message names a task (key, basename, number prefix) or a PR number and says that its pull request was merged or done. The examples are not a list to match: `/dhs-checkit PR 030 został wykonany`, `/dhs-checkit 030 was merged`, `/dhs-checkit zmergowałem #31`. In that case the launch adds `User decision: PR merged — scope: <task> merge-confirmed`. The run-mode token still combines with it.
- A message that names no task or PR, or that says the PR is not merged yet, is not a close request: ask which task, or run the normal mode.
- A PR number: run `gh pr view <n> --json headRefName`, then derive the task from the branch. A task: derive the task branch from the basename or key. Pass the PR number when it is known.
- The in-review and done checks of the entry do not apply. Read the task status. When it is the done status, report "already closed" and do not launch. When it is neither the in-review status nor the done status, report the status and do not launch.
- The launch names "Close task" explicitly, with the task, the branch and the PR number when known. When the user said the PR is merged, pass `User decision: PR merged — scope: <task> merge-confirmed`. Run the reviewer once.
- Report the reviewer's result in one message: the commit (local mode) or the transition (tracker mode), and the push result when the commit is local; the push command for the user (`git push <remote> <base>`) only when the reviewer did not push. Launch no next step.

## Report

Report the reviewer's result in one message: the ✅, ❌ and ⚠️ items. Offer the next step and do not launch it. After open ❌ items: `/dhs-doit`, or `/dhs-fixit` for a bug. After a clean review: nothing. This skill does not chain. `/dhs-feature` runs the whole path.
