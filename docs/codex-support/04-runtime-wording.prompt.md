# Prompt — codex-support stage 04: Runtime wording

Implement stage `04` of `docs/codex-support` only. Requires stage `03` = `done` in `docs/codex-support/README.md`. If not, stop and say so.

## Repo context

- Repo: `se-harness`. Host-table model: render invocation with the row's `invokePrefix`; no `if (id === "codex")` branches in skills.
- Codex invocation is `$<prefix>setit-se`; other hosts `/<prefix>setit-se`.
- `.agents/skills` is shared with other tools: grillit host detection must not rely only on `skillsDir`.
- Versioning: no version bump in this stage.

## Stage spec

### Goal

Skills and agents tell Codex users the right thing to type and detect the host correctly.

### Scope in

- Everywhere a skill or message names an invocation (`/<prefix>setit-se`, next-step hints), render it with the host's `invokePrefix`, including the `seh install` closing message and the `setit-se` entry text.
- grillit: host detection must not rely only on `skillsDir`. Per-persona model: verify whether Codex subagent launch accepts a model; if not, personas use the agent file model and the wording says so.
- `sessionSpawn: "manual"` for Codex documented where fan-out is described.

### Scope out

- Setup generation (stage 03).

### Decisions taken

- Search first (`grep` for hardcoded `/{{prefix}}` invocations in `skills/`, `agents/`, `references/`, `src/`), then change only occurrences that name what the user types.

### Acceptance criteria

- No skill text hardcodes `/` for a Codex user.
- grillit picks the right host with `.agents/skills` present alongside another host's directories.

### Tests

- `npm test`.

### Depends on

- 03 = `done`.

## Constraints

- Do not commit unless the user asks.
- Ask one question at a time; recommended option first, labelled **(Recommended)**.

## Definition of done

- Acceptance criteria PASS with grep output as evidence; `npm test` output quoted.
- Report: changed files, deviations.
