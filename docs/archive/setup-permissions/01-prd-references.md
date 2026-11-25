# 01 — PRD and references

## Goal

PRD and reference files describe the target behaviour before any code changes.

## Scope

In:
- `docs/prd.md`: Feature tracking (drop the read-only exception, add the per-action write list and files fallback), Jira / ADO sections and script tables (verb ↔ action, `get` per flag), Git (`agents.git` ops, chain, `UNCHANGED` + `git: <op> disabled`), Reviewer after-acceptance sequence, `/<prefix>setit-se` detail (changelog, git ops, tracker actions questions, migration), `/<prefix>shipit` requirement and key selection, Statuses (`done` meaning), Decisions.
- `references/harness.config.md`, `references/harness.config.json`: `agents.reportChange` asked by setup, `agents.git`, `agents.tracker.write`.
- `references/harness.tracker.json`, `references/harness.tracker.ado.json`: `write` block, no `readOnly`.
- `references/spec.feature.md`: `tracker:` frontmatter key.
- `references/AGENTS.md`: replace read-only wording.
- `package.json` → `2.0.0`; new `CHANGELOG.md` entry `[2.0.0]`.

Out: scripts, skills, agents.

## Decisions

Q1–Q7, Q9, Q10.

## Detailed plan

### Config

| Key | Values | Missing means |
|-----|--------|---------------|
| `agents.reportChange` | `true` \| `false` | `true` at run time (unchanged); later `/<prefix>setit-se` asks once |
| `agents.git` | `{ "worktree", "commit", "push", "pr" }` booleans | all `true` when `agents.baseBranch` is set; later `/<prefix>setit-se` asks once **(A)** |
| `agents.baseBranch` | branch \| empty | empty = git disabled, as today; `agents.git` is ignored |
| `agents.tracker.write` | `{ "create", "spec", "prompt", "log", "status" }` booleans | setup migrates from `readOnly`; a config with neither is `BLOCKED:` run `/<prefix>setit-se` **(A)** |
| `agents.tracker.readOnly` | — | removed |

### Disabled tracker action

| Action OFF | Script verb refused (`BLOCKED:`, no HTTP, before credentials) | Where it goes instead |
|------------|----------------------------------------------------------------|-----------------------|
| `create` | `create`, `link` **(A: links belong to `create`)** | No issue; task keeps files basename, `tracker:` empty |
| `spec` | `set spec` | `docs/features/<basename>.feature.md` |
| `prompt` | `set prompt` | `docs/prompt/<basename>.prompt.md` |
| `log` | `set log`, `comment` (Q<n>, Reviewer reports, link failures) | `docs/feature-log/<basename>.log.md` |
| `status` | `transition` | `status:` in local spec frontmatter (`agents.statuses`); with `spec` ON that file is a frontmatter-only stub (`status`, `tracker`) **(A)** |

`get` assembles each body from tracker or file according to the same flags. `depends` gate: status is read from wherever status lives for that task (tracker when `status` ON and the task is bound, else local frontmatter); a tracker key with no local file is read with `get` and compared with `blocker`, as today. Setup asks `statuses.todo…done` only with `status` ON, `fields.spec/prompt/log` only for the matching action, `issueTypes` / `workItemTypes` only with `create` ON; `blocker` and `fetchFields` always.

### Binding

A task is bound when `tracker:` in its local spec frontmatter holds a key, or its basename is the key.

- Naming (Q10): new task with no existing item and `create` ON → create the issue first; basename and branch = key. `create` OFF → files basename, `tracker:` empty. Locally started task bound later (by seh with `create` ON, or by hand) keeps basename and branch (Q6).
- Stub: when `spec` is ON, a local spec file exists only if basename ≠ key or `status` is OFF. It is frontmatter only (`id`, `title`, `status`, `type`, `depends`, `relates`, `ui`, `tracker`).
- Move on binding (Q9): at the first seh step that touches a bound task which still has local content for an ON action, write that content to the tracker once (`set spec` / `set prompt` / `set log`, `transition` to the local status). Then the spec becomes the stub and the local prompt / log files are removed. OFF actions stay local. Tracker and local both non-empty for the same artifact → `BLOCKED:` naming both, nothing overwritten. A failed write leaves the local content in place.

### Disabled git operation

| Op OFF | Script | Effect |
|--------|--------|--------|
| `worktree` | `start-task` → `UNCHANGED`, `git: worktree disabled`, `worktree: <launch checkout>` | Work in launch checkout, sequential, no fan-out (as git disabled). `pr-state` still works (read). |
| `commit` | `commit-task` → `UNCHANGED`, `git: commit disabled` | Accepted changes stay uncommitted in the worktree; `return-to-base` leaves the dirty worktree; Reviewer prints its path and branch. `record-change` still writes `CHANGELOG.md` when `reportChange` is `true`. |
| `push` | `push-task` → `UNCHANGED`, `git: push disabled` | Commit stays local. |
| `pr` | `open-pr`, `merge-pr` → `UNCHANGED`, `git: pr disabled` | Branch pushed, no PR. |

"Done" = accepted + every enabled op finished. `/<prefix>shipit` with any op OFF: `BLOCKED: /<prefix>shipit needs worktree, commit, push and pr enabled — change them in /<prefix>setit-se`.

## Acceptance criteria

- [ ] No `readOnly` left in `docs/prd.md` or `references/` (except `codex-adapters.*`, an unrelated option) outside the migration rule.
- [ ] Every disabled action / op has exactly one stated fallback or hand-off.
- [ ] Binding rules (naming, stub, move, conflict) are in the PRD.
- [ ] `package.json` is `2.0.0` and `CHANGELOG.md` has a `[2.0.0]` entry.
- [ ] `npm test` green.

## Verification

`npm test`; review of the PRD diff.

## Files / materials

`docs/prd.md`, `references/`, `package.json`, `CHANGELOG.md`

## Depends on

—
