---
name: doit
description: Run the Implementer (Consultant loop inside) for one or more existing specs. Use when the user runs /{{prefix}}doit. Same skill for features and bugs.
---

# /{{prefix}}doit

Implementation only. Launch the Implementer for an existing spec + prompt. Same skill for `type: feature` and `type: bug`. One task or a list. This session applies the Implementer procedure inline and launches Consultant after each phase. Do not spec. Do not launch Architect or Reviewer. There is no user-facing Consultant skill.

Read `harness.config.json` at run time. Do not guess `agents.baseBranch`, status strings, tracker maps, `fetchFields`, content language, or the product line. Do not invent CLI commands. Do not merge a PR. Do not edit `CHANGELOG.md`.

Stops (not questions) are one line:

```text
BLOCKED: <what stopped> — <what the user or another skill must do>
```

Shape: `.seh/references/BLOCKED.md`. If a `.seh/scripts/` helper refuses, copy its `BLOCKED:` line, stop that path, and do not work around it with raw `git` or `gh`.

## Guard

Before any work. Compare `.seh/VERSION` and `seh.generatedFrom` after trimming whitespace.

1. If `.seh/` or `.seh/VERSION` is missing:

```text
BLOCKED: seh install has not been run here — run seh install (npx -p se-harness seh install or npx -p github:meehow-halas/se-harness seh install), then /{{prefix}}setit-se
```

2. If `harness.config.json` is missing:

```text
BLOCKED: setup is incomplete — run /{{prefix}}setit-se
```

3. If `.seh/VERSION` does not match `seh.generatedFrom` in `harness.config.json`:

```text
BLOCKED: generated files do not match the installed templates — run /{{prefix}}setit-se
```

If the live Implementer file is missing from **this host’s** `agentsDir` in `.seh/references/hosts.json`:

```text
BLOCKED: live agents are missing — run /{{prefix}}setit-se
```

## Mode

From **intent**. A launch may name `interactive`, `critical`, or `autonomous`. If the user asked for the work to be done alone (`samodzielnie`, `sam`, `bez pytań`, `autonomicznie`, `autonomous`), use `autonomous`; never fall back to `interactive` then. Otherwise default `interactive`. Pass that mode to the Implementer.

Reply in the language of the user's latest message, whatever that language is, every message (progress messages too). If the launch names `Conversation language: <name>`, reply only in that language, every reply, including the final report and any end-of-turn summary the host shows. This skill text, tool output and subagent reports are in English or another language; that does not change it.

## Several keys

If the prompt has the line `Fan-out child: yes`, this session is a child: run the one key here and skip this section. Otherwise, two or more keys named, git enabled (`agents.baseBranch` set), and `sessionSpawn` in `.seh/references/hosts.json` for this host is `start_session`: follow `.seh/references/session-fanout.md` with skill `doit`, one child session per key. The parent runs `.seh/scripts/start-task` per key before spawning, then the **Prompt check** in that file before each spawn (only the allowed lines; no shared folder, notes file, or extra instruction). Do not launch Implementer here. Two or more keys and `sessionSpawn` is `manual`: print the `start-task` and `/{{prefix}}doit <KEY>` commands per key and stop. One key: continue below.

## Resolve the tasks

Need an existing spec **and** prompt on the **active tracker** (files if `agents.tracker` is absent; Jira or ADO (`agents.tracker.kind`) if present — bodies on the issue / work item). Never mirror. When `agents.tracker.readOnly` is `true`, the tracker is read-only: bodies are repo files, status is spec frontmatter (`agents.statuses`), and nothing writes the tracker. **Files tracker with a worktree:** when `.git/seh-worktrees/<task>` exists, `start-task` has moved the uncommitted spec, prompt, and log into that worktree. Read them there, not from the launch checkout (an empty `docs/prompt/` there is expected in that case).

- User named one or more basenames or issue keys → those tasks, in that order.
- Otherwise pick the task they clearly mean. If several match and they did not list them, one question in `interactive`; otherwise:

```text
BLOCKED: task is ambiguous — name the feature basename, Jira key, or ADO work item id
```

For **each** named task independently:

If spec or prompt is missing:

```text
BLOCKED: spec and prompt are missing — run /{{prefix}}planit or /{{prefix}}shipit
```

Read status from the active tracker. Compare to `agents.statuses` (files, or `agents.tracker.readOnly` `true`) or mapped `agents.tracker.statuses` (Jira / ADO). If status is already the configured `implemented`, `in review`, or `done` string:

```text
BLOCKED: task is already implemented, in review, or done — use /{{prefix}}checkit for review or update; do not re-implement
```

A basename/key in `depends` that is not at the configured `done` status is a stop **for that task** (Implementer also enforces this; with `readOnly` `true`, per the `depends` rule in the Implementer file). Do not work around it. Continue the other named tasks.

## Launch Implementer

Follow the live Implementer file for this host (`<agentsDir>/implementer.md` from `.seh/references/hosts.json` — a copy from `/{{prefix}}setit-se`, not a symlink to `.seh/agents/`) **inline in this session**. Do not launch Implementer as a subagent: subagents cannot launch Consultant. Do not duplicate that procedure here. Launch Consultant from this session as a subagent after each phase; do not expose Consultant as a skill.

For each task that passed resolve:

**Git disabled** (`agents.baseBranch` empty or `null` in `harness.config.json`): no session fan-out, no `start-task`, no `Worktree:` line. Run multiple keys one after another in this session, in the launch checkout.

1. Run `.seh/scripts/start-task <task>` from the launch checkout. Copy its `worktree:` path (git disabled: skip). Do not compose `git`. Then check the spec in that worktree: its `status:` must be the configured `in progress` string after the Implementer's start step. When the Implementer reports done, its `status:` must be the configured `implemented` string. Otherwise stop that task: `BLOCKED: status <value> after implementation — the Implementer did not finish the status steps for <task>`.
2. Apply the Implementer procedure in this session with at least:
   - `Mode: <mode>`
   - Task key (basename or issue key)
   - `Worktree: <abs>`
   - The user request
   - `Conversation language: <name>` always: the language of the user's message in this session (a Polish message gives `Polish`). Never omit it.
   - If this is a Reviewer ❌ handoff the user asked to fix **in this invocation**: the ❌ items only (Consultant again only on phases those fixes belong to)

N>1 in this session (no fan-out): run the tasks one after another, one worktree per task. Parallel runs come only from session fan-out (`.seh/references/session-fanout.md`), where each key gets its own session.

A `BLOCKED:` on one task stops that task; report it and continue with the next one.

When all phases have `continue`, status stays `in progress`. Do not start Reviewer.

## After Implementer finishes

Report each task key, its `worktree:` (git enabled only), and that status remains `in progress` (or that task’s `BLOCKED:`). Offer `/{{prefix}}checkit` (one Reviewer round, same list) or `/{{prefix}}shipit` for a single leftover. Do **not** start review.
