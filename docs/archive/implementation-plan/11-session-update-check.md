# 11 — Session update check

## Goal

When Claude Code or Cursor Agent starts a session in a project that has seh, check whether a newer released version exists and inject that fact into session context. Do not install. Do not add a CLI subcommand.

## Scope in

- `.seh/scripts/check-update`: compare `.seh/VERSION` with the highest semver git tag of `https://github.com/meehow-halas/se-harness.git` (`git ls-remote --tags --refs`). `v` prefix optional. Non-semver tags ignored.
- Available version is taken from GitHub, not npm, whatever the bootstrap channel.
- Notify only when the tag is strictly greater. Fail-open (empty stdout, exit 0) on missing VERSION, network/timeout, no tags, or local version already higher.
- Cache under `.seh/` with 24h TTL.
- Host adapter fields in `references/hosts.json`: `hooksFile`, `hooksEvent`, `hooksShape`, `hooksHostArg`.
- `seh install` merges the hook command; `seh uninstall` removes only that command. Cursor `hooks.json` gets `"version": 1` if missing.
- Consumer `AGENTS.md`: on first reply surface a newer-tag notice from session context; never query GitHub or npm yourself.

Behaviour: Claude (`claude-nested`): `SessionStart`, matcher `startup`, command `.seh/scripts/check-update --host claude-code`; plain text stdout becomes context. Cursor (`cursor-flat`): `sessionStart`, command `.seh/scripts/check-update --host cursor`, timeout 5s; JSON `{"additional_context":"..."}` only. Marker for merge/uninstall: command contains `.seh/scripts/check-update`. A hooks file left with only empty lists (plus Cursor `version`) is deleted so empty host dirs still prune. Tests stub `git ls-remote` via env override; no network.

## Scope out

- `seh check` or any new CLI subcommand. Silent install. Treating default-branch `package.json` or untagged commits as a new version.
- Recording which channel bootstrap used (the notice lists both commands). Machine-wide hooks.

## Decisions taken

- Notice shape per host via `--host`; Cursor and Claude stdout differ.

## Files likely touched

- `scripts/check-update`, `scripts/check-update.test.js`, `src/cli.js`, `src/cli.test.js`, `references/hosts.json`, `references/AGENTS.md`

## Acceptance criteria

- Install in a throwaway project writes both host hook files; a second install does not duplicate the command.
- Install merges into an existing hooks file that already has other commands.
- Uninstall removes only the seh command; a clean install + uninstall still prunes empty `.claude/` and `.cursor/`.
- `check-update` prints a notice iff a stubbed tag is strictly newer; Cursor vs Claude stdout differs; cache skips a second `ls-remote` within TTL; failures are silent exit 0.
- CLI still accepts only `install` and `uninstall`.

## Tests

- `scripts/check-update.test.js`, `src/cli.test.js`.

## Versioning

Not recorded in the legacy plan.

## Depends on

- 01, 08 = `done`.
