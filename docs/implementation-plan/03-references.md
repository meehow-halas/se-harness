# Phase 3 — References and config templates

## Goal

Publish the extra file templates setup and agents need: config skeleton, artifact shapes, `BLOCKED` format, and the consumer `AGENTS.md` template. These are copied to `.dhs/references/` on install. `/dhs-setup` merges and generates from them; agent bodies (phase 4) tell the host to read config rather than baking values.

## In scope

Package `references/` as named in the PRD:

- Consumer `AGENTS.md` template (`.dhs/references/AGENTS.md` after install).
- `harness.config.json` skeleton (keys setup will write; not a live project config in this repo unless needed as a template file).
- Spec / prompt / log shapes (files tracker markdown).
- `BLOCKED` format matching PRD Stops.

Related small extras the PRD groups as “and the like” if they are required for those shapes (for example a one-line comment on tracker frontmatter). Do not add a second documentation tree.

## Out of scope

- Implementing `/dhs-setup` (phase 5) or product agents (phase 4).
- Jira REST calls (phase 12).
- Rewriting this repo’s own [AGENTS.md](../../AGENTS.md) into the consumer template (the consumer template is for **consuming** projects).
- Status/log helper scripts for the files tracker.

## Inputs

- PRD: Artifact contract; Statuses; Feature tracking; Runtime config and generated files; `/dhs-setup` (AGENTS.md / CLAUDE.md merge); Stops; Decisions 12–14, 16–18.
- This repo’s [AGENTS.md](../../AGENTS.md) is **this product’s** agents file, not the consumer template.

## Outputs

Place under `references/`. Exact filenames are the implementer’s choice except the consumer template **must** be `references/AGENTS.md` so setup can use `.dhs/references/AGENTS.md`.

| Template | Required content |
|----------|------------------|
| `references/AGENTS.md` | Standing instructions for a consuming project using dhs: binding flow, four roles, skills, tracker-at-runtime, git via `.dhs/scripts/`, `BLOCKED:` line. No baked project name, base branch, or status strings |
| Config skeleton | Keys listed below, with comments or empty/defaults where the PRD gives defaults |
| Spec shape | Frontmatter `id`, `title`, `status`, `type` (`feature` \| `bug`), `depends`, `relates`. Body: Abstract, Requirements, Acceptance criteria, Architectural decisions |
| Prompt shape | Goal, phase-grain order, new dependencies, existing code to reuse, **what not to change** |
| Log shape | Table `date \| agent \| action \| note`. Notes for `Q<n>:` and `C<phase>.<n>:` |
| `BLOCKED` format | `BLOCKED: <what stopped> — <what the user or another skill must do>` |

### Config skeleton keys

`harness.config.json` is the source of truth. Include at least:

- `dhs.generatedFrom` — set by setup to `.dhs/VERSION`.
- One-line product (not the PRD body) and `agents.docs` (paths).
- `agents.baseBranch` — no default baked into agents; setup suggests `dev`.
- `agents.statuses` — default English strings for the five file-tracker statuses (`todo`, `in progress`, `code review`, `in review`, `done`).
- `agents.roles` — `architect`, `implementer`, `consultant`, `reviewer` with `model` as a map keyed by `hosts.json` `id` (phase 9; interview defaults from that row’s `modelSuggest`). Optional `rules`; reviewer may use `checklist`.
- `agents.contentLanguage`.
- `packsIgnored`.
- `jiraOffer` (`declined` when they decline the first offer).
- `agents.tracker` — present only when Jira is connected: project key, field mapping, `statuses` (`todo`, `inProgress`, `codeReview`, `inReview`, `done`, optional `blocker`), issue types for `feature` and `bug`, `fetchFields` as needed.
- `agents.brainstorm.consult` — `any` \| `significant` (default if unset) \| `broad`. Members themselves are not this template’s job (phase 7 / `/dhs-brainstorm`).

Do not put credentials in the skeleton. Jira token lives in a local ignored file; never in git, never in chat.

## Behaviour

- Templates describe **reading** `harness.config.json` and **calling** `.dhs/scripts/`.
- Consumer `AGENTS.md` is merge input for first `/dhs-setup`, not a raw overwrite of an existing project file (merge rules are phase 5 / PRD).
- File-tracker paths (for the shapes): `docs/features/<basename>.feature.md`, `docs/prompt/<basename>.prompt.md`, `docs/feature-log/<basename>.log.md`. Basename example: `001-feature-example-name`.

## Done when

- `references/AGENTS.md` exists and contains no interpolated base branch or status literals presented as the only allowed values.
- Config skeleton lists the keys above.
- Spec, prompt, and log shapes match the Artifact contract.
- `BLOCKED` template matches PRD Stops, not a `rule=` line.

## Handoff

Phase 4 agents say “read harness.config.json” using these shapes. Phase 5 merges `references/AGENTS.md` into the consuming project and writes a live `harness.config.json` from the skeleton plus answers.
