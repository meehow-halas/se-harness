# Phase 7 — Brainstorm, pack leftover cleanup, delete samples

## Goal

Publish brainstorm round templates and `/dhs-brainstorm`, strip leftover `dev-harness` from existing packs, then **delete `samples/`** (and any leftover `docs/samples/`) so the published tree is the only source.

## In scope

1. Package `brainstorm/` templates rewritten from samples against the PRD (facilitator **collect only**; no scoring; not a product agent).
2. Skill `/dhs-brainstorm`: members CRUD, app context, run a consult (personae → facilitator → Architect PART A).
3. Clean `dev-harness` comments/names from [packs/](../../packs/) (and any other published files this phase is allowed to touch).
4. Delete `samples/` and any `docs/samples/` once `agents/`, `packs/`, `skills/`, `brainstorm/`, `references/`, and `scripts/` exist from the rewrite.

## Out of scope

- A fifth role in `agents.roles` or a `/dhs-setup` question for facilitator model as a product role.
- Implementer, Consultant, or Reviewer running a round.
- `/dhs-setup` editing members.
- `/dhs-feature` starting a round by itself.
- Writing persona transcripts back into chat or into the Architect launch.
- Cursor-specific generators (Deferred).
- Re-adding `samples/` as a second spec.

## Inputs

- PRD: Brainstorm (entire section); Decisions 2, 10; Package layout (`brainstorm/` not `agents/`).
- Read only, then drop what the PRD does not name:
  - [samples/brainstorm/member.md](../../samples/brainstorm/member.md)
  - [samples/brainstorm/persona-output-format.md](../../samples/brainstorm/persona-output-format.md)
  - [samples/brainstorm/facilitator.md](../../samples/brainstorm/facilitator.md)
  - [samples/brainstorm/report-template.md](../../samples/brainstorm/report-template.md)
  - [samples/brainstorm/synthesizer.md](../../samples/brainstorm/synthesizer.md) — sample “synthesizer” is not a product name; PRD facilitator **only collects**. Do not ship a judging synthesizer. `samples/agents/brainstorm-facilitator.md` is not copied into `agents/`.
- Existing packs under `packs/*/`.

## Outputs

| Path | What |
|------|------|
| `brainstorm/` | Member template; persona output format (`[BLOCKER]` / `[IMPORTANT]` / `[NICE]`); facilitator (PART A: shared points, conflicts, blockers, lone voices, review quality — no winner); report template; app-context skeleton |
| `skills/dhs-brainstorm/` (or host-shaped equivalent) | CRUD members, build/confirm app context, orchestrate a round; does not role-play |
| `packs/**` | Same rules, no `dev-harness` leftover tags |
| `samples/` | **Removed** |

Live locations in a consuming project (skill behaviour, not files to add in this repo beyond templates):

- Members: typically `.claude/brainstorm/members/<id>.md` from config (`id`, `description`, `identity`, `cares`, `dislikes`).
- App context: typically `.claude/brainstorm/app-context.md`.
- Settled interactive records: `docs/brainstorm/<slug>-<YYYY-MM-DD>.md` (files, not the task tracker).

## Behaviour

### Split

```text
material (spec or question)
    → each persona, alone, without Architect context
    → facilitator collates, without scoring or picking a winner
    → Architect receives PART A and decides
```

Personae see only: member file, output format, app context, material. Facilitator sees persona replies and the report template — not Architect notes, not a “corrected” spec. Architect does not prompt personae itself.

### `/dhs-brainstorm`

- Same config/VERSION guard as other work skills (phase 6).
- Members CRUD: on create, ask once for consult threshold and the model used for persona and facilitator turns (suggest `sonnet`). No per-persona model. After create/edit/remove, regenerate that member file; do not hand-edit generated member markdown.
- App context: built from the repo (product line, `agents.docs`, README); gaps one question at a time; user confirms the file.
- **Direct consult:** needs ready app context and at least one member. Threshold does not apply. Named members or every member. Then personae → facilitator → Architect with **PART A only**. Show Architect decisions; user resolves leftover conflicts. Do not hide a blocker the Architect rejected.
- `/dhs-setup` does not edit members.

### During specification

`/dhs-planit` or Architect inside `/dhs-feature`: if a round is needed, stop and ask this skill. Consult on its own when there are at least two members **and** the work passes `agents.brainstorm.consult`:

- `any` — every user-visible change
- `significant` (default if unset) — hard to reverse, or changes how the product is used
- `broad` — new module, onboarding, pricing, navigation rebuild

### Round

1. Ready app context (or stop and finish it via the skill).
2. Persona turns in parallel when the runtime allows. Launch prompt = member + format + app context + material.
3. Facilitator → PART A (or the single persona reply if only one member).
4. Architect gets PART A and decides. Agreement among personae is not required and is not proof.
5. Interactive: write `docs/brainstorm/<slug>-<YYYY-MM-DD>.md` only after the user confirms the round. Critical/autonomous: Architect consumes PART A and does **not** write that file.
6. One round unless the user asks for another, and then only for what changed.

Do not paste persona transcripts back into the chat or into the Architect launch. If every persona says almost the same thing, facilitator flags weak personae under review quality.

### Packs

Keep path-scoped YAML `paths:` and the rule bullets. Replace `<!-- dev-harness:pack:… -->` (and any other leftover name) with `dhs` or drop the comment if it is not needed. Do not change pack **policy** unless it contradicts the PRD.

### Teardown

When published `agents/`, `packs/`, `skills/`, `brainstorm/`, `references/`, and `scripts/` exist: delete `samples/` and any leftover `docs/samples/`. Do not keep both trees. Do not leave sample-only commands or agents.

## Done when

- `brainstorm/` has member, persona format, collect-only facilitator, report, app-context skeleton. No judging synthesizer as a product piece. Facilitator not in `agents/`.
- `/dhs-brainstorm` exists, is generated by setup (not by install), and uses the same VERSION/config guard.
- Packs have no `dev-harness` leftover.
- `samples/` is gone. Product dirs remain.
- No `dev-harness` in published payload (`agents/`, `packs/`, `skills/`, `brainstorm/`, `references/`, `scripts/`, `src/`).

## Handoff

v1 payload is complete. Remaining work is PRD Deferred only (Cursor-specific generators, extra trackers, auto-merge, Windows scripts, and the rest listed in the main plan file).
