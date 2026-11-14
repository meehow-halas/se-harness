# 03 — References and config templates

## Goal

Publish the file templates setup and agents need: config skeleton, artifact shapes, `BLOCKED` format and consumer `AGENTS.md`. Copied to `.seh/references/` on install. Setup merges and generates from them; agent bodies say "read config", not literal values.

## Scope in

- `references/AGENTS.md`: consumer template. Binding flow, four roles, skills, tracker at runtime, git via `.seh/scripts/`, `BLOCKED:` line. No baked project name, base branch or status strings.
- `harness.config.json` skeleton with at least: `seh.generatedFrom` (set by setup from `.seh/VERSION`); one-line product and `agents.docs`; `agents.baseBranch` (no default baked in agents; setup suggests `dev`); `agents.statuses` with the five file-tracker statuses (`todo`, `in progress`, `implemented`, `in review`, `done`); `agents.roles` (`architect`, `implementer`, `consultant`, `reviewer`, `model` as a map keyed by `hosts.json` `id`; optional `rules`; reviewer may use `checklist`); `agents.contentLanguage`; `packsIgnored`; `jiraOffer`; `agents.tracker` (only when Jira connected); `agents.brainstorm.consult` (`any` | `significant` default | `broad`).
- Spec shape: frontmatter `id`, `title`, `status`, `type` (`feature` | `bug`), `depends`, `relates`; body Abstract, Requirements, Acceptance criteria, Architectural decisions.
- Prompt shape: Goal, phase-grain order, new dependencies, existing code to reuse, what not to change.
- Log shape: table `date | agent | action | note`; notes for `Q<n>:` and `C<phase>.<n>:`.
- `BLOCKED` format: `BLOCKED: <what stopped> — <what the user or another skill must do>`.
- File-tracker paths: `docs/features/<basename>.feature.md`, `docs/prompt/<basename>.prompt.md`, `docs/feature-log/<basename>.log.md`.

## Scope out

- Implementing `/<prefix>setit-se` (phase 5) or agents (phase 4). Jira REST (phase 12).
- Rewriting this repo's `AGENTS.md` into the consumer template.
- Status/log helper scripts for the files tracker.

## Decisions taken

- Consumer template must be `references/AGENTS.md`.
- No credentials in the skeleton. Jira token lives in a local ignored file.
- Consumer `AGENTS.md` is merge input for first setup, not an overwrite.

## Files likely touched

- `references/AGENTS.md`, `references/harness.config.json`, `references/harness.config.md`, spec/prompt/log shape files under `references/`, `references/BLOCKED.md`

## Acceptance criteria

- `references/AGENTS.md` has no interpolated base branch or status literal presented as the only allowed value.
- Config skeleton lists the keys above.
- Spec, prompt and log shapes match the artifact contract.
- `BLOCKED` template matches the PRD stop line, not a `rule=` line.

## Tests

- JSON parse of the skeleton; grep checks for forbidden literals.

## Versioning

Initial references. Not recorded in the legacy plan.

## Depends on

- 01 = `done`.
