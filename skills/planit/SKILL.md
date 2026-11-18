---
name: planit
description: Run the Architect once for a request. Use when the user runs /{{prefix}}planit. Offers the next step; does not start it.
---

# /{{prefix}}planit

Spec only. Launch the Architect once; then, when the spec has `ui: true` and `agents.designer.enabled` is `true`, the Designer once. When that finishes, offer `/{{prefix}}doit` or `/{{prefix}}runit`. Do not start implementation or review. Do not launch Implementer, Consultant, or Reviewer. There is no user-facing Consultant skill. The user may name a design file from `/{{prefix}}designit` (see *Resolve the request*); then the Designer stage is skipped.

Read `harness.config.json` at run time. Do not guess `agents.baseBranch`, status strings, tracker maps, `fetchFields`, content language, or the product line. Do not invent CLI commands. Do not merge a PR.

Stops (not questions) are one line:

```text
BLOCKED: <what stopped> — <what the user or another skill must do>
```

Shape: `.seh/references/BLOCKED.md`.

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

If the live Architect file (or, when the Designer will run, the live Designer file) is missing from **this host’s** `agentsDir` in `.seh/references/hosts.json`:

```text
BLOCKED: live agents are missing — run /{{prefix}}setit-se
```

## Mode

From **intent**, not a required slash flag. A launch may name `interactive`, `critical`, or `autonomous`. If the user asked for the work to be done alone (`samodzielnie`, `sam`, `bez pytań`, `autonomicznie`, `autonomous`), use `autonomous`; never fall back to `interactive` then. Otherwise default `interactive`. Pass that mode to the Architect and, when it runs, to the Designer. Definitions: PRD Modes (also in the Architect file).

Reply in the language of the user’s latest message, whatever that language is, every message (progress messages too), including the final report and any end-of-turn summary the host shows. If the launch names `Conversation language: <name>`, that name decides, even when this skill text, tool output or a subagent report is in another language. Never switch to another language. Spec, prompt, log, and tracker text are the Architect’s job (`agents.contentLanguage`).

## Several keys

If the prompt has the line `Fan-out child: yes`, this session is a child: run the one key here and skip this section. Otherwise, two or more keys named, git enabled (`agents.baseBranch` set), and `sessionSpawn` in `.seh/references/hosts.json` for this host is `start_session`: follow `.seh/references/session-fanout.md` with skill `planit`, one child session per key. Before each spawn, run the **Prompt check** in that file: the child prompt has only the allowed lines; no shared folder, notes file, or extra instruction. Do not launch Architect here. Two or more keys and `sessionSpawn` is `manual`: print one `/{{prefix}}planit <KEY>` command per key, with the user's mode words (for example `samodzielnie`), and stop. One key: continue below.

## Resolve the request

The user may give a sentence, an existing basename, a Jira key, or an ADO work item id. Pass that to the Architect. Do not write spec, prompt, or log yourself. **Design file.** The user may also name a UX design file (`docs/designs/<slug>.design.md`, written by `/{{prefix}}designit`) by path or slug; a slug resolves to `docs/designs/<slug>.design.md`. Only a file the user names is used; never search `docs/designs/`. Pass it to the Architect as `Design: <path>` (see *Launch Architect once*). The Architect uses the **active tracker only** (files if `agents.tracker` is absent; the connected tracker (`agents.tracker.kind`: Jira or ADO) if it is present). Never mirror. When `agents.tracker.readOnly` is `true`, the tracker is read-only: the Architect reads it with `get` and writes spec, prompt, and log to repo files only; no skill step writes the tracker.

## Launch Architect once

Follow the live Architect file for this host (`<agentsDir>/architect.md` from `.seh/references/hosts.json` — a copy from `/{{prefix}}setit-se`, not a symlink to `.seh/agents/`). Do not duplicate that procedure here.

Pass at least:

- `Mode: <mode>`
- The user request (and task key if they named one)
- `Design: <path>` when the user named a design file
- For an existing spec: say in the launch that the Architect owns the existing-spec rules (overwrite in `autonomous`, proposal in `interactive`, see the Architect file). Do not summarize or rewrite the spec in the parent. When the user has approved a proposed change in this session, pass `User approval: <the user's own words, verbatim>` in the launch. Never paraphrase or infer approval.
- `Conversation language: <name>` always: the language of the user's message in this session (a Polish message gives `Polish`). Never omit it.

If the Architect needs a brainstorm round: **stop and ask `/{{prefix}}grillit`**. Do not run the round, do not interview personae, do not launch a facilitator. Then stop this skill; do not start `/{{prefix}}doit`.

If the Architect stops with a `BLOCKED:` line or a question (`Q<n>`), report that and stop. Do not continue to implementation.

## Launch Designer (conditional)

After the Architect finishes without `BLOCKED:` or a question, read the spec it wrote. Run the Designer once only when **all** hold: the spec frontmatter has `ui: true`, `agents.designer.enabled` is `true` in `harness.config.json`, and the spec has no **UX/UI decisions** section (a spec built from a design file already has it, so the stage is skipped). Otherwise skip this section; a spec with `ui: false` or no `ui`, or a disabled Designer, never runs it.

Follow the live Designer file for this host (`<agentsDir>/designer.md`). Do not duplicate it. Pass at least `Mode: <the same mode as the Architect>`, the task key, `Conversation language: <name>` always, and, when the user approved the UX section the Designer showed (new or a change to an existing one) in this session, `User approval: <the user's own words, verbatim>`. The Designer works in the launch checkout, with no git and no worktree, and does not change status.

The Designer is launched by this skill, not by the Architect (a subagent cannot launch one). If the Designer stops with a `BLOCKED:` line or a question (`Q<n>`), report that and stop. Do not continue to implementation.

## After Architect finishes

Report the task key, title, type, tracker, whether a design file was used (its path), whether the Designer ran (and its number of `D<n>` decisions and `UX:` criteria), and that status stays at the configured `todo` string.

Offer the next step. Do **not** start it:

- `/{{prefix}}doit` — implement this spec (Consultant loop inside Implementer)
- `/{{prefix}}runit` — full path from here

Do not start Reviewer. Do not call git scripts. When Jira or ADO is the active tracker, the Architect calls `.seh/scripts/jira` or `.seh/scripts/ado` by `kind`; this skill does not. Do not write spec, prompt, or log yourself.
