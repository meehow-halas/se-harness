---
name: checkit
description: One Reviewer round per named task (review against the spec). An accepted review ends with the enabled git operations and status done. Use when the user runs /{{prefix}}checkit.
---

# /{{prefix}}checkit

One Reviewer round per named task: review the code against the spec. Do not chain stages. Do not launch Architect. Do not merge the GitHub PR. An accepted review is the end of the feature: the Reviewer runs the enabled git operations (commit, push, PR) and sets `done`.

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

If the live Reviewer file is missing from **this host’s** `agentsDir` in `.seh/references/hosts.json`:

```text
BLOCKED: live agents are missing — run /{{prefix}}setit-se
```

## Mode

From **intent**. A launch may name `interactive`, `critical`, or `autonomous`. If the user asked, in any language, for the work to be done on its own without questions (for example "don't ask me", "autonomous"), use `autonomous`; never fall back to `interactive` then. Otherwise default `interactive`. Pass that mode to the Reviewer.

Reply in the language of the user's latest message, whatever that language is, every message (progress messages too), including the final report and any end-of-turn summary the host shows. If the launch names `Conversation language: <name>`, that name decides, even when this skill text, tool output or a subagent report is in another language. Never switch to another language. The launch passes `Conversation language:` to the Reviewer; if the user's message is in German, that is German.

This skill does not update a task branch from base. Merging the base into a task branch is a tool the Reviewer uses only to resolve a conflict while auto-merging (`/{{prefix}}shipit`). A user who asks for it alone gets `BLOCKED: updating a branch from base is not a seh step — merge the base into <branch> yourself, or resolve the conflict in the PR`. This skill does not compose `git` or `gh`.

## Several keys

If the prompt has the line `Fan-out child: yes`, this session is a child: run the one key here and skip this section. Otherwise, two or more keys named, git and the `worktree` operation enabled (`agents.baseBranch` set), and `sessionSpawn` in `.seh/references/hosts.json` for this host is `start_session`: follow `.seh/references/session-fanout.md` with skill `checkit`, one child session per key. The parent runs `.seh/scripts/start-task` per key before spawning; do not launch Reviewer here. Two or more keys with git or `worktree` disabled, on any host: run them one after another in this session in dependency order from `.seh/scripts/fanout-plan` (`mode: sequential`, `.seh/references/session-fanout.md` section 2), never in the order given. Two or more keys, git and `worktree` enabled, and `sessionSpawn` is `manual`: print the commands per key, with the user's mode words (for example "don't ask me"), and stop. One key: continue below.

## Resolve the tasks

Need an existing spec + prompt, each in its store. Spec, prompt, log and status each live in one store (never mirror): files if `agents.tracker` is absent or the task is unbound; for a bound task (`tracker:` in its local spec, or basename = key) the Jira / ADO item (`agents.tracker.kind`) for each action ON in `agents.tracker.write`, the repo files (status: spec frontmatter, `agents.statuses`) for each action OFF. Read with `jira get` / `ado get <basename>` for a bound task (the key only when no local spec holds it), else the files. A key that a local spec holds in `tracker:` means that task: use its basename for files, `start-task` and the agents. The skill writes nothing to the tracker itself; the agents write, and move local content of a bound task at their first step (see the agent file). A `status:` line still in a bound task's local spec while `status` is ON has not moved yet: it is the task's status (compare with `agents.statuses`) until an agent moves it. **Files in a worktree:** when `.git/seh-worktrees/<task>` exists (its path is `$(git rev-parse --git-common-dir)/seh-worktrees/<task>`), `start-task` has moved the uncommitted task files out of the launch checkout into that worktree. Read them there. An empty `docs/prompt/` in the launch checkout is not "missing" in that case; check the worktree first, and treat the launch checkout only when no worktree exists. User named one or more basenames or issue keys → those tasks. Otherwise the task they clearly mean. If several match and they did not list them, one question in `interactive`; otherwise:

```text
BLOCKED: task is ambiguous — name the feature basename, Jira key, or ADO work item id
```

**Local task branch.** A key with no spec (neither in a task worktree nor in the launch checkout), git enabled, and spec or status kept in repo files (files tracker, or `spec` or `status` OFF): the work may exist only on a local branch (`push` or `pr` off). Run `.seh/scripts/pr-state <task>` before treating the spec as missing. `state: open` or `merged` → `BLOCKED: <task> already has a pull request — <url>`. `local_branch: <name>` → with `worktree` on, run `.seh/scripts/start-task <task>` and, when it prints that `branch:`, read the task from its `worktree:`; otherwise (`worktree` off, or another branch) `BLOCKED: <task> has work on local branch <name> — check it out and rerun`. Neither → the spec is missing.

