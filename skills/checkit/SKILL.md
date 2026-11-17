---
name: checkit
description: One Reviewer round per named task (review or update from base). An accepted review ends with commit, PR and status done. Use when the user runs /{{prefix}}checkit.
---

# /{{prefix}}checkit

One Reviewer round per named task. Parse intent: **review** (default) or **update** from base. One variant for the whole invocation. Do not chain stages. Do not launch Architect. Do not merge the GitHub PR. An accepted review is the end of the feature: the Reviewer commits, opens the PR and sets `done`.

Prefer reporting ❌ and offering `/{{prefix}}doit`. Do not chain into Implementer unless this invocation is a review ❌ handoff the user **asked to fix here**. `/{{prefix}}runit` owns the fix-round loop.

Read `harness.config.json` at run time. Do not guess `agents.baseBranch`, status strings, tracker maps, `fetchFields`, content language, or the product line. Do not invent CLI commands.

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

If the live Reviewer file is missing from **this host’s** `agentsDir` in `.seh/references/hosts.json`:

```text
BLOCKED: live agents are missing — run /{{prefix}}setit-se
```

## Mode

From **intent**. A launch may name `interactive`, `critical`, or `autonomous`. If the user asked for the work to be done alone (`samodzielnie`, `sam`, `bez pytań`, `autonomicznie`, `autonomous`), use `autonomous`; never fall back to `interactive` then. Otherwise default `interactive`. Pass that mode to the Reviewer.

Reply in the language of the user's latest message, whatever that language is, every message (progress messages too), including the final report and any end-of-turn summary the host shows. If the launch names `Conversation language: <name>`, that name decides, even when this skill text, tool output or a subagent report is in another language. Never switch to another language. The launch passes `Conversation language:` to the Reviewer; if the user's message is in Polish, that is Polish.

## Variant

Parse the user message. Do not mix variants.

| Intent | Variant | When |
|--------|---------|------|
| review (default) | `review` | Anything that is not update |
| update from base | `update` | User asks to update, rebase is not used: merge base into the task branch via the script |

**Update** rules live in the Reviewer file (`update-from-base`). This skill names the variant; it does not compose `git` or `gh`.

## Several keys

If the prompt has the line `Fan-out child: yes`, this session is a child: run the one key here and skip this section. Otherwise, two or more keys named, git enabled (`agents.baseBranch` set), and `sessionSpawn` in `.seh/references/hosts.json` for this host is `start_session`: follow `.seh/references/session-fanout.md` with skill `checkit` and the same variant for every child, one child session per key. The parent runs `.seh/scripts/start-task` per key before spawning; do not launch Reviewer here. Two or more keys and `sessionSpawn` is `manual`: print the commands per key and stop. One key: continue below.

## Resolve the tasks

Need an existing spec + prompt on the **active tracker** (bodies on the issue / work item via `jira get` or `ado get` by `kind`). When `agents.tracker.readOnly` is `true`, bodies are repo files and status is spec frontmatter (`agents.statuses`); nothing writes the tracker. **Files tracker with a worktree:** when `.git/seh-worktrees/<task>` exists (its path is `$(git rev-parse --git-common-dir)/seh-worktrees/<task>`), `start-task` has moved the uncommitted spec, prompt, and log out of the launch checkout into that worktree. Read them there. An empty `docs/prompt/` in the launch checkout is not "missing" in that case; check the worktree first, and treat the launch checkout only when no worktree exists. User named one or more basenames or issue keys → those tasks. Otherwise the task they clearly mean. If several match and they did not list them, one question in `interactive`; otherwise:

```text
BLOCKED: task is ambiguous — name the feature basename, Jira key, or ADO work item id
```

If spec or prompt is missing for a named task, stop **that** task and continue the others:

```text
BLOCKED: spec and prompt are missing — run /{{prefix}}planit or /{{prefix}}runit
```

## Status gate (before Reviewer)

Read `status:` in the task's spec (worktree copy when a worktree exists, else the tracker). For `review`, the status must be the configured `implemented` or `in review` string. For `update`, it must be `in progress`, `implemented`, `in review`, or `done` (the PR may already be open). Any other value stops that task: `BLOCKED: status <value> does not allow <variant> — set the status the Implementer should have left, or run /{{prefix}}doit <task>`. Do not launch Reviewer on a task that fails this gate.

## Launch Reviewer

This skill is the parent. Follow the live Reviewer file for this host (`<agentsDir>/reviewer.md` from `.seh/references/hosts.json` — a copy from `/{{prefix}}setit-se`, not a symlink to `.seh/agents/`). Do not duplicate that procedure here.

For each resolved task:

**Git disabled** (`agents.baseBranch` empty or `null` in `harness.config.json`): no session fan-out, no `start-task`, no `Worktree:` line. Run multiple keys one after another in this session, in the launch checkout. Variant `update` needs git: stop with `BLOCKED: update needs git`.

1. Run `.seh/scripts/start-task <task>` from the launch checkout if a worktree is not already printed for it. Copy `worktree:`. Do not compose `git`.
2. Launch Reviewer with at least:
   - `Mode: <mode>`
   - `Variant: review` or `Variant: update` (same variant for every task)
   - Task key
   - `Worktree: <abs>`
   - The user request
   - `Conversation language: <name>` always: the language of the user's message in this session (a Polish message gives `Polish`). Never omit it, never leave it to the reviewer's guess.
   - `User acceptance: <the user's own words>` when the user has accepted this task's review (for example "Akceptuję"). Copy the words exactly; never paraphrase or infer acceptance. If the user did not accept, omit the line.

N>1: in parallel when the runtime allows; otherwise sequential worktrees. Interactive acceptance is **per task**; do not accept the whole list with one yes. A `Q<n>` or `BLOCKED:` on one task does not stop siblings.

One round per task in this invocation. Do not start a second Reviewer round for the same task here. Do not start Implementer after ❌ unless the user asked to fix those items in this same invocation; even then, prefer `/{{prefix}}doit` unless they were explicit. ⚠️ does not start a fix round.

Do not merge. After a clean accepted review, the Reviewer may open a PR; this skill reports each URL and stops.

## After Reviewer finishes

Report the variant, each task key, ✅/⚠️/❌, status, `worktree:` (git enabled only), and any script `OK` / `UNCHANGED` / `BLOCKED:` lines.

- Open ❌ → offer `/{{prefix}}doit` (those items only, same list) or `/{{prefix}}runit` for a single task. Do not start them unless the user already asked to fix in this invocation.
- Clean review accepted → the Reviewer committed, opened the PR and set `done` (git disabled: no commit or PR, only changelog and `done`). Report the PR URL when there is one. Nothing left for this skill; the user merges on GitHub, and that does not reopen the task.
- Update finished → report; do not review unless they also asked for review (they did not: this invocation was update only).
