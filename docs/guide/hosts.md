# Hosts

[← README](../../README.md) · Contracts in full: [`docs/prd.md`](../prd.md)

A **host** is the coding assistant (harness) you run seh in. This version: **Claude Code**, **Cursor Agent**, **OpenCode**, and **Codex**. A later host is a row in `hosts.json` plus a format adapter, not a second product.

`seh install` and `/_setit-se` always write **every** row in `.seh/references/hosts.json`. They do not ask which hosts to use. Live skills, agents, rules, and brainstorm files are **copies** (not symlinks to `.seh/agents/`) under `.claude/`, `.cursor/`, `.opencode/`, `.agents/`, and `.codex/` (rules as `.md` vs `.mdc`). In a session, use the copy that host loaded. Skill bodies match; live agent `model:` is that host’s string only.

OpenCode differences:

- A skill is not a slash command there, so every skill also gets a thin command file `.opencode/commands/_<name>.md` that loads the skill.
- Rules go to `.opencode/rules/*.md`; that glob is merged into `.opencode/opencode.json` `instructions` (project-root `opencode.json` is not touched).
- Live agents drop `name` and `tools` and get `mode: subagent`; the consultant also gets `permissions` that deny `edit`.
- The session-start update check is a plugin, `.opencode/plugins/seh-check-update.js`.

Codex differences:

- Skills live in `.agents/skills` (shared with other tools; uninstall removes only seh-owned entries). A skill is invoked as `$_setit-se` (or picked in `/skills`), not `/_setit-se`. Codex has no project command directory, so there is no command file and nothing is written under `~/.codex/`.
- Live agents are TOML, `.codex/agents/<name>.toml`. `model` is written only when one is set; otherwise the session model is inherited. A Codex subagent inherits the parent sandbox, so Consultant read-only is an instruction, not enforced.
- Work skills get `agents/openai.yaml` with `allow_implicit_invocation: false`, so the model does not start them on its own.
- Rules go to `.codex/rules/*.md`; `$_setit-se` keeps one seh-managed section in `AGENTS.md` that points at them. Path scoping is soft (instruction only).
- The session-start update check is a `.codex/hooks.json` `SessionStart` hook. Codex loads it only in a **trusted project**.
- **Approve the hook:** after `seh install`, opening the project in Codex shows a notification that hooks need review. Open `/hooks` and accept the seh `SessionStart` hook, otherwise the update check never runs.
- Sessions per key are not started automatically; one command is printed per key.

One session per key (multi-key `/_planit`, `/_doit`, `/_checkit`, `/_runit`, and every `/_shipit`) starts automatically only in the Claude Code desktop app, with git enabled. Cursor, OpenCode, and Codex print one command per key, keeping your mode words (for example `samodzielnie`). With git disabled, several keys run one after another in the current session on every host.

## Models per host

`agents.roles.<role>.model` is a map keyed by host `id`, not one string per role:

```text
"architect": { "model": { "claude-code": "opus", "cursor": "cursor-grok-4.6-medium", "opencode": "anthropic/claude-opus-5-5" } }
```

First-run suggestions come from that host row’s `modelSuggest`. seh does not translate a Claude alias into a Cursor id.

| Host | Architect | Designer | Implementer | Consultant | Reviewer |
|------|-----------|----------|-------------|------------|----------|
| Claude Code | `opus` | `sonnet` | `sonnet` | `haiku` | `sonnet` |
| Cursor | `cursor-grok-4.6-medium` | `cursor-grok-4.6-medium` | `cursor-grok-4.6-medium` | `composer-2.5` | `cursor-grok-4.6-medium` |
| OpenCode | `anthropic/claude-opus-5-5` | `anthropic/claude-sonnet-5-5` | `anthropic/claude-sonnet-5-5` | `anthropic/claude-haiku-5-5` | `anthropic/claude-sonnet-5-5` |
| Codex | `gpt-6-sol` | `gpt-6.1-sol` | `gpt-6.1-sol` | `gpt-6-luna` | `gpt-6.1-sol` |

Codex model ids are unverified per account. Choose "no change" to omit `model` and inherit the session model.

A later `/_setit-se` model change is one cell `(role, host)` and rewrites `model:` only in that host’s `agentsDir`. If `model` is still a string, or a host `id` is missing, setup finishes the map first (prefill a legacy string on every host, then confirm per host) before it stamps live files.

Brainstorm uses the same map shape on `agents.brainstorm.model`. `/_grillit` asks one model per host on the first member (not `/_setit-se`): that string is for every persona turn **and** the facilitator. No per-persona model.
