# 13 — OpenCode host

## Goal

Add OpenCode as a third row in `references/hosts.json` plus path, frontmatter and hook adapters. Same product and templates as Claude Code and Cursor Agent. Not a second tree.

## Scope in

- Host row `id: "opencode"` (`.opencode/` skills, agents, rules `.md`, brainstorm).
- `modelSuggest` in OpenCode `provider/model` form, no translation from another host.
- Skeleton role `model` maps include the `opencode` key.
- CLI copies the install-owned plugin `.opencode/plugins/seh-check-update.js`; uninstall removes only that file.
- Setup: OpenCode agent `mode: subagent`; consultant `permissions` deny `edit`; merge `.opencode/rules/*.md` into `.opencode/opencode.json` `instructions`.
- Never write `~/.config/opencode/`.

Behaviour: install reads the plugin from the package `references/opencode-check-update.js`, not from `.seh/`. Missing source → missing-file error. OpenCode auto-loads `.opencode/plugins/*.js`; install does not edit `opencode.json`. Plugin runs `.seh/scripts/check-update --host opencode` on `session.created` and injects non-empty stdout; fail-open. Setup writes `.md` packs under `.opencode/rules/` (`paths:`), then merges the glob into `.opencode/opencode.json` only. Uninstall leaves generated agents, rules, `opencode.json` and other plugins.

## Scope out

- Codex adapter. Extra CLI commands. README sync. Asking which hosts to write. A second agent template tree. The npm dependency `@opencode/plugin`. Editing project-root `opencode.json`.

## Decisions taken

- Plugin is installed from the package, auto-loaded by OpenCode, no config edit.

## Files likely touched

- `references/hosts.json`, `references/harness.config.json`, `references/harness.config.md`, `references/opencode-check-update.js`, `src/cli.js`, `src/cli.test.js`, `scripts/check-update.test.js`, `skills/setit-se/SKILL.md`, `references/AGENTS.md`

## Acceptance criteria

- `seh install` writes `/<prefix>setit-se` under `.opencode/skills/` and the check-update plugin under `.opencode/plugins/`.
- A second install does not duplicate the plugin file.
- `seh uninstall` removes the setup skill and plugin; prunes empty `.opencode/`; leaves generated files and other plugins.
- Setup documents OpenCode `mode`, consultant `permissions` and the `instructions` glob merge.
- `check-update --host opencode` prints the same plain-text notice as Claude, not Cursor JSON.
- README unchanged.

## Tests

- `src/cli.test.js` (third host), `scripts/check-update.test.js` (`--host opencode`).

## Versioning

Not recorded in the legacy plan.

## Depends on

- 08, 09, 11 = `done`.
