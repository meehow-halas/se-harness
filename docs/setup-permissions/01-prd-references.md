# 01 — PRD and references

## Goal

PRD and reference skeletons describe the target behaviour (README of this plan, sections Config / Behaviour) before any code changes.

## Scope in

- `docs/prd.md`: Feature tracking (drop read-only exception, add per-action write list and files fallback), Jira / ADO tracker sections and script tables (verb ↔ action, `get` per flag), Git (`agents.git` ops, chain, `UNCHANGED` + `git: <op> disabled`), Reviewer after-acceptance sequence, `/<prefix>setit-se` detail (changelog question, git ops question, tracker actions question, migrations), `/<prefix>shipit` requirement, Statuses (`done` meaning), Decisions.
- `references/harness.config.md`: `agents.reportChange` asked by setup, `agents.git`, `agents.tracker.write`, `tracker:` frontmatter.
- `references/harness.tracker.json`, `references/harness.tracker.ado.json`: `write` block, no `readOnly`.
- `references/` spec template (if any): `tracker:` frontmatter key.

## Scope out

- Scripts, skills, agents.

## Acceptance criteria

- No `readOnly` left in PRD or references except the migration rule.
- Every disabled action / op has exactly one stated fallback or hand-off.
