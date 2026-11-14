# Prompt — implementation-plan stage 02: Git scripts

Implement stage `02` of `docs/implementation-plan` only. Requires stage `01` = `done`. Historical stage: status `done` in the original plan.

## Repo context

- Repo `se-harness`. Git helpers are POSIX `sh` in `scripts/`, installed as `.seh/scripts/`. Agents call them by name; agents never compose `git` / `gh` themselves.
- Config: project `harness.config.json`, `agents.baseBranch`. Never guess `main`, `master` or current checkout.
- Contract: `OK` / `UNCHANGED` and `key: value` lines; refusal ends with `BLOCKED: <what stopped> — <what must be done>`.
- No rebase, reset, force, `gh pr merge`. No `seh git` subcommand. Windows out of scope.
- Read `docs/prd.md` (Git table, Stops, Decisions 9, 16) first.
- Versioning: `scripts/` is shipped → version bump in the same change (CLAUDE.md).

## Stage spec

### Goal

Ship the allowlisted git/`gh` helpers as POSIX `sh` files in `scripts/`.

### Scope in

| Script | Caller | Does |
|--------|--------|------|
| `start-task` | Implementer at start; Reviewer if branch missing | Checkout `-b <basename>` from `agents.baseBranch`, or checkout existing `<basename>`. No commit, no push |
| `commit-task` | Reviewer after Acceptance or after an update merge | `git add` listed paths, `git commit` on task branch |
| `push-task` | Reviewer | Push only the task branch |
| `open-pr` | Reviewer after Acceptance | `gh pr create --base <base> --head <task>` |
| `update-from-base` | Reviewer, only on update | Merge base into task branch; stop on conflicts (`BLOCKED:`) |
| `return-to-base` | Reviewer after PR opened | `git checkout` the base |

- Missing config or `agents.baseBranch` → `BLOCKED:`.
- Scripts read project `harness.config.json` at project root, not a seh-package path.
- Names are stable (no extension).

### Scope out

- `seh git` wrapper. Status, log or Jira helpers. Rebase, reset, force, PR merge. Windows. Agent markdown and skills (later phases).

### Acceptance criteria

- All six files exist under `scripts/` and are valid POSIX `sh`.
- Missing `harness.config.json` or `agents.baseBranch` → `BLOCKED:`, no guessed branch.
- Success prints `OK` or `UNCHANGED` plus `key: value`.
- No rebase/reset/force/`gh pr merge` in the scripts.

### Tests

- Script behaviour tests with stubbed `git` / `gh`; `npm test`.

### Depends on

- 01 = `done`.

## Constraints

- Do not commit unless the user asks. Do not touch `.env` files.
- Ask one question at a time; recommended option first, labelled **(Recommended)**.

## Definition of done

- Acceptance criteria PASS with evidence; `npm test` output quoted.
- Report: changed files, deviations.
