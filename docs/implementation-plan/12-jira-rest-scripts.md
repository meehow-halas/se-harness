# Phase 12 — Jira Cloud REST scripts (no MCP)

## Goal

Make the optional Jira tracker harness-agnostic: agents and `/dhs-setup` call `.dhs/scripts/jira` against Jira Cloud REST v3. Do not use MCP. Do not add a `dhs` Jira CLI.

## In scope

- Package `scripts/jira` dispatcher (`meta`, `get`, `create`, `set`, `comment`, `transition`, `link`) with the git-script `OK` / `UNCHANGED` / `BLOCKED:` contract.
- Shared JSON/auth helper used by that script (token never in argv, stdout, chat, or git).
- Behaviour tests that stub HTTP/`curl` only.
- Product templates: `/dhs-setup`, Architect, Implementer, Reviewer, consumer `references/AGENTS.md`, and README (MCP was user-facing there).
- PRD and this plan already record the scope change; keep them aligned if a sentence still says MCP.

## Out of scope

- A `dhs jira` CLI subcommand.
- File-tracker status or log scripts.
- Jira Server/Data Center.
- Windows `sh`.
- Regenerating live agent bodies because tracker maps changed.

## Inputs

- PRD: Jira tracker; Git (jira table); `/dhs-setup` Tracker; Decisions 14, 17; Deferred (files-tracker status/log; Server/DC).

## Outputs

| Path | What |
|------|------|
| `scripts/jira` | POSIX dispatcher |
| `scripts/lib-jira.sh` and/or `scripts/jira-json.js` | Auth, ADF, response formatting |
| `scripts/jira.test.js` | stub `curl`; unique fixtures |
| `skills/dhs-setup/SKILL.md` | `jira meta`, no MCP |
| `agents/*.md` | call `.dhs/scripts/jira` |
| `references/AGENTS.md` | Jira via scripts |
| `README.md` | no Jira MCP |

## Behaviour

- Read `agents.tracker` and `harness.credentials.local.json`. Credentials may live on the main worktree when the caller is a dhs worktree.
- `curl` and `node` required. Missing tracker, token, or `curl` → `BLOCKED:`.
- `transition` with a `null` map key → `UNCHANGED` and no HTTP.
- Mapped status missing from that issue type’s transitions → `BLOCKED:` tell the user to fix mapping in `/dhs-setup`.
- Bodies for `set` / `comment` from `--file` or stdin.

## Done when

- Tests fail if the script uses a hardcoded Jira URL, project key, token, or status name instead of config.
- Token does not appear in script stdout or in stubbed `curl` argv.
- `/dhs-setup` and agents no longer mention Jira MCP.
- CLI still accepts only `install` and `uninstall`.
