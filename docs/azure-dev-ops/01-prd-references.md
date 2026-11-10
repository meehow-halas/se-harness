# Phase 1 — PRD admission and references

## Goal

Move Azure DevOps from “idea in chat” to **documented product scope**: PRD admits one `ado` tracker, references ship a config skeleton, and docs point agents at future `scripts/ado`.

## In scope

- PRD edits: remove ADO from Deferred (or narrow Deferred to “trackers beyond Jira **and ADO**” → only “other trackers”); add `ado` script table rows parallel to `jira`; `/dhs-setup` tracker section for ADO; one-tracker rule includes `kind`.
- `agents.tracker.kind`: **`"jira"`** | **`"ado"`** (existing projects without `kind` treated as Jira when `url`+`user` present).
- `references/harness.tracker.ado.json` skeleton per [spec.md](spec.md).
- `references/harness.config.md` — document `kind`, `adoPat`, mutual exclusion with Jira fields.
- `references/harness.tracker.json` — add `"kind": "jira"` note or field for new setups (backward compatible).
- This plan folder already exists; link from a short note in `docs/implementation-plan.md` **Out of this v1 plan** or a new “Post-v1” line (one paragraph, no backlog drift).

## Out of scope

- Implementing `scripts/ado`.
- Changing live `harness.config.json` in consuming repos automatically.
- README unless user asks.

## Outputs

| Path | What |
|------|------|
| `docs/prd.md` | ADO tracker + scripts + setup |
| `references/harness.tracker.ado.json` | Skeleton |
| `references/harness.config.md` | Tracker kinds |
| `docs/implementation-plan.md` | Optional cross-link to `docs/azure-dev-ops/plan.md` |

## Done when

- PRD explicitly allows **files | Jira | ADO**, still exactly one external tracker.
- Skeleton validates as JSON; field names match [spec.md](spec.md).
- No implementation code in `scripts/ado` yet (phase 2+).
