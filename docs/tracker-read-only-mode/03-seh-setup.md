# 03 — `/<prefix>setit-se`

## Goal

Let the user choose read-only when connecting Jira or ADO, and toggle it on later runs.

## Scope in

`skills/setit-se/SKILL.md`:

- Add — Jira / Add — Azure DevOps: after `meta` is `OK`, one question: read-only mode? No (Recommended default: full write) / Yes. One sentence of explanation: seh reads the tracker but never changes it; spec, prompt, log and status are kept in repo files.
- On yes: write `readOnly: true`; skip `artifactsOnTrackerOnly`, status keys `todo`…`done`, `fields`, `issueTypes` / `workItemTypes`. Ask `blocker` only (numbered list from `meta`, or `null` = no tracker-key dependencies). Keep the `fetchFields` step.
- On no: today's flow, write `readOnly: false` (or leave missing, per stage 01 skeleton).
- Change: one option "toggle read-only". ro → rw: ask every map that is missing for full write (statuses, types, `artifactsOnTrackerOnly`, fields when `artifactsOnTrackerOnly` is `true`); no migration of files. rw → ro: set the flag, keep existing maps untouched, ask `blocker` if missing.
- Remove: unchanged (drops `agents.tracker`, including `readOnly`).
- One question at a time; content language rules as for the rest of the skill.

## Scope out

- Agent regeneration (runtime key; PRD rule).
- Scripts, agents.

## Decisions taken

- Read-only question asked once, shared by the Jira and ADO Add paths, instead of copying the text twice (Recommended), if the skill structure allows it.

## Files likely touched

- `skills/setit-se/SKILL.md`

## Acceptance criteria

- Skill text matches the PRD setup table updated in stage 01.
- Read-only path asks no question about write maps; ro → rw path asks exactly the missing ones.
- Skill never tells the user to remove tracker permissions or use another token; read-only is enforced by seh, not by the token.

## Tests

- Docs/skill change; verify by reading and grep.

## Versioning

`skills/` (shipped): minor bump, propose to user.

## Depends on

- 01 = `done`, 02 = `done`.
