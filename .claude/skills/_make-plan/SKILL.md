---
name: _make-plan
description: Plan a new feature for this repo in staged docs/<plan-dir>/ files (spec + self-contained agent prompt per stage), asking one question at a time with a recommended option, then implement stages and auto-verify each one. Use when the user runs /_make-plan or asks to plan/build a new feature in stages.
---

# /_make-plan

Project-local planning skill for `se-harness`. Two phases: **plan** and **execute**. Conversation with the user: in the user's language. Be terse (see CLAUDE.md). All plan artifacts (spec, prompt, README, any other file in `docs/<slug>/`): in English.

Read `CLAUDE.md` and `docs/prd.md` first. PRD and Deferred lists win over the request's guesses. Do not treat Deferred items as v1 scope unless the user opens a new version scope.

## Phase 1 — Plan

### 1.1 Plan directory

- Plan dir: `docs/<slug>/` (kebab-case, short, e.g. `docs/tracker-read-only-mode/`; finished plans move to `docs/archive/<slug>/`).
- If the dir exists, read it and continue (ask what to change). Never overwrite an existing stage file without showing the user the diff first.
- Planning can be paused and resumed. `docs/<slug>/README.md` holds `Planning: draft | complete` and an `Open questions` list. If `draft`, resume: take the first open question, ask it (one at a time), do not re-ask answered ones.
- Create `docs/<slug>/README.md` with `Planning: draft` after the first answer, and update it after every answer, so an interrupted session loses nothing.

### 1.2 Questions

- Ask **one question per message** using `AskUserQuestion` (2–4 options).
- Every question with options: put the recommended option **first**, label it `(Recommended)`, and state the reason in its `description`.
- Ask only what changes the design. Skip questions answered by PRD, CLAUDE.md, or code. Read code with Grep/Glob first.
- Stop asking when scope, acceptance criteria, and stage split are clear. Summarize the decisions in one short list before writing files.

### 1.3 Stage split

- Default: one stage. Split into stages only when there is a real dependency boundary or a verifiable intermediate state. Ask the user to confirm the split (one question, recommended option first).
- Numbering: `01`, `02`, … in build order.

### 1.4 Files written

For each stage `NN-<stage-slug>`, use this convention (finished examples in `docs/archive/<slug>/`, prompts there already removed):

- `docs/<slug>/NN-<stage-slug>.md` — **spec**:
  - Goal (1–3 sentences)
  - Scope in / Scope out (explicit)
  - Decisions taken (with the chosen option and why)
  - Files likely touched (paths)
  - Acceptance criteria (observable: exit codes, output contract, files, refs, argv)
  - Tests to write/run (narrowest first; per CLAUDE.md "Tests")
  - Versioning/CHANGELOG note if a shipped dir changes (per CLAUDE.md "Versioning"; minor/major → ask user)
  - Depends on: previous stage(s)
- `docs/<slug>/NN-<stage-slug>.prompt.md` — **prompt** for an implementing agent. Must be self-contained: goal, repo context needed, paths, the full spec content (copied, not linked-only), acceptance criteria, constraints (no commit unless asked, no `.env`, no `~/.claude/`, no global npm), definition of done. The agent must be able to start with no other context.
- `docs/<slug>/README.md` — index: goal, `Planning: draft | complete`, `Open questions` list, stage table (`NN | name | status | verification`), status field per stage (`planned` / `in progress` / `gaps` / `done`).
- Stage gate: stage `NN` may start only when stage `NN-1` has status `done`. `done` means verification finished with all criteria `PASS`, tests green, and zero open gaps. Put this rule in each stage spec's "Depends on" line.

Write only these files. Do not edit `README.md` at repo root (CLAUDE.md).

### 1.5 End of planning

Show the list of created files and the stage table. Ask the user to confirm the plan (one question). Only after confirmation set `Planning: complete` in README and clear `Open questions`. Then offer: start stage `01` now (one question, recommended first). Do not start implementation without the user's go-ahead.

Planning with `Planning: draft` cannot be executed. Stage execution requires `Planning: complete`.

## Phase 2 — Execute a stage

0. Gate:
   - `Planning` is not `complete` → stop. Reply `BLOCKED: planning of <slug> is not complete — finish planning first (open questions: N)`.
   - Previous stage is not `done` → stop. Report which stage blocks and why.
1. Set stage status to `in progress` in `docs/<slug>/README.md`.
2. Implement from the `.prompt.md` + spec. Follow CLAUDE.md (tests next to unit, `npm test` narrowest first, changelog/version rules, no commit).
3. Questions raised during implementation: **one at a time**, `AskUserQuestion`, recommended option first with `(Recommended)` and reason. Do not batch. Record each decision in the stage spec's "Decisions taken".
4. When the stage is implemented, **automatically run verification** (do not wait to be asked):
   - Launch one `Agent` (general-purpose, fresh context) with: the stage spec path, the `.prompt.md` path, and the instruction to check each acceptance criterion against the actual code/tests and report `PASS` / `GAP` per criterion with evidence (file:line, command output). It must not edit files.
   - Run the tests the spec names yourself and quote real output. Never claim passing without running.
5. Verification result:
   - All `PASS` and tests green → status `done`. Report briefly.
   - Any `GAP` or failing test → status `gaps`. List gaps as a to-do list. Ask one question: fix now (recommended) or leave for a follow-up stage. Do not silently expand scope. Next stage stays blocked while status is `gaps`.
6. Update `docs/<slug>/README.md` status for the stage.

## Query mode — any time

Read-only. Applies during planning, between stages, and mid-stage. Triggered by any question about a plan: current stage, next stage, can next start, gaps, blocked stages, summary, open questions.

- Plan: the one the user names. Ignore `docs/archive/`, `docs/manual-tests/`, `docs/backlog/` and folders without a `Planning:` line. If only one `docs/<slug>/` plan exists, use it. If several exist, ask which one (recommended: the one with a stage `in progress`).
- Source: `docs/<slug>/README.md` first. Read `NN-*.md` only for the stage asked about.
- Answer from the files. Quote status values as written.
- Report `Planning` status and the open questions count. If `draft`, list the open questions.
- "Can next start?" = yes only if `Planning` is `complete`, the previous stage is `done`, and the next stage is not already `in progress`.
- If files contradict each other (e.g. `done` with open gaps), report it. Do not fix it.
- Do not edit files, run tests, or launch agents.

## Rules

- One question per message, always. Recommended option first, always marked.
- Never invent requirements; mark assumptions as assumptions.
- Keep plan files in `docs/<slug>/` only. Do not create parallel trees.
- When every stage of a plan is `done`, propose (one question) archiving it: `git mv docs/<slug> docs/archive/<slug>`, remove its `*.prompt.md`, drop prompt links from its stage table, fix relative links, and update links to it elsewhere. A manual end-to-end scenario a stage produced goes to `docs/manual-tests/<slug>.md` instead.
- Do not commit, push, or open PRs unless the user asks.
- Do not touch `.env` files. Do not write to `~/.claude/` or other machine-wide paths.
- Do not add items from the PRD Deferred list as work.
