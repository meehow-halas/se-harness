# Phase 4 — Workflow: `transition`, `link`

## Goal

Status steps and dependencies on ADO, with Jira-like `UNCHANGED` semantics.

## In scope

| Verb | Behaviour |
|------|-----------|
| `transition <id> <step>` | `null` map → `UNCHANGED`, no HTTP; fetch current `System.State`; if equal → `UNCHANGED`; else PATCH state; illegal state → `BLOCKED:` |
| `link <id> depends\|relates <other>` | PATCH `/relations/-` with `System.LinkTypes.Dependency-Forward` / `-Reverse` (pick one convention, document in code) or `System.LinkTypes.Related` |

- Both ids pass `require_task`.
- Tests: already-at-state, skip-null, invalid state from API, link success/failure message.

## Options

| Topic | Recommended |
|-------|-------------|
| Dependency direction | `depends`: child `Depends on` parent — match Jira `depends` mental model in `ado-json.js` comments |
| Transition discovery | No transitions API; rely on mapped string + API error |

## Out of scope

- `/dhs-setup` mapping UI (phase 5).

## Done when

- Transition tests vary mapped status strings per fixture (not literals in script source).
- `link` failure surfaces `BLOCKED:` with API fact; architect may comment-and-continue (same as Jira link note in agents — wire in phase 6).
