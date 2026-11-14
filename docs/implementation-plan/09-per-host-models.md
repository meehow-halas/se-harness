# 09 — Per-host role and brainstorm models

## Goal

Store a distinct model id per supported host for each product role and for brainstorm, so switching host does not require rewriting `harness.config.json`. Live agent `model:` frontmatter is stamped from that host's map entry only.

## Scope in

- `agents.roles.<role>.model` and `agents.brainstorm.model` as maps keyed by `hosts.json` `id`.
- `modelSuggest` on each host row (interview defaults only; no translation between hosts).
- `/<prefix>setit-se`: first run one question per host (four-role table, optional overrides); generation; later-run one cell; legacy string migration.
- `/<prefix>grillit`: first-member model map; launch from this host's key; legacy string migration.

Rules: config holds only model strings keyed by host ids. Missing or empty `model[<host.id>]` at generation → `BLOCKED:`; never copy another host's model. Legacy `"model": "<string>"` is invalid for generation: prefill every role on every host with that string, then one confirm-or-change per host. Later-run role change rewrites one `agentsDir`. Brainstorm launch uses `agents.brainstorm.model[<host.id>]`; host id resolved by matching this skill's `skillsDir` to the host table. Suggestion text comes from `modelSuggest`, not host-id branches.

## Scope out

- Codex adapter. Extra CLI commands. README sync. Asking which hosts to write. Per-host agent template trees. CLI generating live agents.

## Decisions taken

- Config wins over live copies; setup reports drift and asks.

## Files likely touched

- `references/harness.config.json`, `references/harness.config.md`, `references/hosts.json`, `references/AGENTS.md`, `skills/setit-se/SKILL.md`, `skills/grillit/SKILL.md`

## Acceptance criteria

- Skeleton role `model` values are maps with a key per `hosts.json` `id`.
- Setup documents per-host confirm, per-host `model:` stamp, one-cell later-run, string migration.
- grillit documents a model map, host resolve, and launch from this host's key.
- PRD Deferred no longer lists per-host role models.

## Tests

- Grep checks; config JSON parse.

## Versioning

Not recorded in the legacy plan.

## Depends on

- 08 = `done`.
