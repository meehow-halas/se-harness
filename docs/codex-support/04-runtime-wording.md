# Stage 4 — Runtime wording

## Goal

Skills and agents tell Codex users the right thing to type and detect the host correctly.

## In scope

- Everywhere a skill or message names an invocation (`/<prefix>setit-se`, next-step hints), render it with the host's `invokePrefix`. The `seh install` closing message and `setit-se` entry text included.
- grillit: host detection must not rely only on `skillsDir` (`.agents/skills` is shared). Per-persona model: verify that Codex subagent launch accepts a model; if not, personas use the agent file model and the wording says so.
- `sessionSpawn: "manual"` for Codex is documented where fan-out is described.

## Out of scope

Setup generation (stage 3).

## Done when

No skill text hardcodes `/` for a Codex user; grillit picks the right host with `.agents/skills` present alongside another host's directories.
