# Prompt — implementation-plan stage 13: OpenCode host

Implement stage `13` of `docs/implementation-plan` only. Requires stages `08`, `09`, `11` = `done`. Historical stage: status `done` in the original plan.

## Repo context

- Repo `se-harness`. OpenCode is a third host row in `references/hosts.json` with path, frontmatter and hook adapters. Same templates; not a second tree.
- Never write `~/.config/opencode/`. Never edit the project-root `opencode.json`. No `@opencode/plugin` dependency. No Codex adapter.
- Install reads the plugin from the package, not from `.seh/`.
- Read `docs/prd.md` first (Package layout, Binding flow, What install writes, Runtime config, Decisions 17–19, 21).
- Versioning: shipped dirs → version bump in the same change (CLAUDE.md).

## Stage spec

### Goal

Add OpenCode as a third host row with adapters.

### Scope in

- Host row `id: "opencode"` (`.opencode/` skills, agents, rules `.md`, brainstorm). `modelSuggest` in `provider/model` form.
- Skeleton role `model` maps include the `opencode` key; `harness.config.md` documents it.
- CLI copies `references/opencode-check-update.js` to `.opencode/plugins/seh-check-update.js`; uninstall removes only that file; second install does not duplicate it; prunes empty `.opencode/`.
- Plugin runs `.seh/scripts/check-update --host opencode` on `session.created` and injects non-empty stdout; fail-open. Missing plugin source → missing-file error.
- Setup: OpenCode agents `mode: subagent`; consultant `permissions` deny `edit`; `.md` packs under `.opencode/rules/` (`paths:`) and their glob merged into `.opencode/opencode.json` `instructions` only.
- `check-update --host opencode` prints the same plain-text notice as Claude, not Cursor JSON.
- Uninstall leaves generated agents, rules, `opencode.json` and other plugins.

### Scope out

- Codex. Extra CLI commands. README sync. Asking which hosts to write. A second agent template tree. Editing root `opencode.json`.

### Acceptance criteria

- `seh install` writes `/<prefix>setit-se` under `.opencode/skills/` and the plugin under `.opencode/plugins/`.
- Second install does not duplicate; uninstall removes setup skill and plugin, prunes empty `.opencode/`, leaves generated files and other plugins.
- Setup documents OpenCode `mode`, consultant `permissions` and the `instructions` glob merge.
- README unchanged.

### Tests

- `src/cli.test.js` (third host); `scripts/check-update.test.js` (`--host opencode`).

### Depends on

- 08, 09, 11 = `done`.

## Constraints

- Do not commit unless the user asks. Do not touch `.env` files.
- Ask one question at a time; recommended option first, labelled **(Recommended)**.

## Definition of done

- Acceptance criteria PASS with test output quoted; report changed files and deviations.
