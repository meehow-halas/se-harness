# Phase 16 — OpenCode full support

## Goal

Phase 13 added the OpenCode row. It wrote files to the right directories, but several of them do not work in OpenCode V2:

- The user cannot type `/<prefix>setit-se` or any work skill, because OpenCode skills are not slash commands.
- Agent frontmatter carries Claude Code fields.
- The update-check plugin uses the V1 plugin shape.

This phase fixes those gaps. It stays inside the host-table model: new row fields and format adapters, not a second tree.

## Findings (OpenCode V2 docs, read 2026-11-13)

| # | Area | Today | OpenCode V2 | Impact |
|---|------|-------|-------------|--------|
| F1 | User invocation | Skills only, in `.opencode/skills/<prefix><name>/` | Skills load through the `skill` tool or `@id`. The user types `/name` only for files in `.opencode/commands/<name>.md` (body template, `$ARGUMENTS`, frontmatter `description`, `agent`, `model`, `subagent`) | **Blocker.** `/<prefix>setit-se` does not exist for the user after install |
| F2 | Agent frontmatter | Template `name:`, `tools: Read, Glob, …` (Claude string) | Name comes from the filename. `tools`, `temperature`, `permission`, `prompt` are listed as legacy and "do not use". Fields: `description`, `mode`, `model`, `permissions`, `steps`, `hidden`, … | **Blocker (verified).** architect, implementer, and reviewer are skipped ("agent file skipped"). Consultant loads with a warning |
| F3 | Read-only roles | Only the consultant has `permissions: edit deny` | Use a `permissions` list (`action` / `resource` / `effect`). The V2 action name for bash is `shell` | Architect "read-only on app code" is not enforced. Acceptable, see Decisions |
| F4 | Plugin | `export async function SehCheckUpdate(ctx)` returns `{ event }`. Listens for `session.created` | `export default Plugin.define({ id, async setup(ctx) {...} })`. Events come from `ctx.event.subscribe`. `session.created` is **not documented**. Injection through `ctx.session.instructions.entry.put` (exists) or `ctx.session.hook("context", e => e.system.push(...))` | **Blocker (verified).** `LoadError`: the default export is a function, not `{ id, setup }` |
| F5 | Skill ID | `_setit-se`, `_planit`, … (default prefix `_`) | The recommended ID pattern is `^[a-z0-9]+(-[a-z0-9]+)*$`. V2 "currently does not enforce" it | The ID is not validated (verified). Note-level risk only |
| F6 | Claude compat | Install writes both `.claude/skills/` and `.opencode/skills/` | OpenCode **also reads** `.claude/skills` (and `.agents/skills`) | Last write wins, with no warning. Probably `.opencode` wins (plugin order). Risk to grillit host detection |
| F7 | Hide work skills from auto-invoke | Cursor gets `disable-model-invocation: true` | OpenCode supports the same field, plus `metadata.opencode/autoinvoke: false` | Parity with Cursor, otherwise the model may start `shipit` on its own |
| F8 | Brainstorm model | grillit launches each persona with `agents.brainstorm.model[<host>]` | The subagent model is fixed per agent file. The task tool takes no per-call model | **Not a gap (verified).** The `subagent` tool takes `model`, and so does Cursor. Only the grillit wording changes |
| F9 | `modelSuggest` | `anthropic/claude-opus-4-5`, `anthropic/claude-haiku-4-5`, sonnet `5-5` | — | Mixed model generations. Patch-level fix |
| F10 | `AGENTS.md` / `CLAUDE.md` | setit-se writes `AGENTS.md` plus a `CLAUDE.md` symlink | OpenCode reads `AGENTS.md`, and `CLAUDE.md` only when no `AGENTS.md` exists | OK. No change |
| F11 | Rules | `.opencode/rules/*.md` plus the `instructions` glob in `.opencode/opencode.json` | Valid. `.opencode/opencode.json` is merged with the root config | OK. No change |

