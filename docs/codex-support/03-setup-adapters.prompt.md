# Prompt — codex-support stage 03: Setup adapters

Implement stage `03` of `docs/codex-support` only. Requires stage `02` = `done` in `docs/codex-support/README.md`. If not, stop and say so.

## Repo context

- Repo: `se-harness`. CLI in v1: `seh install` and `seh uninstall` only. Never write to `~/.codex/`.
- Drive adapters from row fields (`agentFormat`, `skillHide`, `rulesDir`), not host-id branches. No second template tree.
- Codex facts (doc summaries, re-read primary docs before coding): agents in `.codex/agents/*.toml` with `name`, `description`, `developer_instructions` (required), optional `model`; subagents inherit sandbox (read-only is instruction text only); `openai.yaml` with `policy.allow_implicit_invocation: false` hides a skill from auto-invoke; rules in `.codex/rules/*.md` plus a seh-managed `AGENTS.md` section; `.agents/skills` is shared with other tools.
- Model suggestions (decision 5): architect `gpt-6-sol`; implementer, reviewer, brainstorm `gpt-6.1-sol`; consultant `gpt-6-luna`. Offered as suggested answer; "no change" accepted (field omitted, session model inherited). `model_reasoning_effort` not set.
- Tests: `*.test.js` next to the unit; fixtures use quotes, backslashes, `'''`, a non-default model, an unset model. Output must parse as TOML.
- Versioning: no version bump in this stage.

## Stage spec

### Goal

`/<prefix>setit-se` generates everything Codex needs from `.seh/`.

### Scope in

Files: `skills/setit-se/SKILL.md`, `references/harness.config.json` / `.md`.

- Agents: field-driven `agentFormat: "codex-toml"`. Frontmatter to fields; body to `developer_instructions` as a TOML multi-line literal string safe against `'''` and backslashes; `name` from the role; `model` only when set (from `agents.roles.<role>.model["codex"]`), otherwise omitted. Consultant: a read-only sentence in the instructions (not enforceable).
- Model keys: `codex` key in config skeleton and `harness.config.md`; `modelSuggest` offered as suggested answer, "no change" accepted.
- Work skills: write `agents/openai.yaml` with `policy.allow_implicit_invocation: false` (`skillHide: "openai-yaml"`).
- Rules: packs to `.codex/rules/*.md`; idempotent seh-managed section in `AGENTS.md` ("read `<file>` when working on `<paths>`"), shown to the user before writing like the rest of `AGENTS.md`.
- User notice: trust the project and review hooks in `/hooks`; until then the update check does not run.
- Cleanup: prefix change and regeneration remove old `.agents/skills/<oldprefix>*` entries and their `openai.yaml`; never foreign entries.
- Tests where logic is executable (TOML conversion, rules section).

### Scope out

- Runtime wording in other skills (stage 04).

### Decisions taken

- Adapters driven by row fields. Executable TOML conversion in a testable unit with its `*.test.js`.

### Acceptance criteria

- A generation run in a temp project yields valid TOML agents, `openai.yaml` per work skill, rules files, and one idempotent `AGENTS.md` section.
- Rerun changes nothing.

### Tests

- New test file first, then `npm test`.

### Depends on

- 02 = `done`.

## Constraints

- Do not commit unless the user asks.
- Ask one question at a time; recommended option first, labelled **(Recommended)**.

## Definition of done

- Acceptance criteria PASS with evidence; new test file and `npm test` output quoted.
- Report: changed files, deviations, unconfirmed Codex doc facts.
