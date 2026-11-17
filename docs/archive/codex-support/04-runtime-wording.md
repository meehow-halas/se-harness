# 04 — Runtime wording

## Goal

Skills and agents tell Codex users the right thing to type and detect the host correctly.

## Scope in

- Everywhere a skill or message names an invocation (`/<prefix>setit-se`, next-step hints), render it with the host's `invokePrefix`, including the `seh install` closing message and the `setit-se` entry text.
- grillit: host detection must not rely only on `skillsDir` (`.agents/skills` is shared). Per-persona model: verify whether Codex subagent launch accepts a model; if not, personas use the agent file model and the wording says so.
- `sessionSpawn: "manual"` for Codex documented where fan-out is described.

## Scope out

- Setup generation (stage 03).

## Decisions taken

- Search first (`grep` for hardcoded `/{{prefix}}` invocations in `skills/`, `agents/`, `references/`, `src/`), then change only occurrences that name what the user types.

## Files likely touched

- `skills/`, `agents/`, `references/`, `src/` (only where invocation text or host detection is named).

## Acceptance criteria

- No skill text hardcodes `/` for a Codex user.
- grillit picks the right host with `.agents/skills` present alongside another host's directories.

## Tests

- `npm test`.

## Versioning

No version bump in this stage (stage 05).

## Depends on

- 03 = `done`.
