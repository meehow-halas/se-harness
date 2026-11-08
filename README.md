# dhs

A layer for software engineering work in an AI coding assistant (Claude Code first). It ships **skills**, **agents**, **rule packs**, and a **small CLI** so a project can specify, implement (with a quality loop), and review work without each agent inventing its own process.

The product and CLI binary are **`dhs`**. The npm package is **`dev-harness-layer`**.

## Requirements

- Node.js 18 or later
- Run commands in **this project’s directory**, with the assistant open on that project
- Do **not** `npm install -g`
- Do **not** install skills, templates, or a CLI into `~/.claude/` or any other machine-wide path

## 1. Install

From the project directory, pick one source and reuse it later for uninstall:

```text
npx -p dev-harness-layer dhs install
npx -p github:nbmh/dev-harness-layer dhs install
```

npm and GitHub are equivalent. Result: `.dhs/` and the project skill `/dhs-setup`. Setup is **not** done. Work skills (`/dhs-feature`, `/dhs-planit`, `/dhs-doit`, `/dhs-checkit`, `/dhs-brainstorm`) do not exist yet.

## 2. Setup

In the assistant, run **`/dhs-setup`**. That is the only way to finish first-time setup. The CLI does not configure the project.

Required result: a project PRD, `harness.config.json`, agents, the remaining skills, rule packs, and a project-root `AGENTS.md`.

## 3. Work

| Intent | Command |
|--------|---------|
| Full path | `/dhs-feature` plus what to build |
| Spec only | `/dhs-planit` |
| Implementation only | `/dhs-doit` |
| One review / update from base / close after merge | `/dhs-checkit` |
| Change parameters or Jira | `/dhs-setup` |
| Personae | `/dhs-brainstorm` |

You merge the GitHub PR. Close is `/dhs-checkit` after you confirm the merge.

## 4. Uninstall (optional)

Same source as install:

```text
npx -p dev-harness-layer dhs uninstall
npx -p github:nbmh/dev-harness-layer dhs uninstall
```

Removes `.dhs/` and the install-owned `/dhs-setup` skill. Leaves `harness.config.json` and files `/dhs-setup` already generated.

## After a package update

Run install again from the same source, then `/dhs-setup`, so generated files match the installed templates (`.dhs/VERSION` vs `dhs.generatedFrom`).

## CLI

v1 CLI is only `dhs install` and `dhs uninstall`. Everything else is a skill.
