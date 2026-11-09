# Phase 5 — `/dhs-setup`

## Goal

Author the real `/dhs-setup` skill. It is the only skill `dhs install` writes live. It finishes first-time setup and later changes the same config. The CLI does not configure the project.

Cite [prd.md](../prd.md) sections **Skills** and **`/dhs-setup` (detail)** as the procedure. This file is the build slice, not a second copy of every question.

## In scope

- Replace the phase 1 stub with the full skill template under `skills/` (source copied to `.dhs/skills/` and written live as `/dhs-setup` by install).
- First run (no `harness.config.json`).
- Later run (config present), including VERSION vs `dhs.generatedFrom` regeneration.
- Generation of live agents (copies + `model:`), work-skill **files** from `.dhs/skills/` (bodies may still be stubs until phase 6), and rule packs from `.dhs/packs/` filtered by detection and `packsIgnored`.
- Project PRD create-or-keep.
- `AGENTS.md` / `CLAUDE.md` merge and write rules.
- Jira offer / add / change / remove via `.dhs/scripts/jira meta` and config (no dhs Jira CLI, no MCP).
- `agents.baseBranch` question (suggested default `dev`).
- Optional one project rule on roles (`rules`; reviewer `checklist` when it is a review constraint).

## Out of scope

- Implementing the full work-skill **behaviour** for planit/doit/checkit/feature (phase 6) and brainstorm (phase 7). Setup must still **emit** those skill files from templates; if phase 6 has not landed, emit placeholders that stop with `BLOCKED:` telling the user templates are incomplete — or land phase 6 immediately after. Do not invent a second setup skill.
- Committing.
- Rewriting an existing project PRD on later run.
- Remaking `AGENTS.md` on later run.
- Editing `agents.brainstorm` members (that is `/dhs-brainstorm`).
- Global install.
- Regenerating agent **bodies** because base branch, statuses, tracker maps, `fetchFields`, content language, or product line changed.

## Inputs

- PRD: Binding flow step 2; What `/dhs-setup` does; Runtime config; Skills table; `/dhs-setup` (detail) in full; Decisions 11–14, 16–18.
- Phase 1 install (writes this skill live).
- Phase 3 `references/AGENTS.md` and config skeleton.
- Phase 4 `agents/`.
- Existing [packs/](../../packs/).

## Outputs

| Path | What |
|------|------|
| `skills/dhs-setup/` (or host-shaped equivalent) | Full `/dhs-setup` skill | 
| Work-skill **templates** under `skills/` | At least filenames setup will copy live: `dhs-planit`, `dhs-doit`, `dhs-checkit`, `dhs-shipit` (bodies: phase 6). Optional thin `BLOCKED:` stubs if phase 6 is not in the same pass |

Live files written **in a consuming project** (not in this repo during this phase, except as documented behaviour):

- `harness.config.json` including `dhs.generatedFrom` = `.dhs/VERSION`
- Host agents as **copies** of `.dhs/agents/` plus `model:` from `agents.roles.<role>.model[<host.id>]` (phase 9)
- Work skills in the host skills directory
- Rule packs from `.dhs/packs/`, filtered
- Project-root `AGENTS.md` (after acceptance); `CLAUDE.md` when required

## Behaviour

### Entry

If `.dhs/` or the `/dhs-setup` skill is missing: stop. Tell the user to run `dhs install` here (npm or GitHub), then `/dhs-setup` again.

If `.dhs/VERSION` is missing: same stop.

If `harness.config.json` is missing → first run. If present → later run. Do not silently repeat first-run generation. Do not overwrite keys the user did not confirm.

### First run

Follow PRD `/dhs-setup` (detail) **First run**:

