# 05 — `/<prefix>setit-se`

## Goal

Author the real `/<prefix>setit-se` skill. It is the only skill `seh install` writes live. It finishes first-time setup and later changes the same config. The CLI does not configure the project.

Procedure: [../prd.md](../prd.md) sections Skills and `/<prefix>setit-se` (detail).

## Scope in

- Full skill template under `skills/` (copied to `.seh/skills/`, written live by install).
- First run (no `harness.config.json`) and later run (config present), including VERSION vs `seh.generatedFrom` regeneration.
- Generation of live agents (copies + `model:`), work-skill files from `.seh/skills/`, rule packs from `.seh/packs/` filtered by detection and `packsIgnored`.
- Project PRD: use existing, never overwrite; if none, gather and write `docs/prd.md`; config stores a one-line product plus doc paths.
- `AGENTS.md` / `CLAUDE.md` merge and rules (merge table in PRD). Show the full proposed `AGENTS.md` and wait for acceptance. `CLAUDE.md` symlink preferred; if the link fails, write an independent file and tell the user.
- Jira offer / add / change / remove via `.seh/scripts/jira meta` and config (no MCP, no seh Jira CLI).
- `agents.baseBranch` question (suggested default `dev`; never silently `main` / `master` / current checkout).
- One optional project rule on roles (skip is default).

First-run order: read repo and state inferences; PRD; packs (JS/TS, React Native, Angular, Next.js, Python, Django, FastAPI; monorepo: only where used; honour `packsIgnored`); generate live agents and work skills, write `seh.generatedFrom`; roles (only four; one question per host, prefilled from `modelSuggest`); `agents.contentLanguage` (ask once); `agents.baseBranch` (ask once); optional rule; `AGENTS.md` / `CLAUDE.md`; Jira offer once (decline → `jiraOffer: declined`). Do not commit.

Later run: finish any role `model` map missing a host `id` first. VERSION ≠ `generatedFrom` → regenerate live agents, work skills and rule packs from `.seh/` (not from PRD or `AGENTS.md`), set `generatedFrom`, tell the user. Then one parameter at a time: role `model` → one cell (one `agentsDir`); packs → regenerate; `baseBranch` → config only. Never touch `agents.brainstorm`, the project PRD or `AGENTS.md`. Do not commit.

Entry: `.seh/` or setup skill missing, or `.seh/VERSION` missing → stop and tell the user to run `seh install` here, then `/<prefix>setit-se`.

## Scope out

- Work-skill behaviour (phase 6) and brainstorm (phase 7). If phase 6 is not in the same pass, emit `BLOCKED:` placeholders. No second setup skill.
- Committing. Rewriting the PRD or `AGENTS.md` on a later run.
- Editing brainstorm members (`/<prefix>grillit`). Global install.
- Regenerating agent bodies when config values change (runtime rule).

## Decisions taken

- Live agents are copies, not symlinks. `model:` from `agents.roles.<role>.model[<host.id>]`.
- Config values are never interpolated into agent bodies.

## Files likely touched

- `skills/setit-se/SKILL.md`; work-skill templates under `skills/` (`seh-planit`, `seh-doit`, `seh-checkit`, `seh-shipit` names as referenced by setup); live files in consuming projects only.

## Acceptance criteria

- `skills/` contains a complete `/<prefix>setit-se` that distinguishes first and later run and VERSION mismatch.
- Procedure matches the PRD detail (one question at a time, AGENTS.md acceptance, CLAUDE.md rules, Jira, no commit).
- Install still writes only this skill live.

## Tests

- Skill text checks by grep; generation checked in a temp project when executable.

## Versioning

Initial skill. Not recorded in the legacy plan.

## Depends on

- 01–04 = `done`.
