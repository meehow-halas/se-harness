# 12 — Jira Cloud REST scripts (no MCP)

## Goal

Make the optional Jira tracker harness-agnostic: agents and `/<prefix>setit-se` call `.seh/scripts/jira` against Jira Cloud REST v3. No MCP. No `seh` Jira CLI.

## Scope in

- `scripts/jira` dispatcher: `meta`, `get`, `create`, `set`, `comment`, `transition`, `link`, with the `OK` / `UNCHANGED` / `BLOCKED:` contract.
- Shared JSON/auth helper (token never in argv, stdout, chat or git).
- Behaviour tests stubbing `curl` only.
- Product templates: `/<prefix>setit-se`, Architect, Implementer, Reviewer, `references/AGENTS.md`, README (MCP removed there).

Behaviour: read `agents.tracker` and `harness.credentials.local.json`; credentials may live in the main worktree when the caller is a seh worktree. `curl` and `node` required. Missing tracker, token or `curl` → `BLOCKED:`. `transition` with a `null` map key → `UNCHANGED`, no HTTP. Mapped status missing from the issue type's transitions → `BLOCKED:` telling the user to fix the mapping in `/<prefix>setit-se`. Bodies for `set` / `comment` come from `--file` or stdin.

## Scope out

- A `seh jira` CLI subcommand. File-tracker status or log scripts. Jira Server/Data Center. Windows `sh`. Regenerating live agent bodies because tracker maps changed.

## Decisions taken

- Jira Cloud REST v3 only (Server/DC is Deferred).

## Files likely touched

- `scripts/jira`, `scripts/lib-jira.sh`, `scripts/jira-json.js`, `scripts/jira.test.js`, `skills/setit-se/SKILL.md`, `agents/*.md`, `references/AGENTS.md`, `README.md`

## Acceptance criteria

- Tests fail if the script uses a hardcoded Jira URL, project key, token or status name instead of config.
- Token does not appear in script stdout or in stubbed `curl` argv.
- `/<prefix>setit-se` and agents no longer mention Jira MCP.
- CLI still accepts only `install` and `uninstall`.

## Tests

- `scripts/jira.test.js` with stubbed `curl`; fixtures differ from defaults.

## Versioning

Not recorded in the legacy plan.

## Depends on

- 02, 03, 04, 05 = `done`.
