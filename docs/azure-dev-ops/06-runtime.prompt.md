# Prompt — azure-dev-ops stage 06: Agents, skills, consumer docs

Implement stage `06` of `docs/azure-dev-ops` only. Requires stages `04` and `05` = `done` in `docs/azure-dev-ops/README.md`. If not, stop and say so.

## Repo context

- Repo: `se-harness`. Shipped dirs: `agents/`, `packs/`, `skills/`, `brainstorm/`, `references/`, `scripts/`, `src/`.
- Runtime agents call `.seh/scripts/ado` when `agents.tracker.kind === "ado"`. Never raw `curl`, `az boards`, or MCP for tracker I/O.
- Task key in prose: numeric work item id.
- Jira + ADO branch on `kind` at run time; do not duplicate whole agents.
- Versioning (CLAUDE.md): change to shipped dirs → version bump in same change; minor → propose to user.

## Stage spec

### Goal

Runtime instructions call `.seh/scripts/ado` when `agents.tracker.kind === "ado"`.

### Scope in

| Path | Change |
|------|--------|
| `agents/architect.md` | ADO command block mirroring Jira |
| `agents/implementer.md` | `get`, `transition`, `comment` / `set log` |
| `agents/reviewer.md` | `get`, transitions, `comment` |
| `skills/planit`, `doit`, `checkit`, `shipit` | Active tracker = ADO when `kind` is `ado` |
| `references/AGENTS.md` | Script table and tracker section |
| `docs/prd.md` | Agent tables if stage 01 left gaps |

### Scope out

- Regenerating host copies in other repos (user runs `/<prefix>setit-se` / install).
- Consultant calling `ado`.

### Decisions taken

| Topic | Chosen (Recommended) |
|-------|----------------------|
| Jira + ADO in one agent file | Branch on `kind` at run time; do not duplicate whole agents |
| `jira link` exception | Same exception for `ado link` |
| Script choice in docs | `.seh/scripts/ado` (Recommended) vs raw REST/CLI (rejected) |

### Files likely touched

- `agents/architect.md`, `agents/implementer.md`, `agents/reviewer.md`
- `skills/planit/`, `skills/doit/`, `skills/checkit/`, `skills/shipit/`
- `references/AGENTS.md`, `docs/prd.md` (if gaps)

### Acceptance criteria

- No agent tells users to run raw `curl` or `az boards` for tracker I/O.
- Work skills reference `artifactsOnTrackerOnly` for ADO the same as Jira.
- Consumer `AGENTS.md` lists `ado` script who-calls-who like `jira`.

### Tests

- Grep checks for forbidden strings; `npm test` if any script changed.

### Versioning

`agents/`, `skills/`, `references/` (shipped): minor bump, propose to user.

### Depends on

- 04 = `done`, 05 = `done`.

## Constraints

- Do not commit unless the user asks.
- Do not touch `.env` files. Do not write to `~/.claude/` or global npm.
- Ask one question at a time; recommended option first, marked `(Recommended)`.

## Definition of done

- All acceptance criteria PASS with evidence (grep output, file:line).
- `CHANGELOG.md` updated under the current version.
- Report: changed files, criteria PASS/GAP, deviations.
