# Session fan-out: manual test on a test project

End-to-end check of session fan-out in the Claude Code desktop app (Code tab). Other hosts use `sessionSpawn: manual` and only print commands (step 5). Last run: 2026-11-14, on Claude Code desktop, Cursor and OpenCode; fan-out worked as specified (per-step outputs not stored). Not covered: `/<prefix>shipit` (parallel run with auto-merge) and `/<prefix>runit` with several keys.

Decisions behind fan-out: [README.md](README.md).

## Steps

1. Prepare a test project: `mkdir ~/projects/seh-fanout-test && cd ~/projects/seh-fanout-test`; `git init -b dev && git commit --allow-empty -m init`; `node ~/projects/se-harness/src/cli.js install`. Open the folder in the desktop app; run `/<prefix>setit-se` (base `dev`, files tracker).
2. Check installed pieces: `ls .seh/scripts/fanout-plan .seh/references/session-fanout.md`; `sh .seh/scripts/fanout-plan --skill planit --keys TST-1,TST-2`. Expected: `OK`, `mode: parallel`, `ready: TST-1,TST-2`.
3. planit, two specs in parallel: `/<prefix>planit Opracuj spec TST-1 i TST-2`. Expected: parent runs `fanout-plan`, reports `ready: TST-1,TST-2`; two sessions titled `seh-planit TST-1` / `TST-2`; each child runs Architect for one key and writes `docs/features/TST-1.feature.md` etc.; parent wakes when children end and prints one table with statuses and links. If a child does not trigger the skill from `/<prefix>planit TST-1`, record it as the first open point.
4. doit with a dependency: with TST-2 depending on TST-1 (set in spec `depends`): `/<prefix>doit TST-1 TST-2`. Expected: `ready: TST-1`, `waiting: TST-2 after TST-1`; parent runs `start-task TST-1`, starts one session with `cwd` = `$(git rev-parse --git-common-dir)/seh-worktrees/TST-1`; TST-2 starts after TST-1 is done. Check: `git worktree list` shows `seh-worktrees/TST-1`; primary checkout stays on `dev`.
5. Manual host: in a project with `sessionSpawn: manual` (Cursor or OpenCode), `/<prefix>planit TST-1 TST-2` prints two commands and stops; no session created.
6. Failure cases: `/<prefix>doit TST-1 TST-1` (duplicate key): parent reports BLOCKED, starts nothing. A key without a spec: that key `BLOCKED`, siblings still start.

Record for each step: result (pass or fail), `fanout-plan` output, session titles, any `BLOCKED:` line. Report failures with exact output.
