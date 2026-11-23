# Example runs

What you can ask SE Harness to do, and what happens then. Simple runs come first. Each example gives the request, the steps in order, and why SE Harness does it that way.

Contracts in full: [`docs/prd.md`](../prd.md). Setup and reference: [`README.md`](../../README.md).

## Before you read

A few words used below:

- **Task key**: the name of one task. With the files tracker it is a file name such as `001-login`; with Jira it is an issue key such as `MT-01`; with Azure DevOps a work item id. The examples use `MT-01`, `MT-02`, `MT-03`.
- **Spec**: what the task must do (requirements, acceptance criteria). Written by the **Architect**. Together with the **prompt** (how to approach the work) and the **log** (decisions, history) it lives on the active tracker.
- **Status**: where the task is: `todo` → `in progress` → `implemented` → `in review` → `done`. Every agent checks it before working, so a task is never implemented twice or reviewed before it is built.
- **Worktree**: a separate folder with its own git branch for one task. Your own checkout is never switched, and several tasks can be worked on at once without touching each other.
- **PR**: the pull request the Reviewer opens at the end. You merge it on GitHub, except in `/_shipit`, which merges by itself.
- **Mode**: how much SE Harness asks you.
  - `interactive` (default): one question at a time, and the Reviewer waits for your "accept".
  - `autonomous`: nothing is asked. Say so in the request, for example "don't ask me" or "autonomous", in any language. Agents decide, record each decision in the log, and a clean review counts as your acceptance.
- **`BLOCKED:`**: a one-line stop. It says what stopped and what to do next. One task's stop never stops the other tasks of the same run.
- **`Q<n>`**: a numbered question with a recommended answer (interactive mode).
- **Skill names**: the examples use the default prefix `_` (`/_runit`). A slash name labels the skill that answers; you describe what you want and the assistant picks the skill. On Codex a skill is called with `$` (`$_runit`).
- **Session**: one conversation with the assistant. In the Claude Code desktop app SE Harness can start one session per task by itself. On other hosts it prints one ready-to-paste request per task.

## 1. One step at a time

Use these when you want to control each step yourself.

### Write a spec only

```text
write a spec for: add password reset by e-mail
```

*Answered by `/_planit`.*

1. The Architect reads the project (PRD, code) and asks you one question at a time: title first, then the open points.
2. It shows the spec and prompt and writes them only after you confirm.
3. It creates the task (for example `MT-04`) with status `todo`, and suggests the next step without starting it.

Why: the spec is the contract for everything after it. Nothing is built until you agree on what "done" means.

### Design the UX first, then the spec

```text
design the UX of a login screen with "remember me"
```

*Answered by `/_designit`.*

1. The Designer is enabled (`agents.designer.enabled` in `/_setit-se`). Otherwise: `BLOCKED: the Designer is disabled — enable it in /_setit-se`.
2. The Designer reads the project's UI code and design system and asks you one question at a time: flows, screens, states (loading, empty, error), copy, accessibility, components to reuse.
3. It shows the whole file and writes `docs/designs/login-screen.design.md` (`status: draft`). After you accept it, it sets `ready`. The tracker, the spec and git are not touched.
4. It suggests the next step without starting it:

```text
write the spec for the login screen, using docs/designs/login-screen.design.md
```

*Answered by `/_planit`.*

5. The Architect writes the spec with `ui: true` and takes the UX decisions and `UX:` criteria from that file. The log gets a row `design: docs/designs/login-screen.design.md`. The Designer does not run again: the UX section is already there.

To change the design later, ask for the change and name `docs/designs/login-screen.design.md` (`/_designit`). A run request takes the same design file as a spec request. If the task already has a spec, ask for it to be rebuilt from the design file first.

Why: the UX is worked out on its own, without the requirements and the tracker. The file stays in the repo. The Architect uses it only when you name it, so nothing picks up a half-finished design by itself.

### Teach the Designer your UX conventions

```text
learn the project's UX conventions
```

*Answered by `/_designit`.*

