# Prompt — implementation-plan stage 03: References and config templates

Implement stage `03` of `docs/implementation-plan` only. Requires stages `01`–`02` = `done`. Historical stage: status `done` in the original plan.

## Repo context

- Repo `se-harness`. Templates go under `references/`, copied to `.seh/references/` on install.
- Agent bodies and templates say "read `harness.config.json`", never bake config values.
- `references/AGENTS.md` is the consumer template (merge input for first setup).
- Jira token: local ignored file only, never in the skeleton, git or chat.
- Read `docs/prd.md` first (Artifact contract, Statuses, Feature tracking, Runtime config, Stops, Decisions 12–14, 16–18).
- Versioning: `references/` is shipped → version bump in the same change (CLAUDE.md).

## Stage spec

### Goal

Publish the file templates setup and agents need: config skeleton, artifact shapes, `BLOCKED` format and consumer `AGENTS.md`.

### Scope in

- `references/AGENTS.md`: binding flow, four roles, skills, tracker at runtime, git via `.seh/scripts/`, `BLOCKED:` line. No baked project name, base branch or status strings.
- `harness.config.json` skeleton: `seh.generatedFrom`; one-line product and `agents.docs`; `agents.baseBranch` (no default in agents; setup suggests `dev`); `agents.statuses` (`todo`, `in progress`, `implemented`, `in review`, `done`); `agents.roles` (four roles, `model` as a map keyed by `hosts.json` `id`; optional `rules`; reviewer `checklist`); `agents.contentLanguage`; `packsIgnored`; `jiraOffer`; `agents.tracker` (only when Jira connected); `agents.brainstorm.consult` (`any` | `significant` default | `broad`).
- Spec shape: frontmatter `id`, `title`, `status`, `type` (`feature` | `bug`), `depends`, `relates`; body Abstract, Requirements, Acceptance criteria, Architectural decisions.
- Prompt shape: Goal, phase-grain order, new dependencies, existing code to reuse, what not to change.
- Log shape: table `date | agent | action | note`; `Q<n>:` and `C<phase>.<n>:` notes.
- `BLOCKED` format: `BLOCKED: <what stopped> — <what the user or another skill must do>`.
- File-tracker paths: `docs/features/<basename>.feature.md`, `docs/prompt/<basename>.prompt.md`, `docs/feature-log/<basename>.log.md`.

### Scope out

- Setup skill (stage 05), agents (stage 04), Jira REST (stage 12), status/log helper scripts, a second documentation tree.

### Acceptance criteria

- `references/AGENTS.md` has no interpolated base branch or status literal as the only allowed value.
- Skeleton lists the keys above; JSON parses.
- Spec, prompt and log shapes match the artifact contract.
- `BLOCKED` template matches the PRD stop line, not a `rule=` line.

### Depends on

- 01–02 = `done`.

## Constraints

- Do not commit unless the user asks. Do not touch `.env` files.
- Ask one question at a time; recommended option first, labelled **(Recommended)**.

## Definition of done

- Acceptance criteria PASS with grep and JSON-parse output as evidence.
- Report: changed files, deviations.
