# Prompt — implementation-plan stage 08: Multi-host (Claude Code + Cursor)

Implement stage `08` of `docs/implementation-plan` only. Requires stages `01`–`07` = `done`. Historical stage: status `done` in the original plan.

## Repo context

- Repo `se-harness`. Hosts are rows in `references/hosts.json`. This version: Claude Code and Cursor Agent. A later host = new row + format adapter, not a second product.
- CLI reads `hosts.json` from the package, not from `.seh/`.
- No `if (id === "claude-code")`, except the Cursor frontmatter adapter (`readonly` / `disable-model-invocation`) named in the row.
- Install always writes all rows; never ask which hosts.
- Read `docs/prd.md` first (Package layout, Binding flow, What install writes, Decisions 17–19).
- Versioning: shipped dirs → version bump in the same change (CLAUDE.md).

## Stage spec

### Goal

Write live `/<prefix>setit-se`, work skills, agents and rule packs into every supported host tree.

### Scope in

- `references/hosts.json` host table.
- CLI install/uninstall writes and removes `/<prefix>setit-se` in every `skillsDir`.
- Setup generates live agents, work skills and rules for every host.
- Cursor rules as `.mdc` (`description`, `globs`, `alwaysApply: false`); Cursor consultant copies `readonly: true`; Cursor work-skill copies `disable-model-invocation: true`.
- Work skills, brainstorm and consumer `AGENTS.md` read paths from the host table.
- Brainstorm members and app context written to every `brainstormDir`.
- `rulesExt === ".mdc"` vs `".md"` drives the rule adapter.

### Scope out

- Codex adapter. Per-host role models (stage 09). Extra CLI commands. Global paths. README sync.

### Acceptance criteria

- `seh install` writes `/<prefix>setit-se` under `.claude/skills/` and `.cursor/skills/`.
- `seh uninstall` removes those setup skills, prunes empty host dirs, leaves generated files and other skills.
- Setup documents the loop over `.seh/references/hosts.json`.
- Consumer `AGENTS.md` and work skills do not treat `.claude/` as the only live location.

### Depends on

- 01–07 = `done`.

## Constraints

- Do not commit unless the user asks. Do not touch `.env` files.
- Ask one question at a time; recommended option first, labelled **(Recommended)**.

## Definition of done

- Acceptance criteria PASS with evidence (temp project listing, test output); report changed files and deviations.
