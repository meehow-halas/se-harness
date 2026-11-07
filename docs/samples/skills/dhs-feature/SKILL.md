---
name: dhs-feature
description: This skill should be used when the user invokes /dhs-feature or asks to take a task through specification, implementation and review. It runs the whole path in one run: the project's architect, then implementer or bugfixer, then reviewer, with fix rounds, until the review is clean or the run must stop. It does not write the specification, the code or the review itself.
harness: dev-harness
---

# Run a task through the whole path: specification, implementation, review

The machine setup (`dhs install`) is already done when this skill is available. Read `references/launch.md` first. It holds the shared launch rules: the start checks, the task state, what a launch contains, the languages, the `[<short key>]` prefix, the modes and the stops. This skill runs one task through the whole path of the project's agents: architect, then implementer or bugfixer, then reviewer, and back to the implementer or bugfixer for every fix round. It does not write the specification, the code, the review, the tracker fields or the feature files.

A request to implement, fix or review a task, without asking for the whole path, goes to that one agent and stops (`/dhs-planit`, `/dhs-doit`, `/dhs-fixit`, `/dhs-checkit`). This skill runs only when the user invokes `/dhs-feature` or asks for the whole path from specification through review. It is the only chain: the single-stage skills do not chain. Once it runs, it does not stop after one agent: it goes on to the next stage in the same run (see Pipeline).

## Starting stage

Choose the starting stage from the task state in `references/launch.md`. The chosen stage is the first stage of the run, not the only one: the run then continues through every following stage of the pipeline:

- No specification or no implementation prompt: start at the architect (`/dhs-planit`).
- The specification and the implementation prompt are present, and there is no implementation yet: start at the implementer (`/dhs-doit`). When the task is a bug, start at `/dhs-fixit`. Its complexity question does not apply inside this chain: the chain already starts at the architect when the specification is missing.
- An implementation exists: start at the reviewer (`/dhs-checkit`).
- The status is the in-review status or the done status: stop and report that the review already passed.

## Pipeline

Launch each stage as its skill describes, in `skills/dhs-planit/SKILL.md`, `skills/dhs-doit/SKILL.md`, `skills/dhs-fixit/SKILL.md` and `skills/dhs-checkit/SKILL.md`. The stages run in this order, in one run:

1. Specification (`/dhs-planit`): the architect writes or completes the specification and the implementation prompt. It may consult the brainstorm members by its own rules.
2. Implementation (`/dhs-doit`, or `/dhs-fixit` for a bug): the implementer or the bugfixer implements the prompt, including its tests. `/dhs-fixit`'s complexity question does not apply inside this chain.
3. Review (`/dhs-checkit`): the reviewer checks the implementation against the specification and reports ✅, ❌ and ⚠️ items.
4. Fix rounds: while the review has open ❌ items, the loop section sends them back to the implementer or bugfixer and then to the reviewer again.
5. Acceptance: a clean review is the end of the review stage. The mode decides what follows (see Acceptance and Loop).

Before the first launch, print the scope line from `references/launch.md` "Announce and launch": `<stages>` are the stages the run will go through from the starting stage (for example `architect → implementer → reviewer`), `<condition>` is `pull request` in `Mode: critical` or `Mode: autonomous` and `user acceptance` in `Mode: interactive`, or the first stop. The run-mode token from `references/launch.md` "Mode" applies.

Do not pause between stages. This is the "Announce and launch" rule: when an agent finishes its stage without a question and without a stop, the next Agent call follows in the same turn. Do not report and wait after the architect, the implementer or the first review. Report once, at the end of the run, or at the first stop.

On a fix round, pass the mode, the conversation language and only the open ❌ items.

## Acceptance

In `Mode: critical` and `Mode: autonomous`, a brainstorm round is input for the architect. Do not wait for the user to confirm it and do not write a file under `docs/brainstorm/`. A clean review is the acceptance: the reviewer does workflow step 6, including the commit, the push and the pull request. The skill ends with the pull request URL. Do not merge.

## Loop

Send only open ❌ items back to the implementer, or to the bugfixer when the task is a bug. ⚠️ items stay in the report and do not start another round.

Allow three review rounds. Count review rounds already recorded in tracker comments or the feature log. The same ❌ with no change in the code ends the loop sooner.

In an interactive run, when the architect or the reviewer asks the user a question, stop and wait. Do not answer it. An ❌ that contradicts the specification goes back to the user. Changing the specification is a separate decision. The user may say "one more round" or "stop". Do not commit, push or open a pull request. That stays the reviewer's acceptance step and waits until the user accepts.

## Stops

Besides the stops in `references/launch.md`, stop and report when the review round limit is reached, or the same ❌ has no change in the code.

Do not launch a brainstorm round. The architect consults by its own rules.

## Report

At the end of the run, or at the first stop, report in one message: the stages that ran and their result, the review rounds, the open ❌ and ⚠️ items, and where the run stands (the pull request URL in critical and autonomous runs, or the waiting point in an interactive run).
