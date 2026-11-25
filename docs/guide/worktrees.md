# Git worktrees

With git enabled, each task is built and reviewed in its own git worktree: a separate folder on the task branch. Your own checkout is never switched, so you can keep working while SE Harness builds and reviews the task, and several tasks can run at once.

Git disabled (empty `agents.baseBranch`) or the `worktree` [operation](setup.md#git-operations) off: no worktree, agents work in your checkout, one task after another. See [Git and language](setup.md#git-and-language). You can still [ask for a worktree](setup.md#on-your-request) when only the operation is off.

## Where

`$(git rev-parse --git-common-dir)/seh-worktrees/<task>`. For `~/projects/my-app` and task `001-login` that is `~/projects/my-app/.git/seh-worktrees/001-login`. The branch is named after the task key.

## Lifecycle

| Step | Who | What happens |
| --- | --- | --- |
| Create | `start-task` (Implementer; parent of `/_doit`, `/_runit`, `/_checkit`; Reviewer if missing) | Creates the worktree on `<task>` from the base branch, or reuses it, or attaches an existing local or remote `<task>` branch. Symlinks `.seh/` and `harness.config.json` when the branch lacks them. Safe to call again. |
| Work | Implementer, Consultant, Reviewer | All code changes, commits and the PR come from the worktree. |
| Remove | `return-to-base` (Reviewer, last step) | Drops the symlinks and runs `git worktree remove`. The task branch stays, locally and on the remote. Your checkout is not switched. |

The Architect and Designer never use a worktree; they write in your checkout.

## When it is removed

The Reviewer calls `return-to-base` after the last enabled git operation succeeded (also when the PR already existed). In a `/_shipit` session, where the Reviewer merges the PR, it calls it after the merge, or after the merge finally fails, if the worktree is clean.

The same applies to `/_runit`, `/_shipit` and `/_checkit`: they all end with the Reviewer.

## When it stays

- Commit or push failed: the Reviewer does not call `return-to-base`.
- `commit` is off: the worktree holds the uncommitted changes. `return-to-base` keeps it, and the Reviewer prints its path and branch.
- Conflict resolution in `/_shipit` left uncommitted files.
- The worktree is dirty: `return-to-base` prints `BLOCKED: could not remove worktree …`.
- The run stopped earlier with `BLOCKED:` or ❌ (no acceptance, failing tests, an open dependency).

A rerun of the task reuses the existing worktree and continues from the first missing stage.

## Task files (files tracker)

`start-task` moves this task's uncommitted spec, prompt and log from your checkout into the worktree. While the task runs, an empty `docs/prompt/` in your checkout is expected; the files are in the worktree. Once committed they live on the task branch, and on the base branch once merged. Details: [Trackers and statuses](trackers.md).

## Manual cleanup

To remove a worktree left behind on purpose (for example an abandoned task):

```bash
git worktree list
```

```bash
git worktree remove .git/seh-worktrees/<task>
```

Add `--force` only if you want to discard its uncommitted changes. The branch stays; delete it with `git branch -d <task>` if you no longer need it.
