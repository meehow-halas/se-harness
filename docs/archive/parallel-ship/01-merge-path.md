# 01 — Merge path (scripts + Reviewer/shipit)

## Goal

Give seh an allowlisted, opt-in way to merge a task PR into `agents.baseBranch` after acceptance, and a read-only way to ask whether a task's PR is merged. A `/<prefix>shipit` run launched as a fan-out child with `Auto-merge: yes` ends with the PR merged. Every other run behaves exactly as today (human merges).

## Scope in

- New script `scripts/merge-pr` (+ `scripts/merge-pr.test.js`).
- New script `scripts/pr-state` (+ `scripts/pr-state.test.js`).
- `agents/reviewer.md`: merge step after `open-pr`, only with launch line `Auto-merge: yes`; conflict retry loop.
- `skills/shipit/SKILL.md`: accept and forward `Auto-merge: yes` (only together with `Fan-out child: yes`); finish/report wording.
- `docs/prd.md`: remove "Auto-merge" from **Deferred**; script table rows for `merge-pr` and `pr-state`; Reviewer "after acceptance" order; principle 9 wording ("Merge of the PR is always human" → human unless the run was launched by `/<prefix>runit`); `/<prefix>shipit` pipeline finish step.
- `package.json` version `1.3.0`; `CHANGELOG.md` `## [1.3.0]` entry (Added: merge-pr, pr-state, Reviewer auto-merge step).

## Scope out

- The `runit` skill, key selection, waves, parent-side checks (stage 02).
- `fanout-plan` changes (stage 02).
- `gh pr merge --auto`, `--admin`, `--rebase`, `--merge`, `--delete-branch`; deleting the remote task branch.
- Any merge from `/<prefix>doit`, `/<prefix>checkit`, or a user-launched `/<prefix>shipit`.
- Jira/ADO `search`.
- `README.md` at repo root.

## Decisions taken

1. Auto-merge is opt-in, minor version (`1.3.0`). Default behaviour unchanged. Why: user choice; keeps v1 contract for everyone not using `runit`.
2. Merge method: `gh pr merge <number> --squash`. No rebase, no force, no `--auto`, no `--admin`, no `--delete-branch`. Why: user choice; PRD forbids rebase/force; squash keeps the base history one commit per task.
3. The child's Reviewer merges (not the parent). Why: the session that owns the task has the context to resolve conflicts; PRD says the parent never does children's work.
4. Conflict handling: on `merge-pr` `BLOCKED:` for a conflict, Reviewer runs `update-from-base`, resolves, `commit-task`, `push-task`, then `merge-pr` once more. A second failure, or any non-conflict failure (required checks not green, branch protection, gh error), is `BLOCKED:` for that task. Why: user choice ("squash + update and 1 retry").
5. `Auto-merge: yes` is honoured by `/<prefix>shipit` only when the launch also has `Fan-out child: yes`. A user typing `/<prefix>shipit KEY` never merges. Why: opt-in is invoking `/<prefix>runit` (decision 3 in README); this stops a stray line from turning on merge.
6. `pr-state` precedence: `open` if any open PR, else `merged` if any merged PR, else `none` (closed-only counts as `none`). Heads considered: `<task>` and `<task>-<N>` (N ≥ 2, digits only), base = `agents.baseBranch` only. Why: start-task can cut `<task>-N` after an old PR closed/merged.
7. Return to base after merge: `return-to-base` runs after `merge-pr` finishes (success or final `BLOCKED:`) when the worktree is clean; if a conflict resolution left it dirty, do not call it and report. Why: same rule as today (dirty worktree blocks `return-to-base`).

## Files likely touched

- `scripts/merge-pr`, `scripts/merge-pr.test.js` (new, executable)
- `scripts/pr-state`, `scripts/pr-state.test.js` (new, executable)
- `scripts/lib.sh` (only if a shared helper is needed)
- `test/helpers.js` (only if the gh stub needs new canned outputs)
- `agents/reviewer.md`
- `skills/shipit/SKILL.md`
- `docs/prd.md`
- `package.json`, `CHANGELOG.md`

## Contracts

### `merge-pr <task>`

- Git disabled (empty `agents.baseBranch`): prints `UNCHANGED`, `git: disabled`, exit 0, no `gh` call.
- `gh` missing: `BLOCKED: gh is not available — …`.
- Branch = `task_branch <task>` (lib.sh). Refuses the base branch (`require_not_base`).
- Looks up the open PR with head = that branch and base = `agents.baseBranch`.
  - None open, but a merged one exists → `UNCHANGED`, `state: merged`, `url: <url>`, exit 0, no merge call.
  - None at all → `BLOCKED: no open pull request for <branch> — run open-pr <task> first`.
  - Mergeable state `CONFLICTING` → `BLOCKED: <branch> conflicts with <base> — run update-from-base <task>, resolve, commit-task, push-task, then retry merge-pr`. No merge call.
