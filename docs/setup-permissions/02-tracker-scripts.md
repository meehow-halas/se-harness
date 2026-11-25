# 02 — `jira` / `ado` scripts

## Goal

Hard guard per action and per-flag body assembly in `get`.

## Scope

In:
- `scripts/jira-json.js`, `scripts/ado-json.js`: helper `write <action>` → `true` / `false`; `readOnly` ignored. Missing `write` block → `BLOCKED: tracker config predates 2.0 — run /<prefix>setit-se` for `get` and write verbs; `meta` works without it (setup calls it before asking the actions).
- `scripts/jira`, `scripts/ado`, `scripts/lib-jira.sh`, `scripts/lib-ado.sh`: verb guard per table below. Guard runs before credentials and `curl`. Message: `BLOCKED: tracker action <a> is disabled — write the repo file (agents.tracker.write.<a>)`.
- `get <key>`: each of spec / prompt / log from the tracker field when its action is ON, else from `docs/…/<key>.*`; `status:` from the tracker when `status` ON, else from local frontmatter (empty when missing).
- `get <basename>` with `tracker:` set in the local spec: tracker parts from that key, local parts from the basename files.
- Existing tests built on `readOnly` are rewritten to the new behaviour, not deleted without replacement.
- `CHANGELOG.md` `[2.0.0]` lines.

Out: git scripts, skills, agents, the move on binding (agents, stage 05).

## Decisions

Q3, Q4, Q5, Q6, Q7.

## Detailed plan

| Action OFF | Script verb refused (`BLOCKED:`, no HTTP, before credentials) | Where it goes instead |
|------------|----------------------------------------------------------------|-----------------------|
| `create` | `create`, `link` **(A: links belong to `create`)** | No issue; task keeps files basename, `tracker:` empty |
| `spec` | `set spec` | `docs/features/<basename>.feature.md` |
| `prompt` | `set prompt` | `docs/prompt/<basename>.prompt.md` |
| `log` | `set log`, `comment` (Q<n>, Reviewer reports, link failures) | `docs/feature-log/<basename>.log.md` |
| `status` | `transition` | `status:` in local spec frontmatter (`agents.statuses`); with `spec` ON that file is a frontmatter-only stub (`status`, `tracker`) **(A)** |

`get` assembles each body from tracker or file according to the same flags. `depends` gate: status is read from wherever status lives for that task (tracker when `status` ON and the task is bound, else local frontmatter); a tracker key with no local file is read with `get` and compared with `blocker`, as today. Setup asks `statuses.todo…done` only with `status` ON, `fields.spec/prompt/log` only for the matching action, `issueTypes` / `workItemTypes` only with `create` ON; `blocker` and `fetchFields` always.

## Acceptance criteria

- [ ] For each verb × its action OFF: non-zero exit, `BLOCKED:` naming the action, zero requests at the HTTP stub, also without a credentials file.
- [ ] Same verb with its action ON and another action OFF: the request reaches the stub.
- [ ] `get` with mixed flags (e.g. spec ON, prompt OFF, log ON, status OFF): bodies come from the right store; fixture values differ per store.
- [ ] `get <basename>` of a bound local task reads the key's tracker parts and the basename's local parts.
- [ ] Config with `readOnly: true` and no `write`: `BLOCKED:` run setup; `meta` still works.
- [ ] Same behaviour for `jira` and `ado`.

## Verification

`node --test scripts/jira.test.js scripts/ado.test.js`

## Files / materials

`scripts/jira*`, `scripts/ado*`, `scripts/lib-jira.sh`, `scripts/lib-ado.sh`, `CHANGELOG.md`

## Depends on

01 (`done`)
