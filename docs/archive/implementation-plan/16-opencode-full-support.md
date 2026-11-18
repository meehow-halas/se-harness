# 16 — OpenCode full support

## Goal

Phase 13 added the OpenCode row and wrote files to the right directories, but several did not work in OpenCode V2: no user-typed `/<prefix>…` commands, agent frontmatter carried Claude Code fields, and the update plugin used the V1 shape. Fix these inside the host-table model: new row fields and format adapters, not a second tree.

## Findings (OpenCode V2 docs and source, read 2026-11-13)

| # | Area | Problem | Impact |
|---|------|---------|--------|
| F1 | User invocation | Skills load through the `skill` tool or `@id`. User types `/name` only for `.opencode/commands/<name>.md` | Blocker: `/<prefix>setit-se` does not exist for the user |
| F2 | Agent frontmatter | `name:` and `tools:` (Claude fields) are unsupported. Name comes from the filename | Blocker (verified): architect, implementer, reviewer skipped |
| F3 | Read-only roles | Only consultant has `permissions` deny edit; V2 uses `permissions` list form, bash action is `shell` | Architect read-only not enforced (accepted, see D2) |
| F4 | Plugin | Default export must be `{ id, setup(ctx) }`; V1 function export → `LoadError` | Blocker (verified at startup in a consumer project) |
| F5 | Skill ID | Recommended pattern not enforced | Note level only |
| F6 | Claude compat | OpenCode also reads `.claude/skills` and `.agents/skills`; last write wins silently | Risk to grillit host detection |
| F7 | Auto-invoke | Work skills should not auto-invoke | Add `disable-model-invocation: true` (plus OpenCode `autoinvoke: false`) |
| F8 | Brainstorm model | `subagent` tool accepts `model` per launch | Not a gap; grillit wording only |
| F9 | `modelSuggest` | Mixed model generations | Patch-level fix to `anthropic/claude-*-5-5` |
| F10 | `AGENTS.md` / `CLAUDE.md` | OK | No change |
| F11 | Rules | OK via `.opencode/rules/*.md` and `instructions` glob | No change |

## Scope in

1. Commands adapter (F1): new host field `commandsDir` (`.opencode/commands`; `null` for Claude and Cursor). Install writes `<commandsDir>/<prefix>setit-se.md`; uninstall removes only that file and prunes empty dirs. Setup writes `<prefix><name>.md` per work skill, with cleanup as for skill dirs. Command body: thin wrapper telling the model to load skill `<prefix><name>` with the `skill` tool and pass `$ARGUMENTS`. Frontmatter `description` only (no `agent:`, no `subagent: true`: work skills run inline). Template `references/host-command.md` with `{{prefix}}` / `{{name}}` / `{{description}}` / `{{host}}` tokens.
2. Agent frontmatter adapter (F2, F3): for `id: opencode` drop `name:` and `tools:`; keep `description`, `model`, `mode: subagent`; consultant `permissions` denies `edit`. Read-only enforcement for other roles not added. Adapter keyed on `id === "opencode"` next to the existing `mode` / `permissions` rules (phase 8 exception), no new `agentFormat` field.
3. Plugin V2 (F4): rewrite `references/opencode-check-update.js` as a default export plain object `{ id: "seh-check-update", setup(ctx) }`. No npm dependency. Inject the notice once per session through `ctx.session.instructions.entry.put` with key `seh-update`. Session event verified against the source: `session.created` via `ctx.event.subscribe`, id in `event.data.sessionID`. Fail-open unchanged.
4. Hide work skills (F7): `disable-model-invocation: true` on copied work skills, applied through a row field (`skillHideField`), not host id.
5. Duplicate skills (F6): option (b), accept duplicates when content is identical, with a manual test of which copy wins.
6. Brainstorm model (F8): grillit passes `agents.brainstorm.model[<host.id>]` explicitly as the launch model. No carrier agent.
7. `modelSuggest` (F9): `anthropic/claude-opus-5-5`, `anthropic/claude-sonnet-5-5`, `anthropic/claude-haiku-5-5`; same in config skeleton and `harness.config.md`.
8. PRD updated first: What install writes, setup generation, decisions, `hosts.json` fields.

## Scope out

- Codex adapter. `sessionSpawn` for OpenCode (stays `manual`). Read-only permissions on architect and reviewer. Editing root `opencode.json`. Writing `~/.config/opencode/`. New CLI subcommands. README.

## Decisions taken

- D1: Commands are thin wrappers around skills; one source of procedure (`SKILL.md`).
- D2: Architect has no permissions deny (it writes spec and prompt files).
- D3: Every OpenCode adapter is driven by a row field (continues phase 8).
- D4: The `_` prefix stays; enforcing the ID pattern later would be a breaking change and a new scope.
- User decision (2026-11-13): duplicate skills option (b); add to the untagged `[1.1.0]` changelog entry; no version bump; manual test on OpenCode V2 done by the user in a test project.

## Files likely touched

- `docs/prd.md`, `references/hosts.json`, `references/host-command.md`, `references/opencode-check-update.js`, `references/opencode-check-update.test.js`, `references/harness.config.json` / `.md`, `src/cli.js`, `src/cli.test.js`, `skills/setit-se/SKILL.md`, `skills/grillit/SKILL.md`, `references/AGENTS.md`, `CHANGELOG.md`

## Acceptance criteria

- After `seh install`, OpenCode shows `/<prefix>setit-se`. Manual test on OpenCode V2.
- After `/<prefix>setit-se`, OpenCode shows `/<prefix>planit`, `doit`, `checkit`, `shipit`, `grillit`, each loading its skill.
- The four agents in `.opencode/agents/` load without warnings and are visible as subagents; consultant cannot edit.
- The plugin loads; a new session shows the notice once when a newer tag is stubbed.
- Duplicate-skill decision recorded with the manual test result.
- `npm test` green. `seh uninstall` leaves no seh files in `.opencode/` except generated ones and prunes empty dirs.
- Plugin regression: default export has `id` (string) and `setup` (function).

## Progress (recorded in the original plan)

- Plugin V2 done (2026-11-13); manual check passed in a test project. Notice end to end checked (2026-11-14) after the plugin switched to per-session checks, because OpenCode Desktop keeps a background server.
- Commands done (2026-11-13); `/_setit-se` appears; a repair rule regenerates missing generated files (agents, work skills, host commands). Re-check passed.
- Agents done (2026-11-13); manual check passed: copies have no `name` or `tools`, all four reachable.
- F7 and F9 done; manual check passed.
- grillit hardening done: host commands carry `Host: <id>`; grillit prefers it over `skillsDir`; persona and facilitator launches pass the model explicitly.
- Consultant edit denial in V2 list form; accepted without exercising the permission layer.
- Phase 16 done (2026-11-14).

## Verified facts (source `anomalyco/opencode@dev`, 2026-11-13)

- Plugin loader requires `default` to be `{ id, setup }` or `{ id, effect }`. `Plugin.define` is identity.
- Commands are discovered by `{command,commands}/**/*.md`; `$ARGUMENTS` is the whole input.
- Duplicate skill IDs from `.claude/skills` and `.opencode/skills` collide in one map; last one wins (startup order, not a contract).
- Agent files with unsupported keys and no native key go to the V1 path, where a string `tools` fails; consultant with `permissions` takes the V2 path.
- The `subagent` tool accepts `model` as `providerID/modelID`.

## Depends on

- 13 = `done`.
