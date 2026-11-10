# Phase 6 — Agents, skills, consumer docs

## Goal

Runtime instructions call `.dhs/scripts/ado` when `agents.tracker.kind === "ado"`.

## In scope

| Path | Change |
|------|--------|
| `agents/architect.md` | ADO command block mirror Jira |
| `agents/implementer.md` | `get`, `transition`, `comment` / `set log` |
| `agents/reviewer.md` | `get`, transitions, `comment` |
| `skills/dhs-planit`, `dhs-doit`, `dhs-checkit`, `dhs-shipit` | Active tracker = ADO when `kind` is `ado` |
| `references/AGENTS.md` | Script table + tracker section |
| `docs/prd.md` | Agent tables if phase 1 left gaps |

Task key in prose: **numeric work item id**.

## Out of scope

- Regenerating all host copies in other repos (user runs `/dhs-setup` / install).
- Consultant calling ado.

## Options

| Topic | Recommended |
|-------|-------------|
| Jira + ADO in one agent file | Branch on `kind` at run time; do not duplicate entire agents |
| `jira link` exception | Same for `ado link` |

## Done when

- No agent tells users to run raw `curl` or `az boards` for tracker I/O.
- Work skills reference `artifactsOnTrackerOnly` for ADO same as Jira.
- Consumer `AGENTS.md` lists `ado` script who-calls-who like `jira`.
