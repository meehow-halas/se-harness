# Windows scripts (v2 item 8)

Source: `docs/v2-plan.md` item 8. PRD Deferred: "Running `.seh/scripts/` on Windows (`sh` hosts only in v1)". Opened for v2 by the user.

Planning: complete

Goal: `.seh/scripts/` runs on Windows through Git Bash or WSL. Setup detects a missing `sh` and stops with a clear message. Scripts validate required tools and print `BLOCKED:` with a hint.

## Decisions

- Q1 Runtime: Git Bash / WSL (Recommended). No PowerShell port, no Node rewrite.
- Q2 Setup + per-script check: setup detects `sh`; scripts validate `git`, `node`, `gh` they use. Scripts cannot detect a missing `sh` themselves.
- Q3 Testing: stub-PATH automated tests + manual Windows checklist (Recommended). No Windows CI.
- Q4 Stages: two (Recommended), 02 depends on 01.
- Q5 Version: minor `1.3.0` (Recommended), bump in stage 01.

## Open questions

None.

## Stages

| NN | name | status | verification |
|----|------|--------|--------------|
| 01 | [scripts runtime](01-scripts-runtime.md) ([prompt](01-scripts-runtime.prompt.md)) | planned | — |
| 02 | [setup detection + manual test](02-setup-detection.md) ([prompt](02-setup-detection.prompt.md)) | planned | — |

Stage gate: stage 02 may start only when stage 01 is `done`.
