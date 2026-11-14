# Prompt — implementation-plan stage 16: OpenCode full support

Implement stage `16` of `docs/implementation-plan` only. Requires stage `13` = `done`. Historical stage: status `done` in the original plan (2026-11-14). The manual checks listed in the stage spec were run by the user on OpenCode V2 and are recorded there.

## Repo context

- Repo `se-harness`. OpenCode V2 requires: commands in `.opencode/commands/<name>.md` for user-typed `/<prefix>…`; agent files without `name` / `tools`; plugin default export `{ id, setup }`.
- Stay inside the host-table model: row fields and format adapters, no second tree, no `if (id === "opencode")` in the CLI (agent frontmatter adapter excepted, see stage spec).
- Decisions D1–D4 and user decisions (duplicate skills option b; changelog under untagged `[1.1.0]`; no bump) are settled.
- Read `docs/prd.md` first and update it before code (scope item 8).
- Versioning: shipped dirs → changelog entry under `[1.1.0]` (untagged); no new bump.

## Stage spec

### Goal

Make OpenCode work for the user: commands, agent frontmatter, plugin V2, hidden work skills, model suggestions.

### Scope in

1. Commands adapter (F1): row field `commandsDir` (`.opencode/commands`; `null` for Claude and Cursor). Install writes `<commandsDir>/<prefix>setit-se.md`; uninstall removes it and prunes empty dirs. Setup writes `<prefix><name>.md` per work skill, cleanup like skill dirs. Template `references/host-command.md` with `{{prefix}}`, `{{name}}`, `{{description}}`, `{{host}}`; body loads skill `<prefix><name>` via the `skill` tool and passes `$ARGUMENTS`; frontmatter `description` only (no `agent:`, no `subagent: true`); includes a `Host: <id>` line.
2. Agent frontmatter adapter (F2, F3) for `id: opencode`: drop `name:` and `tools:`; keep `description`, `model`, `mode: subagent`; consultant `permissions` denies `edit`. Keyed on `id === "opencode"` next to existing `mode` / `permissions` rules. Repair rule: an agent in the wrong shape counts as missing.
3. Plugin V2 (F4): `references/opencode-check-update.js` default export `{ id: "seh-check-update", setup(ctx) }`; notice once per session via `ctx.session.instructions.entry.put` key `seh-update`; `session.created` via `ctx.event.subscribe`, session id in `event.data.sessionID`; check per session (OpenCode Desktop keeps a background server). Fail-open. Regression test: default export has `id` (string) and `setup` (function). Test file `references/opencode-check-update.test.js` in `npm test`; not copied by install.
4. Hide work skills (F7): `disable-model-invocation: true` on copied work skills via row field `skillHideField`.
5. Duplicate skills (F6): option (b) — write both `.claude/skills` and `.opencode/skills`; manual test of which copy wins; grillit host detection robust (prefer the `Host:` line in the command over `skillsDir`).
6. Brainstorm model (F8): grillit passes `agents.brainstorm.model[<host.id>]` explicitly on each subagent launch.
7. `modelSuggest` (F9): `anthropic/claude-opus-5-5`, `anthropic/claude-sonnet-5-5`, `anthropic/claude-haiku-5-5`; same in config skeleton and `harness.config.md`.
8. PRD updated first: What install writes, setup generation, decisions, `hosts.json` fields.

Decisions: D1 commands are thin wrappers around `SKILL.md`; D2 architect has no permissions deny; D3 every OpenCode adapter driven by a row field; D4 `_` prefix stays.

### Scope out

- Codex. `sessionSpawn` for OpenCode (stays `manual`). Read-only permissions on architect and reviewer. Root `opencode.json` edits. `~/.config/opencode/`. New CLI subcommands. README.

### Acceptance criteria

- After `seh install`, OpenCode shows `/<prefix>setit-se`. Manual check on OpenCode V2.
- After setup, OpenCode shows `/<prefix>planit`, `doit`, `checkit`, `shipit`, `grillit`; each loads its skill.
- Four agents load without warnings; consultant cannot edit.
- Plugin loads; a new session shows the notice once when a newer tag is stubbed.
- Duplicate-skill decision recorded with manual test result.
- `npm test` green. Uninstall leaves no seh files in `.opencode/` except generated ones and prunes empty dirs.

### Depends on

- 13 = `done`.

## Constraints

- Do not commit unless the user asks. Do not touch `.env` files. Do not write to `~/.config/opencode/`.
- Ask one question at a time; recommended option first, labelled **(Recommended)**.

## Definition of done

- Acceptance criteria PASS with test output and manual-check results quoted; report changed files and deviations.
