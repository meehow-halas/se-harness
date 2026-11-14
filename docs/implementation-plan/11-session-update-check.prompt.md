# Prompt — implementation-plan stage 11: Session update check

Implement stage `11` of `docs/implementation-plan` only. Requires stages `01` and `08` = `done`. Historical stage: status `done` in the original plan.

## Repo context

- Repo `se-harness`. `.seh/scripts/check-update` is POSIX `sh`. It notifies only; it never installs.
- No new CLI subcommand. No machine-wide hooks (`~/.claude/`, `~/.cursor/`).
- Source of version: highest semver tag of `https://github.com/meehow-halas/se-harness.git` via `git ls-remote --tags --refs`, not npm, not default-branch `package.json`.
- Read `docs/prd.md` first (What install writes, Non-goals, Decisions 4, 19, 21).
- Versioning: shipped dirs → version bump in the same change (CLAUDE.md).

## Stage spec

### Goal

When Claude Code or Cursor Agent starts a session in a seh project, check whether a newer released version exists and inject that fact into session context.

### Scope in

- `scripts/check-update`: compare `.seh/VERSION` with the highest semver tag (`v` prefix optional; non-semver ignored). Notify only when strictly greater. Fail-open (empty stdout, exit 0) on missing VERSION, network or timeout, no tags, or local version higher. Cache under `.seh/` with 24h TTL. `--host` selects stdout shape.
- Claude (`claude-nested`): `SessionStart`, matcher `startup`, command `.seh/scripts/check-update --host claude-code`; plain text stdout.
- Cursor (`cursor-flat`): `sessionStart`, command `.seh/scripts/check-update --host cursor`, timeout 5s; JSON `{"additional_context":"..."}` only.
- `references/hosts.json` hook fields: `hooksFile`, `hooksEvent`, `hooksShape`, `hooksHostArg`.
- `seh install` merges the hook command; a second install does not duplicate it; merges beside existing hooks. `seh uninstall` removes only the seh command (marker: command contains `.seh/scripts/check-update`). Cursor `hooks.json` gets `"version": 1` if missing. A hooks file left with only empty lists is deleted so empty host dirs prune.
- Consumer `AGENTS.md`: first-reply hint to surface a newer-tag notice from session context; never query GitHub or npm yourself.
- Tests stub `git ls-remote` via env override; no network.

### Scope out

- `seh check`. Silent install. Untagged commits as versions. Recording bootstrap channel. README sync.

### Acceptance criteria

- Install in a throwaway project writes both host hook files; second install does not duplicate.
- Uninstall removes only the seh command; clean install + uninstall prunes empty `.claude/` and `.cursor/`.
- `check-update` prints a notice iff a stubbed tag is strictly newer; Cursor and Claude stdout differ; cache skips a second `ls-remote` within TTL; failures silent, exit 0.
- CLI accepts only `install` and `uninstall`.

### Depends on

- 01, 08 = `done`.

## Constraints

- Do not commit unless the user asks. Do not touch `.env` files. Do not write to `~/.claude/` or `~/.cursor/`.
- Ask one question at a time; recommended option first, labelled **(Recommended)**.

## Definition of done

- Acceptance criteria PASS with test output quoted; report changed files and deviations.
