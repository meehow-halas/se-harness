---
name: dhs-checkit
description: One Reviewer round (review, update from base, or close after merge). Use when the user runs /dhs-checkit.
---

# /dhs-checkit

One Reviewer round. Parse intent: **review** (default), **update** from base, or **close** after the user confirms merge. Do not chain stages. Do not launch Architect. Do not merge the GitHub PR.

Prefer reporting ❌ and offering `/dhs-doit`. Do not chain into Implementer unless this invocation is a review ❌ handoff the user **asked to fix here**. `/dhs-feature` owns the fix-round loop.

Read `harness.config.json` at run time. Do not guess `agents.baseBranch`, status strings, tracker maps, `fetchFields`, content language, or the product line. Do not invent CLI commands.

Stops (not questions) are one line:

```text
BLOCKED: <what stopped> — <what the user or another skill must do>
```

Shape: `.dhs/references/BLOCKED.md`. If a `.dhs/scripts/` helper refuses, copy its `BLOCKED:` line, stop that path, and do not work around it with raw `git` or `gh`.

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

If the live Reviewer file is missing (typically `.claude/agents/reviewer.md`):

```text
BLOCKED: live agents are missing — run /dhs-setup
```

## Mode

From **intent**. A launch may name `interactive`, `critical`, or `autonomous`. Default: `interactive`. Pass that mode to the Reviewer.

Reply in the conversation language.

## Variant

Parse the user message. Do not mix variants.

| Intent | Variant | When |
|--------|---------|------|
| review (default) | `review` | Anything that is not update or close |
| update from base | `update` | User asks to update, rebase is not used: merge base into the task branch via the script |
| close after merge | `close` | User says the PR is merged **and** confirms that |

**Close** without a confirmed merge:

```text
BLOCKED: merge not confirmed — confirm the GitHub PR is merged, then /dhs-checkit close
```

**Update** and **close** rules live in the Reviewer file (`update-from-base`, verify merge, `done`, `return-to-base`). This skill names the variant; it does not compose `git` or `gh`.

## Resolve the task

Need an existing spec + prompt on the **active tracker**. User named a basename or issue key → that task. Otherwise the task they clearly mean. If several match, one question in `interactive`; otherwise:

```text
BLOCKED: task is ambiguous — name the feature basename or Jira key
```

If spec or prompt is missing:

```text
BLOCKED: spec and prompt are missing — run /dhs-planit or /dhs-feature
```

## Launch Reviewer once

Follow the live Reviewer file (typically `.claude/agents/reviewer.md` — a copy from `/dhs-setup`, not a symlink to `.dhs/agents/`). Do not duplicate that procedure here.

Pass at least:

- `Mode: <mode>`
- `Variant: review` or `Variant: update` or `Variant: close`
- Task key
- The user request
- Conversation language when you know it

One round only. Do not start a second Reviewer round in this invocation. Do not start Implementer after ❌ unless the user asked to fix those items in this same invocation; even then, prefer `/dhs-doit` unless they were explicit. ⚠️ does not start a fix round.

Do not merge. After a clean accepted review, the Reviewer may open a PR; this skill reports the URL and stops.

If the Reviewer stops with `BLOCKED:` or a question (`Q<n>`), including waiting for interactive acceptance, report that and stop.

## After Reviewer finishes

Report the variant, task key, ✅/⚠️/❌, status, and any script `OK` / `UNCHANGED` / `BLOCKED:` lines.

- Open ❌ → offer `/dhs-doit` (those items only) or `/dhs-feature`. Do not start them unless the user already asked to fix in this invocation.
- Clean review waiting for merge → the user merges on GitHub; close is a later `/dhs-checkit` after they confirm.
- Update finished → report; do not review unless they also asked for review (they did not: this invocation was update only).
- Close finished → report `done`.
