# Phase 1 — Package and CLI

## Goal

Make `dev-harness-layer` an npx-runnable package whose CLI binary is `dhs`, whose only commands are `install` and `uninstall`, and whose install writes the project-local bootstrap the PRD requires.

Without this, nothing else is a product: there is no binary, no `.dhs/`, no install-owned `/dhs-setup`.

## In scope

- `package.json`: name `dev-harness-layer`, `bin.dhs` pointing at the CLI, version used as `.dhs/VERSION`, `files` (or equivalent) so npm/GitHub installs include payload dirs + `src/` entry.
- `src/`: implement `dhs install` and `dhs uninstall` only.
- Create payload directories if they do not exist so the copy contract is real: `agents/`, `skills/`, `brainstorm/`, `references/`, `scripts/` (`packs/` already exists).
- A **thin** `skills/` stub for `/dhs-setup` if install requires a source file (placeholder is allowed; the real skill is phase 5).
- Idempotent install and uninstall in the **current working directory** (the consuming project).

## Out of scope

- Any CLI beyond `install` / `uninstall`.
- Generating live agents, work skills, rule packs, or `harness.config.json`.
- Writing into `~/.claude/` or any machine-wide path.
- Filling agent/skill/script/reference bodies (phases 2–7).
- Finishing project setup (that is `/dhs-setup`).
- Inventing a test suite.

## Inputs

- PRD: Package source layout; Binding user flow (Bootstrap, Remove); How it runs; What `dhs install` writes; CLI (v1); Decisions 1–4, 11, 15, 18.
- [package.json](../../package.json) as it exists (stub).
- Install payload is `agents/`, `packs/`, `skills/`, `brainstorm/`, `references/`, and `scripts/` at the package root.

## Outputs

| Path | What |
|------|------|
| `package.json` | `name`: `dev-harness-layer`; `bin.dhs` → CLI entry; version is the stamp written to `.dhs/VERSION`; include payload dirs in the published package |
| `src/` | CLI implementation (`install` / `uninstall`) |
| Payload dirs | Exist at package root with the six names install copies (may be empty or stubbed except existing `packs/`) |
| `skills/…` | Enough that install can write the live `/dhs-setup` skill (stub OK) |

Exact CLI file names inside `src/` are the implementer’s choice. The binary name must be `dhs`.

## Behaviour

### Invocation

Both sources are first-class:

```text
npx -p dev-harness-layer dhs install
npx -p github:nbmh/dev-harness-layer dhs install
npx -p github:nbmh/dev-harness-layer#<ref> dhs install
npx -p https://github.com/nbmh/dev-harness-layer dhs install
```

Uninstall uses the **same source** as install. The CLI runs only in the target project directory.

### `dhs install`

Copies into **this project only**:

| Path | Role |
|------|------|
| `.dhs/agents/`, `.dhs/packs/`, `.dhs/skills/`, `.dhs/brainstorm/`, `.dhs/references/`, `.dhs/scripts/` | Same names as package dirs; no remap |
| `.dhs/VERSION` | Package version string |
| Host `/dhs-setup` skill | From package `skills/` (install-owned) |
| Host session-start hook | Merged into each host `hooksFile` (phase 11) |

That is the full install-owned set (hook merge is phase 11).

Install also ensures the project-root `.gitignore` contains `.dhs/` and `harness.credentials.local.json` (creates the file if missing). This is not uninstall-owned: `dhs uninstall` does not edit `.gitignore`.

- Do **not** generate live agents, work skills, rule packs, or `harness.config.json`.
- After install, `/dhs-setup` is invocable. `/dhs-shipit`, `/dhs-planit`, `/dhs-doit`, `/dhs-checkit`, `/dhs-brainstorm` do not exist yet and must not be written by install.
- Idempotent: a second install refreshes `.dhs/` from the package and the install-owned `/dhs-setup` skill. It still does not generate live files.
- If `harness.config.json` already exists (later install after a package update), install **may** print that the user should run `/dhs-setup` to apply new templates. It still does not generate them.
- Host skill location: the project skill directory the host uses (typically under `.claude/skills/` for Claude Code). Do not write machine-wide skills.

### `dhs uninstall`

Removes `.dhs/` and the install-owned `/dhs-setup` skill. Does **not** delete `harness.config.json` or files `/dhs-setup` already generated (live agents, work skills, rule packs, `AGENTS.md`, `CLAUDE.md`, docs it wrote). Idempotent if that set is already gone.

### Hard rules

- Never `npm install -g`.
- Never write to `~/.claude/` as a product location (a consuming project’s **project-local** `.claude/` is the host dir, not a machine-wide install).
- Missing payload subdirs: copy what exists; do not fail the whole install because a later phase has not filled a directory yet, unless `/dhs-setup` source is required to write the live skill — then a stub is enough.

## Done when

- `package.json` exposes binary `dhs`.
- From a throwaway directory, `npx` (or local `node` of the bin) `dhs install` creates `.dhs/` with the six subdir names (empty dirs OK), `.dhs/VERSION` equal to package version, and a project-local `/dhs-setup` skill.
- A second install does not duplicate trees or invent extra CLI output files.
- `dhs uninstall` removes `.dhs/` and that skill and leaves a pre-existing `harness.config.json` (if you placed one for the check) in place.
- No other subcommands are accepted as product commands.

## Handoff

Phase 2 may add files under `scripts/` and assume the next install copies them to `.dhs/scripts/`. Phase 5 replaces the `/dhs-setup` stub with the real skill; install keeps copying `skills/` and writing the live `/dhs-setup` skill only.
