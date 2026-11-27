# Brief: 01-prd-references

You execute one stage of the plan in `docs/learn-the-lesson/` in the se-harness repo (`seh`: skills, agents, rule packs, small CLI).

## Context
- Read first: `AGENTS.md` (project rules), `docs/learn-the-lesson/README.md` (decisions Q1–Q15, assumptions), `docs/prd.md` (normative; wins over everything else).
- Shipped directories: `agents/`, `packs/`, `skills/`, `brainstorm/`, `references/`, `scripts/`, `src/`. Skill names in `skills/` have no prefix; `{{prefix}}` is rendered at install.
- Tests: `npm test`; `*.test.js` next to the unit; assert observable behaviour (exit status, `OK` / `UNCHANGED` / `BLOCKED:`, files), vary every input the contract reads, never restate the implementation.

## Constraints
- Do not change `package.json` version or `CHANGELOG.md` (Q9: decided after execution).
- Do not edit `README.md` outside stage 05.
- No commits, no pushes, no `.env`, no new dependencies, nothing outside this repo.
- Do not touch files of other stages beyond what this spec lists.

## Definition of done
Every acceptance criterion below holds, the listed verification passes with real output quoted, and the stage spec checkboxes are ticked.

## Spec (copied)

# 01 PRD and references

## Goal

Define the behaviour in the PRD and add the templates every later stage builds on: the lesson file shape, the `LESSONS.md` index, the config key, and the two `AGENTS.md` template lines.

## Scope

In:
- `docs/prd.md`: skill row in **Skills**, a `/<prefix>learnthelesson` detail section, `agents.lessons.enabled` in **Runtime config and generated files**, lesson rule files in **Coding standards**, a **Decisions** entry. Wording follows Q1–Q15.
- `references/lesson.md`: template of one lesson file (frontmatter `group`, `topic`, optional `paths:` list; sections `## Rule`, `## Why`, `## In this project`, `## Evidence`).
- `references/lessons-index.md`: template of `docs/lessons/LESSONS.md` (one line per lesson: group, topic, one-line rule, link).
- `references/harness.config.md` and `references/harness.config.json`: `agents.lessons.enabled` (boolean, missing = `true`, not written on first run).
- `references/AGENTS.md`: skills table row plus two lines (link to `docs/lessons/LESSONS.md`; offer `/{{prefix}}learnthelesson` after a correction or review fixes unless `agents.lessons.enabled` is `false`).

Out: the skill body (03), the script (02), `/<prefix>setit-se` (04), README/guide (05), `package.json` version and `CHANGELOG.md` (Q9).

## Decisions

Q1–Q9, Q11, Q12, Q15.

## Detailed plan

1. PRD: describe purpose → storage mapping (Q3) as a table; grouping and file shape (Q4); index and rendering (`lesson-<group>-<topic><rulesExt>`, `general` without globs) (Q5); disabled semantics (Q7); model-invocable exception (Q11).
2. Lesson template: lines one-line and observable; `## Rule` holds no project paths; `## In this project` is optional.
3. Index template: grouped by `group`, sorted by topic.
4. Config docs and sample config.
5. `AGENTS.md` template lines inside the existing **Skills** area, no new long section.

## Acceptance criteria

- [ ] `docs/prd.md` names `/<prefix>learnthelesson`, `docs/lessons/`, `LESSONS.md`, `lesson-` prefix and `agents.lessons.enabled` with the Q7 semantics.
- [ ] The PRD purpose → storage table covers every row of Q3, including "not a lesson".
- [ ] `references/lesson.md` and `references/lessons-index.md` exist and match Q4/Q5.
- [ ] `references/harness.config.md` documents `agents.lessons.enabled` (missing = on, first run does not ask).
- [ ] `references/AGENTS.md` adds exactly the skill row and two lines; no lesson content in it.
- [ ] No change to `package.json` or `CHANGELOG.md`.
- [ ] `npm test` passes.

## Verification

`npm test`; diff review against the criteria.

## Files

`docs/prd.md`, `references/lesson.md`, `references/lessons-index.md`, `references/harness.config.md`, `references/harness.config.json`, `references/AGENTS.md`.

## Depends on

None.
