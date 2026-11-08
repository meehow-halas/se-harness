# AGENTS.md

## Product

`dhs` is an SE harness for coding assistants: skills, agents, rule packs, and a small CLI (`dhs`). The npm package and the binary are both `dhs`. There is no `dev-harness` name.

Behaviour is defined in `docs/prd.md`. That file wins over samples, old agent files, and chat history. `docs/implementation-plan.md` is the build order, not a second spec.

CLI in v1: `dhs install` and `dhs uninstall` only. Never `npm install -g`. Never write to `~/.claude/` or another machine-wide path. There is no `/dhs-init` or `/dhs-config`; setup is `/dhs-setup`.

## `samples/`

`samples/` (including any `docs/samples/` leftover) is **only a reference**: a pattern and a source of information to copy and rewrite into published templates. It is not the product and it is not a second spec.

**Do not create, edit, move, or delete anything under `samples/`.** Read it. Implement elsewhere. Anything in samples that the PRD does not name is out of scope.

## Commands

- Tests: none yet (`npm test` is a stub). Do not invent a suite unless the task asks for it.
- Do not commit unless the user asks.
