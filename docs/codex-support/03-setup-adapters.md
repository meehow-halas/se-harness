# Stage 3 — Setup adapters

## Goal

`/<prefix>setit-se` generates everything Codex needs from `.seh/`.

## In scope (`skills/setit-se/SKILL.md`, `references/harness.config.json` / `.md`)

- **Agents:** field-driven `agentFormat: "codex-toml"`. Frontmatter to fields, body to `developer_instructions` as a TOML multi-line literal string safe against `'''` and backslashes; `name` from the role; `model` only when set (from `agents.roles.<role>.model["codex"]`), otherwise omitted. Consultant: a read-only sentence in the instructions (not enforceable).
- **Model keys:** `codex` key in the config skeleton and `harness.config.md`; `modelSuggest` offered as the suggested answer, "no change" accepted.
- **Work skills:** write `agents/openai.yaml` with `policy.allow_implicit_invocation: false` (`skillHide: "openai-yaml"`).
- **Rules:** packs to `.codex/rules/*.md`; idempotent seh-managed section in `AGENTS.md` ("read `<file>` when working on `<paths>`"), shown to the user before writing like the rest of `AGENTS.md`.
- **User notice:** trust the project and review hooks in `/hooks`; until then the update check does not run.
- **Cleanup:** prefix change and regeneration remove old `.agents/skills/<oldprefix>*` entries and their `openai.yaml`; never foreign entries.
- Tests where the logic is executable (TOML conversion, rules section); fixtures use quotes, backslashes, `'''`, a non-default model, an unset model. Output must parse as TOML.

## Out of scope

Runtime wording in other skills (stage 4).

## Done when

A generation run in a temp project yields valid TOML agents, `openai.yaml` per work skill, rules files, and one idempotent `AGENTS.md` section; rerun changes nothing.
