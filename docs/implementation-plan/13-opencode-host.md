# Phase 13 — OpenCode host

## Goal

Add OpenCode as a third row in `references/hosts.json` plus path/frontmatter/hook adapters. Same product and templates as Claude Code and Cursor Agent. Not a second tree.

## In scope

- Host row `id: "opencode"` (`.opencode/` skills, agents, rules `.md`, brainstorm).
- `modelSuggest` in OpenCode `provider/model` form. No translation from another host.
- Skeleton role `model` maps include the `opencode` key.
- CLI copies install-owned plugin `.opencode/plugins/dhs-check-update.js`; uninstall removes only that file.
- `/dhs-setup`: OpenCode agent `mode: subagent`; consultant `permissions` deny `edit`; merge `.opencode/rules/*.md` into `.opencode/opencode.json` `instructions`.
- Consumer `AGENTS.md` / setup: never write `~/.config/opencode/`.

## Out of scope

- A Codex adapter (TOML agents, `.codex/` / `.agents/skills`).
- Extra CLI commands.
- README sync.
- Asking which hosts to write (always all rows).
- A second agent template tree.
- npm dependency `@opencode/plugin`.
- Editing project-root `opencode.json`.

## Inputs

- PRD: Package layout (`hosts.json`); Binding flow; What install writes; Runtime config; `/dhs-setup` generation; Decisions 17–19, 21.
- Phase 8 host table; phase 9 model maps; phase 11 session update check.

## Outputs

| Path | What |
|------|------|
| `references/hosts.json` | OpenCode row |
| `references/harness.config.json` / `.md` | `opencode` model keys |
| `references/opencode-check-update.js` | Install-owned plugin source |
| `src/cli.js` | `opencode-plugin` copy/remove |
| `src/cli.test.js` | Third host install/uninstall |
| `scripts/check-update.test.js` | `--host opencode` plain text |
| `skills/dhs-setup/SKILL.md` | Agent/rules/instructions adapters |
| `references/AGENTS.md` | Machine-wide path |

## Behaviour

Cite the PRD. Do not restate every question.

- Install reads the plugin from the **package** `references/opencode-check-update.js`, not from the consuming `.dhs/`.
- Missing plugin source → install fails with a missing-file error.
- OpenCode auto-loads `.opencode/plugins/*.js`. Do not edit `opencode.json` on install.
- Plugin runs `.dhs/scripts/check-update --host opencode` on `session.created` and injects non-empty stdout. Fail-open.
- Setup writes `.md` packs under `.opencode/rules/` (`paths:`). Then merges the glob into `.opencode/opencode.json` only.
- Uninstall leaves generated agents, rules, `.opencode/opencode.json`, and other plugins.

## Done when

- `dhs install` writes `/dhs-setup` under `.opencode/skills/` and the check-update plugin under `.opencode/plugins/`.
- A second install does not duplicate the plugin file.
- `dhs uninstall` removes that setup skill and plugin; prunes empty `.opencode/`; leaves generated files and other plugins.
- `/dhs-setup` documents OpenCode `mode` / consultant `permissions` and the `instructions` glob merge.
- `check-update --host opencode` prints the same plain-text notice as Claude, not Cursor JSON.
- Codex is still Deferred. README is unchanged.

## Handoff

A later Codex slice still adds a row and a TOML/agents adapter. Do not invent that row here.
