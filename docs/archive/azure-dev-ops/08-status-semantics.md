# 08 — Status key semantics in spec

## Goal

Docs agree on what each `agents.tracker.statuses` key means for ADO (same as Jira). Found during stage 06 review: the PRD table contradicted the agents. The PRD was fixed; the spec listed keys without meaning.

## Scope in

| Path | Change |
|------|--------|
| ADO spec (now the README "Status meaning" line) | `statuses` / `transition` rows state key meaning by reference to the PRD table "Azure DevOps tracker" |
| `docs/prd.md` | Verify ADO status table and event rows match; no change if they already do |
| `skills/setit-se/SKILL.md` | Verify ADO status-mapping prompt does not describe different meanings; fix only if it does |

Note: the spec sentence and PRD table fix were applied (uncommitted) while closing stage 06. This stage verifies them and settles wording.

## Scope out

- Any script, agent or skill behaviour change; renaming keys.
- Edits to `README.md` (repo root).

## Decisions taken

| Topic | Chosen (Recommended) |
|-------|----------------------|
| How the spec states meaning | One short pointer to the PRD table, listing the five keys inline at most once; do not copy the full table |

## Files likely touched

- `docs/prd.md`, `skills/setit-se/SKILL.md`, and the ADO docs file that states key meaning.

## Acceptance criteria

- The docs, `agents/*.md` and `setit-se` give the same meaning for `todo`, `inProgress`, `codeReview`, `inReview`, `done`.
- `grep` finds no ADO text mapping `codeReview` to "Reviewer starts" or `done` to "merged".

## Tests

- Grep checks. Docs only; `npm test` not required.

## Versioning

Docs/skill wording: patch bump per CLAUDE.md if a shipped dir (`skills/`) changes.

## Depends on

- 06 = `done`.
