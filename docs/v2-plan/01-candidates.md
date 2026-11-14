# 01 — Candidates from Deferred

## Goal

Keep the nine PRD Deferred candidates in one place, each with its reason and PRD reference, so a later version scope can pick them deliberately.

## Scope in

- Record each candidate with: what it is, why it is deferred (risk or constraint), PRD reference.
- Candidates: auto-merge; auto-install of a newer version; Consultant as a user-facing skill; changing `agents.contentLanguage` mid-task; file-tracker status and log helpers in `.seh/scripts/`; Jira Server / Data Center; local git without remote or `gh` as a separate mode; running `.seh/scripts/` on Windows; symlinks from live agents to `.seh/agents/`.

## Scope out

- Implementing any candidate. Creating tickets from them. Treating this list as a backlog.
- Trackers beyond files, Jira and Azure DevOps (non-goal for v1).

## Decisions taken

- Each candidate needs an explicit new version scope before implementation (PRD rule, AGENTS.md "Deferred").

## Files likely touched

- None until a version scope is opened. Source: `docs/prd.md` (Deferred section).

## Acceptance criteria

- Nine candidates listed with PRD references.
- Each candidate has a reason.
- No candidate is marked approved.

## Tests

- None (planning document).

## Versioning

None.

## Depends on

- None.
