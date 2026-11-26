# 02 setit-se, agents and skills

## Goal

Setup asks for the run command; the Implementer and Reviewer print the run block; `/<prefix>doit` and `/<prefix>checkit` offer to open a terminal in the worktree; `/<prefix>runit` and `/<prefix>shipit` stay a non-stop line.

## Scope

In:
- `skills/setit-se/SKILL.md`: **Run command question** (first run; rerun when `agents.runCommand` is missing; change table row). Only when git is connected and `worktree` is enabled. Free text or "none" → `null`. Newline → ask again. State that seh runs it as written in the worktree and does not interpret it; examples from several stacks.
- `agents/implementer.md` **Output**: the run block from `start-task` output (`worktree:` → `cd <abs>`, `run:` → the command). Not printed when there is no task worktree.
- `agents/reviewer.md` final report: the same block when the worktree stays (open ❌ / fix round, `commit` off, failed commit/push, dirty after merge).
- `skills/doit/SKILL.md` **Report** and `skills/checkit/SKILL.md` **After Reviewer finishes**: the block per task; then, when the session has a tool that opens a terminal tab with a working directory and the mode is not `autonomous`, one question: open + run (only when `run:` exists) / only open / no. Several tasks: one question at the end, pick the task (up to 4; more → block only). On "open + run": open the tab in the worktree and run the `run:` line as given; on "only open": tab with that cwd, nothing run.
- `skills/runit/SKILL.md`, `skills/shipit/SKILL.md`: no pause after the Implementer, no terminal question; the Reviewer's block passes through in the final report when the worktree stays.
- Fan-out children: a `doit` / `checkit` child asks in its own session (it is a normal single-key run).
- `CHANGELOG.md` `[2.2.0]`: Added lines (setup question, block, terminal offer).

Out:
- Scripts (stage 01). Guide (stage 03).
- Running the command without the user's choice; tracking or stopping the process.
- Any host-specific name in `hosts.json`.

## Decisions

Q1, Q2, Q3, Q4 (README).

## Detailed plan

1. setit-se: add the question next to the **Changelog question** (wording, when asked, write rule); rerun rule beside `agents.reportChange` missing; change table row.
2. Implementer **Output**: one short paragraph with the block format:
   ```
   cd <worktree>
   <run>
   ```
   copied from `start-task` output, never composed from config.
3. Reviewer: same block, listing when the worktree stays.
4. doit / checkit: block in the report + the terminal question (Q3, assumptions). Wording host-neutral: "a tool that opens a terminal tab with a working directory".
5. runit / shipit: one sentence each (Q4).
6. `CHANGELOG.md` lines.

## Acceptance criteria

- [ ] setit-se asks the run command question under the stated conditions and writes `null` for "none"; rerun asks when the key is missing.
- [ ] Implementer and Reviewer output rules describe the block, copied from `start-task` output.
- [ ] doit and checkit describe the terminal question with three answers, not in `autonomous`, only when the tool exists; several tasks = one question.
- [ ] runit and shipit say: no pause, no terminal question.
- [ ] No file reads `agents.runCommand` except `start-task` and setit-se.
- [ ] `npm test` passes.
- [ ] `CHANGELOG.md` `[2.2.0]` has the Added lines.

## Verification

- `npm test`
- `grep -rn runCommand agents skills scripts` shows only setit-se and `start-task` (+ tests).
- Diff review by the user.

## Files

`skills/setit-se/SKILL.md`, `agents/implementer.md`, `agents/reviewer.md`, `skills/doit/SKILL.md`, `skills/checkit/SKILL.md`, `skills/runit/SKILL.md`, `skills/shipit/SKILL.md`, `CHANGELOG.md`.

## Depends on

01 (`done`).
