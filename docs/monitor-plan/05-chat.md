# Phase 5 — Chat

## Goal

The right column is the conversation with the **selected** task’s Monitor agent. Switching rows does not end other runs.

## In scope

- Bind the phase 2 stream to the selected session
- Composer: text, Send, Enter
- Scrollable history, autoscroll to latest; after the user scrolls up, a control to jump to the latest
- Loader while that session’s run is active
- One thread per task (Architect, Implementer, Reviewer). Consultant is not a user-facing speaker
- Persist messages as decided (`.dhs/monitor/sessions/<task-key>/`)
- Mode `interactive`

## Out of scope

- Add→planit (phase 6)
- Stage buttons (phase 7)
- Brainstorm UI
- Sync with IDE transcripts

## Inputs

- Idea §§6, 9
- Phase 2 stream API

## Outputs

| Path | What |
|------|------|
| `monitor/` | chat UI, session switch, tests that a hidden session keeps streaming |

## Done when

- Tests fail if selecting task B disposes or pauses task A’s run
- Enter and Send both submit
- Autoscroll and the “jump to latest” control match the idea file
- Loader is visible while the selected run is active
- Consultant output is not presented as a user-facing chat turn
