# Phase 11 — Session update check

## Goal

When Claude Code or Cursor Agent starts a session in a project that has seh, check whether a newer **released** version exists and inject that fact into session context. Do not install. Do not add a CLI subcommand.

## In scope

- `.seh/scripts/check-update`: compare `.seh/VERSION` to the highest semver git tag on `https://github.com/nbmh/dev-harness-layer.git` (`git ls-remote --tags --refs`). `v` prefix is optional. Non-semver tags ignored.
- Available version is GitHub, not npm, whether bootstrap used npm or `github:nbmh/dev-harness-layer`.
- Notify only when the tag is strictly greater. Fail-open (empty stdout, exit 0) on missing VERSION, network/timeout, no tags, or local version already higher.
- Cache under `.seh/` with TTL 24h.
- Host adapters on `references/hosts.json`: `hooksFile`, `hooksEvent`, `hooksShape`, `hooksHostArg`.
- `seh install` merges the hook command; `seh uninstall` removes only that command. Cursor `hooks.json` gets `"version": 1` if missing.
- Consumer `AGENTS.md`: on first reply, surface a newer-tag notice from session context; do not query GitHub/npm yourself.

## Out of scope

- `seh check` or any new CLI subcommand.
- Silent `seh install` / `/seh-setup`.
- Treating default-branch `package.json` or untagged commits as a new version.
- Recording which channel (npm vs GitHub) was used for bootstrap; the notice lists both commands.
- README sync unless the user asks.
- Machine-wide `~/.claude/` / `~/.cursor/` hooks.

## Inputs

- PRD: What install writes; Non-goals; Decisions 4, 19, 21; Binding flow.

## Outputs

| Path | What |
|------|------|
| `scripts/check-update` | POSIX checker; `--host` selects stdout shape |
| `scripts/check-update.test.js` | stub `git ls-remote`; cache; host stdout |
| `src/cli.js` | merge/remove hook entries |
| `src/cli.test.js` | idempotent install; surgical uninstall |
| `references/hosts.json` | hook adapter fields |
| `references/AGENTS.md` | first-reply hint |

## Behaviour

- Claude (`claude-nested`): `SessionStart` matcher `startup`, command `.seh/scripts/check-update --host claude-code`. Plain-text stdout becomes context.
- Cursor (`cursor-flat`): `sessionStart` command `.seh/scripts/check-update --host cursor`, timeout 5s. JSON `{"additional_context":"..."}` only.
- Marker for merge/uninstall: command contains `.seh/scripts/check-update`.
- If a hooks file is left with only empty hook lists (plus Cursor `version`), delete the file so empty host dirs still prune.
- Tests stub `git ls-remote` (env override). Do not hit the network.

## Done when

- Install in a throwaway project writes both host hook files; a second install does not duplicate the command.
- Install merges into an existing hooks file that already has other commands.
- Uninstall removes only the seh command and leaves other hooks; a clean install+uninstall still prunes empty `.claude/` / `.cursor/`.
- `check-update` prints a notice iff a stubbed tag is strictly newer; Cursor vs Claude stdout differs; cache skips a second ls-remote inside TTL; failures are silent exit 0.
- CLI still accepts only `install` and `uninstall`.
