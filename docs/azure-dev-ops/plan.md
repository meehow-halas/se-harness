# Azure DevOps tracker — implementation plan

Phased build for the optional **ADO Boards** tracker. **Not a second product PRD.** Behaviour is anchored in [spec.md](spec.md) and [prd.md](../prd.md).

## How to use

Commission one phase via [prompt.md](prompt.md) and the phase’s `.prompt.md`.

When a phase’s “Done when” and [shared done rules](#shared-done-rules) hold, set that row’s **Status** to `done` below. Do not start a phase whose **Depends on** rows are still `todo`.

| Phase | Slice | Prompt |
|-------|--------|--------|
| — | [spec.md](spec.md), this file | [prompt.md](prompt.md) |
| 1 | [01-prd-references.md](01-prd-references.md) | [01-prd-references.prompt.md](01-prd-references.prompt.md) |
| 2 | [02-foundation.md](02-foundation.md) | [02-foundation.prompt.md](02-foundation.prompt.md) |
| 3 | [03-crud.md](03-crud.md) | [03-crud.prompt.md](03-crud.prompt.md) |
| 4 | [04-workflow.md](04-workflow.md) | [04-workflow.prompt.md](04-workflow.prompt.md) |
| 5 | [05-seh-setup.md](05-seh-setup.md) | [05-seh-setup.prompt.md](05-seh-setup.prompt.md) |
| 6 | [06-runtime.md](06-runtime.md) | [06-runtime.prompt.md](06-runtime.prompt.md) |
| 7 | [07-html-bodies.md](07-html-bodies.md) | [07-html-bodies.prompt.md](07-html-bodies.prompt.md) |
| 8 | [08-status-semantics.md](08-status-semantics.md) | [08-status-semantics.prompt.md](08-status-semantics.prompt.md) |

## Shared done rules

A phase is `done` when its checklist is true **and**:

- Recommended architecture in [spec.md](spec.md) was followed (REST + `sh`/`curl`/Node; PAT in credentials file; transient `curl --config`).
- No `az boards` dependency introduced for agent or setup paths.
- No new CLI subcommands; no scope from PRD Deferred except ADO tracker admission.
- `npm test` passes for tests touched in that phase.

## Phase index

| Phase | Slice | Depends on | Status |
|-------|--------|------------|--------|
| 1 | PRD + references (`kind`, skeleton, credentials key) | — | done |
| 2 | `lib-ado.sh`, `ado-json.js`, `ado meta`, auth | 1 | done |
| 3 | `get`, `create`, `set`, `comment` | 2 | done |
| 4 | `transition`, `link`, `UNCHANGED` / `BLOCKED` | 3 | done |
| 5 | `/<prefix>setit-se` ADO add/change/remove | 2, 4 | done |
| 6 | Agents, work skills, consumer `AGENTS.md` | 4, 5 | done |
| 7 | HTML ↔ plain text for mapped fields | 3 | done |
| 8 | Status key semantics in spec (docs only) | 6 | todo |

Phase 7 may run after phase 3; it must complete before calling the initiative done. Phase 6 should not ship user-facing setup until phases 4–5 are `done`.

## Initiative complete when

Phases 1–8 are `done`, PRD lists ADO in the script table, and a consuming project can connect ADO via `/<prefix>setit-se` and run Architect → Implementer → Reviewer using `.seh/scripts/ado` only.
