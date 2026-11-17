# Example runs

What you can ask seh to do, and what happens then. Simple runs come first. Each example gives the command, the steps in order, and why seh does it that way.

Contracts in full: [`docs/prd.md`](docs/prd.md). Setup and reference: [`README.md`](README.md).

## Before you read

A few words used below:

- **Task key**: the name of one task. With the files tracker it is a file name such as `001-login`; with Jira it is an issue key such as `MT-01`; with Azure DevOps a work item id. The examples use `MT-01`, `MT-02`, `MT-03`.
- **Spec**: what the task must do (requirements, acceptance criteria). Written by the **Architect**. Together with the **prompt** (how to approach the work) and the **log** (decisions, history) it lives on the active tracker.
- **Status**: where the task is: `todo` → `in progress` → `implemented` → `in review` → `done`. Every agent checks it before working, so a task is never implemented twice or reviewed before it is built.
- **Worktree**: a separate folder with its own git branch for one task. Your own checkout is never switched, and several tasks can be worked on at once without touching each other.
- **PR**: the pull request the Reviewer opens at the end. You merge it on GitHub, except in `/_shipit`, which merges by itself.
- **Mode**: how much seh asks you.
  - `interactive` (default): one question at a time, and the Reviewer waits for your "accept".
  - `autonomous`: nothing is asked. Add a word like `samodzielnie`, `autonomous` or "don't ask me" to the request. Agents decide, record each decision in the log, and a clean review counts as your acceptance.
- **`BLOCKED:`**: a one-line stop. It says what stopped and what to do next. One task's stop never stops the other tasks of the same run.
- **`Q<n>`**: a numbered question with a recommended answer (interactive mode).
- **Command names**: the examples use the default prefix `_` (`/_runit`). On Codex a skill is called with `$` (`$_runit`).
- **Session**: one conversation with the assistant. In the Claude Code desktop app seh can start one session per task by itself. On other hosts it prints the commands for you to paste.

## 1. One step at a time

Use these when you want to control each step yourself.

### Write a spec only

```text
/_planit add password reset by e-mail
```

1. The Architect reads the project (PRD, code) and asks you one question at a time: title first, then the open points.
2. It shows the spec and prompt and writes them only after you confirm.
3. It creates the task (for example `MT-04`) with status `todo`, and suggests the next step without starting it.

Why: the spec is the contract for everything after it. Nothing is built until you agree on what "done" means.

### Implement one task

```text
/_doit MT-01
```

1. seh checks that `MT-01` has a spec and a prompt. If not: `BLOCKED: run /_planit MT-01 first`.
2. It checks `depends`: every task this one depends on must already be `done`. Otherwise `MT-01` stops, because building on missing code would fail later.
3. `start-task` creates the worktree and branch `MT-01` from the base branch. Your checkout stays as it is.
4. The Implementer sets `in progress`, splits the work into 2–6 phases and builds them one by one.
5. After each phase the **Consultant** checks code quality on that phase only. Serious findings (`must-fix`) are fixed before the next phase; smaller ones may be skipped with a log line.
6. At the end the status is `implemented`. No review, no commit, no PR yet. seh suggests `/_checkit MT-01`.

Why: implementation and review are different jobs. The Consultant judges *how* the code is written; the Reviewer later judges *whether it matches the spec*.

### Implement two tasks

```text
/_doit MT-01 MT-02
```

- **Claude Code desktop app**: one new session per task, working at the same time. Each one runs exactly as "Implement one task" above. This session shows a table with a link to each one.
- **Cursor, OpenCode, Codex**: seh prints one command per task. You paste each one into a new session.
- **Git disabled**: both run here, one after another (see section 5).

If `MT-02` depends on `MT-01`, `MT-02` waits until `MT-01` is `done`, which means reviewed and accepted. So with `/_doit` alone a dependent task ends `BLOCKED`: review the first one with `/_checkit` before you implement the second.

### Review one task

```text
/_checkit MT-01
```

1. The status must be `implemented` (or `in review` on a later round).
2. The Reviewer sets `in review` and compares the code with the spec: each requirement and acceptance criterion, met or not.
3. It reports ✅ (matches), ⚠️ (note, nothing to fix) and ❌ (misses the spec).
4. With ❌, the status goes back to `in progress`; run `/_doit MT-01` to fix those items only.
5. With no ❌, interactive mode waits for your "accept". Then the Reviewer writes the final review to the log, sets `done`, adds a `CHANGELOG.md` line, commits, pushes and opens the PR, and removes the worktree.
6. You merge the PR on GitHub. The task is already `done` and needs nothing more from seh.

