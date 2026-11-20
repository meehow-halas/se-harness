# Language and intent wording
Goal: README and the user guide are English only and describe skills as intent-driven (no "run this command" framing). Skills and references recognise the autonomous mode from the user's intent in any language, with no hardcoded Polish words.
Planning: complete
Source: user request in conversation

## Stages
| NN | Stage | Executor | Status | Verification |
|----|-------|----------|--------|--------------|
| 01 | README + guide: English, intent wording | agent | done | grep for non-English words/diacritics; manual read of changed lines |
| 02 | skills/ + references/: language-neutral mode detection | agent | done | `npm test`; grep for Polish words in shipped dirs |

## Decisions
- Q1: scope of point 2 includes skills (user: hardcoded Polish words in skills are a bug; skills converse in the user's language and react to intent in that language).
- Q2: two stages (docs first, then shipped dirs with version bump).

## Assumptions
- Slash names stay as labels of skills (README already says so); only "run X" instructions are reworded.
- Where a host cannot start sessions (manual fan-out), printing a ready-to-paste command is functional behaviour, not "on command" wording; keep it.
- Step-by-step setup (`/_setit-se`, `seh install`) remains an explicit action: skills block until setup runs, so that instruction stays but is phrased as "ask the assistant to set up / setup skill".
- Version bump for stage 02 is a patch (wording/behaviour-neutral fix); stage 01 touches no shipped dir, no bump.