1. Same gate as above: the Designer must be enabled.
2. The Designer scans the UI code, design tokens, component library and docs. It also reads the `ux-a11y` pack to spot where the project differs from it.
3. It shows the whole file, then writes `docs/designs/ux-conventions.md` (`status: draft`): about 50 one-line rules, each with `path:line` evidence. A project practice that breaks a `ux-a11y` rule is proposed under **Deviations from ux-a11y**, with the pack rule quoted, the practice and the reason.
4. You accept the rules and each deviation. Then it sets `ready`. Nothing is offered after it: no `/_planit`, no `/_runit`.
5. Later, `/_designit`, `/_planit` and `/_runit` use the file. Its rules beat the generic WCAG / HIG baseline, and a decision based on it ends in `(ux-conventions)`. With `ready`, the Consultant no longer flags the accepted deviations in `/_runit`.

Ask again to update the file; it changes only what is new or outdated. In critical or autonomous mode, deviations are only listed in the report as proposals, never written. A `draft` file is a hint only: no deviation counts until it is `ready`.

Why: the generic rules do not know your product. A deviation without your approval would let the Implementer and the Consultant disagree, so a person always decides.

### Implement one task

```text
implement MT-01
```

*Answered by `/_doit`.*

1. `/_doit` checks that `MT-01` has a spec and a prompt. If not: `BLOCKED: run /_planit MT-01 first`.
2. It checks `depends`: every task this one depends on must already be `done`. Otherwise `MT-01` stops, because building on missing code would fail later.
3. `start-task` creates the worktree and branch `MT-01` from the base branch. Your checkout stays as it is.
4. The Implementer sets `in progress`, splits the work into 2–6 phases and builds them one by one.
5. After each phase the **Consultant** checks code quality on that phase only. Serious findings (`must-fix`) are fixed before the next phase; smaller ones may be skipped with a log line.
6. At the end the status is `implemented`. No review, no commit, no PR yet. `/_doit` suggests the review as the next step.

Why: implementation and review are different jobs. The Consultant judges *how* the code is written; the Reviewer later judges *whether it matches the spec*.

### Implement two tasks

```text
implement MT-01 and MT-02
```

*Answered by `/_doit`.*

- **Claude Code desktop app**: one new session per task, working at the same time. Each one runs exactly as "Implement one task" above. This session shows a table with a link to each one.
- **Cursor, OpenCode, Codex**: this session prints one request per task. You paste each one into a new session.
- **Git disabled**: both run here, one after another (see section 5).

If `MT-02` depends on `MT-01`, `MT-02` waits until `MT-01` is `done`, which means reviewed and accepted. So with `/_doit` alone a dependent task ends `BLOCKED`: review the first one with `/_checkit` before you implement the second.

### Review one task

```text
review MT-01
```

*Answered by `/_checkit`.*

1. The status must be `implemented` (or `in review` on a later round).
2. The Reviewer sets `in review` and compares the code with the spec: each requirement and acceptance criterion, met or not.
3. It reports ✅ (matches), ⚠️ (note, nothing to fix) and ❌ (misses the spec).
4. With ❌, the status goes back to `in progress`; ask for `MT-01` to be implemented again to fix those items only.
5. With no ❌, interactive mode waits for your "accept". Then the Reviewer writes the final review to the log, sets `done`, adds a `CHANGELOG.md` line, commits, pushes and opens the PR, and removes the worktree.
6. You merge the PR on GitHub. The task is already `done` and needs nothing more from SE Harness.

Why: the PR is opened only after you accept, so nothing reaches GitHub that you did not approve.

## 2. One task from start to PR

`/_runit` runs the whole path in one go: Architect → Implementer (with Consultant) → Reviewer, up to three review rounds. It starts at the first missing stage. For a task that already has a spec it starts at the Implementer; for one already `implemented` it goes straight to the Reviewer.

### From a sentence, with questions

```text
add CSV export to the reports page, from spec to PR
```

*Answered by `/_runit`.*

1. The Architect asks its questions, you confirm, and it writes the spec (new key, status `todo`).
2. The Implementer builds it in a worktree with the Consultant after each phase (`implemented`).
3. The Reviewer reviews. ❌ sends only those items back to the Implementer, then the Reviewer looks again, at most three rounds.
4. On a clean review it waits for your "accept", then opens the PR (`done`).

