# Prompt — tracker-read-only-mode stage 04: Agents, work skills, consumer `AGENTS.md`

Implement stage `04` of `docs/tracker-read-only-mode` only. Requires stages `02` and `03` = `done` in `docs/tracker-read-only-mode/README.md`. If not, stop and say so.

## Repo context

- Repo: `se-harness`. Shipped dirs: `agents/`, `skills/`, `references/`, `scripts/`.
- Read-only: `agents.tracker.readOnly: true` → agents read from the tracker (`get`) and write only repo files. Full table in the stage spec below.
- Settled decisions (do not reopen): Q1 keys hybrid; Q2 `depends` gate local with tracker `blocker` for tracker-key deps; Q3 scripts refuse writes.
- Agent bodies must contain no literal config values (PRD runtime-config rule). Read config at run time.
- Versioning: shipped dirs → minor bump, propose to user.

## Stage spec

### Goal

Agents behave per this table: read from the tracker, write only repo files.

| When | Full write (today) | Read-only |
|------|--------------------|-----------|
| Architect creates a task | `create` + `set` / files + `transition todo` | Existing tracker item: `get`, write the three files under its key. New: files basename. Status `todo` in frontmatter. |
| Architect updates spec/prompt | tracker or files | files only |
| `depends` / `relates` | `link` | frontmatter only (no link, no comment) |
| User decision `Q<n>`, reviewer report, other log rows | comment / log field | append to log file |
| Implementer / Reviewer status steps | `transition` | frontmatter `status` from `agents.statuses` |
| Reads | `get` | `get` (tracker scalars + file bodies) |

`start-task` copies the task's three files into the worktree (existing behaviour for files-tracker paths; must work for tracker-key names too).

### Scope in

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

### Scope out

- Script changes beyond the `start-task` test/fix.
- Migration.

### Decisions taken

- One paragraph per agent next to the existing `artifactsOnTrackerOnly` paragraphs (Recommended), not duplicated Jira / ADO sections.

### Files likely touched

- `agents/architect.md`, `agents/implementer.md`, `agents/reviewer.md`, `skills/planit/`, `skills/doit/`, `skills/checkit/`, `skills/shipit/`, `references/AGENTS.md`, `scripts/start-task`, `scripts/start-task.test.js`

### Acceptance criteria

- No agent or work skill instructs a tracker write when `readOnly` is `true` (each `create|set|comment|transition|link` mention has a read-only guard).
- `readOnly` false/missing text paths unchanged in meaning.
- `start-task` test for tracker-key file names passes.
- Agent bodies contain no literal config values.

### Tests

- `node --test scripts/start-task.test.js`, then `npm test`. Report actual output.

### Depends on

- 02 = `done`, 03 = `done`.

## Constraints

- Do not edit `README.md`. Do not commit unless the user asks.
- Do not weaken or delete tests.
- Ask one question at a time; recommended option first, labelled **(Recommended)**.

## Definition of done

- Acceptance criteria PASS with grep and test output as evidence.
- `CHANGELOG.md` updated under the current version.
- Report: changed files, deviations.
