# Setup permissions: changelog, git operations, tracker actions

Goal: `/<prefix>setit-se` lets the user decide, in few questions, what seh may do on their behalf: write `CHANGELOG.md`, run each git operation, and run each tracker write. Anything switched off is either left to the developer (git) or falls back to the files tracker (tracker actions).

Planning: complete

Source: conversation 2026-11-25. Version: **2.0.0** (major, approved: `agents.tracker.readOnly` is removed).

## Open questions

None. Assumptions marked **(A)** accepted by the user on 2026-11-25.

## Decisions (accepted)

| Id | Decision | Chosen | Rejected |
|----|----------|--------|----------|
| Q1 | Changelog question | `/<prefix>setit-se` always asks `agents.reportChange` (first run; later run when the key is missing). Proposed default: `true` when project-root `CHANGELOG.md` exists, else `false`. The user still answers; the default is only the proposal. | Silent default `true` (today) |
| Q2 | Git granularity | A list of operations, chosen in one answer: `worktree` (branch + worktree), `commit`, `push`, `pr`. Chain: `pr` ⇒ `push` ⇒ `commit` ⇒ `worktree`. A disabled step is skipped and the agent says what it left for the developer. `/<prefix>shipit` needs all four. | One `publish` switch; launch checkout without branch |
| Q3 | Tracker actions | `agents.tracker.readOnly` is replaced by a list of write actions: `create`, `spec`, `prompt`, `log`, `status`. Read is always on and not configurable (without it a non-files tracker is pointless). | Keep `readOnly` |
| Q4 | Fallback | For Jira / ADO, every disabled action falls back to the files tracker location of that artifact. | Status from log; forbidden combinations |
| Q5 | Compatibility | Major + one-time migration in a later `/<prefix>setit-se`: `readOnly: true` → all actions `false`; `false` / missing → all `true`; `readOnly` deleted. Scripts read only the new key. | Minor with `readOnly` fallback in scripts |
| Q6 | Tracker ↔ local files | A task that comes from the tracker uses its key as basename (`PROJ-123.feature.md`, branch `PROJ-123`). A task created locally uses a files basename (`001-feature-x`) and carries `tracker:` in spec frontmatter (empty until bound). Binding = writing the key there (by the user, or by seh after `create`). Basename and branch never change after binding. | Rename files on binding |
| Q7 | `create` is its own action | `create` ON: seh creates the issue / work item, also later in the task's life (a locally started task with empty `tracker:` gets one at the next seh step that touches it), then writes the key into `tracker:`. `create` OFF: seh never creates; the user may bind by hand. | `create` tied to `spec` |
| Q8 | Setup speed | No preselected defaults for tracker actions, but one question for all of them (table + one reply), like role models. Same for git operations. Follow-up mapping questions are asked only for enabled actions and grouped. | One question per action |

## Config (target)

| Key | Values | Missing means |
|-----|--------|---------------|
| `agents.reportChange` | `true` \| `false` | `true` at run time (unchanged); later `/<prefix>setit-se` asks once |
| `agents.git` | `{ "worktree", "commit", "push", "pr" }` booleans | all `true` when `agents.baseBranch` is set; later `/<prefix>setit-se` asks once **(A)** |
| `agents.baseBranch` | branch \| empty | empty = git disabled, as today; `agents.git` is ignored |
| `agents.tracker.write` | `{ "create", "spec", "prompt", "log", "status" }` booleans | setup migrates from `readOnly`; a config with neither is `BLOCKED:` run `/<prefix>setit-se` **(A)** |
| `agents.tracker.readOnly` | — | removed |

## Behaviour per disabled tracker action (Jira / ADO)

| Action OFF | Script verb refused (`BLOCKED:`, no HTTP, before credentials) | Where it goes instead |
|------------|----------------------------------------------------------------|-----------------------|
| `create` | `create`, `link` **(A: links belong to `create`)** | No issue; task keeps files basename, `tracker:` empty |
| `spec` | `set spec` | `docs/features/<basename>.feature.md` |
| `prompt` | `set prompt` | `docs/prompt/<basename>.prompt.md` |
| `log` | `set log`, `comment` (Q<n>, Reviewer reports, link failures) | `docs/feature-log/<basename>.log.md` |
| `status` | `transition` | `status:` in local spec frontmatter (`agents.statuses`); with `spec` ON that file is a frontmatter-only stub (`status`, `tracker`) **(A)** |

`get` assembles each body from tracker or file according to the same flags. `depends` gate: status is read from wherever status lives for that task (tracker when `status` ON and the task is bound, else local frontmatter); a tracker key with no local file is read with `get` and compared with `blocker`, as today. Setup asks `statuses.todo…done` only with `status` ON, `fields.spec/prompt/log` only for the matching action, `issueTypes` / `workItemTypes` only with `create` ON; `blocker` and `fetchFields` always.

## Behaviour per disabled git operation

| Op OFF | Script | Effect |
|--------|--------|--------|
| `worktree` | `start-task` → `UNCHANGED`, `git: worktree disabled`, `worktree: <launch checkout>` | Work in launch checkout, sequential, no fan-out (as git disabled). `pr-state` still works (read). |
| `commit` | `commit-task` → `UNCHANGED`, `git: commit disabled` | Accepted changes stay uncommitted in the worktree; `return-to-base` leaves the dirty worktree; Reviewer prints its path and branch. `record-change` still writes `CHANGELOG.md` when `reportChange` is `true`. |
| `push` | `push-task` → `UNCHANGED`, `git: push disabled` | Commit stays local. |
| `pr` | `open-pr`, `merge-pr` → `UNCHANGED`, `git: pr disabled` | Branch pushed, no PR. |

"Done" = accepted + every enabled op finished. `/<prefix>shipit` with any op OFF: `BLOCKED: /<prefix>shipit needs worktree, commit, push and pr enabled — change them in /<prefix>setit-se`.

## Stage table

| NN | name | status | verification |
|----|------|--------|--------------|
| 01 | [prd-references](01-prd-references.md) | todo | review of PRD diff |
| 02 | [tracker-scripts](02-tracker-scripts.md) | todo | `node --test scripts/jira.test.js scripts/ado.test.js` |
| 03 | [git-scripts](03-git-scripts.md) | todo | `node --test` on each touched `scripts/*.test.js` |
| 04 | [setit-se](04-setit-se.md) | todo | skill review + [manual-test.md](manual-test.md) setup scenarios |
| 05 | [agents-skills](05-agents-skills.md) | todo | `npm test`; manual-test run scenarios |
| 06 | [docs-release](06-docs-release.md) | todo | `npm test`; CHANGELOG 2.0.0; guide pages |

Parallelism: 02 and 03 may run in parallel after 01 (disjoint files). 04 and 05 after 02 and 03.

## Initiative complete when

All stages `done`. In a consuming project: setup asks the changelog question with the right default; git ops and tracker actions are chosen in one reply each; an old `readOnly` config migrates once; with mixed tracker actions a run writes enabled artifacts to the tracker and the rest to `docs/`; with `commit` OFF a run ends with accepted, uncommitted changes and a clear hand-off.

## Out of scope

- Migration of artifacts between tracker and files when toggling actions (PRD: switching does not migrate).
- Partial git ops for `/<prefix>shipit`.
- Trackers other than Jira / ADO.
- `README.md` (only on explicit request).