The run pauses only for questions. Between stages it does not stop to ask "shall I continue?".

### An existing task, no questions

```text
take MT-01 from start to PR, don't ask me
```

*Answered by `/_runit`.*

1. "Don't ask me" means `autonomous`: no question to you at any stage.
2. If `MT-01` has no spec yet, the Architect writes one from the tracker item and your words, and decides open points itself (each one logged as `Q<n>` with its reason).
3. Implementer, Consultant and Reviewer run as above. A clean review counts as acceptance, so the PR opens without waiting.
4. The final report lists the decisions the agents took, as facts. To change one, give a new request.
5. You merge the PR on GitHub.

If the Architect finds that `MT-01` needs another task that is not `done` yet, the run stops right after the spec: `BLOCKED: depends on MT-02 — rerun /_runit MT-01 after MT-02 is merged`. The spec stays, so the rerun starts at the Implementer, in a fresh worktree that already contains the merged `MT-02` code.

## 3. Several tasks at once, you merge

`/_runit` with several keys starts one session per task. Each session does what section 2 describes. `/_runit` does **not** order the tasks by dependencies here: when something needs another task first, that task stops with `BLOCKED` and you rerun it later. For automatic ordering use `/_shipit` (section 4).

### Three tasks, no questions

```text
take MT-01, MT-02 and MT-03 from start to PR, don't ask me
```

