---
name: dhs-doit
description: Run the Implementer (Consultant loop inside) for an existing spec. Use when the user runs /dhs-doit. Same skill for features and bugs.
---

# /dhs-doit

Implementation only. Launch the Implementer for an existing spec + prompt. Same skill for `type: feature` and `type: bug`. The Implementer launches Consultant after each phase. Do not spec. Do not launch Architect or Reviewer. There is no user-facing Consultant skill.

Read `harness.config.json` at run time. Do not guess `agents.baseBranch`, status strings, tracker maps, `fetchFields`, content language, or the product line. Do not invent CLI commands. Do not merge a PR. Do not edit `CHANGELOG.md`.

Stops (not questions) are one line:

```text
BLOCKED: <what stopped> — <what the user or another skill must do>
```

Shape: `.dhs/references/BLOCKED.md`. If a `.dhs/scripts/` helper refuses, copy its `BLOCKED:` line, stop that path, and do not work around it with raw `git` or `gh`.

## Guard

Before any work. Compare `.dhs/VERSION` and `dhs.generatedFrom` after trimming whitespace.

1. If `.dhs/` or `.dhs/VERSION` is missing:

```text
BLOCKED: dhs install has not been run here — run dhs install (npx -p dev-harness-layer dhs install or npx -p github:nbmh/dev-harness-layer dhs install), then /dhs-setup
```

2. If `harness.config.json` is missing:

```text
BLOCKED: setup is incomplete — run /dhs-setup
```

3. If `.dhs/VERSION` does not match `dhs.generatedFrom` in `harness.config.json`:

```text
BLOCKED: generated files do not match the installed templates — run /dhs-setup
```

If the live Implementer file is missing from **this host’s** `agentsDir` in `.dhs/references/hosts.json`:

```text
BLOCKED: live agents are missing — run /dhs-setup
```

## Mode

From **intent**. A launch may name `interactive`, `critical`, or `autonomous`. Default: `interactive`. Pass that mode to the Implementer.

Reply in the conversation language.

## Resolve the task

Need an existing spec **and** prompt on the **active tracker** (files if `agents.tracker` is absent; Jira if it is present). Never look at the other tracker. Never mirror.

- User named a basename or issue key → that task.
- Otherwise pick the task they clearly mean. If several match, one question in `interactive`; otherwise:

```text
BLOCKED: task is ambiguous — name the feature basename or Jira key
```

If spec or prompt is missing:

```text
BLOCKED: spec and prompt are missing — run /dhs-planit or /dhs-feature
```

Read status from the active tracker. Compare to `agents.statuses` (files) or mapped `agents.tracker.statuses` (Jira). If status is already the configured `in review` or `done` string:

```text
BLOCKED: task is already in review or done — use /dhs-checkit for update or close; do not re-implement
```

A basename/key in `depends` that is not at the configured `done` status is a stop (Implementer also enforces this). Do not work around it.

## Launch Implementer

Follow the live Implementer file for this host (`<agentsDir>/implementer.md` from `.dhs/references/hosts.json` — a copy from `/dhs-setup`, not a symlink to `.dhs/agents/`). Do not duplicate that procedure here. Consultant stays inside Implementer: do not expose Consultant as a skill.

Pass at least:

- `Mode: <mode>`
- Task key (basename or issue key)
- The user request
- Conversation language when you know it
- If this is a Reviewer ❌ handoff the user asked to fix **in this invocation**: the ❌ items only (Consultant again only on phases those fixes belong to)

The Implementer calls `.dhs/scripts/start-task`. This skill does not compose `git`. When all phases have `continue`, status stays `in progress`. Do not start Reviewer.

If the Implementer stops with `BLOCKED:` or a question (`Q<n>`), report that and stop.

## After Implementer finishes

Report the task key and that status remains `in progress`. Offer `/dhs-checkit` (one Reviewer round) or `/dhs-feature`. Do **not** start review.
