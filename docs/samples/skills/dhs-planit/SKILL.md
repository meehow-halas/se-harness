---
name: dhs-planit
description: This skill should be used when the user invokes /dhs-planit or asks to specify, refine or plan one task without running the whole path. It launches the project's architect for one task, reports the result, and offers the next step without launching it.
harness: dev-harness
---

# Specify one task with the architect

Read `references/launch.md` first. It holds the shared launch rules: the start checks, the task state, what a launch contains, the languages, the `[<short key>]` prefix, the modes and the stops. Follow them.

This skill launches exactly one agent, the project's architect, for one task. It does not write the specification, the implementation prompt or the feature files itself.

## Entry check

Do not launch when the status is the in-review status or the done status: report that the review already passed.

## Scope line

Print the scope line from `references/launch.md` "Announce and launch" with `<stages>` = `architect` and `<condition>` = `first question` in `Mode: interactive`, otherwise `specification written`. The run-mode token from `references/launch.md` "Mode" applies.

## Launch

Launch the architect once, with the mode, the language lines, the task and the decisions already recorded. Use a description such as `[015] spec`. When the architect returns a question in `Mode: critical`, follow `references/launch.md`.

## Report

Report the architect's result in one message. Offer the next step and do not launch it: `/dhs-doit`, or `/dhs-fixit` for a bug. This skill does not chain. `/dhs-feature` runs the whole path.
