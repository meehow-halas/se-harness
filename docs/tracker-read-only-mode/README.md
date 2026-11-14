# Tracker read-only mode

Goal: optional read-only mode (`agents.tracker.readOnly: true`) for the external tracker (Jira or Azure DevOps). seh reads tasks from the tracker but never changes it. Spec, prompt, log and status live in repo files.

Planning: complete

Migrated from the pre-`_make-plan` layout (`spec.md`, `plan.md`, `prompt.md`, `01-…` to `06-…`). Stage statuses below are the statuses recorded in the original plan. They were not re-verified during migration. `manual-test.md` is the stage 05 deliverable (manual end-to-end scenario, run by the user against live trackers) and is kept as is.

## Open questions

None.

## Decisions (accepted)

| Id | Decision | Chosen (Recommended) | Rejected |
|----|----------|----------------------|----------|
| Q1 | Task keys | Hybrid. A task that exists on the tracker uses its key for file names and branch (`docs/features/PROJ-123.feature.md`, branch `PROJ-123`). A new task with no tracker item uses a files-tracker basename (`001-feature-x`). | Tracker keys only (Architect BLOCKED for new tasks); always basename with `trackerKey` in frontmatter |
| Q2 | Status and `depends` | Local. Status is spec frontmatter (`agents.statuses`). A `depends` entry with a local spec must be at local `done`. A `depends` entry with no local spec that is a tracker key is read with `get`; its tracker status must equal `agents.tracker.statuses.blocker`. | Local only (missing file = BLOCKED); tracker status as gate |
| Q3 | Enforcement | Script + agents. `jira` / `ado` refuse every write verb with `BLOCKED:` and send no HTTP request. Agents never call write verbs. `get` and `meta` work as usual. | Agent instructions only |
| Q4 | Setup | Ask once, skip write maps. One question right after `meta` is `OK` (default: no = full write). On yes, skip status map `todo`…`done`, `fields`, `issueTypes` / `workItemTypes`, and `artifactsOnTrackerOnly`; ask only for `blocker` (and `fetchFields` as today). Later Change toggles the flag. | Map everything even in read-only |
| Q5 | Switching | No migration (PRD "switching does not migrate"). Files stay in the repo. | Local files win after ro → rw |

PRD exception: with `readOnly: true`, the tracker is a read source and the files tracker is the write store. Nothing is mirrored.

## Config

| Key | Values | Default |
|-----|--------|---------|
| `agents.tracker.readOnly` | `true` \| `false` | `false` when missing (current behaviour unchanged) |

When `readOnly` is `true`: `artifactsOnTrackerOnly` is ignored and treated as `false`; `agents.tracker.statuses` needs only `blocker`; `fields`, `issueTypes` / `workItemTypes` are ignored and may be absent; `fetchFields` keeps its meaning for `get`. Same key and semantics for `kind: "jira"` and `kind: "ado"`.

## Stage table

| NN | name | status | verification |
|----|------|--------|--------------|
| 01 | [prd-references](01-prd-references.md) | done | legacy: not re-run |
| 02 | [scripts](02-scripts.md) | done | legacy: not re-run |
| 03 | [seh-setup](03-seh-setup.md) | done | legacy: not re-run |
| 04 | [runtime](04-runtime.md) | done | legacy: not re-run |
| 05 | [verification](05-verification.md) | done | legacy: not re-run; manual test in [manual-test.md](manual-test.md) |
| 06 | [readme](06-readme.md) | done | legacy: not re-run |

Parallelism (original plan): stages 02 and 03 may run in parallel after 01 (different files). Stage 03 must not ship before 02 is `done`.

## Initiative complete when

Stages 01–06 are `done`, README describes read-only mode, and a consuming project can connect Jira or ADO in read-only via `/<prefix>setit-se`, run Architect → Implementer → Reviewer on an existing tracker item, and the tracker shows no change while repo files hold spec, prompt, log, and status.

## Out of scope

- Migration of files ↔ tracker on toggle.
- Read-only for trackers other than Jira / ADO.
- Partial read-only (e.g. comments allowed, transitions denied).
- README changes outside tracker sections.
