# Phase 0 — Plan tree + Monitor PRD

## Goal

Land the Monitor build order as files an implementing agent can attach, without mixing rows into the dhs v1 plan.

## In scope

- [docs/monitor-plan.md](../monitor-plan.md) (index, invariants, decisions, phase index)
- [prd.md](prd.md) (Monitor addendum)
- Phase files `00`–`08` and prompts `00`–`08` under `docs/monitor-plan/` (each prompt tells the agent to label a Recommended option when asking)

## Out of scope

- Product code, CLI changes, `jira search`, UI, `monitor/` on disk
- Editing [prd.md](../prd.md) v1, [implementation-plan.md](../implementation-plan.md), or README
- Editing [AGENTS.md](../../AGENTS.md) (phase 1, with the payload)

## Inputs

- [ideas/monitor.md](../ideas/monitor.md) (behaviour; wins on conflict)
- [ideas/monitor.txt](../ideas/monitor.txt) (raw notes / layout sketch; idea file wins)
- Commissioning decisions recorded in the index **Accepted decisions**

## Outputs

| Path | What |
|------|------|
| [docs/monitor-plan.md](../monitor-plan.md) | Index, invariants, decisions, phases 0–8 |
| [prd.md](prd.md) | Monitor addendum (not a v1 PRD rewrite) |
| `docs/monitor-plan/0N-*.md` + `*.prompt.md` | One slice and one attachable prompt per phase |

## Behaviour

- v1 [implementation-plan.md](../implementation-plan.md) Phase index is unchanged.
- A later phase is commissioned by attaching that phase’s `.prompt.md`. The prompt’s read list is the idea file, this index, the Monitor PRD, then the slice file.
- Repo `AGENTS.md` still describes the v1 six-directory payload until phase 1. For Monitor work, this plan and the Monitor PRD override that list (`monitor/` is the seventh payload).

## Done when

- The index lists phases 0–8 with Status; phase 0 is `done`; 1–8 are `todo`
- An agent can commission phase 1 from [01-payload-and-server.prompt.md](01-payload-and-server.prompt.md) plus the index, Monitor PRD, and idea file
- v1 phase index is untouched