## In scope

1. **Commands adapter (F1).** New host field `commandsDir` (`.opencode/commands`; `null` for Claude and Cursor).
   - `seh install` writes the install-owned `<commandsDir>/<prefix>setit-se.md`. `seh uninstall` removes only that file, and empty dirs are pruned.
   - `/<prefix>setit-se` writes `<prefix><name>.md` for each work skill. Regeneration and prefix-change cleanup handle these files the same way as skill directories.
   - Command body: a thin wrapper that tells the model to load skill `<prefix><name>` with the `skill` tool, follow it, and pass `$ARGUMENTS`.
   - Frontmatter: `description` only. No `agent:` (the skill runs in the main session). No `subagent: true`, because work skills run Implementer inline.
   - The wrapper template lives in the package, `references/opencode-command.md`, with `{{prefix}}` / `{{name}}` / `{{description}}` tokens.
2. **Agent frontmatter adapter (F2, F3).** For `id: opencode`:
   - Drop `name:` and `tools:`.
   - Keep `description`, `model`, and `mode: subagent`.
   - Consultant: `permissions` denies `edit` (already done).
   - Read-only enforcement for other roles is **not** added (see Decisions).
   - Describe it as a field-driven adapter (`agentFormat: "opencode"` in the row), not `if (id === …)` scattered through the skill.
3. **Plugin V2 (F4).** Rewrite `references/opencode-check-update.js`:
   - Default export is a plain object `{ id: "seh-check-update", setup(ctx) }`. If `Plugin.define` turns out to be more than an identity helper, record that here. No npm dependency (phase 13 boundary).
   - Inject the notice once per session through `ctx.session.instructions.entry.put` with key `seh-update`.
   - Trigger: the documented session event, verified against `V2EventEncoded`. If no event is documented, compute the notice once in `setup`, then put it on the first `context` hook per sessionID.
   - Fail-open is unchanged.
4. **Hide work skills (F7).** For OpenCode, add `disable-model-invocation: true` on copied work skills. Same rule as Cursor: apply it through a row field (`skillHideField`), not through the host id.
5. **Duplicate skills (F6).** Pick one option:
   - (a) Write OpenCode skills **only** to `.opencode/skills/` and document `OPENCODE_DISABLE_CLAUDE_CODE_SKILLS=1` in the consumer `AGENTS.md`.
   - (b) Accept the duplicates when the content is identical. Needs a manual test of which copy wins and whether OpenCode warns.

   Default: (b) plus a test. Move to (a) only if OpenCode errors or warns.
6. **Brainstorm model (F8).** Verified: both OpenCode and Cursor accept a model per subagent launch. `/<prefix>grillit` says explicitly to pass `agents.brainstorm.model[<host.id>]` as the launch's model parameter. There is no carrier agent. grillit's host detection must not rely only on `skillsDir` (see answer 4).
7. **`modelSuggest` (F9).** `anthropic/claude-opus-5-5`, `anthropic/claude-sonnet-5-5`, `anthropic/claude-haiku-5-5`, and the same in the config skeleton and `harness.config.md`.
8. **PRD.** Update What install writes, `/<prefix>setit-se` generation, Decisions, and the `hosts.json` fields. The PRD wins, so update it **first**.

## Out of scope

- A Codex adapter.
- `sessionSpawn` for OpenCode. It stays `manual`. A session fan-out through the OpenCode SDK is a new scope.
- Read-only `permissions` on architect and reviewer.
- Editing the root `opencode.json`.
- Writing to `~/.config/opencode/`.
- New CLI subcommands.
- README.

## Decisions

- D1: Commands are thin wrappers around skills. One source of procedure (`SKILL.md`), no duplicated body.
- D2: Architect has no `permissions` deny, because it must write spec and prompt files. Enforcing "read-only on app code" needs per-path rules, which is a new scope.
- D3: Every OpenCode adapter is driven by a field in the host row. This continues phase 8: no `if (id === "opencode")` in the CLI.
- D4: The `_` prefix stays. If OpenCode starts enforcing the ID pattern, that is a breaking change and a new version scope.

