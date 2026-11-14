# Prompt — azure-dev-ops stage 05: `/<prefix>setit-se` for ADO

Implement stage `05` of `docs/azure-dev-ops` only. Requires stages `02` and `04` = `done` in `docs/azure-dev-ops/README.md`. If not, stop and say so.

## Repo context

- Repo: `se-harness`. Skill source: `skills/`; install writes live `/<prefix>setit-se`. Prefix default `_`; `{{prefix}}` rendered on install.
- CLI in v1: `seh install` and `seh uninstall` only. No `seh ado`. No `az devops`, no MCP for tracker I/O.
- Recommended architecture: `.seh/scripts/ado`; PAT in `harness.credentials.local.json` as `adoPat` (never in chat); `ado meta` verify loop.
- One tracker per project: files, Jira, or ADO. Do not offer Jira and ADO in one project. Switching does not migrate tasks.
- Read `docs/prd.md` first (setup table). PRD wins.
- Versioning (CLAUDE.md): `skills/` change → version bump in same change; minor (new `kind: "ado"` value) → propose the level and wait for the user.

## Stage spec

### Goal

Connect, change, or remove the ADO tracker; map types, fields, statuses; verify with `ado meta`.

### Scope in

- `skills/setit-se/SKILL.md`: tracker offer `files | Jira | ADO` (one at a time); ADO questions (`organizationUrl`, `project`, PAT in local credentials file as `adoPat`); `ado meta` verify loop; mapping questions parallel to Jira.
- Config writes: `agents.tracker` with `kind: "ado"`; clear Jira-only keys on ADO connect and ADO keys on Jira connect; remove clears tracker and PAT.
- Generalize `jiraOffer` → `trackerOffer` only if stage 01 chose that shape. Recommended: extend setup copy to handle `kind` without breaking declined-Jira-offer semantics.

### Scope out

- Agent bodies (stage 06).
- Live consumer regeneration for every config tweak (PRD rule).

### Decisions taken

| Topic | Chosen (Recommended) |
|-------|----------------------|
| Offer declined memory | Follow the PRD as updated in stage 01 |
| Credential keys | `adoPat` only for ADO; empty string until user fills |
| Tracker list order | Azure DevOps (for Azure Boards teams) vs Jira vs files, only if all three are in scope |

### Files likely touched

- `skills/setit-se/SKILL.md`

### Acceptance criteria

- Skill text matches PRD setup table for ADO.
- No instruction to use `az devops` or MCP.
- Documented loop: user fixes token / URL / project → `ado meta` until `OK`.

### Tests

- Docs/skill change; verify by grep and by reading the skill. `npm test` if any script changed.

### Versioning

`skills/` (shipped): minor bump, propose to user.

### Depends on

- 02 = `done`, 04 = `done`.

## Constraints

- Do not commit unless the user asks.
- Do not touch `.env` files. Do not write to `~/.claude/` or global npm.
- Ask one question at a time; recommended option first, marked `(Recommended)`.

## Definition of done

- All acceptance criteria PASS with evidence (grep output, file:line).
- `CHANGELOG.md` updated under the current version.
- Report: changed files, criteria PASS/GAP, deviations.
