# 01 PRD, config, start-task `run:`

## Goal

Make the contract normative and observable: the PRD describes `agents.runCommand`, the run block and the terminal offer; `start-task` prints `run: <cmd>` so agents copy it from script output.

## Scope

In:
- `docs/prd.md`: config key `agents.runCommand`; `start-task` row (PRD:568) gains the `run:` line; Implementer / Reviewer output (block); `/<prefix>doit`, `/<prefix>checkit` terminal offer; `/<prefix>runit`, `/<prefix>shipit` no pause; setup question (Q2).
- `references/harness.config.json`: `"runCommand": null` in `agents`.
- `scripts/start-task`: print `run: <cmd>` after `worktree:` on every `OK` / `UNCHANGED` that names a task worktree (new, reused, attached, `--existing`).
- `scripts/start-task.test.js`: behaviour tests.
- `package.json` 2.2.0; `CHANGELOG.md` `[2.2.0]` entry started (Added).

Out:
- Agents, skills, setit-se (stage 02). Guide (stage 03).
- Any change to the worktree path or to `return-to-base`.

## Decisions

Q2, Q3, Q4, Q5, Q6 (README).

## Detailed plan

1. PRD: add `agents.runCommand` next to `agents.reportChange` (meaning, `null` default, never interpreted). Extend the `start-task` table row with `run:`. In the Implementer and Reviewer output rules add the run block (`cd <worktree>` + `run:` when printed). Under `/<prefix>doit` / `/<prefix>checkit` add the terminal offer (Q3, assumptions). Under `/<prefix>runit` / `/<prefix>shipit` state no pause and no question (Q4). Under setup add the question (Q2).
2. Config skeleton: `"runCommand": null`.
3. `start-task`: read `agents.runCommand` with the existing config reader in `lib.sh` (same way as `agents.baseBranch`); trim; non-empty → append `run: <value>` to the `finish` arguments after `worktree:`. Not on paths that print the launch checkout (git disabled, `worktree` off).
4. Tests (vary the input; a hardcoded value must fail):
   - configured command with spaces and `&&` (e.g. `make dev && echo ok`) → `run:` line equals it verbatim, after `worktree:`;
   - new worktree, reused worktree, `--existing` attach: each prints it;
   - `null`, missing key, `"   "` → no `run:` line;
   - git disabled / `worktree` off → no `run:` line;
   - exit status and `OK` / `UNCHANGED` unchanged versus today.
5. `package.json` → 2.2.0; `CHANGELOG.md` `## [2.2.0]` with an Added line for `run:`.

## Acceptance criteria

- [ ] PRD names `agents.runCommand`, the `run:` line, the block, the terminal offer (doit/checkit only) and no pause in runit/shipit.
- [ ] `references/harness.config.json` has `agents.runCommand: null`.
- [ ] `start-task` prints `run: <exact value>` after `worktree:` for a task worktree when the key is a non-empty string; otherwise no `run:` line.
- [ ] Tests from step 4 exist and pass; the rest of `start-task.test.js` still passes.
- [ ] `package.json` is 2.2.0; `CHANGELOG.md` has `[2.2.0]` with the Added line.

## Verification

- `node --test scripts/start-task.test.js`
- `npm test`
- PRD diff review by the user.

## Files

`docs/prd.md`, `references/harness.config.json`, `scripts/start-task`, `scripts/lib.sh` (only if a reader helper is needed), `scripts/start-task.test.js`, `package.json`, `CHANGELOG.md`.

## Depends on

None.
