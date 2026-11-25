# 06 — Docs and release

## Goal

User guide and changelog match the shipped 2.0.0 behaviour.

## Scope

In:
- `docs/guide/` (`setup.md`, `trackers.md`, `worktrees.md`, `workflow.md`, `examples.md` where affected): new questions, behaviour tables, binding.
- `CHANGELOG.md` `[2.0.0]` complete: Added (`agents.git`, `agents.tracker.write`, `create`, `tracker:` binding, changelog question), Changed (setup questions), Removed (`agents.tracker.readOnly`), migration note.

Out: root `README.md` (only on explicit request).

## Decisions

Q5, Q11.

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

- [ ] No `readOnly` in `docs/guide/` outside the migration note.
- [ ] Guide describes the three setup questions, disabled actions / ops, and binding, consistent with the PRD.
- [ ] `CHANGELOG.md` `[2.0.0]` has Added, Changed, Removed and the migration note.
- [ ] `npm test` green.

## Verification

`npm test`; review of guide pages against the PRD.

## Files / materials

`docs/guide/`, `CHANGELOG.md`

## Depends on

05 (`done`)
