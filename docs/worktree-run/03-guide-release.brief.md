# Brief

You execute one stage of the plan `docs/worktree-run/` in the repo `se-harness` (npm package `se-harness`, binary `seh`).

Context:
- Read `AGENTS.md` / `CLAUDE.md` first: PRD (`docs/prd.md`) wins; tests assert observable behaviour; every change to a shipped dir needs a `CHANGELOG.md` line under 2.2.0 (approved minor, Q5); do not edit root `README.md`.
- Decisions Q1–Q6 and assumptions: `docs/worktree-run/README.md` (binding).
- Problem: with the `worktree` git operation on, the task lives in `$(git rev-parse --git-common-dir)/seh-worktrees/<task>`; the developer wants to run the app there without digging for the path. The solution must be framework- and language-agnostic: seh prints the path and a user-written command, never guesses one.

Constraints: no commits, no push, no `.env`, no new dependencies, no external actions. Do not change files outside the stage's file list. Do not weaken or delete existing tests.

Definition of done: every acceptance criterion below holds; the stage's verification commands were run and their real output reported.

---

# 03 Guide and release

## Goal

The user guide explains how to run a task from its worktree; the 2.2.0 entry is complete; the plan is indexed.

## Scope

In:
- `docs/guide/worktrees.md`: section "Running the task" (block, `run:`, terminal offer in doit/checkit, none in runit/shipit, why seh does not prepare dependencies: symlinked dependency dirs can run the primary checkout's code; put setup into the command).
- `docs/guide/setup.md`: the run command question, examples from several stacks.
- `docs/README.md`: `worktree-run/` under Active work while open.
- `CHANGELOG.md` `[2.2.0]`: final check, date.

Out:
- Root `README.md`.
- PRD changes (stage 01) beyond fixing a contradiction found here (then report it).

## Decisions

Q2, Q3, Q4 (README).

## Acceptance criteria

- [ ] `docs/guide/worktrees.md` and `docs/guide/setup.md` describe the feature consistently with the PRD.
- [ ] Examples cover at least three stacks (e.g. Node/nx, Python, Go or Rust, `make`).
- [ ] `docs/README.md` lists the plan.
- [ ] `CHANGELOG.md` `[2.2.0]` is complete and dated.
- [ ] `npm test` passes.

## Verification

- `npm test`
- Guide review by the user.

## Files

`docs/guide/worktrees.md`, `docs/guide/setup.md`, `docs/README.md`, `CHANGELOG.md`.

## Depends on

02 (`done`).
