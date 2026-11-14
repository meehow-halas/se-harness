# Codex support — commissioning prompt

Use this file when asking an agent to implement **one stage** of the Codex plan.

## Read order

1. [docs/prd.md](../prd.md) — product invariants; wins until stage 1 updates it.
2. [docs/codex-support/plan.md](plan.md) — findings, decisions, host row, stage index.
3. The stage file named in your task, e.g. `docs/codex-support/02-host-row-cli.md`.
4. That stage's `.prompt.md` sibling.

## Task line

```text
Zrealizuj pojedynczy etap. Prompt: docs/codex-support/<NN-name>.prompt.md
```

Each `.prompt.md` is self-contained: read order, preflight, work, verification, finish.

## Choosing between options

1. Decisions 1–8 in [plan.md](plan.md) are settled. Do not reopen them unless the user overrides in the commissioning message.
2. For a new choice, ask one question at a time, recommended option first, labelled **(Recommended)**.
3. If you must deviate, state the deviation and why in the report.

## Shared constraints

- Host-table model: new row fields and format adapters, no `if (id === "codex")` scattered through skills, no second template tree.
- No new `seh` CLI subcommands; no `npm install -g`; never write to `~/.codex/` or any machine-wide path.
- Codex field names, hook matcher, and model IDs come from doc summaries: re-read the primary Codex docs before coding an adapter, and say what you could not confirm.
- Tests follow `AGENTS.md` **Tests**: observable behaviour, vary every input, stub only external boundaries. Run the narrowest test, then `npm test` at stage end.
- Do not weaken or delete tests to pass.
- Versioning: one minor bump for the whole change set, done in stage 5. Earlier stages touching shipped directories add their line to the same `CHANGELOG.md` entry only in stage 5; do not bump earlier.
- `README.md` only in stage 5, last, Codex additions only.
- Do not commit unless the user asks.
