# Codex support

Goal: add Codex as a fourth host. A row in `references/hosts.json` plus format adapters. Same product and templates, no second tree. Opens a new version scope: Codex leaves PRD **Deferred** and the plan's **Out of this v1 plan**.

Planning: complete

Migrated from the pre-`_make-plan` layout (`plan.md`, `prompt.md`, `01-prd.md` … `05-release.md`). Stage statuses below are the statuses recorded in the original plan. They were not re-verified during migration.

## Open questions

None.

## Findings

Codex docs, read 2026-11-14. Doc summaries: re-read primary pages before coding.

| # | Area | Codex | Impact |
|---|------|-------|--------|
| C1 | Skills | Repo scan: `.agents/skills` only. `.codex/skills` is not documented | `skillsDir: ".agents/skills"` |
| C2 | User invocation | `$<skill>` or `/skills`. Custom prompts exist only in `~/.codex/prompts/` (deprecated, machine-wide) | `commandsDir: null`. Never write `~/.codex/`. Docs say `$<prefix>setit-se` |
| C3 | Agents | `.codex/agents/*.toml`: `name`, `description`, `developer_instructions` (required), optional `model`, `model_reasoning_effort`. Identified by `name` | TOML adapter |
| C4 | Read-only | Subagents inherit the parent sandbox. The agent file cannot enforce read-only | Consultant read-only is instruction text only. Document it |
| C5 | Hooks | `.codex/hooks.json`, `SessionStart`, nested shape like Claude. Matcher `startup\|resume`. Stdout becomes developer context. Loads only in a trusted project; user reviews hooks in `/hooks` | `claude-nested` shape, new matcher, setup tells the user |
| C6 | Rules | `AGENTS.md` only | `.codex/rules/*.md` plus a pointer section in `AGENTS.md` |
| C7 | Hide from auto-invoke | `<skill>/agents/openai.yaml`, `policy.allow_implicit_invocation: false` | Work skills get that file. Field-driven |
| C8 | Models | `model` is a bare string; absent = inherits the session model | Decision 5 |
| C9 | Shared dir | `.agents/skills` is read by other tools too | Uninstall removes only seh-owned entries |

## Decisions (user-approved)

1. `skillsDir: ".agents/skills"` (`.codex/skills` unsupported).
2. Invocation by `$`, no `commandsDir`, no machine-wide writes.
3. Agents via `agentFormat: "codex-toml"` adapter.
4. Update check via `.codex/hooks.json` `SessionStart`.
5. `modelSuggest`: architect `gpt-6-sol`; implementer, reviewer, brainstorm `gpt-6.1-sol`; consultant `gpt-6-luna` (tier match to Claude Code opus / sonnet / haiku). `gpt-6-sol` has no description in docs: availability per account is unverified. The user may change a suggestion or keep "no change" (field omitted, session model inherited). `model_reasoning_effort` is not set.
6. Rule packs to `.codex/rules/*.md` plus a seh-managed section in `AGENTS.md`. Scope by `paths` is soft (instruction only).
7. Minor version bump (approved).
8. README is updated last, Codex additions only (user asked).

## Host row (target)

`id: "codex"`, `skillsDir: ".agents/skills"`, `commandsDir: null`, `agentsDir: ".codex/agents"`, `rulesDir: ".codex/rules"`, `rulesExt: ".md"`, `brainstormDir: ".codex/brainstorm"`, `projectAgentsFile: null`, `hooksFile: ".codex/hooks.json"`, `hooksEvent: "SessionStart"`, `hooksShape: "claude-nested"`, `hooksHostArg: "codex"`, `sessionSpawn: "manual"`, `agentFormat: "codex-toml"`, `modelSuggest` per Decision 5.

New optional row fields: `hooksMatcher` (`"startup|resume"` for Codex), `invokePrefix` (`"$"` for Codex, `"/"` for the others), `skillHide` (`"openai-yaml"` for Codex; Cursor and OpenCode keep frontmatter).

## Stage table

| NN | name | status | verification |
|----|------|--------|--------------|
| 01 | [prd](01-prd.md) | done | legacy: not re-run |
| 02 | [host-row-cli](02-host-row-cli.md) | done | legacy: not re-run |
| 03 | [setup-adapters](03-setup-adapters.md) | done | legacy: not re-run |
| 04 | [runtime-wording](04-runtime-wording.md) | done | legacy: not re-run |
| 05 | [release](05-release.md) | done | legacy: not re-run |

Order is strict: each stage builds on the previous one.

## Out of scope

- `~/.codex/prompts` or any machine-wide path.
- Reasoning-effort config.
- Enforcing read-only (impossible in the agent file).
- A second agent template tree, extra CLI commands, npm dependencies.
- Codex features beyond the row (MCP config, `config.toml` edits).

## Risks

- Field names and hook matcher come from doc summaries.
- `gpt-6-sol` and `gpt-6.1-sol` availability varies per account.
- The hook does not run until the project is trusted and the hook is reviewed in `/hooks`.
- `.agents/skills` may be shared with other tools: identical content is fine, never delete foreign entries.

## Shared constraints (all stages)

- Host-table model: new row fields and format adapters, no `if (id === "codex")` scattered through skills, no second template tree.
- No new `seh` CLI subcommands; no `npm install -g`; never write to `~/.codex/` or any machine-wide path.
- Tests per CLAUDE.md "Tests". Run the narrowest test, then `npm test` at stage end. Do not weaken or delete tests.
- Versioning: one minor bump for the whole change set, done in stage 05. Earlier stages do not bump.
- `README.md` only in stage 05, last, Codex additions only.
