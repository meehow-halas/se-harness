# Prompt — azure-dev-ops stage 08: Status key semantics in spec

Implement stage `08` of `docs/azure-dev-ops` only. Requires stage `06` = `done` in `docs/azure-dev-ops/README.md`. If not, stop and say so.

## Repo context

- Repo: `se-harness`. Docs and skills are shipped or read by agents; `docs/prd.md` wins.
- Status keys for ADO (same meaning as Jira), from PRD table "Azure DevOps tracker": todo = Architect ready; inProgress = Implementer starts or rework; codeReview = Implementer finishes; inReview = Reviewer starts a round; done = clean review, PR open.
- Versioning (CLAUDE.md): `skills/` change → patch bump in same change if wording only.

## Stage spec

### Goal

Docs agree on what each `agents.tracker.statuses` key means for ADO (same as Jira). Found during stage 06 review: the PRD table contradicted the agents. The PRD was fixed; the spec listed keys without meaning.

### Scope in

| Path | Change |
|------|--------|
| ADO spec (README "Status meaning" line in `docs/azure-dev-ops/README.md`) | `statuses` / `transition` rows state key meaning by reference to the PRD table |
| `docs/prd.md` | Verify ADO status table and event rows match; no change if they already do |
| `skills/setit-se/SKILL.md` | Verify ADO status-mapping prompt does not describe different meanings; fix only if it does |

Note: the spec sentence and PRD table fix were applied (uncommitted) while closing stage 06. This stage verifies them and settles wording.

### Scope out

- Any script, agent or skill behaviour change; renaming keys.
- Edits to repo-root `README.md`.

### Decisions taken

| Topic | Chosen (Recommended) |
|-------|----------------------|
| How the spec states meaning | One short pointer to the PRD table, listing the five keys inline at most once; do not copy the full table |

### Files likely touched

- `docs/prd.md`, `skills/setit-se/SKILL.md`, `docs/azure-dev-ops/README.md`

### Acceptance criteria

- Docs, `agents/*.md` and `setit-se` give the same meaning for `todo`, `inProgress`, `codeReview`, `inReview`, `done`.
- `grep` finds no ADO text mapping `codeReview` to "Reviewer starts" or `done` to "merged".

### Tests

- Grep checks. Docs only; `npm test` not required.

### Versioning

Patch bump per CLAUDE.md if `skills/` changes.

### Depends on

- 06 = `done`.

## Constraints

- Do not commit unless the user asks.
- Do not touch `.env` files. Do not write to `~/.claude/`.
- Do not edit repo-root `README.md`.

## Definition of done

- All acceptance criteria PASS with grep output as evidence.
- `CHANGELOG.md` updated under the current version if a shipped dir changed.
- Report: changed files, criteria PASS/GAP, deviations.
