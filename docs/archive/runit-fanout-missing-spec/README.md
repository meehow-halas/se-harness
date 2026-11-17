# runit fan-out without specs

Goal: resolve the contradictions found when `/<prefix>runit K1 K2 K3 <autonomous words>` is launched for keys that have no spec yet, and plan the fixes.

Planning: complete

## Findings (verified in files)

1. `skills/runit/SKILL.md` stage 1: no spec/prompt → Architect runs inside the child. `references/session-fanout.md:10` and `:72` say a missing spec is `BLOCKED` for that key and the parent never runs `planit`. `skills/shipit/SKILL.md:10,~66` states the BLOCKED rule explicitly; `runit` states nothing for the fan-out case.
2. Session-fanout placement table already says `runit`: "Architect in launch checkout; Implementer and Reviewer in the worktree".
3. PRD (~l.727) lists `runit` given a list as a stop, PRD (~l.639) and `runit` "Several keys" fan it out; `runit` also opens with a `BLOCKED: runit is one task` block for a list. Texts conflict.
4. Architect may add `depends` between sibling keys only after children have started.

## Decisions

1. Missing spec in a `runit` fan-out is **not** BLOCKED. Each child runs the full path from Architect. Reason (user): with "samodzielnie" the user wants Architect to run without user intervention. `shipit` keeps its BLOCKED rule (it never runs Architect).

2. `runit` fan-out does no dependency ordering (user: something wrong → `BLOCKED`, user reacts; full automation = `shipit` with specs written beforehand). Sibling `depends` already in a spec: parent passes no `--depends` and does not start that key. Found by Architect after fan-out started: the child ends after the Architect stage (spec stays `todo`). Both: `BLOCKED: depends on <KEY> — rerun /<prefix>runit <this key> after <KEY> is merged`; parent reports it in the table; no waiting, no side channel, no new waves. Git disabled (`mode: sequential`, one session): keys run in dependency order from `fanout-plan`, never in the order given (user: order of the list is not a dependency contract); a sibling `depends` found by Architect sends the key back to `waiting`.

3. Key with no spec that exists nowhere: files/readOnly → new task under that key; Jira/ADO full write → existing item read as existing task, nonexistent item `BLOCKED` (Architect never invents a tracker key).
4. One stage, patch version, appended to the 1.3.1 CHANGELOG entry (no git tags exist; verify at execution), else 1.3.2.

## Open questions

None.

## Stage table

| NN | name | status | verification |
|----|------|--------|--------------|
| 01 | [text-alignment](01-text-alignment.md) | done | PASS 1–6 (2026-11-17): npm test 375/375; stale `runit` list stop removed from `references/BLOCKED.md` during verification |

Stage gate: stage `NN` may start only when stage `NN-1` is `done` (all criteria `PASS`, tests green, zero open gaps). Execution requires `Planning: complete`.
