# Codex support — stage 3: Setup adapters

You were given only this file. Everything needed is here or in the files it names.

## Task

Implement **docs/codex-support stage 3 only**. Do not implement other stages.

## Read first (in order)

1. `docs/codex-support/prompt.md` — read order and shared constraints (they apply here).
2. `docs/prd.md` — wins over this plan.
3. `docs/codex-support/plan.md` — findings, decisions 1–8, host row, status table.
4. `docs/codex-support/03-setup-adapters.md` — this stage's scope and "Done when".

## Preflight

Stage **2** Status must be `done` in `docs/codex-support/plan.md`; if not, stop and say so.

## Work

Work in `skills/setit-se/SKILL.md` and the config skeleton/docs under `references/`. Drive the adapters from row fields (`agentFormat`, `skillHide`, `rulesDir`), not host-id branches. Where the TOML conversion is executable logic, put it in a testable unit with a `*.test.js` next to it (tests must not be copied by `seh install`). Re-read the Codex subagent docs to confirm TOML field names before coding.

No version bump or README. Do not commit. Ask the user only for a choice the plan does not settle: one question at a time, recommended option first, labelled **(Recommended)**.

## Verify

Run the new test file, then `npm test`. Report actual output, never claim passing without running.

## Finish

Report against the stage "Done when" checklist, listing deviations and anything unconfirmed in the Codex docs. If all items hold, set stage 3 Status to `done` in `docs/codex-support/plan.md`.
