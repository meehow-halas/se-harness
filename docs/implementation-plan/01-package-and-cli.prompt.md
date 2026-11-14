# Prompt — implementation-plan stage 01: Package and CLI

Implement stage `01` of `docs/implementation-plan` only. No dependencies. Historical stage: status is `done` in the original plan; use this prompt to re-create or verify it.

## Repo context

- Repo `se-harness`. Binary `seh`, npm package `se-harness`. CLI in v1: `seh install` and `seh uninstall` only. Never `npm install -g`. Never write to `~/.claude/` or other machine-wide paths.
- Product sources at package root: `agents/`, `packs/`, `skills/`, `brainstorm/`, `references/`, `scripts/`, `src/`. Install copies the first six into `.seh/<same-name>/` and writes `.seh/VERSION`.
- Read `docs/prd.md` first (Package source layout, Binding user flow, What `seh install` writes, CLI v1). PRD wins.
- Versioning (CLAUDE.md): changes to shipped dirs need a version bump in the same change.

## Stage spec

### Goal

Make `se-harness` an npx-runnable package whose CLI binary is `seh`, whose only commands are `install` and `uninstall`, and whose install writes the project-local bootstrap the PRD requires.

### Scope in

- `package.json`: name `se-harness`, `bin.seh` → CLI entry, version used as `.seh/VERSION`, `files` so installs include payload dirs and `src/`.
- `src/`: `seh install` and `seh uninstall` only.
- Payload dirs at package root: `agents/`, `skills/`, `brainstorm/`, `references/`, `scripts/` (`packs/` exists).
- Thin `skills/` stub for `/<prefix>setit-se` if install needs a source file.
- Idempotent install and uninstall in the current working directory.
- Install ensures project-root `.gitignore` contains `.seh/` and `harness.credentials.local.json`. Uninstall does not edit `.gitignore`.
- Invocation: `npx -p se-harness seh install` or `npx -p github:meehow-halas/se-harness seh install`. Uninstall uses the same source.
- `seh install` copies `.seh/{agents,packs,skills,brainstorm,references,scripts}/`, writes `.seh/VERSION`, writes the host `/<prefix>setit-se` skill. It does not generate agents, work skills, rule packs or `harness.config.json`. Second install refreshes, no duplicates.
- `seh uninstall` removes `.seh/` and the install-owned setup skill; keeps `harness.config.json` and generated files.

### Scope out

- Any CLI beyond install/uninstall. Generating live files. Machine-wide paths. Filling bodies of later phases. Inventing a test suite beyond stage tests.

### Acceptance criteria

- `package.json` exposes binary `seh`.
- In a throwaway directory `seh install` creates `.seh/` with the six subdirs, `.seh/VERSION` equal to package version, and the project-local `/<prefix>setit-se` skill.
- Second install does not duplicate trees.
- `seh uninstall` removes `.seh/` and the skill and leaves a pre-existing `harness.config.json`.
- No other subcommands accepted.

### Depends on

- None.

## Constraints

- Do not commit unless the user asks. Do not touch `.env` files.
- Ask one question at a time if a choice is not covered; recommended option first, labelled **(Recommended)**.

## Definition of done

- Acceptance criteria PASS with evidence (command output from a temp directory).
- Report: changed files, deviations.
