# Skill name swap: shipit ↔ runit

Goal: swap the skill names. `shipit` becomes the parallel, dependency-ordered, auto-merge skill (start-to-finish delivery of many tasks). `runit` becomes the single-task skill (Architect → Implementer → Reviewer, no merge). Behaviour unchanged.

Planning: complete

## Decisions

1. Swap the names (user). No merge of the skills, no third name.
2. Version `1.3.1` (user's choice; CLAUDE.md would call it major — assumption flagged).
3. One stage.
4. Historical plans, root README and past changelog text untouched (assumption).

## Open questions

None.

## Stage table

| NN | name | status | verification |
|----|------|--------|--------------|
| 01 | [swap](01-swap.md) | done | all PASS, npm test 373/373 |

Stage gate: stage `NN` may start only when stage `NN-1` is `done`. Execution requires `Planning: complete`.
