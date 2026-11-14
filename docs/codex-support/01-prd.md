# Stage 1 — PRD

## Goal

The PRD wins, so it changes first. No code in this stage.

## In scope

- `docs/prd.md`: supported hosts line (add Codex); Package layout (`hosts.json` fields: `agentFormat`, `hooksMatcher`, `invokePrefix`, `skillHide`); What install writes; hooks table (Codex `.codex/hooks.json`); `/<prefix>setit-se` generation (TOML agents, `openai.yaml`, rules + `AGENTS.md` section, trust and `/hooks` note); host agent files row (Codex copies are TOML, model optional, consultant read-only is text only); Decisions (record plan decisions 1–6); **Deferred**: remove the Codex adapter line.
- `docs/implementation-plan.md`: remove Codex from "Out of this v1 plan".
- Older phase files (8, 9, 13, 16) that say "Codex is Deferred" stay as historical; do not edit them.

## Out of scope

Code, tests, version, README.

## Done when

PRD, plan and this folder agree; no document still lists Codex as Deferred except as history.
