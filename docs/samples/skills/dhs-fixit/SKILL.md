---
name: dhs-fixit
description: This skill should be used when the user invokes /dhs-fixit or asks to fix one named bug without the whole path. It launches the project's bugfixer for one bug. When the bug is complex, this skill (the main agent, not the bugfixer) asks whether to run /dhs-planit first. It reports the result and offers the next step without launching it.
harness: dev-harness
---

# Fix one bug with the bugfixer

Read `references/launch.md` first. It holds the shared launch rules: the start checks, the task state, what a launch contains, the languages, the `[<short key>]` prefix, the modes and the stops. Follow them.

This skill launches the project's bugfixer for one bug. It does not write the code or the feature files itself. The complexity check belongs to this skill in the main agent. The bugfixer never asks the complexity question.

## Entry checks

Do not launch in these cases. Report and point to the skill:

- The task is not a bug: point to `/dhs-doit`.
- The status is the code-review status: the implementation exists, point to `/dhs-checkit`.
- The status is the in-review status or the done status: stop, the review already passed.

The in-progress status launches the bugfixer to finish the work. Skip the complexity check.

## Complexity check

Before the launch, this skill (the main agent, not the bugfixer) checks the task description and the task state for these signals:

- no specification
- several modules or areas named
- a change of business behaviour
- a data or schema migration

One signal is enough.

In `Mode: interactive`, with a signal, ask the user whether to run `/dhs-planit` first, and name the signals found.

- Yes: launch the architect, then the bugfixer, in one run. Stop and wait when the architect asks a question or waits for the user's approval of the specification. Launch the bugfixer after that approval.
- No: launch the bugfixer alone.

In `Mode: critical` or `Mode: autonomous`, do not ask. With a signal, launch the architect, then the bugfixer, and record the choice and its signals in one sentence in the report.

With no signal, launch the bugfixer alone in every mode.

## Scope line

Print the scope line from `references/launch.md` "Announce and launch" with `<stages>` = `bugfixer`, or `architect → bugfixer` when the complexity check runs the architect first. `<condition>` is `implementation done`, or the first stop. The run-mode token from `references/launch.md` "Mode" applies.

## Launch

Launch the bugfixer once, with the mode, the language lines, the task and the decisions already recorded. Use a description such as `[015] fix`. When this skill ran the architect first, launch the bugfixer after that stage as above.

## Report and next step

Report the result in one message. Offer `/dhs-checkit` and do not launch it.
