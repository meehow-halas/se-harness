# 02 — `jira` / `ado` scripts

## Goal

Default guard per action, lifted only on an explicit user request, and per-flag body assembly in `get`.

## Scope

In:
- `scripts/jira-json.js`, `scripts/ado-json.js`: helper `write <action>` → `true` / `false`; `readOnly` ignored. Missing `write` block → `BLOCKED: tracker config predates 2.0 — run /<prefix>setit-se` for `get` and write verbs; `meta` works without it (setup calls it before asking the actions).
- `scripts/jira`, `scripts/ado`, `scripts/lib-jira.sh`, `scripts/lib-ado.sh`: verb guard per table below. Guard runs before credentials and `curl`. Message: `BLOCKED: tracker action <a> is disabled — write the repo file (agents.tracker.write.<a>)`.
- `get <key>`: each of spec / prompt / log from the tracker field when its action is ON, else from `docs/…/<key>.*`; `status:` from the tracker when `status` ON, else from local frontmatter (empty when missing). A key no local spec holds (basename or `tracker:`): `status:` always from the tracker (Q17).
- `get <basename>` with `tracker:` set in the local spec: tracker parts from that key, local parts from the basename files.
- `--user-request "<words>"` on write verbs and `get` (see Explicit user request).
- `docs/prd.md`, `references/AGENTS.md`, `references/harness.config.md`: replace "an OFF tracker action is never performed" with the explicit user request rule below (Q16).
- Existing tests built on `readOnly` are rewritten to the new behaviour, not deleted without replacement.
- `CHANGELOG.md` `[2.0.0]` lines.

Out: git scripts, skills, agents, the move on binding (agents, stage 05).

## Decisions

Q3, Q4, Q5, Q6, Q7, Q12, Q13, Q15, Q16, Q17.

## Detailed plan

| Action OFF | Script verb refused (`BLOCKED:`, no HTTP, before credentials; unless `--user-request`) | Where it goes instead |
|------------|----------------------------------------------------------------|-----------------------|
| `create` | `create`, `link` **(A: links belong to `create`)** | No issue; task keeps files basename, `tracker:` empty |
| `spec` | `set spec` | `docs/features/<basename>.feature.md` |
| `prompt` | `set prompt` | `docs/prompt/<basename>.prompt.md` |
| `log` | `set log`, `comment` (Q<n>, Reviewer reports, link failures) | `docs/feature-log/<basename>.log.md` |
| `status` | `transition` | `status:` in local spec frontmatter (`agents.statuses`); with `spec` ON that file is a frontmatter-only stub (`status`, `tracker`) **(A)** |

`get` assembles each body from tracker or file according to the same flags. `depends` gate: status is read from wherever status lives for that task (tracker when `status` ON and the task is bound, else local frontmatter); a tracker key no local spec holds (basename or `tracker:`) is read with `get`, status from the tracker whatever the flag, and compared with `blocker`, as today. Setup asks `statuses.todo…done` only with `status` ON, `fields.spec/prompt/log` only for the matching action, `issueTypes` / `workItemTypes` only with `create` ON; `blocker` and `fetchFields` always.

### Explicit user request (Q12)

OFF means seh does not do it automatically where it normally would. On the user's explicit request seh still does it.

- The guarded script takes `--user-request "<the user's words>"`, which lifts the `agents.tracker.write` / `agents.git` guard for that call only. Empty value → `BLOCKED:`. **(A: flag name)**
- The words come from the user in this session, or from a launch line that carries them verbatim. seh never adds the flag for its own steps, in any mode. **(A)**
- Tracker (Q13): the write is a one-off copy. Repo files stay the source for an OFF action, nothing is synced, local status is unchanged. A non-empty target field → ask before overwriting; `get <key> --user-request` reads every part from the tracker. **(A: `get` flag)**
- Missing mapping (Q15): the skill lists values from `meta`, asks, writes the mapping to config with the user's consent, runs the action; the action stays OFF.
- Manual `create` binds the task (`tracker:`); content of OFF actions stays local. A later switch to ON follows the move rule, including its `BLOCKED:` when both sides are non-empty. **(A)**

## Acceptance criteria

- [ ] For each verb × its action OFF: non-zero exit, `BLOCKED:` naming the action, zero requests at the HTTP stub, also without a credentials file.
- [ ] Same verb with its action ON and another action OFF: the request reaches the stub.
- [ ] `get` with mixed flags (e.g. spec ON, prompt OFF, log ON, status OFF): bodies come from the right store; fixture values differ per store.
- [ ] `status` OFF: `get <key>` with no local spec holding the key prints the tracker status; with a local spec holding it (as basename, or in `tracker:`), not the tracker status.
- [ ] `get <basename>` of a bound local task reads the key's tracker parts and the basename's local parts.
- [ ] Config with `readOnly: true` and no `write`: `BLOCKED:` run setup; `meta` still works.
- [ ] Same behaviour for `jira` and `ado`.
- [ ] Verb with its action OFF and `--user-request` with non-empty words: the request reaches the stub; empty words → `BLOCKED:`, zero requests.
- [ ] `get <key> --user-request` with actions OFF prints the tracker values; without the flag, the repo values.
- [ ] PRD and `references/` state the explicit user request rule for tracker actions.

## Verification

`node --test scripts/jira.test.js scripts/ado.test.js`

## Files / materials

`scripts/jira*`, `scripts/ado*`, `scripts/lib-jira.sh`, `scripts/lib-ado.sh`, `docs/prd.md`, `references/`, `CHANGELOG.md`

## Depends on

01 (`done`)
