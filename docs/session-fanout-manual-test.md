# Session fan-out: manual test on a test project

Scope: Claude Code desktop app (Code tab). Other hosts use `manual` and only print commands.

## 1. Prepare a test project

```bash
mkdir ~/projects/dhs-fanout-test && cd ~/projects/dhs-fanout-test
git init -b dev && git commit --allow-empty -m init
node ~/projects/dhs/src/cli.js install
```

Open this folder in the desktop app (Code tab). Then run `/dhs-setup` and finish it (base branch `dev`, files tracker).

## 2. Check the installed pieces

```bash
ls .dhs/scripts/fanout-plan .dhs/references/session-fanout.md
sh .dhs/scripts/fanout-plan --skill planit --keys TST-1,TST-2
```

Expected: `OK`, `mode: parallel`, `ready: TST-1,TST-2`.

## 3. planit: two specs in parallel

In the session, run:

```text
/dhs-planit Opracuj spec TST-1 i TST-2
```

Expected:
- the parent runs `fanout-plan` and reports `ready: TST-1,TST-2`
- two sessions appear in the sidebar, titled `dhs-planit TST-1` / `TST-2`
- each child runs Architect for one key and writes `docs/features/TST-1.feature.md` etc.
- parent wakes when children end, prints one table with statuses and links

If the child does not trigger the skill from `/dhs-planit TST-1`, that is the first open point: record it and report.

## 4. doit with a dependency

Create two specs with prompts (planit each, or copy the `docs/` files from step 3). Then:

```text
/dhs-doit TST-1 TST-2   (with TST-2 depending on TST-1, set in the spec's depends field)
```

Expected: planner returns `ready: TST-1`, `waiting: TST-2 after TST-1`. Parent runs `start-task TST-1`, starts one session with `cwd` = `$(git rev-parse --git-common-dir)/dhs-worktrees/TST-1`. TST-2 starts after TST-1 is done.

Check: `git worktree list` shows `dhs-worktrees/TST-1`; the primary checkout stays on `dev`.

Open point: whether the app accepts `cwd` on a dhs worktree. If refused, the parent reports `BLOCKED: session cannot open worktree ...`.

## 5. Manual host

Use a project with `sessionSpawn: manual` (OpenCode), or Cursor without a request for independent work. `/dhs-planit TST-1 TST-2` must print two commands and stop; it must not create any session.

## 6. Failure cases to try

- `/dhs-doit TST-1 TST-1`: duplicate key, parent reports BLOCKED, starts nothing.
- A key without a spec: that key `BLOCKED`, sibling keys still start.
- `/dhs-checkit close TST-1 TST-2`: `mode: serial`, one session at a time.

## Record for each step

Result (pass/fail), the `fanout-plan` output, the session titles, and any `BLOCKED:` line. Report failures with the exact output.

## Known issues (not blocking)

- **Reviewer report language.** In `/dhs-shipit` runs on the test project, the parent replies in the user's language, but the Reviewer subagent's final report comes back in English, although `agents/reviewer.md` and the shipit skill ask for the launch to pass `Conversation language: Polish` (not verified in the transcript). Seen on 03-multiply and 011-feature-negate. Open TODO, non-critical. Next step when picked up: export the session transcript and check the exact Agent call input to see whether the launch line reached the Reviewer.

## Cursor Agent (`cli_headless`)

Requires the Cursor CLI (`agent` or `cursor-agent`) on `PATH` and `CURSOR_API_KEY`. In Cursor Agent run `/dhs-planit samodzielnie TST-1 TST-2`.

Expected: two background `agent -p --trust --force --workspace ... "<prompt>"` commands, each writing one spec. Without `samodzielnie` it must print two commands and start nothing.

Open point: whether a slash skill line (`/dhs-planit TST-1`) is expanded in `-p` mode. If not, the child ignores the skill; record it and report.
