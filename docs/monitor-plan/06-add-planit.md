# Phase 6 — Add → planit

## Goal

**Add** starts a new Monitor session whose first intent is `/dhs-planit`. The user types the request in chat. The UI does not write spec files or call `jira create`.

## In scope

- Add focuses the right column and creates a new session (not bound to a tracker key until Architect creates one)
- First `send` includes `/dhs-planit` and the user text, mode `interactive`
- Model: Architect’s `cursor` model from config
- Files tracker: take the planit lock from phase 2; send through the phase 9 CLI adapter; on conflict surface `BLOCKED:`
- After the run, refresh the list at least once so a new spec row appears (phase 8 owns continuous refresh)
- Architect `Q<n>` is answered in the same chat

## Out of scope

- `/dhs-shipit` as Add
- Brainstorm screen
- Stage buttons

## Inputs

- Idea §8
- Index decision: Add = planit only
- Phase 9 CLI adapter (Depends on 9); planit lock from phase 2

## Outputs

| Path | What |
|------|------|
| `monitor/` | Add handler, first-prompt construction, tests |

## Done when

- Tests fail if Add creates a feature file or runs `jira create` in the Monitor process
- Tests fail if the first agent prompt does not carry `/dhs-planit`
- Tests fail if Add reuses another task’s CLI process
- A completed planit in a files-tracker fixture makes a new left-column key appear after the run (direct refresh is enough)
