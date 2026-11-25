# 05 — Agents and work skills

## Goal

Agents follow per-action / per-op flags at run time; nothing is baked into generated markdown.

## Scope

In:
- Architect: naming and binding per rules below; write spec / prompt to tracker or file per flag; `link` only with `create` ON.
- Implementer, Reviewer, Designer: same binding and move rules at their first touch; log / comments and status per flag.
- Reviewer after acceptance: run enabled git ops only; the final report lists what was left to the developer (uncommitted worktree path and branch, local commit, pushed branch without PR).
- Explicit user request (agents, skills, `references/AGENTS.md`): pass `--user-request` with the user's own words; ask before overwriting a non-empty ticket field; ask for a missing mapping and save it with consent.
- `depends` gate: status read from where status lives for that task (tracker when `status` ON and bound, else local frontmatter); a tracker key no local spec holds (basename or `tracker:`) is read with `get`, status from the tracker whatever the flag, and compared with `blocker`.
- `doit`, `checkit`, `runit`, `shipit`, `planit`, `grillit`, `agents/consultant.md` (check), `references/session-fanout.md`: replace `readOnly` wording, handle disabled ops (`worktree` OFF = sequential, no fan-out, as git disabled).
- `shipit`: `BLOCKED: /<prefix>shipit needs worktree, commit, push and pr enabled — change them in /<prefix>setit-se`. No keys: `status` OFF → scan local spec frontmatter; `status` ON → `BLOCKED:` name the keys.
- `CHANGELOG.md` `[2.0.0]` lines.

Out: scripts, `setit-se`. The `depends` merge gate (`docs/backlog/depends-gate-requires-merge.md`).

## Decisions

Q2, Q3, Q4, Q6, Q7, Q9, Q10, Q12–Q15.

## Detailed plan

### Binding

A task is bound when `tracker:` in its local spec frontmatter holds a key, or its basename is the key.

- Naming (Q10): new task with no existing item and `create` ON → create the issue first; basename and branch = key. `create` OFF → files basename, `tracker:` empty. Locally started task bound later (by seh with `create` ON, or by hand) keeps basename and branch (Q6).
- Stub: when `spec` is ON, a local spec file exists only if basename ≠ key or `status` is OFF. It is frontmatter only (`id`, `title`, `status`, `type`, `depends`, `relates`, `ui`, `tracker`).
- Move on binding (Q9): at the first seh step that touches a bound task which still has local content for an ON action, write that content to the tracker once (`set spec` / `set prompt` / `set log`, `transition` to the local status). Then the spec becomes the stub and the local prompt / log files are removed. OFF actions stay local. Tracker and local both non-empty for the same artifact → `BLOCKED:` naming both, nothing overwritten. A failed write leaves the local content in place.

### Disabled tracker action

| Action OFF | Script verb refused (`BLOCKED:`, no HTTP, before credentials; unless `--user-request`) | Where it goes instead |
|------------|----------------------------------------------------------------|-----------------------|
| `create` | `create`, `link` **(A: links belong to `create`)** | No issue; task keeps files basename, `tracker:` empty |
| `spec` | `set spec` | `docs/features/<basename>.feature.md` |
| `prompt` | `set prompt` | `docs/prompt/<basename>.prompt.md` |
| `log` | `set log`, `comment` (Q<n>, Reviewer reports, link failures) | `docs/feature-log/<basename>.log.md` |
| `status` | `transition` | `status:` in local spec frontmatter (`agents.statuses`); with `spec` ON that file is a frontmatter-only stub (`status`, `tracker`) **(A)** |

`get` assembles each body from tracker or file according to the same flags. `depends` gate: status is read from wherever status lives for that task (tracker when `status` ON and the task is bound, else local frontmatter); a tracker key no local spec holds (basename or `tracker:`) is read with `get`, status from the tracker whatever the flag, and compared with `blocker`, as today. Setup asks `statuses.todo…done` only with `status` ON, `fields.spec/prompt/log` only for the matching action, `issueTypes` / `workItemTypes` only with `create` ON; `blocker` and `fetchFields` always.

### Disabled git operation

| Op OFF | Script | Effect |
|--------|--------|--------|
| `worktree` | `start-task` → `UNCHANGED`, `git: worktree disabled`, `worktree: <launch checkout>` | Work in launch checkout, sequential, no fan-out (as git disabled). `pr-state` still works (read). |
| `commit` | `commit-task` → `UNCHANGED`, `git: commit disabled` | Accepted changes stay uncommitted in the worktree; `return-to-base` leaves the dirty worktree; Reviewer prints its path and branch. `record-change` still writes `CHANGELOG.md` when `reportChange` is `true`. |
| `push` | `push-task` → `UNCHANGED`, `git: push disabled` | Commit stays local. |
| `pr` | `open-pr`, `merge-pr` → `UNCHANGED`, `git: pr disabled` | Branch pushed, no PR. |

"Done" = accepted + every enabled op finished. `/<prefix>shipit` with any op OFF: `BLOCKED: /<prefix>shipit needs worktree, commit, push and pr enabled — change them in /<prefix>setit-se`.

### Explicit user request (Q12)

OFF means seh does not do it automatically where it normally would. On the user's explicit request seh still does it.

- The guarded script takes `--user-request "<the user's words>"`, which lifts the `agents.tracker.write` / `agents.git` guard for that call only. Empty value → `BLOCKED:`. **(A: flag name)**
- The words come from the user in this session, or from a launch line that carries them verbatim. seh never adds the flag for its own steps, in any mode. **(A)**
- Tracker (Q13): the write is a one-off copy. Repo files stay the source for an OFF action, nothing is synced, local status is unchanged. A non-empty target field → ask before overwriting; `get <key> --user-request` reads every part from the tracker. **(A: `get` flag)**
- Missing mapping (Q15): the skill lists values from `meta`, asks, writes the mapping to config with the user's consent, runs the action; the action stays OFF.
- Manual `create` binds the task (`tracker:`); content of OFF actions stays local. A later switch to ON follows the move rule, including its `BLOCKED:` when both sides are non-empty. **(A)**
- Git (Q14): applies to `start-task`, `commit-task`, `push-task`, `open-pr`; the flag runs that one operation even when an earlier one in the chain is OFF. It does not override git disabled (empty `agents.baseBranch`), does not change who may merge (`merge-pr` only on a `/<prefix>shipit` run), and does not satisfy the `/<prefix>shipit` requirement. **(A)**

## Acceptance criteria

- [ ] `grep -rn readOnly agents skills references scripts` → only the migration rule in `setit-se`, tests, and the unrelated `codex-adapters.*` option.
- [ ] Every agent that writes an artifact picks the store by its action flag.
- [ ] Naming, stub, move and conflict rules are stated for the agents that touch a task.
- [ ] With any git op OFF the Reviewer report names what is left; `shipit` stops.
- [ ] `npm test` green.
- [ ] Agents and skills say OFF = not automatic, and how a user request runs it (words verbatim, never self-initiated).
- [ ] Overwrite confirmation and missing-mapping question are stated.

## Verification

`npm test`; review of the diff against the criteria.

## Files / materials

`agents/`, `skills/`, `references/session-fanout.md`, `CHANGELOG.md`

## Depends on

04 (`done`)