## Outputs

| Path | What |
|------|------|
| `docs/prd.md` | Commands, agent format, plugin V2, grillit host detection |
| `references/hosts.json` | `commandsDir`, `agentFormat`, `skillHideField`, `modelSuggest` |
| `references/opencode-command.md` | Command wrapper template |
| `references/opencode-check-update.js` | V2 plugin |
| `references/harness.config.json` / `.md` | Model ids |
| `src/cli.js` | Install and uninstall the setup command in `commandsDir`. `loadHosts` validates the new fields |
| `src/cli.test.js` | Command written and removed. A second install does not duplicate it. `--prefix` changes the file name. Other commands are untouched |
| `references/opencode-check-update.test.js` | Import the plugin with a fake `ctx` (stub `event.subscribe`, `session.instructions.entry.put`) and a stub `.seh/scripts/check-update`. Assert one put per session with key `seh-update`, nothing on empty stdout, and no throw on errors. Add the file to `npm test`. Install must not copy it |
| `skills/setit-se/SKILL.md` | Commands per work skill, OpenCode agent frontmatter, hide field, cleanup |
| `skills/grillit/SKILL.md` | Brainstorm carrier agent |
| `references/AGENTS.md` | `/<prefix>…` on OpenCode = command. Optional compat env |
| `CHANGELOG.md` | Under `[1.1.0]` (not yet tagged): Added / Fixed |

## Done when

- After `seh install`, OpenCode shows `/<prefix>setit-se` in the command list. Manual test on a real OpenCode V2.
- After `/<prefix>setit-se`, OpenCode shows `/<prefix>planit`, `doit`, `checkit`, `shipit`, `grillit`, and each one loads its skill.
- The four agents in `.opencode/agents/` load without warnings and are visible as subagents. The consultant cannot edit.
- The plugin loads, and a new session shows the notice once when a newer tag is stubbed.
- The skill duplication decision is recorded (option a or b) with the result of the manual test.
- `npm test` is green. `seh uninstall` leaves no seh files in `.opencode/` (except generated ones) and prunes empty dirs.
- Phase index: row 16 is `done`.

## Verified answers (OpenCode source `anomalyco/opencode@dev`, 2026-11-13)

Read from source, not run: OpenCode is not installed locally. The final manual test on a real OpenCode V2 is still in **Done when**.

