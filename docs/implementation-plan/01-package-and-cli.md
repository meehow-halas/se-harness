# Phase 1 — Package and CLI

## Goal

Make `dev-harness-layer` an npx-runnable package whose CLI binary is `seh`, whose only commands are `install` and `uninstall`, and whose install writes the project-local bootstrap the PRD requires.

Without this, nothing else is a product: there is no binary, no `.seh/`, no install-owned `/<prefix>setit-se`.

## In scope

- `package.json`: name `dev-harness-layer`, `bin.seh` pointing at the CLI, version used as `.seh/VERSION`, `files` (or equivalent) so npm/GitHub installs include payload dirs + `src/` entry.
- `src/`: implement `seh install` and `seh uninstall` only.
- Create payload directories if they do not exist so the copy contract is real: `agents/`, `skills/`, `brainstorm/`, `references/`, `scripts/` (`packs/` already exists).
- A **thin** `skills/` stub for `/<prefix>setit-se` if install requires a source file (placeholder is allowed; the real skill is phase 5).
- Idempotent install and uninstall in the **current working directory** (the consuming project).

## Out of scope

- Any CLI beyond `install` / `uninstall`.
- Generating live agents, work skills, rule packs, or `harness.config.json`.
- Writing into `~/.claude/` or any machine-wide path.
- Filling agent/skill/script/reference bodies (phases 2–7).
- Finishing project setup (that is `/<prefix>setit-se`).
- Inventing a test suite.

## Inputs

- PRD: Package source layout; Binding user flow (Bootstrap, Remove); How it runs; What `seh install` writes; CLI (v1); Decisions 1–4, 11, 15, 18.
- [package.json](../../package.json) as it exists (stub).
- Install payload is `agents/`, `packs/`, `skills/`, `brainstorm/`, `references/`, and `scripts/` at the package root.

## Outputs

| Path | What |
|------|------|
| `package.json` | `name`: `dev-harness-layer`; `bin.seh` → CLI entry; version is the stamp written to `.seh/VERSION`; include payload dirs in the published package |
| `src/` | CLI implementation (`install` / `uninstall`) |
| Payload dirs | Exist at package root with the six names install copies (may be empty or stubbed except existing `packs/`) |
| `skills/…` | Enough that install can write the live `/<prefix>setit-se` skill (stub OK) |

Exact CLI file names inside `src/` are the implementer’s choice. The binary name must be `seh`.

## Behaviour

### Invocation

Both sources are first-class:

```text
npx -p dev-harness-layer seh install
npx -p github:nbmh/dev-harness-layer seh install
npx -p github:nbmh/dev-harness-layer#<ref> seh install
npx -p https://github.com/nbmh/dev-harness-layer seh install
```

Uninstall uses the **same source** as install. The CLI runs only in the target project directory.

### `seh install`

Copies into **this project only**:

| Path | Role |
|------|------|
| `.seh/agents/`, `.seh/packs/`, `.seh/skills/`, `.seh/brainstorm/`, `.seh/references/`, `.seh/scripts/` | Same names as package dirs; no remap |
| `.seh/VERSION` | Package version string |
| Host `/<prefix>setit-se` skill | From package `skills/` (install-owned) |
| Host session-start hook | Merged into each host `hooksFile` (phase 11) |

That is the full install-owned set (hook merge is phase 11).

Install also ensures the project-root `.gitignore` contains `.seh/` and `harness.credentials.local.json` (creates the file if missing). This is not uninstall-owned: `seh uninstall` does not edit `.gitignore`.

- Do **not** generate live agents, work skills, rule packs, or `harness.config.json`.
- After install, `/<prefix>setit-se` is invocable. `/<prefix>shipit`, `/<prefix>planit`, `/<prefix>doit`, `/<prefix>checkit`, `/<prefix>grillit` do not exist yet and must not be written by install.
- Idempotent: a second install refreshes `.seh/` from the package and the install-owned `/<prefix>setit-se` skill. It still does not generate live files.
- If `harness.config.json` already exists (later install after a package update), install **may** print that the user should run `/<prefix>setit-se` to apply new templates. It still does not generate them.
- Host skill location: the project skill directory the host uses (typically under `.claude/skills/` for Claude Code). Do not write machine-wide skills.

### `seh uninstall`

Removes `.seh/` and the install-owned `/<prefix>setit-se` skill. Does **not** delete `harness.config.json` or files `/<prefix>setit-se` already generated (live agents, work skills, rule packs, `AGENTS.md`, `CLAUDE.md`, docs it wrote). Idempotent if that set is already gone.

### Hard rules

- Never `npm install -g`.
- Never write to `~/.claude/` as a product location (a consuming project’s **project-local** `.claude/` is the host dir, not a machine-wide install).
- Missing payload subdirs: copy what exists; do not fail the whole install because a later phase has not filled a directory yet, unless `/<prefix>setit-se` source is required to write the live skill — then a stub is enough.

## Done when

- `package.json` exposes binary `seh`.
- From a throwaway directory, `npx` (or local `node` of the bin) `seh install` creates `.seh/` with the six subdir names (empty dirs OK), `.seh/VERSION` equal to package version, and a project-local `/<prefix>setit-se` skill.
- A second install does not duplicate trees or invent extra CLI output files.
- `seh uninstall` removes `.seh/` and that skill and leaves a pre-existing `harness.config.json` (if you placed one for the check) in place.
- No other subcommands are accepted as product commands.

## Handoff

Phase 2 may add files under `scripts/` and assume the next install copies them to `.seh/scripts/`. Phase 5 replaces the `/<prefix>setit-se` stub with the real skill; install keeps copying `skills/` and writing the live `/<prefix>setit-se` skill only.