Why: the PR is opened only after you accept, so nothing reaches GitHub that you did not approve.

### Bring a branch up to date

```text
/_checkit update MT-01
```

The Reviewer merges the base branch into `MT-01` and resolves conflicts, keeping what the spec requires. It does not review, change the status, or open a new PR.

## 2. One task from start to PR

`/_runit` runs the whole path in one go: Architect → Implementer (with Consultant) → Reviewer, up to three review rounds. It starts at the first missing stage. For a task that already has a spec it starts at the Implementer; for one already `implemented` it goes straight to the Reviewer.

### From a sentence, with questions

```text
/_runit add CSV export to the reports page
```

1. The Architect asks its questions, you confirm, and it writes the spec (new key, status `todo`).
2. The Implementer builds it in a worktree with the Consultant after each phase (`implemented`).
3. The Reviewer reviews. ❌ sends only those items back to the Implementer, then the Reviewer looks again, at most three rounds.
4. On a clean review it waits for your "accept", then opens the PR (`done`).

The run pauses only for questions. Between stages it does not stop to ask "shall I continue?".

### An existing task, no questions

```text
/_runit MT-01 samodzielnie
```

1. `samodzielnie` means `autonomous`: no question to you at any stage.
2. If `MT-01` has no spec yet, the Architect writes one from the tracker item and your words, and decides open points itself (each one logged as `Q<n>` with its reason).
3. Implementer, Consultant and Reviewer run as above. A clean review counts as acceptance, so the PR opens without waiting.
4. The final report lists the decisions the agents took, as facts. To change one, give a new request.
5. You merge the PR on GitHub.

If the Architect finds that `MT-01` needs another task that is not `done` yet, the run stops right after the spec: `BLOCKED: depends on MT-02 — rerun /_runit MT-01 after MT-02 is merged`. The spec stays, so the rerun starts at the Implementer, in a fresh worktree that already contains the merged `MT-02` code.

## 3. Several tasks at once, you merge

`/_runit` with several keys starts one session per task. Each session does what section 2 describes. seh does **not** order the tasks by dependencies here: when something needs another task first, that task stops with `BLOCKED` and you rerun it later. For automatic ordering use `/_shipit` (section 4).

### Three tasks, no questions

```text
/_runit MT-01 MT-02 MT-03 samodzielnie
```

Claude Code desktop app, git enabled:

1. This session checks each key. A key without a spec is fine: its own session starts with the Architect.
2. A key whose existing spec depends on one of the other two is not started: `BLOCKED: depends on MT-01 — rerun /_runit MT-03 after MT-01 is merged`.
3. Up to four sessions start at once, one per task, each in `autonomous` mode. More than four needs your yes.
4. Each session writes its spec (if needed), implements, reviews and opens its own PR.
5. If an Architect finds a dependency on a sibling task while writing the spec, that session stops after the spec with the same `BLOCKED` line. The others continue.
6. When every session has finished, this session shows a table: key, link to the session, result (`done`, or the `BLOCKED` line). It asks nothing.
7. You merge the PRs. Each PR adds its own `CHANGELOG.md` line, so the second and third merges usually need a small conflict resolution.

Why no automatic ordering here: these tasks may have no spec yet, so their dependencies are unknown until the Architects run. Waiting for a merge you do yourself on GitHub would leave sessions idle. A clear stop is simpler and safer.

### Two tasks, with questions

```text
/_runit MT-01 MT-02
```

Same as above, but each session asks its own questions and waits for your "accept". You answer in that task's session; this session does not pass answers along. While a session waits for you it still counts as running, and this session shows an interim table.

### On Cursor, OpenCode or Codex

```text
/_runit MT-01 MT-02 samodzielnie
```

These hosts cannot start sessions. seh prints `/_runit MT-01 samodzielnie` and `/_runit MT-02 samodzielnie`; paste each one into a new session. The mode word is kept, so the new sessions also run without questions.

## 4. Many tasks to merged, unattended

`/_shipit` is for running many tasks without you, for example overnight. It needs:

- **Git**: it merges.
- **A spec and prompt for every task beforehand**: it never writes specs. Write them first with `/_planit`, with you, including which task depends on which.

### Overnight run with a dependency

During the day:

```text
/_planit MT-01 MT-02 MT-03
```

You answer the Architects' questions. The spec of `MT-02` records that it depends on `MT-01`. An open dependency is not a stop for the Architect, so all three specs get written.

In the evening:

```text
/_shipit MT-01 MT-02 MT-03 samodzielnie
```

