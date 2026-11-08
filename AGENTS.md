# AGENTS.md

## Product

`dhs` is an SE harness for coding assistants: skills, agents, rule packs, and a small CLI (`dhs`). The npm package and the binary are both `dhs`. There is no `dev-harness` name.

Behaviour is defined in `docs/prd.md`. That file wins over samples, old agent files, and chat history. `docs/implementation-plan.md` is the build order, not a second spec.

CLI in v1: `dhs install` and `dhs uninstall` only. Never `npm install -g`. Never write to `~/.claude/` or another machine-wide path. There is no `/dhs-init` or `/dhs-config`; setup is `/dhs-setup`. Git allowlist helpers are POSIX scripts under `scripts/` (installed as `.dhs/scripts/`), not CLI subcommands.

## Package directories

Product sources in **this** repo are `agents/`, `packs/`, `skills/`, `brainstorm/`, `references/`, `scripts/`, and `src/` (CLI). `dhs install` copies the first six into a consuming repo as `.dhs/<same-name>/` and writes `.dhs/VERSION`. Write files in those directories; do not invent a parallel tree and rename on copy.

## `samples/`

`samples/` (including any `docs/samples/` leftover) is a **temporary** kit: read it, rewrite into the published directories, then **delete it**. It is not the product and it is not a second spec.

Until that rewrite is done: do not create, edit, or move files under `samples/`. Implement elsewhere. Anything in samples that the PRD does not name is out of scope.

As soon as `agents/`, `packs/`, `skills/`, `brainstorm/`, `references/`, and `scripts/` exist from that rewrite: delete `samples/` and any leftover `docs/samples/`. Do not keep both trees.

## Commands

- Tests: none yet (`npm test` is a stub). Do not invent a suite unless the task asks for it.
- Do not commit unless the user asks.
