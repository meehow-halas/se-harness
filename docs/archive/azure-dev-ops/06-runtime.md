# 06 — Agents, skills, consumer docs

## Goal

Runtime instructions call `.seh/scripts/ado` when `agents.tracker.kind === "ado"`.

## Scope in

| Path | Change |
|------|--------|
| `agents/architect.md` | ADO command block mirroring Jira |
| `agents/implementer.md` | `get`, `transition`, `comment` / `set log` |
| `agents/reviewer.md` | `get`, transitions, `comment` |
| `skills/planit`, `doit`, `checkit`, `shipit` | Active tracker = ADO when `kind` is `ado` |
| `references/AGENTS.md` | Script table and tracker section |
| `docs/prd.md` | Agent tables if stage 01 left gaps |

Task key in prose: numeric work item id.

## Scope out

- Regenerating host copies in other repos (user runs `/<prefix>setit-se` / install).
- Consultant calling `ado`.

## Decisions taken

| Topic | Chosen (Recommended) |
|-------|----------------------|
| Jira + ADO in one agent file | Branch on `kind` at run time; do not duplicate whole agents |
| `jira link` exception | Same exception for `ado link` |
| Script choice in docs | `.seh/scripts/ado` (Recommended) vs raw REST/CLI (rejected) |

## Files likely touched

- `agents/architect.md`, `agents/implementer.md`, `agents/reviewer.md`
- `skills/planit/`, `skills/doit/`, `skills/checkit/`, `skills/shipit/`
- `references/AGENTS.md`, `docs/prd.md` (if gaps)

## Acceptance criteria

- No agent tells users to run raw `curl` or `az boards` for tracker I/O.
- Work skills reference `artifactsOnTrackerOnly` for ADO the same as Jira.
- Consumer `AGENTS.md` lists `ado` script who-calls-who like `jira`.

## Tests

- Grep checks for forbidden strings; `npm test` if any script changed.

## Versioning

Changes `agents/`, `skills/`, `references/` (shipped): minor bump, propose to user.

## Depends on

- 04 = `done`, 05 = `done`.
