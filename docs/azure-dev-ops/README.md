# Azure DevOps tracker

Goal: optional Azure DevOps Boards tracker (`agents.tracker.kind: "ado"`) in `seh`, same flow and `OK` / `UNCHANGED` / `BLOCKED:` contract as `jira`, via `.seh/scripts/ado` only.

Planning: complete

Migrated from the pre-`_make-plan` layout (`plan.md`, `spec.md`, `prompt.md`). Stage statuses below are the statuses recorded in the original plan. They were not re-verified during migration.

## Open questions

None.

## Shared decisions

Recommended architecture (default; a stage implements the recommended row unless the commissioning message overrides it):

| Decision | Recommended | Rejected for seh |
|----------|-------------|------------------|
| API surface | Azure DevOps WIT REST (`api-version=7.1`, pinned in code) | `az boards` / `azure-devops` CLI extension |
| Script stack | POSIX `sh` + `curl` + Node helper (`scripts/ado`, `lib-ado.sh`, `ado-json.js`) | All-HTTP in agents; MCP; `seh ado` CLI |
| Auth | PAT in `harness.credentials.local.json` (`adoPat`); Basic with empty user + PAT | PAT in env; PAT in argv; interactive `az login` only |
| Passing creds to `curl` | Transient `curl --config` file (`mktemp`, mode `600`, `trap` remove) | `-u` / `-H Authorization` on argv; long-lived netrc in repo |
| Config | `harness.config.json` → `agents.tracker` + local credentials file only | Extra org/project files; machine-wide az defaults |
| Tracker identity | `agents.tracker.kind`: `"ado"` (Jira: `"jira"` or omitted) | Two external trackers at once |
| Task key | Numeric work item id | Fabricated `PROJ-123` keys |
| Status change | PATCH `System.State` to mapped exact name; current equal → `UNCHANGED` | Guessing transitions API |
| Comments | REST `…/workitems/{id}/comments` for `ado comment` | Only `System.History` unless mapped |
| Body fields | `System.Description` + custom field `referenceName`; HTML ↔ plain text in script I/O | Markdown stored in ADO without conversion rules |
| Cloud vs Server | Cloud first (`https://dev.azure.com/{org}/…`) | Server-only features before Cloud works |

Product invariants: CLI only `seh install` / `seh uninstall`; scripts under package `scripts/` installed as `.seh/scripts/ado`; one tracker (files or exactly one of `jira` / `ado`); contract `OK` / `UNCHANGED` / `BLOCKED:`; token never in argv, stdout, chat or git; agents call `.seh/scripts/ado`, never raw `curl`/REST; POSIX `sh` hosts only.

Config shape (`agents.tracker`, `kind: "ado"`): `organizationUrl`, `project`, `workItemTypes.feature` / `.bug`, `fields.spec` / `prompt` / `log` (`referenceName`, `description`, `comment`, or `history`), `fetchFields`, `statuses` (`todo`, `inProgress`, `codeReview`, `inReview`, `done`, `blocker` → state string or `null`), `artifactsOnTrackerOnly` (default `true`). Skeleton: `references/harness.tracker.ado.json`.

Status meaning (same as Jira, from PRD table "Azure DevOps tracker"): todo = Architect ready; inProgress = Implementer starts or rework; codeReview = Implementer finishes; inReview = Reviewer starts a round; done = clean review, PR open.

Out of scope for the initiative: Azure CLI integration; replacing Jira; auto-merge, MCP, Windows `cmd` hosts; full Azure DevOps Server QA before Cloud paths are green in tests.

## Stage table

| NN | name | status | verification |
|----|------|--------|--------------|
| 01 | [prd-references](01-prd-references.md) | done | legacy: not re-run |
| 02 | [foundation](02-foundation.md) | done | legacy: not re-run |
| 03 | [crud](03-crud.md) | done | legacy: not re-run |
| 04 | [workflow](04-workflow.md) | done | legacy: not re-run |
| 05 | [seh-setup](05-seh-setup.md) | done | legacy: not re-run |
| 06 | [runtime](06-runtime.md) | done | legacy: not re-run |
| 07 | [html-bodies](07-html-bodies.md) | done | legacy: not re-run |
| 08 | [status-semantics](08-status-semantics.md) | done | legacy: not re-run |

Initiative complete when: stages 01–08 are `done`, PRD lists ADO in the script table, and a consuming project can connect ADO via `/<prefix>setit-se` and run Architect → Implementer → Reviewer using `.seh/scripts/ado` only.
