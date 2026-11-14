# Prompt — session-fanout-manual-test stage 01: Manual test

Status `done` (run 2026-11-14). Use this prompt to repeat the manual test on a test project. Live steps are run by the user; do not enter credentials.

## Repo context

- Repo `se-harness`. CLI in v1: `seh install` and `seh uninstall` only. Test project is outside this repo: `~/projects/seh-fanout-test`.
- Fan-out is on for the Claude Code desktop app only. Cursor and OpenCode are `manual` and print commands.
- Read `references/session-fanout.md` and `docs/fanout-decisions/` first.

## Stage spec

Goal: manual end-to-end check of fan-out. Scope: prepare test project; check `fanout-plan`; planit in parallel (two specs); doit with a dependency (`start-task` worktree, primary stays on `dev`); manual host prints commands only; failure cases (duplicate key, missing spec). Expected outputs and steps are in `01-manual-test.md`.

### Acceptance criteria

- Steps 2–6 recorded with pass or fail and exact outputs.

### Depends on

- Installed fan-out scripts present in the test project (`seh install` re-run after any change to `scripts/` or `agents/`).

## Constraints

- Do not commit in the test project unless the user asks. Do not touch `.env` files.
- Ask one question at a time; recommended option first, labelled **(Recommended)**.

## Definition of done

- Per step: pass or fail, `fanout-plan` output, session titles, `BLOCKED:` lines. Failures with exact output.
