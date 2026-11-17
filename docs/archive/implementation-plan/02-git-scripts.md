# 02 — Git scripts

## Goal

Ship the allowlisted git/`gh` helpers as POSIX `sh` files in package `scripts/`. Agents call these by stable name; they must not compose the matching commands.

## Scope in

| Script | Caller | Does |
|--------|--------|------|
| `start-task` | Implementer at start; Reviewer if the branch is missing | Checkout `-b <basename>` from `agents.baseBranch`, or checkout `<basename>` if it exists. No commit, no push |
| `commit-task` | Reviewer after Acceptance, or after an update merge | `git add` listed paths, `git commit` on the task branch |
| `push-task` | Reviewer | Push only the task branch |
| `open-pr` | Reviewer after Acceptance | `gh pr create --base <base> --head <task>` |
| `update-from-base` | Reviewer, only on update | Merge `agents.baseBranch` into the task branch; stop on conflicts |
| `return-to-base` | Reviewer after PR opened | `git checkout` the base |

- Scripts read `harness.config.json` (`agents.baseBranch`). They never guess `main`, `master`, or the current checkout.
- Success prints `OK` or `UNCHANGED` and `key: value` lines. Refusal ends with `BLOCKED: <what stopped> — <what must be done>`.
- Missing config or missing `agents.baseBranch` → `BLOCKED:`.
- `start-task` takes the task basename (files tracker) or issue key (Jira) as branch name. No commit, no push.
- `commit-task` adds only listed paths. `push-task` pushes only that branch. `open-pr` uses `--base <agents.baseBranch> --head <task>`.
- Scripts run in the consuming project and read project `harness.config.json` (project root), not a path inside the seh package.

## Scope out

- A `seh git` wrapper or any CLI subcommand. Status, log or Jira helpers.
- Rebase, reset, force, or merging the PR (`gh pr merge` is out).
- Windows (`sh` hosts only in v1).
- LLM procedure, agent markdown (phase 4), skills (phases 5–6).

## Decisions taken

- Script names without extension, stable across versions.
- Config is read from the consuming project, never from a seh-repo path.

## Files likely touched

- `scripts/start-task`, `scripts/commit-task`, `scripts/push-task`, `scripts/open-pr`, `scripts/update-from-base`, `scripts/return-to-base`

## Acceptance criteria

- All six files exist under `scripts/` and are valid POSIX `sh`.
- Missing `harness.config.json` or `agents.baseBranch` → `BLOCKED:`, not a guessed branch.
- Success path prints `OK` or `UNCHANGED` plus `key: value`.
- No rebase, reset, force or `gh pr merge` in the scripts.
- `seh install` would copy them to `.seh/scripts/` under the same names.

## Tests

- Script behaviour tests with stubbed `git` / `gh`.

## Versioning

Initial scripts. Not recorded in the legacy plan.

## Depends on

- 01 = `done`.
