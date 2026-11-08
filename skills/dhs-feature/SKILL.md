---
name: dhs-feature
description: Full path Architect → Implementer (Consultant inside) → Reviewer. Use when the user runs /dhs-feature. Starts at the first missing stage.
---

# /dhs-feature

Full path. Single-stage skills do not chain; **this** skill runs the pipeline. Starts at the first missing stage. Does not merge the GitHub PR. There is no user-facing Consultant skill (Consultant stays inside Implementer).

Read `harness.config.json` at run time. Do not guess `agents.baseBranch`, status strings, tracker maps, `fetchFields`, content language, or the product line. Do not invent CLI commands.

Stops (not questions) are one line:

```text
BLOCKED: <what stopped> — <what the user or another skill must do>
```

Shape: `.dhs/references/BLOCKED.md`. If a `.dhs/scripts/` helper refuses, copy its `BLOCKED:` line, stop that path, and do not work around it with raw `git` or `gh`.

Do not pause between stages when there is no question and no stop. Report once at the end or at the first stop.

This skill does **not** start a brainstorm round by itself. If Architect (inside this skill) needs a round, stop and ask `/dhs-brainstorm`. Do not interview personae in-process.

## Guard

Before any work. Compare `.dhs/VERSION` and `dhs.generatedFrom` after trimming whitespace.

1. If `.dhs/` or `.dhs/VERSION` is missing:

```text
BLOCKED: dhs install has not been run here — run dhs install (npx dhs install or npx -p github:<owner>/<repo> dhs install), then /dhs-setup
```

2. If `harness.config.json` is missing:

```text
BLOCKED: setup is incomplete — run /dhs-setup
```

3. If `.dhs/VERSION` does not match `dhs.generatedFrom` in `harness.config.json`:

```text
BLOCKED: generated files do not match the installed templates — run /dhs-setup
```

If a live agent this stage needs is missing (typically `.claude/agents/architect.md`, `implementer.md`, `reviewer.md`):

```text
BLOCKED: live agents are missing — run /dhs-setup
```

## Mode

From **intent**. A launch may name the mode so **every** agent in this run shares it. Default: `interactive`. Pass the same `Mode:` to Architect, Implementer, and Reviewer.

| Mode | Ask the user |
|------|----------------|
| `interactive` | One question at a time, when it is reached. Stop this pipeline on that question. |
| `critical` | One question only for a **critical** decision, then stop. Otherwise agents decide, record, continue. Clean review = PR URL; do not merge. |
| `autonomous` | Ask nothing. Clean review = PR URL; do not merge. |

Reply in the conversation language.

## Resolve the task

Active tracker only: files if `agents.tracker` is absent; Jira if it is present. Never both. Never mirror.

- New work (a sentence, no key) → no spec yet.
- Named basename or issue key → load spec, prompt, log, status from that tracker.
- Status strings: `agents.statuses` (files) or mapped `agents.tracker.statuses` (Jira). Compare to those values; do not translate them.

If status is already the configured **`in review`** or **`done`** string, stop. Do not re-run Architect, Implementer, or Reviewer:

```text
BLOCKED: task is already in review or done — user merges the GitHub PR; close is /dhs-checkit after they confirm the merge
```

(`in review` wait: they may still run `/dhs-checkit` update or close. This skill does not.)

## Pipeline

Start at the first missing stage. Skip stages that are already done.

### 1. No spec or prompt → Architect

Follow the live Architect file (typically `.claude/agents/architect.md`). Do not duplicate it.

Pass `Mode:`, the request, conversation language when known.

If Architect asks `/dhs-brainstorm`: stop and ask that skill; do not run the round here; do not continue the pipeline.

If Architect stops on `BLOCKED:` or `Q<n>`, stop the pipeline and report.

On success, status stays `todo`. Continue to stage 2 without pausing.

### 2. Spec + prompt, no implementation → Implementer

No implementation means status is still the configured `todo` string (Architect does not advance past `todo`).

Follow the live Implementer file (typically `.claude/agents/implementer.md`). Consultant inside each phase; do not launch Consultant as a skill.

Pass the same `Mode:` and the task key. Implementer calls `.dhs/scripts/start-task`.

If Implementer stops on `BLOCKED:` or `Q<n>`, stop the pipeline and report.

On success, status stays `in progress`. Continue to stage 3 without pausing.

### 3. Implementation exists → Reviewer

Implementation exists when status is the configured `in progress` or `code review` string (or the log shows implementation and there is no open ❌ handled in stage 4).

Follow the live Reviewer file (typically `.claude/agents/reviewer.md`). One review round: `Variant: review`.

Pass the same `Mode:` and the task key. Do not merge.

If Reviewer stops on `BLOCKED:` or `Q<n>` (including interactive acceptance), stop the pipeline and report.

- No open ❌ → stage 5.
- Open ❌ → stage 4.
- ⚠️ only → do not start a fix round; continue to stage 5 if Acceptance allows, else report.

### 4. Open ❌ → Implementer (those items only), then Reviewer again

Max **three** Reviewer rounds total for this task (count Reviewer reports in the log plus this run). The same ❌ with no code change ends the loop: report and stop.

Launch Implementer with **only** the open ❌ items. Consultant runs again only on phases those fixes belong to (Implementer’s caps). Then Reviewer again (`Variant: review`).

Do not start a fourth Reviewer round.

### 5. Finish

- `interactive`: stop on agent questions (already handled). After a clean review, Reviewer waits for explicit acceptance, then git allowlist (commit, push, PR, return to base). Do not merge.
- `critical` / `autonomous`: a clean Reviewer run is acceptance. Report the PR URL. Do not merge.

The user merges on GitHub. Close is `/dhs-checkit` after they confirm, not this skill.

## Launch payload (every agent)

- `Mode: <same mode for the whole run>`
- Task key when it exists
- User request
- Conversation language when known
- Stage 4: the ❌ list only

Live files are copies from `/dhs-setup` (typically under `.claude/agents/`), not symlinks to `.dhs/agents/`.
