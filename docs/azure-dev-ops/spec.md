# Azure DevOps tracker — spec

Behaviour for an optional **Azure DevOps Boards** tracker in `seh`. This document is the **ADO slice spec**. When it conflicts with [prd.md](../prd.md) on product-wide rules (one tracker, no CLI subcommands, install layout), **the PRD wins** until the PRD is updated to admit ADO.

## Problem

Teams on Azure DevOps need the same harness flow as Jira: spec, prompt, log, comments, and status steps on the **active tracker only**, with agents calling a single POSIX allowlist script — not raw `curl`, not `az boards`, not MCP.

## Recommended architecture (default)

When this spec or a phase file lists options, **implement the recommended row** unless the user explicitly chooses another in the commissioning message.

| Decision | Recommended | Rejected for seh |
|----------|-------------|------------------|
| API surface | **Azure DevOps WIT REST** (`api-version=7.1` on Services; pin in code) | `az boards` / `azure-devops` CLI extension |
| Script stack | **POSIX `sh` + `curl` + Node helper** (`scripts/ado`, `lib-ado.sh`, `ado-json.js`) | All-HTTP in agents; MCP; `seh ado` CLI |
| Auth | **PAT in `harness.credentials.local.json`** (`adoPat`); Basic with empty user + PAT as password | PAT in env (`AZURE_DEVOPS_EXT_PAT`); PAT in argv; interactive `az login` only |
| Passing creds to `curl` | **Transient `curl --config` file** (`mktemp`, mode `600`, `trap` remove) | `-u` / `-H Authorization` on argv; long-lived netrc in repo |
| Config | **`harness.config.json` → `agents.tracker`** + local credentials file only | Extra org/project files; machine-wide az defaults |
| Tracker identity | **`agents.tracker.kind`: `"ado"`** (Jira: `"jira"` or omitted for backward compat) | Two external trackers at once |
| Task key | **Numeric work item id** (string of digits) | Fabricated `PROJ-123` keys unless project adds a custom field later |
| Status change | **PATCH `System.State`** to mapped exact name; compare current → `UNCHANGED` | Guessing transitions API (Jira-only pattern) |
| Comments | **REST `…/workitems/{id}/comments`** for `ado comment` | Only `System.History` unless mapped to `history` |
| Body fields | **`System.Description` + custom field `referenceName`**; HTML in ADO → plain text in script I/O where needed | Storing markdown in ADO without conversion rules |
| Cloud vs Server | **Cloud first** (`https://dev.azure.com/{org}/…`); Server URL shape documented, same script | Server-only features before Cloud works |

## Product invariants (unchanged from PRD)

- CLI v1+: still only `seh install` / `seh uninstall`. **No** `seh ado`.
- Scripts live under package `scripts/`, installed as `.seh/scripts/ado`.
- **One tracker:** files **or** exactly one external tracker (`kind` `jira` or `ado`). No mirroring spec/prompt/log.
- Contract: `OK` / `UNCHANGED` / `BLOCKED:` (same family as `jira` and git scripts).
- Token **never** in argv, stdout, chat, or git.
- Agents call `.seh/scripts/ado`; they do not compose `curl` or REST.
- `agents.tracker.artifactsOnTrackerOnly`: same semantics as Jira (issue vs repo files named by task id).
- POSIX `sh` hosts only (v1 rule); ADO does not relax that.

## Config shape (`agents.tracker` when `kind` is `ado`)

Skeleton lives in `references/harness.tracker.ado.json` (phase 1). Fields:

| Key | Purpose |
|-----|---------|
| `kind` | `"ado"` |
| `organizationUrl` | Base, e.g. `https://dev.azure.com/{org}` (no trailing slash) |
| `project` | Project name or GUID |
| `workItemTypes.feature` / `.bug` | Exact type names from process template |
| `fields.spec` / `prompt` / `log` | `referenceName`, `description`, `comment`, or `history` |
| `fetchFields` | Extra field refs for `get` |
| `statuses` | Maps `todo`, `inProgress`, `codeReview`, `inReview`, `done`, `blocker` → state string or `null`; `todo`…`done` mean the same as in Jira (table “Azure DevOps tracker” in `docs/prd.md`: todo = Architect ready; inProgress = Implementer starts or rework; codeReview = Implementer finishes; inReview = Reviewer starts a round; done = clean review, PR open) |
| `artifactsOnTrackerOnly` | Boolean; default `true` when missing |

Credentials: `{ "adoPat": "…" }` in `harness.credentials.local.json` (may coexist with empty `jiraToken` keys only when unused; setup docs should not require both).

## Script surface (`scripts/ado`)

Mirror `scripts/jira` verbs and argv style:

| Verb | Role |
|------|------|
| `meta` | `/<prefix>setit-se` Add/Change — list states (per configured types), types, fields for mapping |
| `get <id>` | Architect, Implementer, Reviewer |
| `create --type feature\|bug --title <text>` | Architect |
| `set <id> spec\|prompt\|log [--file <path>]` | Architect; Implementer/Reviewer (log) |
| `comment <id> [--file <path>]` | All three |
| `transition <id> todo\|inProgress\|codeReview\|inReview\|done` | Step owner |
| `link <id> depends\|relates <other>` | Architect — `System.LinkTypes.Dependency-*` / `Related` |

`require_task` for ADO: numeric id (positive integer string).

## REST endpoints (reference)

Base: `{organizationUrl}/{project}/_apis/wit/…` (encode project in path as today’s MS docs).

- Meta: `GET workitemtypes`, per-type fields, `System.State` allowed values (`$expand=All` where needed), `GET fields`
- Get: `GET workitems/{id}`, comments collection when artifacts use comments
- Create: `POST workitems/${Type}` with `application/json-patch+json`
- Set / transition / link: `PATCH workitems/{id}` with JSON Patch
- Comment: `POST workitems/{id}/comments?api-version=7.1`

## `/<prefix>setit-se` (ADO)

Same offer/add/change/remove pattern as Jira:

1. Ask `organizationUrl`, `project` (no PAT in chat).
2. Write `adoPat` locally; confirm; loop `ado meta` until `OK` or user stops.
3. Map statuses, types, fields, `fetchFields`.
4. Set `agents.tracker.kind` to `ado`. Remove clears tracker and PAT.

Do not offer Jira and ADO in one project. Switching does not migrate tasks.

## HTML and log append

- **Description / rich fields:** ADO stores HTML. `ado-json.js` converts HTML → plain text for `get` output blocks; `set` may wrap plain text as minimal HTML or use markdown-friendly subset documented in phase 7.
- **Log on field:** append like Jira when `fields.log` is not `comment` / `history`.

## Worktrees and task id

Branch and worktree directory name = work item id (digits). Git scripts unchanged; agents pass id instead of Jira key.

## Out of scope (this initiative)

- Azure CLI integration.
- Replacing Jira implementation.
- Auto-merge, MCP, Windows `cmd` hosts.
- Full Azure DevOps Server QA before Cloud paths are green in tests.

## PRD follow-up

Shipping ADO requires moving **“Trackers beyond Jira”** off Deferred in [prd.md](../prd.md) and adding ADO rows to the script table, setup, and decisions. Phase 1 owns that edit set.

## Verification principles

Same as [implementation-plan.md](../implementation-plan.md): behaviour tests stub `curl` only; fixtures must not match hardcoded org/project/token; assert token absent from stdout and stub argv.
