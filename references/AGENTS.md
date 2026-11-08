# Agents

This project uses **dhs**. Read `harness.config.json` at run time for the one-line product, doc paths, base git branch, file-tracker status strings, content language, tracker maps, `fetchFields`, and role models. Do not bake those values into agent files. Do not guess `main`, `master`, or the current checkout as the base branch.

The product and CLI binary are `dhs`. The npm package is `dev-harness-layer`. Run the CLI only in this project. Never `npm install -g`. Never write skills, templates, or a CLI to `~/.claude/` or any other machine-wide path.

## Binding flow

The only supported adoption path:

1. **Bootstrap** — `npx -p dev-harness-layer dhs install` (npm or GitHub). Result: `.dhs/` plus the install-owned `/dhs-setup` skill. Setup is not done. Do not offer work skills yet.
2. **Finish setup** — `/dhs-setup` only. The CLI does not configure the project.
3. **Work** — `/dhs-feature`, `/dhs-planit`, `/dhs-doit`, `/dhs-checkit`, `/dhs-brainstorm`, or later `/dhs-setup`.
4. **Remove bootstrap (optional)** — `dhs uninstall` with the **same source** as install. Removes `.dhs/` and the install-owned `/dhs-setup` skill. Leaves `harness.config.json` and files `/dhs-setup` generated.

CLI in v1: `dhs install` and `dhs uninstall` only.

Work skills stop before doing work when `harness.config.json` is missing **or** `.dhs/VERSION` does not match `dhs.generatedFrom`. Tell the user to run `/dhs-setup` (and `dhs install` first if `.dhs/` or `.dhs/VERSION` is missing).

## Roles

Exactly four product agents. Live copies typically live under `.claude/agents/` (not symlinks to `.dhs/agents/`). Brainstorm members are not agents and are not `@`-addressable. The brainstorm facilitator is a collector runner, not a fifth role.

| Role | Job |
|------|-----|
| Architect | Spec + prompt + first log row on the active tracker. Status stays at the configured `todo` string. Read-only on application code. No git writes. |
| Implementer | Implements the spec (`feature` or `bug`). Own phase plan. After each phase, launches Consultant. Calls `.dhs/scripts/start-task` before work. |
| Consultant | Code quality on the phase diff. Does not edit product code. Does not talk to the user. Does not judge spec compliance. Not a user-facing skill. |
| Reviewer | Spec compliance (requirements + acceptance criteria) only. After acceptance: changelog, then git allowlist scripts. Does not merge the PR. |

Models and optional role `rules` (reviewer may have `checklist`) come from `agents.roles` in `harness.config.json`.

## Skills

| Skill | Does |
|-------|------|
| `/dhs-setup` | First-time setup when config is missing; later, one parameter at a time (including tracker). |
| `/dhs-planit` | Architect once. Offer the next step; do not start it. |
| `/dhs-doit` | Implementer, including the Consultant loop. |
| `/dhs-checkit` | One Reviewer round: review, update from base, or close after the user confirms merge. |
| `/dhs-feature` | Architect → Implementer (Consultant inside) → Reviewer → fix rounds. |
| `/dhs-brainstorm` | Members, app context, and a consult round. |

## Tracker

Exactly one tracker: files **or** Jira, never both. Never mirror.

Which tracker is active is in `harness.config.json`. If `agents.tracker` is present, Jira is active: write spec, prompt, log, and status only on the ticket, using that map (`null` means skip that transition). Do not invent Jira status names. Credentials are in a local ignored file, never in git and never in chat.

If `agents.tracker` is absent, the files tracker is active. Same basename for all three files (example: `001-feature-example-name`):

| Path | Role |
|------|------|
| `docs/features/<basename>.feature.md` | Spec |
| `docs/prompt/<basename>.prompt.md` | Implementation prompt |
| `docs/feature-log/<basename>.log.md` | Append-only log |

Task key = basename. Branch name = basename. Status strings = `agents.statuses` (read from config; do not translate them from the conversation language). Artifact shapes: `.dhs/references/` (`spec.feature.md`, `prompt.prompt.md`, `log.log.md`).

`CHANGELOG.md` and code stay in git on both modes. Settled brainstorm records stay under `docs/brainstorm/` (not a task tracker).

## Git

Allowlisted git/`gh` operations run through `.dhs/scripts/`. Agents call those scripts. They do not compose the matching `git`/`gh` themselves. Scripts read `agents.baseBranch` from `harness.config.json`. No rebase, reset, or force. No merge of the PR (human on GitHub).

| Script | Who |
|--------|-----|
| `start-task` | Implementer at start; Reviewer if the branch is missing |
| `commit-task` | Reviewer, after acceptance, or after resolving an update merge |
| `push-task` | Reviewer |
| `open-pr` | Reviewer, after acceptance |
| `update-from-base` | Reviewer, only when the user asks to update |
| `return-to-base` | Reviewer, after PR opened or after close |

Architect and Consultant: no git writes; they do not call these scripts.

## Stops

Not questions and not Consultant `must-fix`. One line:

```text
BLOCKED: <what stopped> — <what the user or another skill must do>
```

If a `.dhs/scripts/` helper refuses, copy that `BLOCKED:` line into the report, stop that path, and do not work around it with raw `git` or `gh`. Shape: `.dhs/references/BLOCKED.md`.
