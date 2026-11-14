# Prompt — implementation-plan stage 05: `/<prefix>setit-se`

Implement stage `05` of `docs/implementation-plan` only. Requires stages `01`–`04` = `done`. Historical stage: status `done` in the original plan.

## Repo context

- Repo `se-harness`. `/<prefix>setit-se` is the only skill `seh install` writes live. Setup finishes project configuration; the CLI does not.
- Prefix default `_`; `{{prefix}}` rendered on install.
- Live agents are copies (not symlinks) with `model:` from `agents.roles.<role>.model[<host.id>]`. Config values are never interpolated into agent bodies.
- Jira via `.seh/scripts/jira meta` only. Token never in chat or git.
- Read `docs/prd.md` first: Binding flow step 2, What `/<prefix>setit-se` does, Runtime config, Skills table, `/<prefix>setit-se` (detail), Decisions 11–14, 16–18.
- Versioning: `skills/` shipped → version bump in the same change (CLAUDE.md).

## Stage spec

### Goal

Author the real `/<prefix>setit-se` skill: first-run setup and later-run changes.

### Scope in

- Full skill under `skills/` (copied to `.seh/skills/`, written live by install).
- Entry: `.seh/` or setup skill missing, or `.seh/VERSION` missing → stop, tell user to run `seh install` here, then `/<prefix>setit-se`.
- First run (no `harness.config.json`), in order: read repo and state inferences; project PRD (use existing, never overwrite; otherwise gather and write `docs/prd.md`); detect packs (JS/TS, React Native, Angular, Next.js, Python, Django, FastAPI; monorepo: only trees that use them; honour `packsIgnored`); generate live agents and work skills, write `seh.generatedFrom`; roles (four, one question per host, prefilled from `modelSuggest`); `agents.contentLanguage` (ask once); `agents.baseBranch` (ask once, suggest `dev`); one optional project rule (skip default); `AGENTS.md` / `CLAUDE.md` (full proposed `AGENTS.md` shown, acceptance required; `CLAUDE.md` symlink preferred, independent file if link fails); Jira offer once (decline → `jiraOffer: declined`). Do not commit.
- Later run: finish any role model map missing a host id; VERSION ≠ `generatedFrom` → regenerate live agents, work skills and packs from `.seh/` and set `generatedFrom`; then one parameter at a time (role model → one cell; packs → regenerate; baseBranch → config only). Never touch `agents.brainstorm`, the project PRD or `AGENTS.md`. Do not commit.
- Jira add / change / remove: token file filled by user, `jira meta` verify loop, map statuses (`todo`, `inProgress`, `codeReview`, `inReview`, `done`, optional `blocker`, or `null`), types, fields. Switching does not migrate tasks.

### Scope out

- Work-skill behaviour (stage 06), brainstorm (stage 07). If stage 06 is not in the same pass, emit `BLOCKED:` placeholders. No second setup skill. No commit. No PRD or `AGENTS.md` rewrite on later run.

### Acceptance criteria

- `skills/` contains a complete `/<prefix>setit-se` that distinguishes first vs later run and VERSION mismatch.
- Procedure matches PRD detail (one question at a time, AGENTS.md acceptance, CLAUDE.md rules, Jira, no commit).
- Install still writes only this skill live.

### Depends on

- 01–04 = `done`.

## Constraints

- Do not commit unless the user asks. Do not touch `.env` files.
- Ask one question at a time; recommended option first, labelled **(Recommended)**.

## Definition of done

- Acceptance criteria PASS with grep evidence.
- Report: changed files, deviations.
