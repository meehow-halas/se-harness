# Codex support — plan

Status: planned. PRD (`docs/prd.md`) is updated first (stage 1) and wins over this file.

## Goal

Add Codex as a fourth host: a row in `references/hosts.json` plus format adapters. Same product and templates, no second tree. This opens a new version scope: Codex leaves PRD **Deferred** and the plan's **Out of this v1 plan**.

## Findings (Codex docs, read 2026-11-14; doc summaries, re-read the primary pages before coding)

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

## Stages

| # | File | What | Status |
|---|------|------|--------|
| 1 | `01-prd.md` | PRD and plan updated first; Codex leaves Deferred | done |
| 2 | `02-host-row-cli.md` | Host row, new fields, CLI install/uninstall, `check-update --host codex` | done |
| 3 | `03-setup-adapters.md` | `/<prefix>setit-se`: TOML agents, `openai.yaml`, rules + `AGENTS.md` section, model keys | done |
| 4 | `04-runtime-wording.md` | `invokePrefix` in skills, grillit host detection and per-persona model | done |
| 5 | `05-release.md` | Version, changelog, full test run, README last | pending |

Order is strict: each stage builds on the previous one. Each stage has a `NN-*.prompt.md` sibling; [prompt.md](prompt.md) has the read order and shared constraints.

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
