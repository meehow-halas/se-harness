# 01 — Manual test: session fan-out

## Goal

Check end to end that fan-out works in the Claude Code desktop app: parallel planit, doit with a dependency, manual host behaviour and failure cases.

## Scope in

1. Prepare a test project: `mkdir ~/projects/seh-fanout-test && cd ~/projects/seh-fanout-test`; `git init -b dev && git commit --allow-empty -m init`; `node ~/projects/seh/src/cli.js install`. Open the folder in the desktop app; run `/<prefix>setit-se` (base `dev`, files tracker).
2. Check installed pieces: `ls .seh/scripts/fanout-plan .seh/references/session-fanout.md`; `sh .seh/scripts/fanout-plan --skill planit --keys TST-1,TST-2`. Expected: `OK`, `mode: parallel`, `ready: TST-1,TST-2`.
3. planit, two specs in parallel: `/<prefix>planit Opracuj spec TST-1 i TST-2`. Expected: parent runs `fanout-plan`, reports `ready: TST-1,TST-2`; two sessions titled `seh-planit TST-1` / `TST-2`; each child runs Architect for one key and writes `docs/features/TST-1.feature.md` etc.; parent wakes when children end and prints one table with statuses and links. If a child does not trigger the skill from `/<prefix>planit TST-1`, record it as the first open point.
4. doit with a dependency: with TST-2 depending on TST-1 (set in spec `depends`): `/<prefix>doit TST-1 TST-2`. Expected: `ready: TST-1`, `waiting: TST-2 after TST-1`; parent runs `start-task TST-1`, starts one session with `cwd` = `$(git rev-parse --git-common-dir)/seh-worktrees/TST-1`; TST-2 starts after TST-1 is done. Check: `git worktree list` shows `seh-worktrees/TST-1`; primary checkout stays on `dev`.
5. Manual host: in a project with `sessionSpawn: manual` (Cursor or OpenCode), `/<prefix>planit TST-1 TST-2` prints two commands and stops; no session created.
6. Failure cases: `/<prefix>doit TST-1 TST-1` (duplicate key): parent reports BLOCKED, starts nothing. A key without a spec: that key `BLOCKED`, siblings still start.

Record for each step: result (pass or fail), `fanout-plan` output, session titles, any `BLOCKED:` line. Report failures with exact output.

## Scope out

- Automated tests for fan-out (script tests live with the scripts).

## Decisions taken

- Manual run is the acceptance check for fan-out on the desktop host.

## Files likely touched

- None (manual test). Test project is outside this repo.

## Acceptance criteria

- Steps 2–6 recorded with pass or fail and exact outputs.

## Tests

- Manual; `fanout-plan` output checked by eye against expected lines.

## Versioning

None.

## Depends on

- Installed `seh` pieces from the implementation plan (fan-out scripts present).