1. Read the repo; state inferences so the user can object. One question at a time for gaps.
2. **PRD:** use existing; never overwrite. If none, gather from the repo, ask for missing product facts, write `docs/prd.md`, put the path in `agents.docs`. Config stores a one-line product plus doc paths, not the PRD body.
3. Detect frameworks; generate packs (JS/TS, React Native, Angular, Next.js, Python, Django, FastAPI). Monorepo: pack only on trees that use it. Honour `packsIgnored`.
4. Generate live agents and work skills from `.dhs/` as copies. Write `dhs.generatedFrom` from `.dhs/VERSION`.
5. Roles: only the four. One question per `(host, role)`. Suggest from that host’s `modelSuggest` (phase 9).
6. `agents.contentLanguage`: ask once, suggest conversation language.
7. `agents.baseBranch`: ask once, suggest `dev`. If the repo already names a default branch, state that inference; do not silently take `main`, `master`, or the current checkout. Do not write this value into agent markdown.
8. **Optional project rule:** one question after models, language, and base branch. Explain what it is. Skip is the default. Do not ask for a list or a second rule.
9. **AGENTS.md / CLAUDE.md:** every combination (neither, only one, or both). Merge table in the PRD. Show the **full** proposed `AGENTS.md` and wait for acceptance (including when neither file existed). Result is always a regular `AGENTS.md`. Then `CLAUDE.md` iff `.claude/` was present and/or `CLAUDE.md` already existed; prefer symlink `CLAUDE.md` → `AGENTS.md`; if the link fails, write an independent file with the same body and tell the user; do not stop setup.
10. Offer Jira once. Decline → `jiraOffer: declined`. Do not commit.

### Later run

If a role `model` is still a string or the map is missing a host `id`, finish that map first. If `.dhs/VERSION` ≠ `dhs.generatedFrom`: regenerate live agents, work skills, and rule packs from current `.dhs/` first (not from the project PRD, not from `AGENTS.md`), set `dhs.generatedFrom`, tell the user templates changed. Then one parameter at a time.

- Role `model` change → one cell `(role, host)`; rewrite that live agent’s frontmatter in **that** `agentsDir` only.
- `packsIgnored` or detected frameworks change → regenerate rule packs.
- `agents.baseBranch` change → config only.
- Do not touch `agents.brainstorm`. Do not create or rewrite the project PRD. Do not remake `AGENTS.md`. Do not commit.
- If `.claude/` is present and `CLAUDE.md` is still missing: create symlink (or independent file if link fails). If `CLAUDE.md` already exists as a regular file, do not overwrite it and do not re-run first-run merge.

### Tracker (Jira)

PRD table Add / Change / Remove. Token never in chat or git. Map each of `todo`, `inProgress`, `codeReview`, `inReview`, `done` (and `blocker` if they use dependencies) from the project’s real Jira statuses, or `null`. Map spec/prompt locations and issue types. Switching does not migrate old tasks.

If the user names another config key, do that key first, then the tracker offer only when there is still no tracker and the offer was not declined — unless they explicitly asked to add/change/remove Jira.

### Generation rules

- Live agents: copies, not symlinks. `model:` from `agents.roles.<role>.model[<host.id>]`. Bodies still do not interpolate runtime keys.
- Work skills generated here; install does not generate them.
- Packs: from `.dhs/packs/`, path-scoped as the pack files specify.

## Done when

- `skills/` contains a complete `/dhs-setup` that distinguishes first vs later run and VERSION mismatch.
- Procedure matches PRD detail (PRD, questions one at a time, AGENTS.md acceptance, CLAUDE.md rules, Jira, no commit).
- Setup generates from `.dhs/`.
- Install still writes **only** this skill live; it does not generate the rest.

## Handoff

Phase 6 replaces work-skill stubs with real `/dhs-planit`, `/dhs-doit`, `/dhs-checkit`, `/dhs-shipit`. Those skills must stop when config is missing or VERSION ≠ `generatedFrom`, with a message to run `/dhs-setup` (and `dhs install` first if `.dhs/` or VERSION is missing). Phase 7 adds `/dhs-brainstorm` the same way.
