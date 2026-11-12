# Phase 8 — Multi-host (Claude Code + Cursor)

## Goal

Write live `/seh-setup`, work skills, agents, and rule packs into **every** supported host tree. Supported hosts are the rows in `references/hosts.json`. This version: Claude Code and Cursor Agent. A later host is a new row plus a format adapter, not a second product.

## In scope

- `references/hosts.json` as the host table (copied to `.seh/references/` on install).
- CLI `install` / `uninstall` writes and removes `/seh-setup` in **every** `skillsDir`.
- `/seh-setup` generates live agents, work skills, and rules for every host.
- Cursor rule files as `.mdc` (`description`, `globs`, `alwaysApply: false`).
- Cursor consultant copies: `readonly: true`. Cursor work-skill copies: `disable-model-invocation: true`.
- Work skills, brainstorm, and consumer `AGENTS.md` read paths from the host table.
- Brainstorm live members and app context written to every `brainstormDir`.

## Out of scope

- A Codex adapter (TOML agents, `.codex/` or `.agents/skills`). Leave the table as the hook.
- Per-host role models.
- Extra CLI commands (`seh host`).
- Global / machine-wide paths (`~/.claude/`, `~/.cursor/`).
- README sync.
- Asking the user which hosts to write (always all rows).

## Inputs

- PRD: Package layout (`hosts.json`); Binding flow; What install writes; Runtime config; `/seh-setup` generation; Decisions 17–19; Deferred (Codex, per-host models).
- Phase 1 CLI; phase 5 `/seh-setup`; phase 6 work skills; phase 7 brainstorm.

## Outputs

| Path | What |
|------|------|
| `references/hosts.json` | Host table |
| `src/cli.js` | Install/uninstall loop over `skillsDir` |
| `skills/seh-setup/SKILL.md` | Generation loop and rule/frontmatter adapters |
| Work skills + `/seh-brainstorm` + `references/AGENTS.md` | Host-table paths |

## Behaviour

Cite the PRD. Do not restate every question.

- CLI reads `references/hosts.json` from the **package**, not from the consuming `.seh/` (uninstall still works after `.seh/` is gone).
- Missing or empty `hosts.json` → install/uninstall fails with a missing-file error.
- `rulesExt === ".mdc"` vs `".md"` drives the rule adapter. Do not `if (id === "claude-code")` except where a field in the row already names the difference (`readonly` / `disable-model-invocation` for `id === "cursor"` is allowed as the Cursor skill/agent frontmatter adapter).
- Live files stay **copies**. Install still does not generate agents, work skills, or rules.

## Done when

- `seh install` writes `/seh-setup` under both `.claude/skills/` and `.cursor/skills/`.
- `seh uninstall` removes those setup skills and prunes empty host dirs; leaves generated files and other skills.
- `/seh-setup` documents the loop over `.seh/references/hosts.json`.
- Consumer `AGENTS.md` and work skills do not treat `.claude/` as the only live location.

## Handoff

A later Codex slice adds a row and a TOML/agents adapter. Do not invent that row here.
