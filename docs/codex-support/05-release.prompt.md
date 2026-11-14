# Codex support — stage 5: Release

You were given only this file. Everything needed is here or in the files it names.

## Task

Implement **docs/codex-support stage 5 only**. Do not implement other stages.

## Read first (in order)

1. `docs/codex-support/prompt.md` — read order and shared constraints (they apply here).
2. `docs/prd.md` — wins over this plan.
3. `docs/codex-support/plan.md` — findings, decisions 1–8, host row, status table.
4. `docs/codex-support/05-release.md` — this stage's scope and "Done when".

## Preflight

Stage **4** Status must be `done` in `docs/codex-support/plan.md`; if not, stop and say so.

## Work

Minor bump in `package.json` (approved), `CHANGELOG.md` Added entry covering the Codex host (extend the entry if the current version is untagged). Run full `npm test`; never fix a failure by weakening a test. Then, last, update `README.md` with Codex additions only (explicitly requested for this initiative).

No other README sync. Do not commit. Ask the user only for a choice the plan does not settle: one question at a time, recommended option first, labelled **(Recommended)**.

## Verify

Run `npm test`. Report actual output, never claim passing without running.

## Finish

Report against the stage "Done when" checklist, listing deviations and anything unconfirmed in the Codex docs. If all items hold, set stage 5 Status to `done` in `docs/codex-support/plan.md`.
