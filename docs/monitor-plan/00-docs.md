# Phase 0 — Plan tree + Monitor PRD

## Goal

Land the Monitor build order as files an implementing agent can attach, without mixing rows into the dhs v1 plan.

## In scope

- [docs/monitor-plan.md](../monitor-plan.md) (index, invariants, decisions, phase index)
- [prd.md](prd.md) (Monitor addendum)
- Phase files `00`–`08` and prompts `00`–`08` under `docs/monitor-plan/` (each prompt tells the agent to label a Recommended option when asking)

## Out of scope

- Product code, CLI changes, `jira search`, UI
- Editing [prd.md](../prd.md) v1, [implementation-plan.md](../implementation-plan.md), or README

## Done when

- The index lists phases 0–8 with Status; phase 0 is `done`; 1–8 are `todo`
- An agent can commission phase 1 from `01-payload-and-server.prompt.md` alone plus the index and idea file
- v1 phase index is untouched
