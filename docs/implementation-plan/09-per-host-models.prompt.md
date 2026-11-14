# Prompt — implementation-plan stage 09: Per-host role and brainstorm models

Implement stage `09` of `docs/implementation-plan` only. Requires stage `08` = `done`. Historical stage: status `done` in the original plan.

## Repo context

- Repo `se-harness`. Config holds model strings keyed by host ids from `references/hosts.json`. No translation between hosts. No per-host agent template tree.
- Live agent `model:` frontmatter is stamped from that host's entry only.
- Read `docs/prd.md` first (Runtime config, `/<prefix>setit-se` generation, `/<prefix>grillit` first member, Decisions 17 and 19).
- Versioning: shipped dirs → version bump in the same change (CLAUDE.md).

## Stage spec

### Goal

Store a distinct model id per supported host for each product role and for brainstorm, so switching host does not require rewriting `harness.config.json`.

### Scope in

- `agents.roles.<role>.model` and `agents.brainstorm.model` as maps keyed by `hosts.json` `id`.
- `modelSuggest` on each host row (interview defaults only).
- `/<prefix>setit-se`: first run one question per host (four-role table, optional overrides); generation stamps `model:` per host; later run changes one cell (one `agentsDir`); legacy string migration.
- `/<prefix>grillit`: first-member model map; launch from this host's key (resolve by matching `skillsDir` to the host table); legacy string migration.
- Missing or empty `model[<host.id>]` at generation → `BLOCKED:`. Never copy another host's model. Legacy `"model": "<string>"` is invalid for generation: prefill every role on every host with it, then one confirm-or-change per host.
- Suggestion text from `modelSuggest`, not host-id branches.

### Scope out

- Codex adapter. Extra CLI commands. README sync. Asking which hosts to write. CLI generating live agents.

### Acceptance criteria

- Skeleton role `model` values are maps with a key per host id.
- Setup documents per-host confirm, per-host stamp, one-cell later-run change and string migration.
- grillit documents model map, host resolve and launch from this host's key.
- PRD Deferred no longer lists per-host role models.

### Depends on

- 08 = `done`.

## Constraints

- Do not commit unless the user asks. Do not touch `.env` files.
- Ask one question at a time; recommended option first, labelled **(Recommended)**.

## Definition of done

- Acceptance criteria PASS with grep and JSON-parse evidence; report changed files and deviations.
