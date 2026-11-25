# 05 — Agents and work skills

## Goal

Agents follow per-action / per-op flags at run time; nothing is baked into generated markdown.

## Scope

In:
- Architect: naming and binding per rules below; write spec / prompt to tracker or file per flag; `link` only with `create` ON.
- Implementer, Reviewer, Designer: same binding and move rules at their first touch; log / comments and status per flag.
- Reviewer after acceptance: run enabled git ops only; the final report lists what was left to the developer (uncommitted worktree path and branch, local commit, pushed branch without PR).
- `depends` gate: status read from where status lives for that task (tracker when `status` ON and bound, else local frontmatter); a tracker key with no local file is read with `get` and compared with `blocker`.
- `doit`, `checkit`, `runit`, `shipit`, `planit`, `grillit`, `agents/consultant.md` (check), `references/session-fanout.md`: replace `readOnly` wording, handle disabled ops.
- `shipit`: `BLOCKED: /<prefix>shipit needs worktree, commit, push and pr enabled — change them in /<prefix>setit-se`. No keys: `status` OFF → scan local spec frontmatter; `status` ON → `BLOCKED:` name the keys.
- `CHANGELOG.md` `[2.0.0]` lines.

Out: scripts, `setit-se`. The `depends` merge gate (`docs/backlog/depends-gate-requires-merge.md`).

## Decisions

Q2, Q3, Q4, Q6, Q7, Q9, Q10.

## Detailed plan

### Binding

A task is bound when `tracker:` in its local spec frontmatter holds a key, or its basename is the key.

- Naming (Q10): new task with no existing item and `create` ON → create the issue first; basename and branch = key. `create` OFF → files basename, `tracker:` empty. Locally started task bound later (by seh with `create` ON, or by hand) keeps basename and branch (Q6).
- Stub: when `spec` is ON, a local spec file exists only if basename ≠ key or `status` is OFF. It is frontmatter only (`id`, `title`, `status`, `type`, `depends`, `relates`, `ui`, `tracker`).
- Move on binding (Q9): at the first seh step that touches a bound task which still has local content for an ON action, write that content to the tracker once (`set spec` / `set prompt` / `set log`, `transition` to the local status). Then the spec becomes the stub and the local prompt / log files are removed. OFF actions stay local. Tracker and local both non-empty for the same artifact → `BLOCKED:` naming both, nothing overwritten. A failed write leaves the local content in place.

### Disabled tracker action

| Action OFF | Script verb refused (`BLOCKED:`, no HTTP, before credentials) | Where it goes instead |
|------------|----------------------------------------------------------------|-----------------------|
| `create` | `create`, `link` **(A: links belong to `create`)** | No issue; task keeps files basename, `tracker:` empty |
| `spec` | `set spec` | `docs/features/<basename>.feature.md` |
| `prompt` | `set prompt` | `docs/prompt/<basename>.prompt.md` |
| `log` | `set log`, `comment` (Q<n>, Reviewer reports, link failures) | `docs/feature-log/<basename>.log.md` |
| `status` | `transition` | `status:` in local spec frontmatter (`agents.statuses`); with `spec` ON that file is a frontmatter-only stub (`status`, `tracker`) **(A)** |

`get` assembles each body from tracker or file according to the same flags. `depends` gate: status is read from wherever status lives for that task (tracker when `status` ON and the task is bound, else local frontmatter); a tracker key with no local file is read with `get` and compared with `blocker`, as today. Setup asks `statuses.todo…done` only with `status` ON, `fields.spec/prompt/log` only for the matching action, `issueTypes` / `workItemTypes` only with `create` ON; `blocker` and `fetchFields` always.

### Disabled git operation

| Op OFF | Script | Effect |
|--------|--------|--------|
| `worktree` | `start-task` → `UNCHANGED`, `git: worktree disabled`, `worktree: <launch checkout>` | Work in launch checkout, sequential, no fan-out (as git disabled). `pr-state` still works (read). |
| `commit` | `commit-task` → `UNCHANGED`, `git: commit disabled` | Accepted changes stay uncommitted in the worktree; `return-to-base` leaves the dirty worktree; Reviewer prints its path and branch. `record-change` still writes `CHANGELOG.md` when `reportChange` is `true`. |
| `push` | `push-task` → `UNCHANGED`, `git: push disabled` | Commit stays local. |
| `pr` | `open-pr`, `merge-pr` → `UNCHANGED`, `git: pr disabled` | Branch pushed, no PR. |

"Done" = accepted + every enabled op finished. `/<prefix>shipit` with any op OFF: `BLOCKED: /<prefix>shipit needs worktree, commit, push and pr enabled — change them in /<prefix>setit-se`.

## Acceptance criteria

- [ ] `grep -rn readOnly agents skills references scripts` → only the migration rule in `setit-se`, tests, and the unrelated `codex-adapters.*` option.
- [ ] Every agent that writes an artifact picks the store by its action flag.
- [ ] Naming, stub, move and conflict rules are stated for the agents that touch a task.
- [ ] With any git op OFF the Reviewer report names what is left; `shipit` stops.
- [ ] `npm test` green.

## Verification

`npm test`; review of the diff against the criteria.

## Files / materials

`agents/`, `skills/`, `references/session-fanout.md`, `CHANGELOG.md`

## Depends on

04 (`done`)
