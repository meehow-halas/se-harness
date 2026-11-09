# AGENTS.md

## Product

`dhs` is an SE harness for coding assistants: skills, agents, rule packs, and a small CLI (`dhs`). The npm package is `dev-harness-layer`. The binary is `dhs`.

Behaviour is defined in `docs/prd.md`. That file wins over old agent files and chat history. `docs/implementation-plan.md` is the build order, not a second spec.

CLI in v1: `dhs install` and `dhs uninstall` only. Never `npm install -g`. Never write to `~/.claude/` or another machine-wide path. Setup is `/dhs-setup`. Git allowlist helpers are POSIX scripts under `scripts/` (installed as `.dhs/scripts/`), not CLI subcommands.

## Package directories

Product sources in **this** repo are `agents/`, `packs/`, `skills/`, `brainstorm/`, `references/`, `scripts/`, and `src/` (CLI). `dhs install` copies the first six into a consuming repo as `.dhs/<same-name>/` and writes `.dhs/VERSION`. Write files in those directories; do not invent a parallel tree and rename on copy.

## Deferred (not a backlog)

PRD **Deferred** and the plan’s **Out of this v1 plan** are a **scope boundary**. They record decisions we considered and postponed. They are not tickets, not leftover audit work, and not items to implement “while here”. A ticket exists only when someone opens a **new** version scope. Read the list before new work: if it is Deferred, it is not v1.

The plan’s “Repo state before phase 1” is a historical snapshot, not TODO.

## Commands

- Tests: `npm test` (`node:test` next to the units: `src/cli.test.js`, `scripts/*.test.js`). `dhs install` does not copy `*.test.js` into `.dhs/`.
- Do not commit unless the user asks.
- Do not edit, “improve”, or sync `README.md` with the PRD, the plan, or the code unless the user explicitly asks to change the README.
