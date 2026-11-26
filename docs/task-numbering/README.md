# Task numbering: no repeats, no going back

Goal: a new files-basename number (`NNN-slug`) never repeats and never goes backwards, also when earlier tasks live only on their branches and have not reached the base branch yet. Gaps in the numbering are acceptable.

Planning: complete

Source: conversation 2026-11-26 (numbering is blind to task branches; gap-filling reuses numbers)

## Stages

| NN | Stage | Executor | Status | Verification |
|----|-------|----------|--------|--------------|
| 01 | [next-task script, Architect, PRD, guide, release](01-next-task.md) | agent | planned | `node --test scripts/next-task.test.js`; `npm test`; diff review |

## Decisions

- Q1: a POSIX script `.seh/scripts/next-task` computes the number: `max(NNN- prefixes in the three task directories, NNN- branch names local + remote, counter in .git/) + 1`, never the smallest free one. It writes the counter. The Architect calls it instead of computing the number itself. (rejected: prose rule in the Architect, which cannot be tested)
- Q2: no `git fetch`. `refs/remotes` as of the last fetch: works offline, no network or credentials. Between people a repeat is possible only inside the window since the last fetch, and the basename still differs by slug. (rejected: fetch when `push` is ON)
- Q3: git disabled (empty `agents.baseBranch`) or no git repo → the three task directories only, no counter, `OK` with `git: disabled`. Without git there are no task branches, so the original problem does not occur. (settled by context)
- Q4: minor. Shared 2.2.0 with `docs/worktree-run`: if `CHANGELOG.md` already has an untagged 2.2.0, add to it; otherwise this plan creates 2.2.0 and `worktree-run` adds to it later. (user, 2026-11-26)
- Q5: one stage. (user, 2026-11-26)
- Q6: a branch counts only when it looks like a files basename: `^[0-9]+-` followed by a slug that contains a letter (with an optional `-N` suffix). This excludes ADO suffix branches such as `1234-2`, which would otherwise push the numbering to 1235. (settled by context)
- Q7: the counter is `$(git rev-parse --git-common-dir)/seh-next-task` (shared by all worktrees of the clone, never committed). Read-compute-write runs under a `mkdir` lock, because `/<prefix>planit` fan-out can run several Architects in parallel in one clone. (settled by context)

## Assumptions

- Only the Architect assigns new files basenames (grep: `agents/architect.md:134` is the only rule site). No script parses the number out of a basename.
