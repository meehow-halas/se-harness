# Session fan-out: manual test on a test project

Scope: Claude Code desktop app (Code tab). Other hosts use `manual` and only print commands.

## 1. Prepare a test project

```bash
mkdir ~/projects/seh-fanout-test && cd ~/projects/seh-fanout-test
git init -b dev && git commit --allow-empty -m init
node ~/projects/seh/src/cli.js install
```

Open this folder in the desktop app (Code tab). Then run `/<prefix>setit-se` and finish it (base branch `dev`, files tracker).

## 2. Check the installed pieces

```bash
ls .seh/scripts/fanout-plan .seh/references/session-fanout.md
sh .seh/scripts/fanout-plan --skill planit --keys TST-1,TST-2
```

Expected: `OK`, `mode: parallel`, `ready: TST-1,TST-2`.

## 3. planit: two specs in parallel

In the session, run:

```text
/<prefix>planit Opracuj spec TST-1 i TST-2
```

Expected:
- the parent runs `fanout-plan` and reports `ready: TST-1,TST-2`
- two sessions appear in the sidebar, titled `seh-planit TST-1` / `TST-2`
- each child runs Architect for one key and writes `docs/features/TST-1.feature.md` etc.
- parent wakes when children end, prints one table with statuses and links

If the child does not trigger the skill from `/<prefix>planit TST-1`, that is the first open point: record it and report.

## 4. doit with a dependency

Create two specs with prompts (planit each, or copy the `docs/` files from step 3). Then:

```text
/<prefix>doit TST-1 TST-2   (with TST-2 depending on TST-1, set in the spec's depends field)
```

Expected: planner returns `ready: TST-1`, `waiting: TST-2 after TST-1`. Parent runs `start-task TST-1`, starts one session with `cwd` = `$(git rev-parse --git-common-dir)/seh-worktrees/TST-1`. TST-2 starts after TST-1 is done.

Check: `git worktree list` shows `seh-worktrees/TST-1`; the primary checkout stays on `dev`.

## 5. Manual host

Use a project with `sessionSpawn: manual` (Cursor or OpenCode). `/<prefix>planit TST-1 TST-2` must print two commands and stop; it must not create any session.

## 6. Failure cases to try

- `/<prefix>doit TST-1 TST-1`: duplicate key, parent reports BLOCKED, starts nothing.
- A key without a spec: that key `BLOCKED`, sibling keys still start.

## Record for each step

Result (pass/fail), the `fanout-plan` output, the session titles, and any `BLOCKED:` line. Report failures with the exact output.

## Outcome

- 2026-11-14: manual test run on each host (Claude Code desktop, Cursor, OpenCode). Result: działanie potwierdzone (fan-out works as specified). Per-step outputs are not stored in this repo.
