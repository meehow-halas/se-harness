# Setup permissions: changelog, git operations, tracker actions

Goal: `/<prefix>setit-se` lets the user decide, in few questions, what seh may do on their behalf: write `CHANGELOG.md`, run each git operation, and run each tracker write. Anything switched off is either left to the developer (git) or falls back to the files tracker (tracker actions). Off means "not automatically": on the user's explicit request seh still does it.

Planning: complete

Source: conversation 2026-11-25

## Stages

| NN | Stage | Executor | Status | Verification |
|----|-------|----------|--------|--------------|
| 01 | [PRD and references](01-prd-references.md) | agent | done | `npm test`; PRD diff review |
| 02 | [Tracker scripts](02-tracker-scripts.md) | agent | planned | `node --test scripts/jira.test.js scripts/ado.test.js` |
| 03 | [Git scripts](03-git-scripts.md) | agent | planned | `node --test` on touched `scripts/*.test.js` |
| 04 | [setit-se](04-setit-se.md) | agent | planned | `npm test`; skill diff review |
| 05 | [Agents and skills](05-agents-skills.md) | agent | planned | `npm test`; diff review |
| 06 | [Docs and release](06-docs-release.md) | agent | planned | `npm test`; guide review |

## Decisions

- Q1: `/<prefix>setit-se` always asks `agents.reportChange` (first run; later run when the key is missing); proposal `true` when project-root `CHANGELOG.md` exists, else `false`. (rejected: silent default `true`)
- Q2: git ops list chosen in one answer: `worktree`, `commit`, `push`, `pr`; chain `pr` ⇒ `push` ⇒ `commit` ⇒ `worktree`; a disabled step is skipped and the agent says what it left; `/<prefix>shipit` needs all four. (rejected: one `publish` switch; launch checkout without branch)
- Q3: `agents.tracker.readOnly` replaced by write actions `create`, `spec`, `prompt`, `log`, `status`; read is always on. (rejected: keep `readOnly`)
- Q4: every disabled Jira / ADO action falls back to the files-tracker location of that artifact. (rejected: status from log; forbidden combinations)
- Q5: version 2.0.0 (major, approved) with one-time migration in a later `/<prefix>setit-se`: `readOnly: true` → all `false`; `false` / missing → all `true`; scripts read only the new key. (rejected: minor with fallback)
- Q6: tracker-origin task uses the key as basename; locally created task uses a files basename and `tracker:` in spec frontmatter; basename and branch never change after binding. (rejected: rename on binding)
- Q7: `create` is its own action; ON: seh creates the item, also later in the task's life; OFF: seh does not create automatically (on request: Q12), binding by hand allowed. (rejected: tied to `spec`)
- Q8: no preselected tracker actions; one question for all of them, same for git ops; mapping follow-ups only for enabled actions, grouped. (rejected: one question per action)
- Q9: local content of a bound task for ON actions moves to the tracker once, at the first seh step that touches it, after binding or after an action is turned on (confirmed 2026-11-25); both sides non-empty → `BLOCKED`. (rejected: local stays the source; no late creation)
- Q10: new task without an item and `create` ON: issue first, basename = key. (rejected: files basename + `tracker:` for every task)
- Q11: no manual test scenarios or manual stage. (user decision)
- Q12: a disabled tracker action is not automatic but runs on the user's explicit request; scripts keep the guard and lift it with `--user-request "<words>"`. (rejected: no script guard)
- Q13: after a requested write for an OFF action, repo files stay the source; one-off copy, no sync. (rejected: tracker becomes the source for that task)
- Q14: Q12 applies to git operations too. (rejected: git stays user-only)
- Q15: missing mapping for a requested action: ask, save with consent, run; action stays OFF. (rejected: `BLOCKED` to setup)
- Q16: PRD / `references/` from stage 01 are corrected in stages 02 (tracker) and 03 (git). (rejected: new stage 07; immediate edit)
- Q17: a tracker key no local spec holds (basename or `tracker:`) always takes its status from the tracker, also with `status` OFF; PRD / `references/` contradictions found in the stage 01 review fixed at once (2026-11-25).

## Assumptions

- Missing `agents.git` with a base branch set = all `true` (accepted 2026-11-25).
- `link` belongs to `create` (accepted 2026-11-25).
- A tracker config with neither `write` nor `readOnly` is `BLOCKED` (accepted 2026-11-25).
- `spec` ON with `status` OFF keeps a frontmatter-only local stub (accepted 2026-11-25); a stub is also needed when basename ≠ key, and keeps the full frontmatter.
- `--user-request` is the flag name; the words come only from the user (session or verbatim launch line). `get <key> --user-request` reads all parts from the tracker.
- The flag does not override git disabled, does not widen who may merge, and does not satisfy `/<prefix>shipit`'s four-op requirement.
- A manual `create` binds the task; enabling an action after a manual write may hit the Q9 both-sides `BLOCKED`.
- Moved prompt / log local files are removed after a successful tracker write.
- `shipit` without keys scans local spec frontmatter only when `status` is OFF.
- Stages run in order; 2.0.0 is bumped in 01 and each stage adds its `CHANGELOG.md` lines (project versioning rule). Between 01 and 05 the branch is not releasable.

## Out of scope

- Bulk migration of artifacts when toggling actions (setup copies nothing; Q9 moves only a bound task, when a step touches it) and any copy from the tracker back to files.
- Partial git ops for `/<prefix>shipit`.
- Trackers other than Jira / ADO.
- Root `README.md` (only on explicit request).
