# 04 — Four product agents

## Goal

Publish Architect, Implementer, Consultant and Reviewer under package `agents/`, written against the PRD. The facilitator is not an agent.

## Scope in

| File | Role | Default model (template frontmatter; setup applies the live `model:`) |
|------|------|------|
| `agents/architect.md` | Spec + prompt + first log row on the active tracker. Status stays `todo`. Read-only on application code. No git writes | opus |
| `agents/implementer.md` | Implements the spec (feature or bug). Own 2–6 phase plan. After each phase launches Consultant. Calls `start-task` | sonnet |
| `agents/consultant.md` | Quality on the phase diff. Structured report. No product code edits, no user talk, no spec judging | haiku |
| `agents/reviewer.md` | Spec compliance only. Git allowlist after acceptance. Update-from-base | sonnet |

Bodies say: **read** `harness.config.json` for base branch, statuses, tracker maps, `fetchFields`, content language, product line; **call** `.seh/scripts/` for git and Jira.

Shared rules: modes `interactive` / `critical` / `autonomous`; questions as `Q<n>` with one recommended answer; stops use the `BLOCKED:` line; tracker writes only on the active tracker, never both, never mirror; Jira via `.seh/scripts/jira` only; status keys stay configured English strings; run the project's own test/lint, not a seh command.

Architect: input is a sentence or existing files / Jira; output spec + prompt + first log row; status stays `todo`; no branches, no git scripts; interactive asks to confirm title, then spec+prompt; may split tasks with `depends` / `relates` (a basename in `depends` must be `done` before implementation); paths in the spec are constraints, never a step list; if a brainstorm round is needed, stop and ask `/<prefix>grillit`.

Implementer: same agent for feature and bug; before work `.seh/scripts/start-task`, then status `in progress`; plan 2–6 phases (more than 6 → merge the rest into the last phase); after each phase launch Consultant and do not continue until it says `continue`; do not edit `CHANGELOG.md`; if the project test command fails on code it did not touch, stop and tell the user; when all phases have `continue`, set `implemented`.

Consultant report shape:

```text
CONSULT: phase=<name> pass=<1|2> of 2
must-fix:
- C<phase>.<n>: <file> — <problem> — <why it violates a rule or breaks behaviour>
should-fix:
- C<phase>.<n>: <file> — <problem>
notes:
- …
VERDICT: rework | continue
```

Consultant loop: 2-pass cap, anti-thrash, debt protocol copied from the PRD. Implementer talks to the user when the debt protocol requires it; Consultant never does.

Reviewer: spec requirements and AC only (not style, not Consultant `should-fix`). Gate: `implemented` (first round) or `in review` (later rounds); sets `in review` before review; ❌ → `in progress`. ❌ goes back to Implementer with only those items. Max three rounds; same ❌ with no code change ends the loop. Spec-contradicting ❌ goes to the user. Acceptance only with no open ❌; interactive waits for explicit user acceptance; critical/autonomous: this run is acceptance. After acceptance, in order: final review in log → status `done` → `CHANGELOG.md` entry → `commit-task` → `push-task` → `open-pr` → `return-to-base`. Do not merge. Update only when asked (`update-from-base`).

## Scope out

- Facilitator templates (phase 7, `brainstorm/`).
- Live copies into `.claude/agents/` (phase 5). Interpolating runtime config values into bodies.
- Worktrees, merging PRs, a fifth role, Architect writing line-level recipes, a user-facing Consultant skill.

## Decisions taken

- Product line sentence and `BLOCKED: rule=` shape are not used.
- Reviewer is spec-only.

## Files likely touched

- `agents/architect.md`, `agents/implementer.md`, `agents/consultant.md`, `agents/reviewer.md`

## Acceptance criteria

- Four files in `agents/`; no facilitator there.
- No baked product line; no interpolated runtime config values.
- Consultant has the report shape, 2-pass cap, debt protocol.
- Implementer calls `start-task` and launches Consultant per phase; Reviewer calls the other five scripts in the PRD order.

## Tests

- Grep checks on templates.

## Versioning

Initial agents. Not recorded in the legacy plan.

## Depends on

- 03 = `done` (runtime-config rule).
