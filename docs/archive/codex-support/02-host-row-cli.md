# 02 — Host row and CLI

## Goal

`seh install` / `seh uninstall` handle Codex; `check-update` speaks to it.

## Scope in

- `references/hosts.json`: Codex row and new fields (see README "Host row"). Existing rows get `invokePrefix: "/"`; other new fields are optional and absent for them.
- `src/cli.js`: install writes `/<prefix>setit-se` into `.agents/skills/` and merges the `SessionStart` hook (with `hooksMatcher`) into `.codex/hooks.json` without touching other hooks or keys. Uninstall removes only the setup skill and the seh hook entry; prunes empty dirs seh created; leaves `.agents/skills` when other content exists. Second install does not duplicate the hook.
- `scripts/check-update`: `--host codex` prints the plain-text notice (same as Claude).
- Tests (`src/cli.test.js`, `scripts/check-update.test.js`): fourth host install/uninstall; hook merged beside a foreign hook; foreign hook and foreign skills survive uninstall; second install idempotent; Claude's hook output unchanged (no matcher regression); `--host codex` plain text.

## Scope out

- Generation of agents, rules, skills (stage 03).
- Wording (stage 04).

## Decisions taken

- Model the Codex hook merge on the existing `claude-nested` merge in `src/cli.js`; add `hooksMatcher` as an optional row field so Claude output stays byte-identical.

## Files likely touched

- `references/hosts.json`, `src/cli.js`, `src/cli.test.js`, `scripts/check-update`, `scripts/check-update.test.js`

## Acceptance criteria

- `npm test` passes with the new cases.
- Install then uninstall in a temp repo leaves foreign files untouched.

## Tests

- `node --test src/cli.test.js scripts/check-update.test.js`, then `npm test`.

## Versioning

No version bump in this stage (stage 05).

## Depends on

- 01 = `done`.
