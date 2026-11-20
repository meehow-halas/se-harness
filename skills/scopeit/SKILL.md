---
name: scopeit
description: Creates or updates the project PRD (purpose, users, scope, non-goals). Use when the user runs /{{prefix}}scopeit. Does not write harness.config.json.
---

# /{{prefix}}scopeit

Create the project PRD, or update the one that exists. The PRD path comes from `agents.docs` in `harness.config.json`. This skill writes the PRD file only.

Read `harness.config.json` at run time. Do not guess `agents.contentLanguage`, `agents.docs`, or the product line. Do not invent CLI commands. Do not commit.

Ask **one question at a time**. Wait for the answer. Do not dump a questionnaire. Reply in the language of the user's latest message. Write the PRD in `agents.contentLanguage` (`conversation` = the conversation language); the template headings may stay in English.

Stops (not questions) are one line:

```text
BLOCKED: <what stopped> — <what the user or another skill must do>
```

Shape: `.seh/references/BLOCKED.md`.

## Guard

Before any work. Check in the order below; the first failing check stops the run. Compare `.seh/VERSION` and `seh.generatedFrom` after trimming whitespace.

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

## Mode

The PRD path is the entry of `agents.docs` that is the PRD (the first one that is a product requirements document; on the first run of `/{{prefix}}setit-se`, `docs/prd.md`).

- The file exists → **update**.
- `agents.docs` has a PRD entry but the file is missing:

```text
BLOCKED: PRD from agents.docs not found (<path>) — run /{{prefix}}setit-se
```

- `agents.docs` has no PRD entry (outside a call from `/{{prefix}}setit-se`, see **Called from setit-se**): the same `BLOCKED`, with `<path>` = `docs/prd.md`. `/{{prefix}}setit-se` registers the PRD.
- Called from `/{{prefix}}setit-se` and no PRD exists → **create**, at `docs/prd.md`.

## The `TBD` rule

A section that reads `TBD — not stated by the user` is no constraint. Agents treat it as "nothing stated" and never report a conflict with it. A conflict is reported only against a stated non-goal or a stated scope line. This is the same rule as in `.seh/references/prd-template.md`.

## Create

1. Read the repo (README, manifests, docs). Use it only to form proposals.
2. Ask, one question per message, in this order: **purpose**, **users**, **scope**. Each carries a proposal from the repo, labelled as such (for example `Proposal from README: …`), and this helper: `Enter or ok = accept, otherwise type a correction.` Propose only what the README, a manifest or the docs state about it; otherwise ask without a proposal. Only accepted or typed text becomes a stated fact in the PRD. Do not invent facts the repo does not show.
3. **Non-goals**: ask directly, what must not be built. Never propose one. No answer, or `none` → `None stated`.
4. `skip`, `enough`, `wystarczy`, or the same intent at any question → stop the interview and go to the write. Unanswered sections are `TBD — not stated by the user`. Do not write non-goals the user did not state. After the write, skip steps 6 and 7 (no deepening and no `/{{prefix}}planit` question); finish with one line that `/{{prefix}}scopeit` fills the PRD in.
5. Write the PRD from `.seh/references/prd-template.md` into the PRD path (`docs/prd.md`), content in `agents.contentLanguage`. The title is `# <project name> — PRD`, the name from the README's first heading, else `name` in the manifest, else the directory name. The markers `TBD — not stated by the user` and `None stated` stay in English exactly as in the template, because agents match them literally. The file is **always** written, also when every section is `TBD`.
6. One question: deepen the PRD now or later (success metrics, constraints, key flows, glossary, open questions). Now → one question per section; `skip` leaves that section `TBD`; write the file after each answer. Later → one line: `/{{prefix}}scopeit` fills the PRD in.
7. Only when the file did not exist before this run: one question — start `/{{prefix}}planit` for the first spec? Yes → hand over to `/{{prefix}}planit` (this skill does not do the Architect's work). No → one line that `/{{prefix}}planit` can be run later.

## Update

- Input: what changed, from the invocation or one question. It may be filling in a `TBD`.
- Show the affected section before and after, **one change per message**. Write only after the user accepts. Never rewrite the whole file or sections the change does not touch.
- A PRD that does not use the template headings (not made by seh): keep its structure. Put new content in the closest matching section, or, after acceptance, in a new section with a template heading.
- No argument and `TBD` sections exist: propose filling them (one question, recommendation first). No `TBD` sections: ask what to change.
- When the purpose changed: finish with one line that `product` in `harness.config.json` may be out of date, and that `/{{prefix}}setit-se` changes it.

## Called from setit-se

On the first run of `/{{prefix}}setit-se`, when the project has no PRD, `/{{prefix}}setit-se` reads this file from `.seh/skills/scopeit/SKILL.md` (the host may not see the new skill yet) and runs **Create** in its own session. The config is already written, so the **Guard** passes as usual; this skill assumes no other entry. On return `/{{prefix}}setit-se` registers the path in `agents.docs` and the `product` line. The `/{{prefix}}planit` question belongs to this skill; `/{{prefix}}setit-se` does not repeat it.

## Do not

- Write `harness.config.json`.
- Commit.
- Create any file other than the PRD.
- Write a proposal as a fact before the user accepts it.
- Propose non-goals.
