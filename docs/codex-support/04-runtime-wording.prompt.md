# Codex support — stage 4: Runtime wording

You were given only this file. Everything needed is here or in the files it names.

## Task

Implement **docs/codex-support stage 4 only**. Do not implement other stages.

## Read first (in order)

1. `docs/codex-support/prompt.md` — read order and shared constraints (they apply here).
2. `docs/prd.md` — wins over this plan.
3. `docs/codex-support/plan.md` — findings, decisions 1–8, host row, status table.
4. `docs/codex-support/04-runtime-wording.md` — this stage's scope and "Done when".

## Preflight

Stage **3** Status must be `done` in `docs/codex-support/plan.md`; if not, stop and say so.

## Work

Search first (`grep` for hardcoded `/{{prefix}}` invocations in `skills/`, `agents/`, `references/`, `src/`), then change only the occurrences that name what the user types. For grillit, check whether a Codex subagent launch accepts a per-call model and write the wording to match what the docs say.

No version bump or README. Do not commit. Ask the user only for a choice the plan does not settle: one question at a time, recommended option first, labelled **(Recommended)**.

## Verify

Run `npm test`. Report actual output, never claim passing without running.

## Finish

Report against the stage "Done when" checklist, listing deviations and anything unconfirmed in the Codex docs. If all items hold, set stage 4 Status to `done` in `docs/codex-support/plan.md`.
