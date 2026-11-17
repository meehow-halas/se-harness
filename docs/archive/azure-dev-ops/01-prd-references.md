# 01 — PRD admission and references

## Goal

Move Azure DevOps from "idea in chat" to documented product scope: PRD admits one `ado` tracker, references ship a config skeleton, docs point agents at a future `scripts/ado`.

## Scope in

- PRD: remove ADO from Deferred (or narrow Deferred to "other trackers"); add `ado` script table rows parallel to `jira`; `/<prefix>setit-se` tracker section for ADO; one-tracker rule includes `kind`.
- `agents.tracker.kind`: `"jira"` | `"ado"` (existing projects without `kind` treated as Jira when `url` + `user` present).
- `references/harness.tracker.ado.json` skeleton (field names per README "Config shape").
- `references/harness.config.md`: document `kind`, `adoPat`, mutual exclusion with Jira fields.
- `references/harness.tracker.json`: `"kind": "jira"` note or field for new setups (backward compatible).
- Short cross-link from `docs/implementation-plan/README.md` ("Out of this v1 plan" or a "Post-v1" line, one paragraph).

## Scope out

- Implementing `scripts/ado`.
- Changing live `harness.config.json` in consuming repos.
- README.md unless the user asks.

## Decisions taken

- `kind` values `"jira"` | `"ado"`; missing `kind` with `url` + `user` = Jira (backward compatible). Source: spec, Recommended.

## Files likely touched

- `docs/prd.md`
- `references/harness.tracker.ado.json` (new)
- `references/harness.config.md`
- `references/harness.tracker.json`
- `docs/implementation-plan/README.md` (cross-link only)

## Acceptance criteria

- PRD explicitly allows files | Jira | ADO, still exactly one external tracker.
- Skeleton is valid JSON; field names match the config shape in README.
- No implementation code in `scripts/ado` (phase 2+).

## Tests

- JSON validity of the skeleton (`node -e` parse or existing test). No behaviour tests in this stage.

## Versioning

Changes `references/` (shipped). Per CLAUDE.md: patch bump without asking if wording only; minor if new config key (`kind`, `adoPat`) → propose level to the user. Not recorded in the legacy plan.

## Depends on

- None.
