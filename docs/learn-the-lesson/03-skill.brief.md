# Brief: 03-skill

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

# 03 learnthelesson skill

## Goal

`skills/learnthelesson/SKILL.md` (English): recognises a lesson from intent, classifies it by purpose, groups it, gets acceptance, writes it, and renders it through the script.

## Scope

In: `skills/learnthelesson/SKILL.md` only.

Out: setup wiring (04), docs (05), behaviour scenarios (Q13).

## Decisions

Q1–Q7, Q10, Q11, Q15.

## Detailed plan

1. Frontmatter: `name: learnthelesson`; a description that triggers on intent in any language (corrections, finished review fixes, resolved conflicts, repeated mistakes, "remember this") and says it only proposes on its own initiative.
2. Gate: `harness.config.json` missing or VERSION mismatch → same stop as other work skills. `agents.lessons.enabled` `false` → recording `BLOCKED: lessons are disabled — enable them in /{{prefix}}setit-se`; list and remove still work.
3. Gather: conversation, PR comments (`gh`), the fix diff, the conflict.
4. Root cause, not symptom (one-line, observable rule plus why).
5. Classify by purpose (Q3 table, copied from the PRD); "not a lesson" is a valid outcome and is said in one line.
6. Split "Rule" (agnostic) and "In this project"; choose the group (pack name, `general`, `domain-<area>`).
7. Dedupe and conflict check: existing `docs/lessons/`, live `seh-*` rules, `agents.roles.*.rules`, `ux-conventions.md`. Prefer extending an existing topic; a lesson against a pack rule is written as a deviation with its reason.
8. Acceptance table in the user's language: rule, why, evidence (`path:line` / PR link), target file, yes/change/reject per row. Proactive mode: one-line offer at the end of the turn, no table until the user wants it.
9. Write accepted lessons from `.seh/references/lesson.md`, update `LESSONS.md` from `.seh/references/lessons-index.md`, then run `.seh/scripts/lessons-render` and relay `OK` / `UNCHANGED` / `BLOCKED:`. Targets outside `docs/lessons/` (role rules, `ux-conventions.md`) are written directly.
10. Maintenance intents: list, change, remove, merge similar lessons; size limit for `general` (always loaded).
11. Never commit; never write outside the project.

## Acceptance criteria

- [ ] SKILL.md is English, uses `{{prefix}}` for every slash form, and has no `disable-model-invocation`.
- [ ] Description triggers on intent, names examples in more than one form, and states proactive mode only proposes.
- [ ] Every Q3 target and "not a lesson" appear in the classification step.
- [ ] Disabled semantics match Q7 exactly, including the `BLOCKED:` text.
- [ ] Writes go through `.seh/references/lesson.md`, `LESSONS.md` and `.seh/scripts/lessons-render`; no prose rendering of host files.
- [ ] No commit step; no write outside the project.
- [ ] `npm test` passes.

## Verification

`npm test`; diff review against the criteria.

## Files

`skills/learnthelesson/SKILL.md`.

## Depends on

02 (`done`).
