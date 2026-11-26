# Worktree run: test the task where it lives

Goal: after the Implementer (and the Reviewer, when the worktree stays) the developer can run and check the task in its worktree without digging into `.git/seh-worktrees/<task>`. Framework- and language-agnostic: seh prints the path and, optionally, a command the user wrote; on a host that can open a terminal tab, `/<prefix>doit` and `/<prefix>checkit` offer to open one there.

Planning: complete

Source: conversation 2026-11-25 (QoL: running an app from a seh worktree)

## Stages

| NN | Stage | Executor | Status | Verification |
|----|-------|----------|--------|--------------|
| 01 | [PRD, config, start-task `run:`](01-prd-start-task.md) | agent | planned | `node --test scripts/start-task.test.js`; PRD diff review |
| 02 | [setit-se, agents and skills](02-setup-agents-skills.md) | agent | planned | `npm test`; diff review |
| 03 | [Guide and release](03-guide-release.md) | agent | planned | `npm test`; guide review |

## Decisions

- Q1: the "how to test" block is printed by the Implementer at the end of every run and by the Reviewer when the worktree stays (gaps / fix round, commit disabled). (rejected: Implementer only; extra `wt` script)
- Q2: `agents.runCommand` (string or `null`), asked by `/<prefix>setit-se` on the first run and when the key is missing, like `agents.reportChange`; changeable later through setup. seh never interprets or guesses it. (rejected: manual-only key; labelled list of commands)
- Q3: when the session has a tool that opens a terminal tab with a working directory, the skill asks one question after the block: open the tab and run `runCommand` / only open it / no. Detected by the tool being present, not by `hosts.json` (CLI and desktop are the same host). `autonomous`: no question, nothing opened. (rejected: open automatically; open without the run option)
- Q4: `/<prefix>runit` and `/<prefix>shipit` are one assembly line: no pause after the Implementer and no terminal question. Their Reviewer report still carries the block when the worktree stays (text only). The question lives in `/<prefix>doit` and `/<prefix>checkit` only. (user, 2026-11-25)
- Q5: minor bump. No version is tagged and 2.1.1 (patch) is already committed, so this is 2.2.0 with its own `CHANGELOG.md` entry.
- Q6: `start-task` (also `--existing`) prints `run: <cmd>` after `worktree:` when `agents.runCommand` is a non-empty string; agents copy `worktree:` and `run:` from the script output and do not read the key themselves. (rejected: agents read config)

## Assumptions

- `runCommand` missing, `null` or empty (after trim) = no `run:` line; the block is then `cd <worktree>` only.
- The key is a single line; setup rejects a value with a newline and asks again.
- `start-task` prints `run:` only when it prints a real task worktree (not the launch checkout: git disabled or `worktree` off print no `run:`), and `/<prefix>setit-se` asks the question only when git is connected and the `worktree` operation is enabled.
- Several keys run one after another in one session: one terminal question at the end, the user picks the task (up to 4 per question; more → the block only).
- The terminal tab runs the command as given, in the worktree; seh does not stop or track that process.

## Out of scope

- Shorter or configurable worktree path (option C, separate decision).
- Preparing the worktree (symlinks, dependency install): dropped, symlinked dependency dirs can run the primary checkout's code; the user puts setup into the command (`npm ci && …`).
- Guessing a run command from project files.
- A pause in `/<prefix>runit` / `/<prefix>shipit`.
- Root `README.md`.
