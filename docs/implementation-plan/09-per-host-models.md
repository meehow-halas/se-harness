# Phase 9 — Per-host role and brainstorm models

## Goal

Store a distinct model id per supported host for each product role and for brainstorm, so switching harness does not require rewriting `harness.config.json`. Live agent `model:` frontmatter is stamped from that host’s map entry only.

## In scope

- `agents.roles.<role>.model` and `agents.brainstorm.model` as maps keyed by `hosts.json` `id`.
- `modelSuggest` on each host row (interview defaults only; no translation between hosts).
- `/<prefix>setit-se` first-run one question per host (four-role table, optional overrides), generation, later-run one cell, legacy string migration.
- `/<prefix>grillit` first-member model map, launch from this host’s key, legacy string migration.
- PRD Decision 17, Runtime config, setup/brainstorm detail, consumer `AGENTS.md`, config skeleton.

## Out of scope

- A Codex adapter (TOML agents, `.codex/` / `.agents/skills`).
- Extra CLI commands (`seh host`).
- README sync.
- Asking which hosts to write (always all rows).
- A second agent template tree per host.
- CLI generating live agents.

## Inputs

- PRD: Runtime config; `/<prefix>setit-se` generation; `/<prefix>grillit` first member; Decisions 17 and 19.
- Phase 8 host table and copy loop.

## Outputs

| Path | What |
|------|------|
| `references/harness.config.json` | Role `model` maps; brainstorm `model` is still written by `/<prefix>grillit` |
| `references/harness.config.md` | Map contract |
| `references/hosts.json` | `modelSuggest` per row |
| `references/AGENTS.md` | Per-host `model` |
| `skills/setit-se/SKILL.md` | Interview, stamp, later-run cell, migration |
| `skills/grillit/SKILL.md` | Map, host resolve, launch, migration |

## Behaviour

Cite the PRD. Do not restate every question.

- Hosts stay in `hosts.json`. Config holds only model strings keyed by those ids.
- Missing or empty `model[<host.id>]` at generation → `BLOCKED:`. Do not copy another host’s model.
- Legacy `"model": "<string>"` is not valid for generation. Prefill every role on every host with that string, then one confirm-or-change question per host (setup: four-role table; brainstorm: single default per host).
- Later-run role `model` change rewrites **one** `agentsDir`.
- Brainstorm launch uses `agents.brainstorm.model[<host.id>]`. Resolve `id` by matching this skill’s `skillsDir` to the host table.
- Suggest from `modelSuggest`. Do not `if (id === "claude-code")` for suggestion text.

## Done when

- Skeleton role `model` values are maps with a key per `hosts.json` `id`.
- `/<prefix>setit-se` documents per-host confirm (table + optional overrides), per-host `model:` stamp, one-cell later-run, and string migration.
- `/<prefix>grillit` documents a model map, host resolve, and launch from this host’s key.
- PRD Deferred no longer lists per-host role models.

## Handoff

A later Codex slice adds a row, a format adapter, and `modelSuggest` for that host. Do not invent that row here.