*Answered by `/_runit`.*

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
take MT-01 and MT-02 from start to PR
```

*Answered by `/_runit`.*

Same as above, but each session asks its own questions and waits for your "accept". You answer in that task's session; this session does not pass answers along. While a session waits for you it still counts as running, and this session shows an interim table.

### On Cursor, OpenCode or Codex

```text
take MT-01 and MT-02 from start to PR, don't ask me
```

*Answered by `/_runit`.*

These hosts cannot start sessions. `/_runit` prints one ready-to-paste request per task, each keeping your wording about not asking questions; paste each one into a new session. The new sessions then also run without questions.

## 4. Many tasks to merged, unattended

`/_shipit` is for running many tasks without you, for example overnight. It needs:

- **Git**: it merges.
- **A spec and prompt for every task beforehand**: it never writes specs. Have them written first (`/_planit`), with you, including which task depends on which.

### Overnight run with a dependency

During the day:

```text
write specs for MT-01, MT-02 and MT-03
```

*Answered by `/_planit`.*

You answer the Architects' questions. The spec of `MT-02` records that it depends on `MT-01`. An open dependency is not a stop for the Architect, so all three specs get written.

In the evening:

```text
ship MT-01, MT-02 and MT-03, don't ask me
```

*Answered by `/_shipit`.*

1. `/_shipit` checks every key: spec and prompt present, PR state (`pr-state`), dependencies.
2. It shows the plan and asks once for a go-ahead. This is its only question. Plan:
   - first wave `MT-01`, `MT-03`;
   - `MT-02` waiting for `MT-01`;
   - finished tasks will be **merged into the base branch**.
3. After your yes it starts one session for `MT-01` and one for `MT-03`. Each runs `/_runit` in `autonomous` mode with auto-merge.
4. In each session the Reviewer opens the PR and merges it itself.
   - If the base branch moved and the PR conflicts (often just `CHANGELOG.md`), it merges the base in, resolves the conflict, runs the project's tests, and tries again, up to 3 times.
   - Red tests after resolving stop that task with `BLOCKED`: nothing broken is merged.
5. When `MT-01` is merged, `MT-02` starts. Its worktree is cut from the updated base, so it already contains `MT-01`'s code.
6. At the end `/_shipit` writes a run report to `docs/run-reports/<date>-shipit.md`. It holds what was merged, what stopped and why, the decisions agents took, open warnings, and the next steps for you. It shows a short table in chat and asks nothing.

If `MT-01` stops with `BLOCKED`, `MT-02` is never started (`blocked` in the report). `MT-03` is not affected.

Why a dependent starts only after the merge: an opened PR is not yet in the base branch, and a task cut from the base would miss that code.

### With questions

```text
ship MT-01 and MT-02
```

*Answered by `/_shipit`.*

Same, but each session asks you and waits for your "accept" before its merge. While a session waits for you it counts as running: tasks that depend on it keep waiting, and the run report is written only when nobody is running or waiting. Answer in the task's own session.

### A single task

```text
ship MT-01, don't ask me
```

*Answered by `/_shipit`.*

One session, the same go-ahead question, then spec check → implement → review → merge, and a run report. Use it when you want the task merged without opening the PR yourself.

### Resume after an interrupted night

```text
ship MT-01, MT-02 and MT-03, don't ask me
```

*Answered by `/_shipit`.*

`/_shipit` keeps no state of its own. It reads the facts again and continues:

- already merged → skipped;
- still running in a live session → left alone;
- started but no session alive any more → planned again, and its new session resumes at the first missing stage;
- `done` with the PR still open → `BLOCKED` until you merge it, and its dependents wait.

Tasks with no keys given: asking to ship everything without questions takes every `todo` task that has a spec and a prompt. This works with the files tracker or a read-only Jira / Azure DevOps; with full-write Jira or Azure DevOps you name the keys.

## 5. Without git

An empty `agents.baseBranch` in `harness.config.json` turns git off. The flow and the statuses stay the same; only git actions disappear:

- no worktree: work happens in your checkout;
- no commit, push or PR: `done` is set after acceptance, with a `CHANGELOG.md` line;
- no parallel sessions: several tasks always run one after another, here, on every host;
- `/_shipit` is not available: there is nothing to merge.

```text
take MT-01 and MT-02 from start to PR, don't ask me
```

*Answered by `/_runit`.*

1. `/_runit` asks the planner (`fanout-plan`) which task goes first. The order you typed does not matter: if `MT-01` depends on `MT-02`, `MT-02` runs first.
2. Each task runs the full path here. A task is finished at `done`, and the next one starts.
3. If an Architect finds a new dependency on a task of this run, that task goes back in the queue and runs again after it, starting at the Implementer.
4. A question (`Q<n>`) is asked here; after your answer the same task continues.
5. A `BLOCKED` task is skipped, and so are the tasks that depend on it; the rest continue.

Asking to implement or review both tasks follows the same order. Remember that `/_doit` ends at `implemented`, so a dependent task still waits for a review.

## 6. When something stops

Every stop is one line, `BLOCKED: <what> — <what to do>`. Common ones:

| Line | What it means | What to do |
|---|---|---|
| `run /_planit MT-01 first` | `/_doit`, `/_checkit` or `/_shipit` needs a spec | Write the spec |
| `depends on MT-02 — rerun … after MT-02 is merged` | This task needs code that is not in the base branch yet | Merge `MT-02`'s PR, then ask again |
| `task is already done — the PR is opened` | Nothing left to do for this task | Merge the PR (resolve its conflict first if it has one) |
| `MT-01 is done but its PR is not merged` (`/_shipit`) | `/_shipit` does not merge PRs it did not open in this run | Merge it, then ask to ship again |
| `project checks fail after merging …` | Auto-merge found red tests after a conflict | Fix the branch in its worktree, merge the PR |
| `the Designer is disabled — enable it in /_setit-se` | `/_designit` needs the Designer | Turn the Designer on in setup (`/_setit-se`) |
| `design … is draft — finish it in /_designit or rerun interactive` | Critical mode got a design file still in `draft` | Finish the design, or ask again in interactive mode |
| `MT-01 already has a spec — run /_planit MT-01 <design path> …` | `/_runit` got a design file for a task whose spec was not built from it | Ask for the spec to be rebuilt from the design, then ask for the run again |
| `conventions file write did not persist for docs/designs/ux-conventions.md` | `/_designit` "learn conventions" could not save the file (checked after a retry) | Check the folder is writable, ask again |
| `generated files do not match the installed templates` | The SE Harness package was updated but the project was not | Ask for setup again (`/_setit-se`) |

A question (`Q<n>`) is not a stop in interactive mode: answer it in that session and the run continues.