1. seh checks every key: spec and prompt present, PR state (`pr-state`), dependencies.
2. It shows the plan and asks once for a go-ahead. This is its only question. Plan:
   - first wave `MT-01`, `MT-03`;
   - `MT-02` waiting for `MT-01`;
   - finished tasks will be **merged into the base branch**.
3. After your yes it starts one session for `MT-01` and one for `MT-03`. Each runs `/_runit` in `autonomous` mode with auto-merge.
4. In each session the Reviewer opens the PR and merges it itself.
   - If the base branch moved and the PR conflicts (often just `CHANGELOG.md`), it merges the base in, resolves the conflict, runs the project's tests, and tries again, up to 3 times.
   - Red tests after resolving stop that task with `BLOCKED`: nothing broken is merged.
5. When `MT-01` is merged, `MT-02` starts. Its worktree is cut from the updated base, so it already contains `MT-01`'s code.
6. At the end seh writes a run report to `docs/run-reports/<date>-shipit.md`. It holds what was merged, what stopped and why, the decisions agents took, open warnings, and the next steps for you. It shows a short table in chat and asks nothing.

If `MT-01` stops with `BLOCKED`, `MT-02` is never started (`blocked` in the report). `MT-03` is not affected.

Why a dependent starts only after the merge: an opened PR is not yet in the base branch, and a task cut from the base would miss that code.

### With questions

```text
/_shipit MT-01 MT-02
```

Same, but each session asks you and waits for your "accept" before its merge. While a session waits for you it counts as running: tasks that depend on it keep waiting, and the run report is written only when nobody is running or waiting. Answer in the task's own session.

### A single task

```text
/_shipit MT-01 samodzielnie
```

One session, the same go-ahead question, then spec check → implement → review → merge, and a run report. Use it when you want the task merged without opening the PR yourself.

### Rerun after an interrupted night

```text
/_shipit MT-01 MT-02 MT-03 samodzielnie
```

seh keeps no state of its own. It reads the facts again and continues:

- already merged → skipped;
- still running in a live session → left alone;
- started but no session alive any more → planned again, and its new session resumes at the first missing stage;
- `done` with the PR still open → `BLOCKED` until you merge it, and its dependents wait.

Tasks with no keys given: `/_shipit samodzielnie` takes every `todo` task that has a spec and a prompt. This works with the files tracker or a read-only Jira / Azure DevOps; with full-write Jira or Azure DevOps you name the keys.

## 5. Without git

An empty `agents.baseBranch` in `harness.config.json` turns git off. The flow and the statuses stay the same; only git actions disappear:

- no worktree: work happens in your checkout;
- no commit, push or PR: `done` is set after acceptance, with a `CHANGELOG.md` line;
- no parallel sessions: several tasks always run one after another, here, on every host;
- `/_shipit` and `/_checkit update` are not available: there is nothing to merge.

```text
/_runit MT-01 MT-02 samodzielnie
```

1. seh asks the planner (`fanout-plan`) which task goes first. The order you typed does not matter: if `MT-01` depends on `MT-02`, `MT-02` runs first.
2. Each task runs the full path here. A task is finished at `done`, and the next one starts.
3. If an Architect finds a new dependency on a task of this run, that task goes back in the queue and runs again after it, starting at the Implementer.
4. A question (`Q<n>`) is asked here; after your answer the same task continues.
5. A `BLOCKED` task is skipped, and so are the tasks that depend on it; the rest continue.

`/_doit MT-01 MT-02` and `/_checkit MT-01 MT-02` follow the same order. Remember that `/_doit` ends at `implemented`, so a dependent task still waits for a review.

## 6. When something stops

Every stop is one line, `BLOCKED: <what> — <what to do>`. Common ones:

| Line | What it means | What to do |
|---|---|---|
| `run /_planit MT-01 first` | `/_doit`, `/_checkit` or `/_shipit` needs a spec | Write the spec |
| `depends on MT-02 — rerun … after MT-02 is merged` | This task needs code that is not in the base branch yet | Merge `MT-02`'s PR, then rerun |
| `task is already done — the PR is opened` | Nothing left to do for this task | Merge the PR, or `/_checkit update` if the branch needs it |
| `MT-01 is done but its PR is not merged` (`/_shipit`) | `/_shipit` does not merge PRs it did not open in this run | Merge it, rerun `/_shipit` |
| `project checks fail after merging …` | Auto-merge found red tests after a conflict | Fix the branch in its worktree, merge the PR |
| `generated files do not match the installed templates` | seh was updated but the project was not | Run `/_setit-se` |

A question (`Q<n>`) is not a stop in interactive mode: answer it in that session and the run continues.
