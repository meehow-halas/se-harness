---
name: dhs-doit
description: This skill should be used when the user invokes /dhs-doit or asks to implement one task without the whole path. It launches the project's implementer for one task that has a specification and an implementation prompt, reports the result, and offers the next step without launching it.
harness: dev-harness
---

# Implement one task with the implementer

Read `references/launch.md` first. It holds the shared launch rules: the start checks, the task state, what a launch contains, the languages, the `[<short key>]` prefix, the modes and the stops. Follow them.

This skill launches exactly one agent, the project's implementer, for one task. It does not write the code or the feature files itself.

## Entry checks

Do not launch in these cases. Report and point to the skill:

- The task is a bug: point to `/dhs-fixit`.
- No specification or no implementation prompt: point to `/dhs-planit`.
- The status is the code-review status: the implementation exists, point to `/dhs-checkit`.
- The status is the in-review status or the done status: stop, the review already passed.

The in-progress status launches the implementer to finish the work.

## Scope line

Print the scope line from `references/launch.md` "Announce and launch" with `<stages>` = `implementer` and `<condition>` = `implementation done`. The run-mode token from `references/launch.md` "Mode" applies.

## Launch

Launch the implementer once, with the mode, the language lines, the task and the decisions already recorded. Use a description such as `[015] implement`.

## Report

Report the implementer's result in one message. Offer the next step and do not launch it: `/dhs-checkit`. This skill does not chain. `/dhs-feature` runs the whole path.
