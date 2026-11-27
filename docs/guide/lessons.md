# Project lessons

[← README](../../README.md) · Contracts in full: [`docs/prd.md`](../prd.md)

`/_learnthelesson` turns what a conversation taught into **project lessons**, so agents do not repeat the same mistakes in this project. On Codex it is `$_learnthelesson`. Like the other work skills, it needs a finished [`/_setit-se`](setup.md#_setit-se).

## What a lesson is

A lesson is a rule that would have prevented a mistake: one line, observable (checkable in a diff or a command), with one line saying why. It names the cause, not the symptom. "Be careful with dates" is not a lesson. When the cause is unclear, the skill asks one question instead of guessing.

Not a lesson:

- a one-off decision of a single pull request;
- something already covered by an existing lesson or rule (the skill says where, and may propose sharper wording if it was broken anyway).

"Not a lesson" is a normal outcome: the skill says so in one line and writes nothing for that item.

## When it triggers

On **intent**, in any language, not on a command. For example:

- you correct the agent ("we don't do it that way here");
- review comments have been fixed;
- a merge conflict or CI failure with a clear cause has been resolved;
- the same mistake repeats in a session;
- you say "remember this".

This is the one work skill the assistant may start on its own. On its own initiative it **only proposes**: it finishes the work in hand, then offers the lesson in one line at the end of its reply. No table and no writes until you want it, and the same lesson is offered once. You can also ask for it directly:

```text
"remember this: tests never sleep to wait for async work" · "turn the review fixes into lessons"
```

## Where a lesson goes

It is stored where it works best for its purpose:

| Purpose | Stored in |
|---------|-----------|
| Code (language, framework, tests) | Path-scoped lesson in the framework group |
| Domain or module knowledge | **In this project** section of the lesson for that area (group `domain-<area>`) |
| Project convention (naming, characters, commit language), agent behaviour, commands | Group `general`, always loaded |
| One agent role only | `agents.roles.<role>.rules` (reviewer: `checklist`) in `harness.config.json` |
| UX | `docs/designs/ux-conventions.md` |
| One-off decision of a single pull request | Not a lesson: nothing is written |

## Files

`docs/lessons/` is the source of truth:

```text
docs/lessons/
  LESSONS.md                 index
  csharp/async-tests.md      one topic per file
  domain-billing/invoices.md
  general/commit-language.md
```

- **Groups** are named like the [rule packs](setup.md#rule-packs) (`csharp`, `angular`, `typescript`, …), plus `general` and `domain-<area>`. Test lessons live in the framework group. Group and topic names are lowercase words joined by `-`.
- **`LESSONS.md`** has one line per lesson (group, topic, one-line rule, link), grouped by group and sorted by topic. The `AGENTS.md` template only links to it and tells agents to offer the skill after a correction or review fixes; no lesson content goes into `AGENTS.md`.
- A **lesson file** has frontmatter (`group`, `topic`, optional `paths` list, never in `general`) and these sections:

| Section | Content |
|---------|---------|
| `## Rule` | Project-agnostic: no project paths, module names or ticket keys |
| `## Why` | The failure the rule prevents |
| `## In this project` | Optional: paths, legacy exceptions, examples |
| `## Evidence` | `path:line`, a review comment link, or your words |

Lessons, the index and every rule line are written in English. The skill talks to you in your language.

`general` lessons are loaded in every session, so the group stays small (about 30 rule lines). Over that, the skill proposes merging, moving or removing something; it removes nothing on its own.

## Acceptance

Before writing, the skill checks existing lessons, the generated `seh-*` pack rules, role rules and UX conventions:

- a related topic is extended instead of adding a new one;
- a contradiction with a lesson or role rule is shown, and you choose which one stands;
- a lesson against a pack rule is written as a **deviation** that names the pack rule and the reason (UX pack: under **Deviations from ux-a11y** in `docs/designs/ux-conventions.md`, in effect only at `status: ready`). Pack rule files are never edited.

Then it shows one table: rule, why, evidence, target file, and **yes / change / reject** per row, and names the other files that get written. Only accepted rows are written. The skill does not commit.

## Rendering

After writing, the skill runs `.seh/scripts/lessons-render`. It copies every lesson into each host's rules directory as `lesson-<group>-<topic>` (see [where each host loads lessons](hosts.md#lessons)), removes `lesson-*` files whose source is gone, and answers `OK`, `UNCHANGED` or `BLOCKED:`. On `BLOCKED:` it changes nothing.

Do not edit `lesson-*` files: change the source under `docs/lessons/` and run the script again.

Regenerating rule packs keeps your lessons: `/_setit-se` replaces only `seh-*` files, never `lesson-*` ones, and runs the script after it writes the packs.

## List, change, remove

| Ask for | What happens |
|---------|--------------|
| List lessons | Grouped list; points out an index line without a file, or the reverse |
| Change or merge lessons | Before and after, written after your OK, then rendered |
| Remove a lesson | Shows what goes; after your OK deletes the file and its index line, then renders |

## Turning lessons off

Lessons are on by default. To turn them off, ask a later `/_setit-se` ("turn lessons off"). It sets `agents.lessons.enabled` to `false`; the first setup run neither asks about it nor writes it, and nothing is regenerated.

While off: no proactive offers, and recording or changing a lesson stops with `BLOCKED: lessons are disabled — enable them in /_setit-se`. Existing lessons stay loaded. Listing and removing still work.

## Example: a review fix becomes two lessons

A review left two comments on a pull request: a test waited for background work with a fixed sleep, and the commit messages were in the wrong language. Both are fixed. The agent ends its reply with one line offering to record them with `/_learnthelesson`. You accept, and it shows:

| # | Rule | Why | Evidence | Target file | yes / change / reject |
|---|------|-----|----------|-------------|-----------------------|
| 1 | Tests await the work they start; no fixed-time sleeps. | A sleep makes the test slow and flaky. | `tests/OrderTests.cs:42`, review comment | `docs/lessons/csharp/async-tests.md` | |
| 2 | Write commit messages in English. | History is read by everyone on the project. | review comment | `docs/lessons/general/commit-language.md` | |

After "yes" to both, the first file reads:

```markdown
---
group: csharp
topic: async-tests
paths:
  - "tests/**/*.cs"
---

# Async tests

## Rule

- Tests await the work they start; no fixed-time sleeps.

## Why

- A sleep makes the test slow and flaky.

## In this project

- Background jobs are awaited through the test host helper — `tests/TestHost.cs:18`

## Evidence

- `tests/OrderTests.cs:42` — review comment: the test failed on a slow machine
```

The index gets two lines:

```markdown
# Lessons

## csharp

- [csharp/async-tests](csharp/async-tests.md): Tests await the work they start; no fixed-time sleeps.

## general

- [general/commit-language](general/commit-language.md): Write commit messages in English.
```

The script then renders `lesson-csharp-async-tests` (loaded for `tests/**/*.cs`, where the host scopes rules by path) and `lesson-general-commit-language` (always loaded) for every host. You review the diff and commit.
