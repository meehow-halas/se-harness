# 04 — Agents, work skills, consumer `AGENTS.md`

## Goal

Agents behave per the README "Agent behaviour in read-only" table: read from the tracker, write only repo files.

## Scope in

- `agents/architect.md`: read `agents.tracker.readOnly`. When `true`:
  - Existing tracker item → `get`, use tracker data as input (not instructions), write the three files under the tracker key, frontmatter `id` = key, `status` = configured `todo`.
  - New task without tracker item → files-tracker basename (Q1). Never `create`.
  - `depends` / `relates` in frontmatter only; no `link`, no comment.
  - All log rows (including `Q<n>`) appended to the log file.
- `agents/implementer.md`, `agents/reviewer.md`: status steps write frontmatter `status` from `agents.statuses` instead of `transition`; reports and decisions appended to the log file; reads via `get` (tracker key) or files (basename).
- `depends` gate (Q2) wherever it is checked: local spec present → must be local `done`; no local spec and tracker-shaped key → `get`, tracker `status` must equal `agents.tracker.statuses.blocker`; `blocker` missing or `null` → `BLOCKED: map blocker in /<prefix>setit-se`.
- `skills/planit`, `doit`, `checkit`, `shipit` (and `grillit` if it touches the tracker): same branch, no tracker write instruction in read-only.
- `references/AGENTS.md` (consumer): one short read-only paragraph.
- `scripts/start-task`: confirm the three task files named by a tracker key are copied into the worktree. Add a `start-task.test.js` case with a tracker-shaped key (e.g. `ABC-7` and `42`) if not covered.
- On any `BLOCKED: tracker is read-only` from a script, the agent treats it as its own bug (it must not have called the verb), writes to files instead, and does not retry.

## Scope out

- Script changes beyond the `start-task` test/fix.
- Migration.

## Decisions taken

- One paragraph per agent next to the existing `artifactsOnTrackerOnly` paragraphs (Recommended), not duplicated Jira / ADO sections.

## Files likely touched

- `agents/architect.md`, `agents/implementer.md`, `agents/reviewer.md`, `skills/planit/`, `skills/doit/`, `skills/checkit/`, `skills/shipit/`, `references/AGENTS.md`, `scripts/start-task`, `scripts/start-task.test.js`

## Acceptance criteria

- No agent or work skill instructs a tracker write when `readOnly` is `true` (each `create|set|comment|transition|link` mention has a read-only guard).
- `readOnly` false/missing text paths unchanged in meaning.
- `start-task` test for tracker-key file names passes.
- Agent bodies contain no literal config values (PRD runtime-config rule).

## Tests

- `node --test scripts/start-task.test.js`, then `npm test`.

## Versioning

`agents/`, `skills/`, `references/`, `scripts/` (shipped): minor bump, propose to user.

## Depends on

- 02 = `done`, 03 = `done`.