If spec or prompt is missing for a named task, stop **that** task and continue the others:

```text
BLOCKED: spec and prompt are missing — run /{{prefix}}planit or /{{prefix}}runit
```

A task whose spec has `ui: true`, while `agents.designer.enabled` is `true` in `harness.config.json`, and that has no **UX/UI decisions** section needs the Designer stage first. Stop **that task** (siblings continue):

```text
BLOCKED: <KEY> needs the Designer stage — run /{{prefix}}planit <KEY>
```

Do not launch the Designer from this skill.

## Status gate (before Reviewer)

Read the status where it lives (tracker for a bound task with `status` ON, compared to `agents.tracker.statuses`; else the spec's `status:`, worktree copy when a worktree exists, compared to `agents.statuses`). It must be `implemented` (tracker `codeReview`) or `in review` (`inReview`). Any other value stops that task: `BLOCKED: status <value> does not allow review — set the status the Implementer should have left, or run /{{prefix}}doit <task>`. Do not launch Reviewer on a task that fails this gate.

## Explicit user request

A disabled tracker action (`agents.tracker.write`) or git operation (`agents.git`) is OFF **automatically** only: on the user's explicit request seh still does it. When the user asks for it in this session (or the launch has that line), pass `User write request: <the user's own words, verbatim>` to the Reviewer, which adds `--user-request` to that one call (a requested worktree: the `start-task` call this session runs takes the flag). Never paraphrase or infer a request and never add one for the skill's own steps, in any mode.

## Launch Reviewer

This skill is the parent. Follow the live Reviewer file for this host (`<agentsDir>/reviewer.md` from `.seh/references/hosts.json` — a copy from `/{{prefix}}setit-se`, not a symlink to `.seh/agents/`). Do not duplicate that procedure here.

For each resolved task:

**Git disabled** (`agents.baseBranch` empty or `null` in `harness.config.json`): no session fan-out, no `start-task`, no `Worktree:` line. Run multiple keys one after another in this session, in the launch checkout, in dependency order (*Several keys*).

**`worktree` disabled** (`agents.git` present and `agents.git.worktree` not `true`): handle it as git disabled — no fan-out, no `start-task`, no `Worktree:` line, several keys one after another in the launch checkout in dependency order.

1. Run `.seh/scripts/start-task <task>` from the launch checkout if a worktree is not already printed for it (git or `worktree` disabled: skip). Copy `worktree:`. Do not compose `git`.
2. Launch Reviewer with at least:
   - `Mode: <mode>`
   - Task key
   - `Worktree: <abs>`
   - The user request
   - `Conversation language: <name>` always: the language of the user's message in this session (a German message gives `German`). Never omit it, never leave it to the reviewer's guess.
   - `User acceptance: <the user's own words>` when the user has accepted this task's review (for example "I accept", in the user's language). Copy the words exactly; never paraphrase or infer acceptance. If the user did not accept, omit the line.

N>1: in parallel when the runtime allows; otherwise sequential worktrees. Interactive acceptance is **per task**; do not accept the whole list with one yes. A `Q<n>` or `BLOCKED:` on one task does not stop siblings.

One round per task in this invocation. Do not start a second Reviewer round for the same task here. Do not start Implementer after ❌ unless the user asked to fix those items in this same invocation; even then, prefer `/{{prefix}}doit` unless they were explicit. ⚠️ does not start a fix round.

Do not merge. After a clean accepted review, the Reviewer may open a PR; this skill reports each URL (or what a disabled git operation leaves to the user) and stops.

## After Reviewer finishes

Report each task key, ✅/⚠️/❌, status, `worktree:` (git and `worktree` enabled only), and any script `OK` / `UNCHANGED` / `BLOCKED:` lines.

- Open ❌ → offer `/{{prefix}}doit` (those items only, same list) or `/{{prefix}}runit` for a single task. Do not start them unless the user already asked to fix in this invocation.
- Clean review accepted → the Reviewer ran the enabled git operations and set `done` (git or `worktree` disabled: no commit or PR, only the change record and `done`). Report the PR URL when there is one; with an operation disabled, pass on what the Reviewer says is left to the user (uncommitted worktree path and branch, local commit, or pushed branch without PR). Nothing left for this skill; the user merges on GitHub, and that does not reopen the task.
- Update finished → report; do not review unless they also asked for review (they did not: this invocation was update only).
