# Phase 2 — Git scripts

## Goal

Ship the allowlisted git/`gh` helpers as POSIX `sh` files in package `scripts/`. Agents will call these by stable name; they must not compose the matching commands.

## In scope

The six scripts named in the PRD Git table:

| Script | Who calls it (later phases) | Does |
|--------|------------------------------|------|
| `start-task` | Implementer at start; Reviewer if the branch is missing | Checkout `-b <basename>` from `agents.baseBranch`, or checkout `<basename>` if it exists. No commit, no push |
| `commit-task` | Reviewer after Acceptance, or after resolving an **update** merge | `git add` of listed paths and `git commit` on the task branch |
| `push-task` | Reviewer | Push **only** the task branch |
| `open-pr` | Reviewer after Acceptance | `gh pr create --base <base> --head <task>` |
| `update-from-base` | Reviewer, only on **update** | Merge `agents.baseBranch` into the task branch; stop on conflicts |
| `return-to-base` | Reviewer after PR opened | `git checkout` that base |

Scripts read `harness.config.json` (including `agents.baseBranch`). They do not guess `main`, `master`, or the current checkout.

## Out of scope

- A `dhs git` wrapper or any new CLI subcommand.
- Status, log, or Jira helpers.
- Rebase, reset, force, or merging the GitHub PR.
- Windows (`sh` hosts only in v1). If the host cannot run `sh`, callers stop; the script should still be POSIX `sh`.
- LLM procedure (phases, Consultant, review checklist).
- Agent markdown (phase 4) or skills that call these (phases 5–6).

## Inputs

- PRD: Git; Stops; Decisions 9, 16.
- Phase 1 copy contract: install copies `scripts/` → `.dhs/scripts/`.
- Runtime config key `agents.baseBranch` (skeleton lands in phase 3; scripts still read that path).

## Outputs

| Path | What |
|------|------|
| `scripts/start-task` | executable `sh` |
| `scripts/commit-task` | executable `sh` |
| `scripts/push-task` | executable `sh` |
| `scripts/open-pr` | executable `sh` |
| `scripts/update-from-base` | executable `sh` |
| `scripts/return-to-base` | executable `sh` |

Names are stable across package versions so a later `dhs install` can replace the body without renaming the call. Prefer no extension, or `.sh` only if the call path in agents will match; pick one convention and keep it. The PRD names them without extension.

## Behaviour

### Contract

- Success prints `OK` or `UNCHANGED` and `key: value` lines.
- Refusal ends with a `BLOCKED:` line in the PRD Stops shape: `BLOCKED: <what stopped> — <what the user or another skill must do>`.
- No rebase, reset, or force. No merge of the PR (`gh pr merge` is out).
- Base branch: only `agents.baseBranch` from `harness.config.json`. If the key or file is missing, refuse with `BLOCKED:` (do not guess).
- `start-task` takes the task basename (file tracker) or issue key (Jira tracker) as the branch name. It does not commit or push.
- `commit-task` adds only listed paths (arguments or a documented convention). It commits on the task branch.
- `push-task` pushes only that task branch.
- `open-pr` uses `gh pr create --base <agents.baseBranch> --head <task>`.
- `update-from-base` merges the base into the task branch and stops on conflicts (`BLOCKED:`).
- `return-to-base` checks out `agents.baseBranch`.

### Config location

Scripts run in a consuming project after install, so they read **project** `harness.config.json` (project root), not a path inside the dhs package. Document that in the script comments if needed; do not hardcode a dhs-repo path.

## Done when

- All six files exist under `scripts/` and are valid POSIX `sh`.
- Missing `harness.config.json` or missing `agents.baseBranch` produces `BLOCKED:`, not a guessed branch.
- Success path prints `OK` or `UNCHANGED` plus `key: value`.
- No rebase/reset/force/`gh pr merge` in the scripts.
- `dhs install` (phase 1) would copy them to `.dhs/scripts/` under the same names.

## Handoff

Phase 4 agents and phase 6 Reviewer/Implementer instructions will **call** these names under `.dhs/scripts/`. Phase 3 does not need to exist for the scripts to be written, but a config skeleton will define `agents.baseBranch` for setup to fill.
