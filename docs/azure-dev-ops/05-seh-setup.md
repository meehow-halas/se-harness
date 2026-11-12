# Phase 5 — `/<prefix>setit-se` for ADO

## Goal

Connect, change, or remove ADO tracker; map types, fields, statuses; verify with `ado meta`.

## In scope

- `skills/setit-se/SKILL.md` — tracker offer: **files | Jira | ADO** (one at a time); ADO questions (`organizationUrl`, `project`, PAT file `adoPat`); `ado meta` verify loop; mapping questions parallel to Jira.
- Config writes: `agents.tracker` with `kind: "ado"`, clear Jira-only keys on ADO connect and vice versa on remove.
- `adoOffer` or generalize `jiraOffer` → `trackerOffer` **only if** PRD phase 1 chose that shape; **(Recommended)** extend setup copy to handle `kind` without breaking declined Jira offer semantics.

## Out of scope

- Agent bodies (phase 6).
- Live consumer regen for every config tweak (PRD rule).

## Options

| Topic | Recommended |
|-------|-------------|
| Offer declined memory | Keep `jiraOffer: declined` meaning “declined external tracker on first ask” OR add `externalTrackerOffer: declined` in PRD phase 1 — follow PRD after phase 1 |
| Credential keys | `adoPat` only for ADO; empty string until user fills |

## Done when

- Skill text matches PRD setup table for ADO.
- No instruction to use `az devops` or MCP.
- Documented loop: user fixes token/URL/project → `ado meta` until `OK`.
