# Changelog

All notable changes to `se-harness` (`seh`). Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions: [Semantic Versioning](https://semver.org/).

## [1.1.0] - 2026-11-13

Version reset from `2.0.0`: seh has no production users yet. First changelog entry.

### Added

- Jira and Azure DevOps read-only mode (`agents.tracker.readOnly`). seh only reads the tracker; spec, prompt, log, and status live in repo files. Every write verb of `.seh/scripts/jira` and `.seh/scripts/ado` is `BLOCKED:`.

### Changed

- `/<prefix>setit-se` tracker flow: pick the tracker (files, Jira, Azure DevOps), then the read-only question, then the connection, token, and mapping. Read-only maps only `blocker` and `fetchFields`.

### Fixed

- Autonomous `/<prefix>shipit` asked the user at the end. Architect now fixes a clear misspelling in a requested name (for example `substract` → `subtract`) in `critical` / `autonomous` and records it as `Q<n>`, and never leaves a choice open for the user. The autonomous final report lists decisions and asks nothing.

### Removed

- `agents.tracker.artifactsOnTrackerOnly`. A tracker in full write keeps spec, prompt, log, and status only on the issue or work item, never in repo files. The setit-se question for it is gone. A leftover key in an existing config is ignored.
