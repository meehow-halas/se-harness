# Prompt — tracker-read-only-mode stage 03: `/<prefix>setit-se`

Implement stage `03` of `docs/tracker-read-only-mode` only. Requires stages `01` and `02` = `done` in `docs/tracker-read-only-mode/README.md`. If not, stop and say so.

## Repo context

- Repo: `se-harness`. Skill source: `skills/setit-se/SKILL.md`; install writes the live `/<prefix>setit-se`.
- Settled decisions (do not reopen): Q4 setup: ask once, right after `meta` is `OK`; default **no** (full write). On yes, skip write maps; ask only `blocker` and keep `fetchFields`. Q5: no migration on toggle.
- Read-only is enforced by seh (scripts + agents), not by token permissions. The skill must never tell the user to remove tracker permissions or use another token.
- Agent regeneration is not needed for this key (runtime config).
- Versioning: `skills/` shipped → minor bump, propose to user.

## Stage spec

### Goal

Let the user choose read-only when connecting Jira or ADO, and toggle it on later runs.

### Scope in

`skills/setit-se/SKILL.md`:

- Add — Jira / Add — Azure DevOps: after `meta` is `OK`, one question: read-only mode? No (Recommended default: full write) / Yes. One sentence of explanation: seh reads the tracker but never changes it; spec, prompt, log and status are kept in repo files.
- On yes: write `readOnly: true`; skip `artifactsOnTrackerOnly`, status keys `todo`…`done`, `fields`, `issueTypes` / `workItemTypes`. Ask `blocker` only (numbered list from `meta`, or `null` = no tracker-key dependencies). Keep the `fetchFields` step.
- On no: today's flow, write `readOnly: false` (or leave missing, per stage 01 skeleton).
- Change: one option "toggle read-only". ro → rw: ask every map that is missing for full write (statuses, types, `artifactsOnTrackerOnly`, fields when `artifactsOnTrackerOnly` is `true`); no migration of files. rw → ro: set the flag, keep existing maps untouched, ask `blocker` if missing.
- Remove: unchanged (drops `agents.tracker`, including `readOnly`).
- One question at a time; content language rules as for the rest of the skill.

### Scope out

- Agent regeneration; scripts; agents.

### Decisions taken

- The read-only question is asked once, shared by the Jira and ADO Add paths, instead of copying the text twice (Recommended), if the skill structure allows it.

### Files likely touched

- `skills/setit-se/SKILL.md`

### Acceptance criteria

- Skill text matches the PRD setup table updated in stage 01.
- Read-only path asks no question about write maps; ro → rw path asks exactly the missing ones.
- Skill never tells the user to remove tracker permissions or use another token.

### Tests

- Docs/skill change; verify by reading and grep. `npm test` if any script changed.

### Depends on

- 01 = `done`, 02 = `done`.

## Constraints

- Do not edit `README.md`. Do not commit unless the user asks.
- Ask one question at a time; recommended option first, labelled **(Recommended)**.

## Definition of done

- Acceptance criteria PASS with evidence (file:line, grep output).
- `CHANGELOG.md` updated under the current version.
- Report: changed files, deviations.