- Otherwise runs exactly `gh pr merge <number> --squash` (argv asserted in tests). Failure → `BLOCKED: merge failed (<gh error>) — …`, non-zero exit.
- Success → `OK`, `branch: <branch>`, `base: <base>`, `url: <url>`, `state: merged`, exit 0.
- Never: `--auto`, `--admin`, `--delete-branch`, `--rebase`, `--merge`, any `git push`, `git checkout`, `git merge`.

### `pr-state <task>`

- Read-only. Never calls `gh pr merge`, `gh pr create`, or any git write.
- Git disabled → `UNCHANGED`, `git: disabled`, exit 0.
- `gh` missing → `BLOCKED:`.
- Output on success: `OK`, `task: <task>`, `state: merged|open|none`, and `url: <url>` when state is not `none` (the PR that decided the state). When `merged`, also `merged_at: <ISO-8601 from gh mergedAt>` and `merge_commit: <sha from gh mergeCommit.oid>` (used by the stage 02 run report). Exit 0 in all three states.
- Uses base = `agents.baseBranch` from config (a PR into another base is ignored).

## Acceptance criteria

1. `merge-pr` with git disabled prints `UNCHANGED` and `git: disabled`, exit 0, and the gh stub log is empty.
2. `merge-pr` with an open, mergeable PR calls `gh pr merge <number> --squash` exactly (argv from the stub log) and prints `OK` with `state: merged` and the URL.
3. `merge-pr` uses the configured base: with `agents.baseBranch` set to a non-default value (e.g. `release-x`), the PR lookup argv contains that base and a PR into another base is not merged.
4. `merge-pr` with a `CONFLICTING` PR prints `BLOCKED:` naming `update-from-base`, non-zero exit, and makes no `gh pr merge` call.
5. `merge-pr` when the PR is already merged prints `UNCHANGED` with `state: merged`, exit 0, no merge call.
6. `merge-pr` with no PR prints `BLOCKED:` naming `open-pr`.
7. `merge-pr` when `gh pr merge` fails prints `BLOCKED:` with the gh error, non-zero exit.
8. `merge-pr` resolves `<task>-N` when the seh worktree is on `<task>-2`.
9. `pr-state` prints `state: open`, `state: merged` (with `merged_at:` and `merge_commit:` from the stub data), `state: none` for the matching stub data; open beats merged; closed-only is `none`; `<task>-2` head counts; a PR into another base is ignored; `<task>x` / `<task>-abc` heads are ignored.
10. `pr-state` with git disabled prints `UNCHANGED` / `git: disabled`; without gh prints `BLOCKED:`.
11. Neither script is copied into `.seh/` as a test file (`*.test.js` excluded — existing install test still green).
12. `agents/reviewer.md`: without `Auto-merge: yes` the text still says never merge; with it, the after-acceptance order is `open-pr` → `merge-pr` (conflict: `update-from-base` → resolve → `commit-task` → `push-task` → `merge-pr` once more) → `return-to-base`; final failure is reported as `BLOCKED:` and the Reviewer does not compose `gh pr merge` itself.
13. `skills/shipit/SKILL.md`: forwards `Auto-merge: yes` to the Reviewer only when the launch also has `Fan-out child: yes`; otherwise ignores it; finish step reports the merge result.
14. `docs/prd.md`: "Auto-merge" no longer in **Deferred**; `merge-pr` and `pr-state` rows in the script table; principle 9 and the Reviewer order describe the `runit`-only merge.
15. `package.json` version is `1.3.0`; `CHANGELOG.md` has `## [1.3.0]` with Added lines for `merge-pr`, `pr-state`, and the Reviewer merge step.
16. `npm test` green.

## Tests to write/run

Narrowest first:

```bash
node --test scripts/merge-pr.test.js
```

```bash
node --test scripts/pr-state.test.js
```

```bash
npm test
```

Use `test/helpers` (`writeGhStub`, `argvLogArgv`, `initGitRepo`, `startTask`, `assertOk` / `assertUnchanged` / `assertBlocked`). Stub only `gh`. Fixture base branch must not be `dev` or `main` in at least one test (invariant: configured base is used).

## Versioning / CHANGELOG

Minor bump `1.2.1` → `1.3.0` (approved by the user during planning: opt-in auto-merge as a new minor). Add `## [1.3.0]` to `CHANGELOG.md`. Stage 02 extends the same entry; it does not bump again.

## Depends on

None (first stage). Stage 02 may start only when this stage has status `done`: verification finished with all criteria `PASS`, tests green, zero open gaps.
