# 05 — `/<prefix>setit-se` for ADO

## Goal

Connect, change, or remove the ADO tracker; map types, fields, statuses; verify with `ado meta`.

## Scope in

- `skills/setit-se/SKILL.md`: tracker offer `files | Jira | ADO` (one at a time); ADO questions (`organizationUrl`, `project`, PAT in local credentials file as `adoPat`); `ado meta` verify loop; mapping questions parallel to Jira.
- Config writes: `agents.tracker` with `kind: "ado"`; clear Jira-only keys on ADO connect and ADO keys on Jira connect; remove clears tracker and PAT.
- Generalize `jiraOffer` → `trackerOffer` only if stage 01 chose that shape. Recommended: extend setup copy to handle `kind` without breaking declined-Jira-offer semantics.

## Scope out

- Agent bodies (stage 06).
- Live consumer regeneration for every config tweak (PRD rule).

## Decisions taken

| Topic | Chosen (Recommended) |
|-------|----------------------|
| Offer declined memory | Follow the PRD as updated in stage 01 |
| Credential keys | `adoPat` only for ADO; empty string until user fills |
| Tracker list order | Azure DevOps (for Azure Boards teams) vs Jira vs files, only if all three are in scope |

Do not offer Jira and ADO in one project. Switching does not migrate tasks.

## Files likely touched

- `skills/setit-se/SKILL.md`

## Acceptance criteria

- Skill text matches PRD setup table for ADO.
- No instruction to use `az devops` or MCP.
- Documented loop: user fixes token / URL / project → `ado meta` until `OK`.

## Tests

- Docs/skill change; verify by grep and by reading the skill. No `npm test` requirement beyond shipped-dir rules.

## Versioning

Changes `skills/` (shipped). Minor bump (new config value `kind: "ado"`), propose to user.

## Depends on

- 02 = `done`, 04 = `done`.