1. **`session.created` exists.** It is a durable event in `packages/schema/src/session-event.ts`. The envelope is `{ type, data }`, so the session id is in `event.data.sessionID` (not `properties`). Plugins receive events through `ctx.event.subscribe({ types })`, an `AsyncIterable`. There is no `event:` key in the returned object.
2. **The V1 plugin shape does not load.** `packages/core/src/plugin/module.ts` requires `default` to be `{ id: string, setup: fn }` or `{ id, effect: fn }`. Otherwise it raises `LoadError` "Plugin must export a default definition with an id and an effect or setup function". Today the plugin exports a function as `default`, so it fails to load. **Confirmed manually (2026-11-13):** at startup in a consumer project, the OpenCode TUI shows `Plugin failed: …/.opencode/plugins/seh-check-update.js` ("Run /plugins to view details"). **F4 is a blocker.** Regression test: an import of the plugin must have `default.id` (string) and `default.setup` (function). `Plugin.define` is an identity function (`packages/plugin/src/promise/plugin.ts`), so a plain object is enough and needs no npm dependency. `ctx.session.instructions` exists (`Pick<ExperimentalSessionApi, "wait" | "instructions">`). `.opencode/plugin/` and `.opencode/plugins/` are both discovered, and single `.js` files are accepted.
3. **Commands.** Files are discovered by `{command,commands}/**/*.md`. The name is the relative path without `.md`, so `_setit-se.md` becomes `/_setit-se` (no name validation). `$ARGUMENTS` is the whole user input, and `$1`… are positional. With no placeholder, the input is appended to the template. Without `agent:` / `subagent:` the command runs in the current session, which is what work skills need (Implementer inline). No skill-to-command mechanism exists in core, so **F1 is confirmed**.
4. **Duplicate skills.**
   - `ConfigCompatibilityPlugin` (`.claude/skills`, `.agents/skills`) and `ConfigSkillPlugin` (`.opencode/skill(s)`) both add into one `Map` by ID (`editor.add` → `skills.set`). The last one wins, with no warning.
   - Registration order in `plugin/internal.ts`: compatibility, then config skill. Transforms run "in order", so **the `.opencode/skills` copy probably wins**. That relies on startup order, not on a contract.
   - Risk: if the `.claude` copy wins, `/<prefix>grillit` detects the host by `skillsDir` and picks `claude-code`, which means the wrong models and the wrong `agentsDir`.
   - Decision: keep (b) and add a manual test. Also make grillit's host detection robust: on OpenCode, the skill should resolve the host by the presence of the `skill` tool, or the command should pass `Host: opencode` in its arguments.
   - The skill ID has no validation (`Schema.String` brand), so the `_` prefix works. **F5 drops to note level.**
5. **Brainstorm model (F8) is not a gap.**
   - OpenCode: the `subagent` tool takes an optional `model` (`"providerID/modelID[#variant]"`, `packages/core/src/tool/plugin/subagent.ts`). Its description says to set it only when the user asks. A configured `agents.brainstorm.model` counts as that, so grillit should say explicitly "pass `model`".
   - Cursor: "The parent agent can name a model when it launches a subagent."
   - Scope item 6 (carrier agent) **is dropped**. In its place, one sentence in grillit.
6. **New, critical (F2):** `packages/core/src/config/plugin/agent.ts` sorts agent files into two paths:
   - When a file has unsupported keys (`name`, `tools`) and no native key (`permissions`, `request`, `system`, `disabled`), it goes down the **V1 legacy path**. There, `tools` must be an object (`ConfigPermissionV1.Entries`), and a string `Read, Glob, …` fails with the warning "agent file skipped". **So `architect`, `implementer`, and `reviewer` do not load in OpenCode today.** Consultant has `permissions`, so it takes the V2 path, gets only an "ignored unsupported agent fields" warning, and loads.
   - Fix: drop `name` and `tools` for OpenCode. The agent name comes from the file name.

## Progress

- Scope item 3 (plugin V2) is done (2026-11-13), with `references/opencode-check-update.test.js` in `npm test`. Manual check passed in `seh-test-jira` (2026-11-13): the plugin loads.
- Scope item 1 (commands, F1) is done (2026-11-13). The template is `references/host-command.md` (one host-neutral wrapper, not `opencode-command.md`). PRD, CLI, tests, `/<prefix>setit-se`, and consumer `AGENTS.md` are updated. Manual check: `/_setit-se` appears in OpenCode. On a later run, `/_setit-se` did not generate the work-skill commands, because VERSION was equal to `generatedFrom`. Fix: a repair rule in `/<prefix>setit-se` that regenerates when a generated agent, work skill, or host command is missing. Re-check passed in `seh-test-jira` (2026-11-13): after `/_setit-se`, the work-skill commands appear in OpenCode.

## User decisions (2026-11-13)

- Duplicate skills: option (b). Write both `.claude/skills` and `.opencode/skills`. Add a manual test and make grillit host detection robust.
- Versioning: add to the untagged `[1.1.0]` entry in `CHANGELOG.md`. No bump.
- Manual test on real OpenCode V2: done by the user in `seh-test-jira`, with a checklist from the implementer (`/plugins`, `/<prefix>…` commands, agent list).
