# Phase 7 — Stage buttons

## Goal

Right-column buttons start the matching skill on **that** task’s session. They never write tracker status. Close is per row and requires confirm.

## In scope

Conditions use configured status **strings** (files: `agents.statuses`; Jira: mapped `agents.tracker.statuses`). Hide a button when its condition is false.

| Condition | Button | Skill |
|-----------|--------|-------|
| Spec+prompt exist, status `todo` | Run implementation | `/dhs-doit` |
| Status `in progress` | Run review | `/dhs-checkit` review |
| Status `in review` (PR open) | PR merged to `agents.baseBranch` | `/dhs-checkit` close |

- Close: confirm dialog required, then close on that key only (not a list)
- Confirm on doit/review: optional, not required
- Same chat thread receives the skill
- Unmet `depends`: show on the row; that task’s implement path should follow dhs (block that task, not the others)
- Warn if a dhs worktree for the key already exists (IDE collision). Do not hard-block
- No new “implementation finished” status — user clicks review when they believe the code is ready

## Out of scope

- checkit update-from-base
- Merging the PR
- Batch close

## Inputs

- Idea §§10, 1 (close per task)

## Outputs

| Path | What |
|------|------|
| `monitor/` | buttons, confirm, skill send, tests |

## Done when

- Tests fail if a button writes frontmatter status or calls `jira transition` from the Monitor process
- Tests fail if close runs without confirm
- Tests fail if close sends a list of keys
- Tests fail if buttons compare against hardcoded `"todo"` / `"in progress"` when the fixture uses other strings
- Hidden when the condition does not hold
