# 08 — Multi-host (Claude Code + Cursor)

## Goal

Write live `/<prefix>setit-se`, work skills, agents and rule packs into every supported host tree. Supported hosts are the rows in `references/hosts.json`. This version: Claude Code and Cursor Agent. A later host is a new row plus a format adapter, not a second product.

## Scope in

- `references/hosts.json` as the host table (copied to `.seh/references/`).
- CLI `install` / `uninstall` writes and removes `/<prefix>setit-se` in every `skillsDir`.
- Setup generates live agents, work skills and rules for every host.
- Cursor rule files as `.mdc` (`description`, `globs`, `alwaysApply: false`).
- Cursor consultant copies `readonly: true`; Cursor work-skill copies `disable-model-invocation: true`.
- Work skills, brainstorm and consumer `AGENTS.md` read paths from the host table.
- Brainstorm live members and app context written to every `brainstormDir`.

Rules: CLI reads `hosts.json` from the package (uninstall works after `.seh/` is gone). Missing or empty `hosts.json` → missing-file error. `rulesExt` drives the rule adapter. No `if (id === "claude-code")`, except the Cursor skill/agent frontmatter adapter (`readonly` / `disable-model-invocation`). Live files stay copies. Install still does not generate agents, work skills or rules.

## Scope out

- Codex adapter. Per-host role models (phase 9). Extra CLI commands. Global paths. README sync. Asking which hosts to write (always all rows).

## Decisions taken

- Host table drives paths; no host-id branches except the field-named adapters above.

## Files likely touched

- `references/hosts.json`, `src/cli.js`, `skills/setit-se/SKILL.md`, work skills, `references/AGENTS.md`

## Acceptance criteria

- `seh install` writes `/<prefix>setit-se` under both `.claude/skills/` and `.cursor/skills/`.
- `seh uninstall` removes those setup skills and prunes empty host dirs; leaves generated files and other skills.
- Setup documents the loop over `.seh/references/hosts.json`.
- Consumer `AGENTS.md` and work skills do not treat `.claude/` as the only live location.

## Tests

- `src/cli.test.js` with temp directories for both hosts.

## Versioning

Not recorded in the legacy plan.

## Depends on

- 01–07 = `done`.
