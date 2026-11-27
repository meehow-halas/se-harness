# Learn the lesson: project lessons for agents

Goal: a skill `/<prefix>learnthelesson` that turns what the conversation taught (fixed review comments, resolved conflicts, user corrections, explicit "remember this") into project lessons, stored where they work best for their purpose and grouped by framework, so agents do not repeat the same mistakes in this project.

Planning: complete

Source: conversation 2026-11-27 (ifm PR review session: the agent fixed review comments, then had to be walked through six prompts to turn them into rules)

## Stages

| NN | Stage | Executor | Status | Verification |
|----|-------|----------|--------|--------------|
| 01 | [PRD and references](01-prd-references.md) | agent | planned | diff review against criteria; `npm test` |
| 02 | [lessons-render script and Codex section](02-render-script.md) | agent | planned | `node --test scripts/lessons-render.test.js references/codex-adapters.test.js`; `npm test` |
| 03 | [learnthelesson skill](03-skill.md) | agent | planned | diff review against criteria; `npm test` |
| 04 | [setit-se and install integration](04-setit-se.md) | agent | planned | `node --test src/cli.test.js`; `npm test`; diff review |
| 05 | [README and guide](05-docs.md) | agent | planned | link check; diff review against PRD |

## Decisions

- Q1: skill name `learnthelesson` (live `/<prefix>learnthelesson`; `_learnit` is taken by another skill). (user, 2026-11-27)
- Q2: triggers on intent, not on commands, in any language: user corrections, finished review fixes, resolved conflicts or CI failures with a clear cause, a mistake repeated in the session, explicit "remember this". On its own initiative it only proposes; nothing is written without acceptance. (user, 2026-11-27)
- Q3: a lesson is stored where it works best for its purpose: code (language, framework, tests) → path-scoped rule; domain or module knowledge → "In this project" section of the rule for that area; project conventions (naming, characters, commit language), agent behaviour, commands → always-on rules in group `general`; one seh role only → `agents.roles.<role>.rules` / reviewer `checklist` in `harness.config.json`; UX → `docs/designs/ux-conventions.md`; a one-off decision of a single PR → not a lesson. (user, 2026-11-27)
- Q4: lessons are grouped: `docs/lessons/<group>/<topic>.md`, groups named like seh packs (`csharp`, `angular`, `typescript`, …) plus `general` and `domain-<area>`; tests live in the framework group. One file holds sections "Rule" (project-agnostic) and "In this project" (paths, legacy, examples). (user, 2026-11-27)
- Q5: `docs/lessons/` is the source of truth with index `docs/lessons/LESSONS.md` (one line per lesson). Lessons are rendered to every host `rulesDir` as `lesson-<group>-<topic><rulesExt>`; `general` lessons render without globs (always loaded). `AGENTS.md` gets only two lines in the seh template: link to `LESSONS.md` and "after a correction or review fixes, offer `/<prefix>learnthelesson`". (user, 2026-11-27)
- Q6: skill, templates and lesson bodies in English; the acceptance table talks to the user in their language. (user, 2026-11-27)
- Q7: `agents.lessons.enabled`, default on (missing key = on). First `/<prefix>setit-se` run neither asks nor writes it; a later run changes it only when the user asks. `false`: no proactive offers, recording is `BLOCKED: lessons are disabled — enable them in /<prefix>setit-se`, existing lessons stay loaded, listing and removal still work. Runtime key: no regeneration. (user, 2026-11-27)
- Q8: README and `docs/guide/` document the skill (user explicitly asked to change the README). (user, 2026-11-27)
- Q9: the version bump, its level and the CHANGELOG entry are decided after execution, not in this plan. (user, 2026-11-27)
- Q10: rendering is a deterministic script in `scripts/` (installed as `.seh/scripts/`) with a behaviour test; the skill and `/<prefix>setit-se` only call it. Codex: the `rules-section` helper in `references/codex-adapters.cjs` also lists `lesson-*` files. (rejected: prose rendering in SKILL.md, untestable, drifts between hosts) (user, 2026-11-27)
- Q11: unlike other work skills, `learnthelesson` stays model-invocable: no `disable-model-invocation`, no Codex `openai.yaml` hide, since intent triggering needs it. (settled by context: `skills/setit-se/SKILL.md:389`, `:393`)
- Q12: `seh-*` regeneration never touches `lesson-*` files (it already deletes only `seh-` prefixed files, `skills/setit-se/SKILL.md:454`); the Codex managed section keeps lesson pointers across a pack regenerate. (settled by context)
- Q13: no manual test stage and no `manual-test.md`. (user, 2026-11-27)
- Q14: five stages: references → script → skill → setup integration → docs. (user, 2026-11-27)
- Q15: when the skill writes accepted lessons, the Codex pointer section in `AGENTS.md` is derived data of the accepted lessons and is written by the render script without a second acceptance; the skill's acceptance table names that file. A pack regenerate in `/<prefix>setit-se` keeps its own acceptance step. (settled by context: PRD keeps AGENTS.md writes behind acceptance; the lesson table is that acceptance)

## Assumptions

- `src/cli.js:216` (`INVOKE_SKILLS`) is the only hardcoded skill-name list in the CLI; install copies `skills/` as a whole (`package.json` `files`).
- Hosts load a rules file without globs as always on: Claude Code `.claude/rules/*.md` without `paths`, Cursor `.mdc` with `alwaysApply: true`, OpenCode via the `.opencode/rules/*.md` `instructions` glob. Not re-verified against host docs during planning; stage 02 checks it.
