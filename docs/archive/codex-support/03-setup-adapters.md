# 03 — Setup adapters

## Goal

`/<prefix>setit-se` generates everything Codex needs from `.seh/`.

## Scope in

Files: `skills/setit-se/SKILL.md`, `references/harness.config.json` / `.md`.

- Agents: field-driven `agentFormat: "codex-toml"`. Frontmatter to fields; body to `developer_instructions` as a TOML multi-line literal string safe against `'''` and backslashes; `name` from the role; `model` only when set (from `agents.roles.<role>.model["codex"]`), otherwise omitted. Consultant: a read-only sentence in the instructions (not enforceable).
- Model keys: `codex` key in the config skeleton and `harness.config.md`; `modelSuggest` offered as the suggested answer, "no change" accepted.
- Work skills: write `agents/openai.yaml` with `policy.allow_implicit_invocation: false` (`skillHide: "openai-yaml"`).
- Rules: packs to `.codex/rules/*.md`; idempotent seh-managed section in `AGENTS.md` ("read `<file>` when working on `<paths>`"), shown to the user before writing like the rest of `AGENTS.md`.
- User notice: trust the project and review hooks in `/hooks`; until then the update check does not run.
- Cleanup: prefix change and regeneration remove old `.agents/skills/<oldprefix>*` entries and their `openai.yaml`; never foreign entries.
- Tests where logic is executable (TOML conversion, rules section). Fixtures use quotes, backslashes, `'''`, a non-default model, an unset model. Output must parse as TOML.

## Scope out

- Runtime wording in other skills (stage 04).

## Decisions taken

- Drive adapters from row fields (`agentFormat`, `skillHide`, `rulesDir`), not host-id branches.
- Executable TOML conversion goes in a testable unit with `*.test.js` next to it (`seh install` must not copy tests).
- Re-read Codex subagent docs to confirm TOML field names before coding.

## Files likely touched

- `skills/setit-se/SKILL.md`, `references/harness.config.json`, `references/harness.config.md`, plus the TOML unit and its test.

## Acceptance criteria

- A generation run in a temp project yields valid TOML agents, `openai.yaml` per work skill, rules files, and one idempotent `AGENTS.md` section.
- Rerun changes nothing.

## Tests

- New test file, then `npm test`.

## Versioning

No version bump in this stage (stage 05).

## Depends on

- 02 = `done`.
