# 04 setit-se and install integration

## Goal

Setup generates the skill for every host (model-invocable), keeps rendered lessons in place, and lets a later run switch `agents.lessons.enabled` on request.

## Scope

In:
- `skills/setit-se/SKILL.md`:
  - **Work skills**: add `learnthelesson` to the copy list, cleanup lists, `invokePrefix` name list and host-command lists; exempt it from `disable-model-invocation` and from `openai.yaml` hide (Q11).
  - Later-run parameters: `agents.lessons.enabled` changed only when the user asks; never asked or written on first run (Q7). No regeneration on change.
  - Rule packs / repair: after writing `seh-*` rules, run `.seh/scripts/lessons-render` so lesson files and the Codex section stay complete (Q12); the Codex section keeps its acceptance step.
- `src/cli.js`: add `learnthelesson` to `INVOKE_SKILLS` (`src/cli.js:216`); test in `src/cli.test.js`.

Out: the skill body (03), docs (05).

## Decisions

Q7, Q11, Q12, Q15.

## Acceptance criteria

- [x] Generated `learnthelesson` gets no `disable-model-invocation` on Cursor/OpenCode and no `agents/openai.yaml` on Codex; other work skills unchanged.
- [x] `learnthelesson` appears in every list the other work skills are on (copy, cleanup, old-prefix cleanup, `invokePrefix`, host commands).
- [x] First run does not ask about lessons and does not write `agents.lessons.enabled`.
- [x] Later run: changes the key only on the user's request, shows current and new value, writes after confirmation, regenerates nothing.
- [x] Pack regenerate and repair call `lessons-render`; `lesson-*` files survive a pack regenerate.
- [x] `src/cli.test.js` asserts the `$<prefix>learnthelesson` rewrite on a Codex row and `/` elsewhere, with a non-default prefix.
- [x] `npm test` passes.

## Verification

`node --test src/cli.test.js`, then `npm test`; diff review of `skills/setit-se/SKILL.md`.

## Files

`skills/setit-se/SKILL.md`, `src/cli.js`, `src/cli.test.js`.

## Depends on

03 (`done`).
