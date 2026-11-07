---
name: dhs-brainstorm
description: This skill should be used when the user invokes /dhs-brainstorm or asks to create, edit, remove or consult this project's brainstorm members. Members are consulted through the architect or the improver.
harness: dev-harness
---

<!-- dev-harness:brainstorm -->

# Brainstorm for this project

The machine setup is already done when this skill is available. `dhs init` wrote this file into the project. It is not a global skill. Do not install it under `~/.claude/skills/`. Do not commit unless the user asks.

Brainstorm members are not Claude Code agents. Their files live in `.claude/brainstorm/members/` and are not addressable with `@` or by delegation. A request to talk to a persona is handled here. Do not launch a member by name as a subagent type.

The architect or the improver runs the round. They launch `brainstorm-facilitator`. A round starts from the architect, the improver or /dhs-brainstorm. The architect uses the members as an extra viewpoint while specifying user-visible work, on its own only when at least two members exist. The improver consults for domain/business and UX/accessibility proposals. Asking the user stays as it already is. A brainstorm opinion is not the user's approval.

## Every invocation

Do this before creating, editing, removing or consulting.

The app context is `.claude/brainstorm/app-context.md` when it exists, and otherwise the old `.claude/council/app-context.md`. When both exist, the new file wins, and you tell the user once that the old one can be deleted. Read the winning file. When it exists and does not contain `TODO`, the context is ready. Continue with what the user asked.

When no file exists, or the winning file contains `TODO`, build it before anything else:

1. Run `dhs agent brainstorm-context` in the project root. It prints a draft made from `agents.product`, the files in `agents.docs`, `CLAUDE.md` and `README`, and then a gap list.
2. Read those same sources. When a listed gap is answered there, fill that section from the source and drop the gap. Do not ask about a section you can fill.
3. Ask one question at a time, and only for a gap that remains. Findings from real users are often the only gap. When the user has none, write that the sources contain none and do not ask again.
4. Show the whole file and wait for confirmation. Then write `.claude/brainstorm/app-context.md` with no `TODO` marker, even when you completed the old file. `dhs init` never writes this file.
5. Continue with what the user asked.

## Members

Members are stored in `harness.config.json` at `agents.brainstorm.members`. This skill writes only `agents.brainstorm`. On your first edit of a config that still has `agents.council`, move that whole object to `agents.brainstorm` and remove the old key. After any change, run `dhs init`. That command renders `.claude/brainstorm/members/<id>.md` from the harness template. Do not write those files by hand.

Each member has `id` (lowercase kebab-case, unique), `description` (one sentence), and non-empty lists `identity`, `cares` and `dislikes`. A persona replies in the conversation language.

### Create

Ask one question at a time: the name, who the persona is, what they care about, what they dislike, and the one-sentence description. Read the members already in the config. When the new persona overlaps one of them, say how, and ask what makes this one different. Show the full persona and wait for confirmation. When this is the first member and `agents.brainstorm.consult` is absent, ask once which threshold to store: `any`, `significant`, or `broad`. When this is the first member and `agents.brainstorm.model` is absent, ask once which model the personas and the synthesizer should use. Suggest `sonnet`. Store the name the user gives and do not check it against a list. That one model runs every persona and the synthesizer. Members have no model of their own. Then append the member, set the threshold and the model when you asked for them, and run `dhs init`. On an existing setup with no threshold, do not ask. The absent key means `significant`. On an existing setup with no model, do not ask. The absent key means `sonnet`.

### Edit

Ask which member, then which section (description, identity, cares or dislikes), then ask that one question. Show the updated persona, wait for confirmation, update the config and run `dhs init`.

### Remove

Ask for confirmation, remove the member from the config and run `dhs init`. The command deletes that member's generated file. A file in `.claude/brainstorm/members/` without the `dev-harness:brainstorm` marker is left in place.

### Threshold

`agents.brainstorm.consult` is `any`, `significant`, or `broad`. When the key is absent, the threshold is `significant`.

- `any`: every change a user can see
- `significant`: a change that is hard to reverse or that changes how the product is used
- `broad`: a new module, onboarding, pricing, or a navigation rebuild

Change it when the user asks, then run `dhs init`. A direct consultation does not check the threshold. The architect checks it only for its own consultation.

### Model

`agents.brainstorm.model` is the model of the personas and the synthesizer. When the key is absent, they use `sonnet`. Change it when the user asks, then run `dhs init`. Do not give a member its own model.

## Consultation

Requires a ready app context, as described under Every invocation. When none is ready, return to the context steps above. The architect subagent does not write that file; it tells the user to run `/dhs-brainstorm`.

A direct `/dhs-brainstorm` has no minimum beyond one member and does not check the threshold. With no members, stop and offer to create one. With one member, there is no synthesizer, and the architect returns that persona's reply. When the user names members, ask those. When the user does not, ask every member.

Input is a specification path, the specification from this session, or a question. When it is unclear which, ask one short question.

Launch the `architect` subagent with `Mode: brainstorm`, the material, the named members (or none), and `Conversation language: <name>` taken from the user's messages in this session. Do not take that name from `agents.contentLanguage`. Do not launch `brainstorm-facilitator` yourself. Do not ask for the persona replies. Do not write them to disk. The architect asks the personas, runs the synthesizer when two or more members were asked, and returns part A, or the single persona reply, with its decision on every blocker, conflict and gap.

Show the architect's result to the user. Name the conflicts with no obvious resolution and every blocker the architect rejected. The user resolves those. Do not resolve them quietly. Agreement among the personas is not required before deciding, and it is not a reason to ignore a blocker.

Do not write a brainstorm file for this round yet. Write `docs/brainstorm/<slug>-<YYYY-MM-DD>.md` only after the user confirms the round. The slug is the specification basename, or a short kebab-case name of the question. The file is the settled record from `.claude/brainstorm/report-template.md`: what the user confirmed and what changed in the specification, plus what remains for the user. When the user does not confirm the round, write nothing. On a later design, the architect and this skill read the settled records from `docs/brainstorm/` and from the old `docs/council/`. When the same file name exists in both, `docs/brainstorm/` wins. They are confirmed decisions, not the specification.

One round. Run another only when the user asks, and only for the part that changed. The brainstorm produces hypotheses, not proof. Do not copy the persona transcripts back into the conversation. When every persona says almost the same thing, treat that as a sign the personas are too loose, not as confirmation.

Do not launch the implementer, the bugfixer or the reviewer.
