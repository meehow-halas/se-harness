---
name: designit
description: Run the Designer once to design UX/UI before the spec and write a design file, or (on "learn conventions") to write the project's UX conventions file. Use when the user runs /{{prefix}}designit. Offers /{{prefix}}planit with the design file; does not start it.
---

# /{{prefix}}designit

UX/UI design only, before the spec. Launch the Designer once. It writes one design file, `docs/designs/<slug>.design.md`, in the repo. Do not touch the tracker, write a spec, prompt, or log, or use git. Do not launch Architect, Implementer, Consultant, or Reviewer. When it finishes, offer `/{{prefix}}planit` with the file; do not start it. Exception: the conventions mode (see **Learn conventions**) writes `docs/designs/ux-conventions.md` and offers nothing.

Read `harness.config.json` at run time. Do not guess `agents.designer.enabled`, content language, or the product line. Do not invent CLI commands.

Stops (not questions) are one line:

```text
BLOCKED: <what stopped> — <what the user or another skill must do>
```

Shape: `.seh/references/BLOCKED.md`.

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

4. If `agents.designer.enabled` is not `true`:

```text
BLOCKED: the Designer is disabled — enable it in /{{prefix}}setit-se
```

If the live Designer file is missing from **this host’s** `agentsDir` in `.seh/references/hosts.json`:

```text
BLOCKED: live agents are missing — run /{{prefix}}setit-se
```

## Mode

From **intent**, not a required slash flag. A launch may name `interactive`, `critical`, or `autonomous`. If the user asked, in any language, for the work to be done on its own without questions (for example "don't ask me", "autonomous"), use `autonomous`; never fall back to `interactive` then. Otherwise default `interactive`. Pass that mode to the Designer. Definitions: PRD Modes (also in the Designer file).

Reply in the language of the user’s latest message, whatever that language is, every message (progress messages too), including the final report and any end-of-turn summary the host shows. If the launch names `Conversation language: <name>`, that name decides. Never switch to another language. The design file is written in `agents.contentLanguage` (the Designer’s job).

## Learn conventions

If the user asks to learn the project's UX conventions (in any language, for example "learn conventions"; the file is `ux-conventions`), this is the conventions mode, not a design. Launch the Designer once with `Conventions file: docs/designs/ux-conventions.md` instead of `Design file:`, plus `Mode`, `Conversation language`, and `User approval:` as below. Iterating on an existing file is allowed. No slug, no sentence-to-design. Report the path, `status`, the number of rules, and the deviations from `ux-a11y` (written / proposed); state that no tracker was touched. Do **not** offer `/{{prefix}}planit` or `/{{prefix}}runit` in this mode. Skip **Resolve the input** and the design-file steps below.

## Resolve the input

One call is one design file. The user gives either:

- a sentence (new design): choose a short kebab-case `<slug>` from it; if `docs/designs/<slug>.design.md` already exists, ask for another slug (or, in `autonomous`, append `-2`, `-3`, …); or
- an existing design file (path or slug): iterate on it. Read it first; a missing file is `BLOCKED: design file <path> not found — give an existing path or a sentence`.

Several requests in one call: design the first, tell the user to run the skill again for the rest. No fan-out, no brainstorm round, no `ux-a11y` pack. Do not write the file yourself.

## Launch Designer once

Follow the live Designer file for this host (`<agentsDir>/designer.md`). Do not duplicate it. Pass at least:

- `Design file: docs/designs/<slug>.design.md`
- `Mode: <mode>`
- The user request (a sentence, or the existing file to iterate on)
- `Conversation language: <name>` always: the language of the user’s message in this session. Never omit it.
- When the user approved the file the Designer showed in this session, `User approval: <the user's own words, verbatim>`. Never paraphrase or infer approval.

The Designer works in the launch checkout, with no git and no worktree. If it stops with a `BLOCKED:` line or a question (`Q<n>`), report that and stop.

## After the Designer finishes

Report the path, the `status` (`draft` or `ready`), the number of `D<n>` decisions and `UX:` criteria, and any open questions. State that no tracker was read or written.

Offer the next step. Do **not** start it:

- `/{{prefix}}planit "<request>" docs/designs/<slug>.design.md` — spec on the active tracker, with the UX taken from this file
- `/{{prefix}}runit "<request>" docs/designs/<slug>.design.md` — full path

Do not call tracker scripts or git scripts.
