# Tracker read-only mode — commissioning prompt

Use this file when asking an agent to implement **one phase** of the read-only plan.

## Read order

1. [docs/prd.md](../prd.md) — product invariants; wins until phase 1 updates it.
2. [docs/tracker-read-only-mode/spec.md](spec.md) — accepted decisions Q1–Q5.
3. [docs/tracker-read-only-mode/plan.md](plan.md) — phase index and shared rules.
4. The phase file named in your task, e.g. `docs/tracker-read-only-mode/02-scripts.md`.
5. That phase's `.prompt.md` sibling.

## Task line template

```text
Implement docs/tracker-read-only-mode phase <N> only.

Read the files in docs/tracker-read-only-mode/prompt.md (read order).
Do not implement other phases. Do not commit unless I ask.

When finished, report against the phase "Done when" checklist.
If all items and shared done rules hold, set phase <N> Status to done in docs/tracker-read-only-mode/plan.md.
```

## Choosing between options

1. Decisions Q1–Q5 in [spec.md](spec.md) are settled. Do not reopen them unless the user explicitly overrides in the commissioning message.
2. For a new choice not covered by the spec, default to the option marked **(Recommended)** in the phase file.
3. If you must deviate, state the deviation and why in the report.
4. When asking the user, one question at a time, recommended option first, labelled **(Recommended)**.

## Shared constraints

- No new `seh` CLI subcommands; no global install; no machine-wide paths.
- Token never in argv, stdout, chat, or git.
- `npm test` for script tests; no second runner. Tests follow `AGENTS.md` **Tests** (observable behaviour, vary the flag, stub only HTTP).
- `README.md` only in phase 6 (explicit user request for this initiative); never in phases 1–5.
- Same key and semantics for Jira and ADO; minimal diff, reuse the `artifactsOnTrackerOnly: false` code path where it already reads files.
