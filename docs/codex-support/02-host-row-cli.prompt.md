# Prompt — codex-support stage 02: Host row and CLI

Implement stage `02` of `docs/codex-support` only. Requires stage `01` = `done` in `docs/codex-support/README.md`. If not, stop and say so.

## Repo context

- Repo: `se-harness`. CLI in v1: `seh install` and `seh uninstall` only. No `npm install -g`. Never write to `~/.codex/` or any machine-wide path.
- Host-table model: new row fields and format adapters, no `if (id === "codex")` scattered through skills.
- Host row target: `id: "codex"`, `skillsDir: ".agents/skills"`, `commandsDir: null`, `agentsDir: ".codex/agents"`, `rulesDir: ".codex/rules"`, `rulesExt: ".md"`, `brainstormDir: ".codex/brainstorm"`, `projectAgentsFile: null`, `hooksFile: ".codex/hooks.json"`, `hooksEvent: "SessionStart"`, `hooksShape: "claude-nested"`, `hooksHostArg: "codex"`, `sessionSpawn: "manual"`, `agentFormat: "codex-toml"`, `modelSuggest` per decision 5.
- New optional row fields: `hooksMatcher` (`"startup|resume"` for Codex), `invokePrefix` (`"$"` for Codex, `"/"` for others), `skillHide` (`"openai-yaml"` for Codex).
- Re-read the Codex hooks docs to confirm the `hooks.json` shape before coding; state anything unconfirmed.
- Tests: `*.test.js` next to the unit; `seh install` must not copy them. Stub external boundaries only. Vary inputs.
- Versioning: no version bump in this stage.

## Stage spec

### Goal

`seh install` / `seh uninstall` handle Codex; `check-update` speaks to it.

### Scope in

- `references/hosts.json`: Codex row and new fields. Existing rows get `invokePrefix: "/"`; other new fields optional and absent for them.
- `src/cli.js`: install writes `/<prefix>setit-se` into `.agents/skills/` and merges the `SessionStart` hook (with `hooksMatcher`) into `.codex/hooks.json` without touching other hooks or keys. Uninstall removes only the setup skill and the seh hook entry; prunes empty dirs seh created; leaves `.agents/skills` when other content exists. Second install does not duplicate the hook.
- `scripts/check-update`: `--host codex` prints the plain-text notice (same as Claude).
- Tests (`src/cli.test.js`, `scripts/check-update.test.js`): fourth host install/uninstall; hook merged beside a foreign hook; foreign hook and foreign skills survive uninstall; second install idempotent; Claude's hook output unchanged (no matcher regression); `--host codex` plain text.

### Scope out

- Generation of agents, rules, skills (stage 03). Wording (stage 04).

### Decisions taken

- Model the Codex hook merge on the existing `claude-nested` merge in `src/cli.js`; `hooksMatcher` optional so Claude output stays byte-identical.

### Files likely touched

- `references/hosts.json`, `src/cli.js`, `src/cli.test.js`, `scripts/check-update`, `scripts/check-update.test.js`

### Acceptance criteria

- `npm test` passes with the new cases.
- Install then uninstall in a temp repo leaves foreign files untouched.

### Tests

- `node --test src/cli.test.js scripts/check-update.test.js`, then `npm test`. Report actual output.

### Depends on

- 01 = `done`.

## Constraints

- Do not commit unless the user asks.
- Do not touch `.env` files.
- Ask one question at a time; recommended option first, labelled **(Recommended)**.

## Definition of done

- Acceptance criteria PASS with evidence; `npm test` output quoted.
- Report: changed files, deviations, unconfirmed Codex doc facts.
