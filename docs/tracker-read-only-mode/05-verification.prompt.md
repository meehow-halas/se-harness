# Prompt — tracker-read-only-mode stage 05: Verification

Implement stage `05` of `docs/tracker-read-only-mode` only. Requires stage `04` = `done` in `docs/tracker-read-only-mode/README.md`. If not, stop and say so.

## Repo context

- Repo: `se-harness`. Manual test style follows `docs/session-fanout-manual-test/01-manual-test.md`.
- Read-only: tracker is read-only for seh; files hold spec, prompt, log, status. Tracker must show no change.
- Live tracker steps are run by the user. Do not enter credentials or tokens.
- Versioning: no bump in this stage.

## Stage spec

### Goal

Prove end to end that read-only leaves the tracker untouched and the files hold the full history.

### Scope in

- `docs/tracker-read-only-mode/manual-test.md`: a scenario run once on Jira and once on ADO:
  1. `seh install` into a scratch project; `/<prefix>setit-se` → connect tracker → read-only yes → `blocker` mapped.
  2. Note the tracker item's fields, comments, state, links, history (before snapshot).
  3. "Show task <KEY>" → data read from the tracker.
  4. `/<prefix>planit <KEY>` → three files under `<KEY>`, status `todo`.
  5. New task from a sentence → files basename, no tracker item created.
  6. `/<prefix>doit <KEY>` → `/<prefix>checkit <KEY>` → status `done` in frontmatter, log rows in file.
  7. After snapshot of the tracker item equals before snapshot.
  8. `/<prefix>setit-se` Change → read-only off → asks missing maps; new task goes to the tracker; old files untouched.
- Full `npm test`.

### Scope out

- Live tracker steps by the user.

### Decisions taken

- The manual test file is the deliverable, with expected results per step.

### Files likely touched

- `docs/tracker-read-only-mode/manual-test.md`

### Acceptance criteria

- Manual test file exists with expected results per step.
- `npm test` passes (report actual output).
- Any defect found is fixed in the owning stage's files and noted in the report.

### Tests

- Full `npm test`.

### Depends on

- 04 = `done`.

## Constraints

- Do not edit `README.md`. Do not commit unless the user asks.
- Do not weaken or delete tests.

## Definition of done

- Acceptance criteria PASS with evidence; `npm test` output quoted.
- Report: changed files, deviations, steps the user must run live.
