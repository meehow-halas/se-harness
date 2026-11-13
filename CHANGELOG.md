# Changelog

All notable changes to `se-harness` (`seh`). Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions: [Semantic Versioning](https://semver.org/).

## [1.1.0] - 2026-11-13

Version reset from `2.0.0`: seh has no production users yet. First changelog entry.

### Added

- OpenCode slash commands. OpenCode does not turn skills into `/` commands, so `/_setit-se` did not exist there. The host table now has `commandsDir` (`.opencode/commands` for OpenCode, `null` elsewhere).
  - `seh install` writes `<commandsDir>/<prefix>setit-se.md` from `references/host-command.md`, a thin wrapper that loads the skill and passes `$ARGUMENTS`. A prefix change moves it. `seh uninstall` removes it.
  - `/<prefix>setit-se` writes the same wrapper for each work skill.
- `/<prefix>setit-se` repairs incomplete host trees on a later run. If a live agent, work skill, or host command is missing while the version and prefix are unchanged (for example a new host row or `commandsDir`), it regenerates them and names the missing paths.
- Jira and Azure DevOps read-only mode (`agents.tracker.readOnly`). seh only reads the tracker; spec, prompt, log, and status live in repo files. Every write verb of `.seh/scripts/jira` and `.seh/scripts/ado` is `BLOCKED:`.

### Changed

- `/<prefix>setit-se` tracker flow: pick the tracker (files, Jira, Azure DevOps), then the read-only question, then the connection, token, and mapping. Read-only maps only `blocker` and `fetchFields`.

### Fixed

- OpenCode showed `Plugin failed: …/.opencode/plugins/seh-check-update.js` on every start. The plugin now uses the OpenCode V2 shape: a default export `{ id, setup }`, events from `ctx.event.subscribe` (`session.created`), and the notice added through `ctx.session.instructions.entry.put` (key `seh-update`). Top-level sessions only. The check runs once per OpenCode process and never blocks it.
- `seh install` without `--prefix` reset an existing project to `_`. It now keeps the prefix in `.seh/PREFIX`, so updating no longer renames the skills. `_` is used only on a first install or when `.seh/PREFIX` holds a disallowed value.
- Autonomous `/<prefix>shipit` asked the user at the end. Architect now fixes a clear misspelling in a requested name (for example `substract` → `subtract`) in `critical` / `autonomous` and records it as `Q<n>`, and never leaves a choice open for the user. The autonomous final report lists decisions and asks nothing.

- `jira meta` and `ado meta` listed every custom field on the Jira site or in the ADO organization, so `/<prefix>setit-se` offered fields that the project does not use (for example ones left over from another project). Jira now takes fields from the project’s create metadata per issue type, with paging. ADO takes them from the project’s work item types. A field appears once even when several types have it.
- Skills and agents named Claude Code tools (`Agent tool`, `wrap_up`, `WebSearch`), which Cursor and OpenCode do not have. The text now says what to do (launch Consultant as a subagent, search the web, end-of-turn summary) without naming one host’s tool.

### Removed

- `agents.tracker.artifactsOnTrackerOnly`. A tracker in full write keeps spec, prompt, log, and status only on the issue or work item, never in repo files. The setit-se question for it is gone. A leftover key in an existing config is ignored.
