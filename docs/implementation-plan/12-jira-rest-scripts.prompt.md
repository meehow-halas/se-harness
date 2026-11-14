# Prompt — implementation-plan stage 12: Jira Cloud REST scripts (no MCP)

Implement stage `12` of `docs/implementation-plan` only. Requires stages `02`–`05` = `done`. Historical stage: status `done` in the original plan.

## Repo context

- Repo `se-harness`. Jira is optional. Agents and setup call `.seh/scripts/jira` against Jira Cloud REST v3. No MCP. No `seh jira` subcommand.
- Token never in argv, stdout, chat or git. Credentials in `harness.credentials.local.json` (may be in the main worktree when the caller is a seh worktree).
- Read `docs/prd.md` first (Jira tracker, Git jira table, setup Tracker, Decisions 14 and 17; Deferred: files-tracker status/log, Server/DC).
- Versioning: `scripts/` and `skills/` shipped → version bump in the same change (CLAUDE.md).

## Stage spec

### Goal

Make the optional Jira tracker harness-agnostic: `scripts/jira` dispatcher with `meta`, `get`, `create`, `set`, `comment`, `transition`, `link`.

### Scope in

- POSIX dispatcher `scripts/jira` with the `OK` / `UNCHANGED` / `BLOCKED:` contract.
- Shared auth and JSON helper (`scripts/lib-jira.sh` and/or `scripts/jira-json.js`): auth, ADF, response formatting.
- Behaviour tests stub `curl` only (`scripts/jira.test.js`).
- Read `agents.tracker` and credentials. Missing tracker, token or `curl` → `BLOCKED:`. `node` required.
- `transition` with a `null` map key → `UNCHANGED`, no HTTP. Mapped status missing from the issue type's transitions → `BLOCKED:` pointing to `/<prefix>setit-se`.
- `set` / `comment` bodies from `--file` or stdin.
- Templates: `/<prefix>setit-se`, agents and `references/AGENTS.md` call `.seh/scripts/jira`; README has no Jira MCP.

### Scope out

- `seh jira` subcommand. File-tracker status/log scripts. Jira Server/DC. Windows `sh`. Regenerating agent bodies because maps changed.

### Acceptance criteria

- Tests fail if the script uses a hardcoded Jira URL, project key, token or status name instead of config.
- Token absent from script stdout and stubbed `curl` argv.
- Setup and agents no longer mention Jira MCP.
- CLI still accepts only `install` and `uninstall`.

### Tests

- `scripts/jira.test.js`; fixtures differ from defaults.

### Depends on

- 02, 03, 04, 05 = `done`.

## Constraints

- Do not commit unless the user asks. Do not touch `.env` files. Do not weaken tests.
- Ask one question at a time; recommended option first, labelled **(Recommended)**.

## Definition of done

- Acceptance criteria PASS with `npm test` output quoted; report changed files and deviations.
