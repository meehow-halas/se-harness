# Stage 2 — Host row and CLI

## Goal

`seh install` / `seh uninstall` handle Codex; `check-update` speaks to it.

## In scope

- `references/hosts.json`: Codex row and new fields (see `plan.md`). Existing rows get `invokePrefix: "/"`; other new fields are optional and absent for them.
- `src/cli.js`: install writes `/<prefix>setit-se` into `.agents/skills/` and merges the `SessionStart` hook (with `hooksMatcher`) into `.codex/hooks.json` without touching other hooks or keys. Uninstall removes only the setup skill and the seh hook entry; prunes empty dirs seh created; leaves `.agents/skills` when other content exists. Second install does not duplicate the hook.
- `scripts/check-update`: `--host codex` prints the plain-text notice (same as Claude).
- Tests (`src/cli.test.js`, `scripts/check-update.test.js`): fourth host install/uninstall; hook merged beside a foreign hook; foreign hook and foreign skills survive uninstall; second install idempotent; Claude's hook output unchanged (no matcher regression); `--host codex` plain text.

## Out of scope

Generation of agents/rules/skills (stage 3). Wording (stage 4).

## Done when

`npm test` passes with the new cases; install then uninstall in a temp repo leaves foreign files untouched.
