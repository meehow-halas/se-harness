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
BLOCKED: seh install has not been run here — run seh install (npx se-harness install or npx github:meehow-halas/se-harness install), then /{{prefix}}setit-se
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

From **intent**. A launch may name `interactive`, `critical`, or `autonomous`. If the user asked, in any language, for the work to be done on its own without questions (for example "don't ask me", "autonomous"), use `autonomous`; never fall back to `interactive` then. Otherwise default `interactive`. Pass that mode to the Implementer.

Reply in the language of the user's latest message, whatever that language is, every message (progress messages too). If the launch names `Conversation language: <name>`, reply only in that language, every reply, including the final report and any end-of-turn summary the host shows. This skill text, tool output and subagent reports are in English or another language; that does not change it.

## Several keys

If the prompt has the line `Fan-out child: yes`, this session is a child: run the one key here and skip this section. Otherwise, two or more keys named, git and the `worktree` operation enabled (`agents.baseBranch` set), and `sessionSpawn` in `.seh/references/hosts.json` for this host is `start_session`: follow `.seh/references/session-fanout.md` with skill `doit`, one child session per key. The parent runs `.seh/scripts/start-task` per key before spawning, then the **Prompt check** in that file before each spawn (only the allowed lines; no shared folder, notes file, or extra instruction). Do not launch Implementer here. Two or more keys with git or `worktree` disabled, on any host: run them one after another in this session in dependency order from `.seh/scripts/fanout-plan` (`mode: sequential`, `.seh/references/session-fanout.md` section 2), never in the order given. Two or more keys, git and `worktree` enabled, and `sessionSpawn` is `manual`: print the `start-task` and `/{{prefix}}doit <KEY>` commands per key, with the user's mode words (for example "don't ask me"), and stop. One key: continue below.

## Resolve the tasks

Need an existing spec **and** prompt, each in its store. Spec, prompt, log and status each live in one store (never mirror): files if `agents.tracker` is absent or the task is unbound; for a bound task (`tracker:` in its local spec, or basename = key) the Jira / ADO item (`agents.tracker.kind`) for each action ON in `agents.tracker.write`, the repo files (status: spec frontmatter, `agents.statuses`) for each action OFF. Read with `jira get` / `ado get <basename>` for a bound task (the key only when no local spec holds it), else the files. A key that a local spec holds in `tracker:` means that task: use its basename for files, `start-task` and the agents. The skill writes nothing to the tracker itself; the agents write, and move local content of a bound task at their first step (see the agent file). A `status:` line still in a bound task's local spec while `status` is ON has not moved yet: it is the task's status (compare with `agents.statuses`) until an agent moves it. **Files in a worktree:** when `.git/seh-worktrees/<task>` exists, `start-task` has moved the uncommitted task files into that worktree. Read them there, not from the launch checkout (an empty `docs/prompt/` there is expected in that case).

**Local task branch.** A key with no spec (neither in a task worktree nor in the launch checkout), git enabled, and spec or status kept in repo files (files tracker, or `spec` or `status` OFF): the work may exist only on a local branch (`push` or `pr` off). Run `.seh/scripts/pr-state <task>` before treating the spec as missing. `state: open` or `merged` → `BLOCKED: <task> already has a pull request — <url>`. `local_branch: <name>` → with `worktree` on, run `.seh/scripts/start-task <task>` and, when it prints that `branch:`, read the task from its `worktree:`; otherwise (`worktree` off, or another branch) `BLOCKED: <task> has work on local branch <name> — check it out and rerun`. Neither → the spec is missing.

- User named one or more basenames or issue keys → those tasks, in that order.
- Otherwise pick the task they clearly mean. If several match and they did not list them, one question in `interactive`; otherwise:

```text
BLOCKED: task is ambiguous — name the feature basename, Jira key, or ADO work item id
```

For **each** named task independently:

If spec or prompt is missing:

```text
BLOCKED: spec and prompt are missing — run /{{prefix}}planit or /{{prefix}}runit
```

Read status where it lives. Compare to `agents.tracker.statuses` (bound task with `status` ON) or `agents.statuses` (otherwise). If status is already the configured `implemented`, `in review`, or `done` string:

```text
BLOCKED: task is already implemented, in review, or done — use /{{prefix}}checkit for review or update; do not re-implement
```

A basename/key in `depends` that does not pass the **`depends` gate** in the Implementer file is a stop **for that task** (Implementer also enforces this). Do not work around it. Continue the other named tasks.

A task whose spec has `ui: true`, while `agents.designer.enabled` is `true` in `harness.config.json`, and that has no **UX/UI decisions** section needs the Designer stage first. Stop **that task** (siblings continue):

```text
BLOCKED: <KEY> needs the Designer stage — run /{{prefix}}planit <KEY>
```

Do not launch the Designer from this skill.

## Explicit user request

A disabled tracker action (`agents.tracker.write`) or git operation (`agents.git`) is OFF **automatically** only: on the user's explicit request seh still does it. When the user asks for it in this session (or the launch has that line), pass `User write request: <the user's own words, verbatim>` to the Implementer, which adds `--user-request` to that one call (a requested worktree: the `start-task` call this session runs takes the flag). Never paraphrase or infer a request and never add one for the skill's own steps, in any mode.

## Launch Implementer

Follow the live Implementer file for this host (`<agentsDir>/implementer.md` from `.seh/references/hosts.json` — a copy from `/{{prefix}}setit-se`, not a symlink to `.seh/agents/`) **inline in this session**. Do not launch Implementer as a subagent: subagents cannot launch Consultant. Do not duplicate that procedure here. Launch Consultant from this session as a subagent after each phase; do not expose Consultant as a skill.

For each task that passed resolve:

**Git disabled** (`agents.baseBranch` empty or `null` in `harness.config.json`): no session fan-out, no `start-task`, no `Worktree:` line. Run multiple keys one after another in this session, in the launch checkout, in dependency order (*Several keys*).

**`worktree` disabled** (`agents.git` present and `agents.git.worktree` not `true`): handle it as git disabled — no fan-out, no `start-task`, no `Worktree:` line, several keys one after another in the launch checkout in dependency order.

1. Run `.seh/scripts/start-task <task>` from the launch checkout. Copy its `worktree:` path (git or `worktree` disabled: skip). Do not compose `git`. Then check the status where it lives (spec in that worktree, or `get`): it must be `in progress` after the Implementer's start step and `implemented` when the Implementer reports done (a `null` tracker map leaves it unchanged; that is not a stop). Otherwise stop that task: `BLOCKED: status <value> after implementation — the Implementer did not finish the status steps for <task>`.
2. Apply the Implementer procedure in this session with at least:
   - `Mode: <mode>`
   - Task key (basename or issue key)
   - `Worktree: <abs>`
   - The user request
   - `Conversation language: <name>` always: the language of the user's message in this session (a German message gives `German`). Never omit it.
   - If this is a Reviewer ❌ handoff the user asked to fix **in this invocation**: the ❌ items only (Consultant again only on phases those fixes belong to)

N>1 in this session (no fan-out): run the tasks one after another in dependency order, one worktree per task. Parallel runs come only from session fan-out (`.seh/references/session-fanout.md`), where each key gets its own session.

A `BLOCKED:` on one task stops that task; report it and continue with the next one.

When all phases have `continue`, status stays `in progress`. Do not start Reviewer.

## After Implementer finishes

Report each task key, its `worktree:` (git and `worktree` enabled only), and that status remains `in progress` (or that task’s `BLOCKED:`). Offer `/{{prefix}}checkit` (one Reviewer round, same list) or `/{{prefix}}runit` for a single leftover. Do **not** start review.
