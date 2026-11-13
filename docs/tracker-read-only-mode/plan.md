# Tracker read-only mode — implementation plan

Phased build for `agents.tracker.readOnly` (Jira and Azure DevOps). **Not a second product PRD.** Behaviour is anchored in [spec.md](spec.md) and [prd.md](../prd.md).

## How to use

Commission one phase via [prompt.md](prompt.md) and the phase's `.prompt.md`.

When a phase's "Done when" and [shared done rules](#shared-done-rules) hold, set that row's **Status** to `done` below. Do not start a phase whose **Depends on** rows are still `todo`.

| Phase | Slice | Prompt |
|-------|--------|--------|
| — | [spec.md](spec.md), this file | [prompt.md](prompt.md) |
| 1 | [01-prd-references.md](01-prd-references.md) | [01-prd-references.prompt.md](01-prd-references.prompt.md) |
| 2 | [02-scripts.md](02-scripts.md) | [02-scripts.prompt.md](02-scripts.prompt.md) |
| 3 | [03-seh-setup.md](03-seh-setup.md) | [03-seh-setup.prompt.md](03-seh-setup.prompt.md) |
| 4 | [04-runtime.md](04-runtime.md) | [04-runtime.prompt.md](04-runtime.prompt.md) |
| 5 | [05-verification.md](05-verification.md) | [05-verification.prompt.md](05-verification.prompt.md) |
| 6 | [06-readme.md](06-readme.md) | [06-readme.prompt.md](06-readme.prompt.md) |

## Shared done rules

A phase is `done` when its checklist is true **and**:

- Decisions Q1–Q5 in [spec.md](spec.md) were followed.
- `readOnly` missing or `false` keeps today's Jira and ADO behaviour (existing tests unchanged and passing).
- No new CLI subcommands; no scope from PRD Deferred. `README.md` is edited only in phase 6.
- `npm test` passes for tests touched in that phase.

## Phase index

| Phase | Slice | Depends on | Status |
|-------|--------|------------|--------|
| 1 | PRD + references (`readOnly`, two-store exception, script table) | — | done |
| 2 | `jira` / `ado`: write verbs `BLOCKED`, `get` from files | 1 | done |
| 3 | `/<prefix>setit-se` question, skipped maps, toggle | 1, 2 | todo |
| 4 | Agents, work skills, consumer `AGENTS.md`, `start-task` check | 2, 3 | todo |
| 5 | Manual end-to-end scenario + full `npm test` | 4 | todo |
| 6 | `README.md` tracker sections | 5 | todo |

Phases 2 and 3 may run in parallel after phase 1 (different files). Phase 3 must not ship before phase 2 is `done`.

## Initiative complete when

Phases 1–6 are `done`, README describes read-only mode, and a consuming project can connect Jira or ADO in read-only via `/<prefix>setit-se`, run Architect → Implementer → Reviewer on an existing tracker item, and the tracker shows no change while repo files hold spec, prompt, log, and status.
