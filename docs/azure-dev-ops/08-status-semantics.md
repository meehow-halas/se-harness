# Phase 8 — Status key semantics in spec

## Goal

`spec.md` and `docs/prd.md` agree on what each `agents.tracker.statuses` key means for ADO (same as Jira). Found during the phase 6 review: the PRD table contradicted the agents; the PRD is fixed, `spec.md` listed keys without meaning.

## In scope

| Path | Change |
|------|--------|
| `docs/azure-dev-ops/spec.md` | `statuses` / `transition` rows state key meaning by reference to the PRD table “Azure DevOps tracker” (todo = Architect ready; inProgress = Implementer starts or rework; codeReview = Implementer finishes; inReview = Reviewer starts a round; done = clean review, PR open) |
| `docs/prd.md` | Verify ADO status table and event rows match; no change if they already do |
| `skills/setit-se/SKILL.md` | Verify any status-mapping prompt for ADO does not describe different meanings; fix only if it does |

Note: the `spec.md` sentence and the PRD table fix were already applied (uncommitted) while closing phase 6. This phase verifies them and settles wording.

## Options

| Topic | Recommended |
|-------|-------------|
| How `spec.md` states meaning | One short pointer to the PRD table, listing the five keys inline at most once; do not copy the full table |

## Out of scope

- Any script, agent or skill behaviour change; renaming keys.
- Edits to `README.md`.

## Done when

- `spec.md`, `docs/prd.md`, `agents/*.md` and `setit-se` give the same meaning for `todo`, `inProgress`, `codeReview`, `inReview`, `done`.
- `grep` finds no ADO text that maps `codeReview` to “Reviewer starts” or `done` to “merged”.
