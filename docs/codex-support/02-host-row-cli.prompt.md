# Codex support — stage 2: Host row and CLI

You were given only this file. Everything needed is here or in the files it names.

## Task

Implement **docs/codex-support stage 2 only**. Do not implement other stages.

## Read first (in order)

1. `docs/codex-support/prompt.md` — read order and shared constraints (they apply here).
2. `docs/prd.md` — wins over this plan.
3. `docs/codex-support/plan.md` — findings, decisions 1–8, host row, status table.
4. `docs/codex-support/02-host-row-cli.md` — this stage's scope and "Done when".

## Preflight

Stage **1** Status must be `done` in `docs/codex-support/plan.md`; if not, stop and say so.

## Work

Model the Codex hook merge on the existing `claude-nested` merge in `src/cli.js`; add `hooksMatcher` as an optional row field so Claude output stays byte-identical. Re-read the Codex hooks docs to confirm the `hooks.json` shape before coding, and state anything unconfirmed.

No version bump, README, or setup-skill changes. Do not commit. Ask the user only for a choice the plan does not settle: one question at a time, recommended option first, labelled **(Recommended)**.

## Verify

Run `node --test src/cli.test.js scripts/check-update.test.js`, then `npm test`. Report actual output, never claim passing without running.

## Finish

Report against the stage "Done when" checklist, listing deviations and anything unconfirmed in the Codex docs. If all items hold, set stage 2 Status to `done` in `docs/codex-support/plan.md`.
