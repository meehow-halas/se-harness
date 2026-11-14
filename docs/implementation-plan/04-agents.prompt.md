# Prompt — implementation-plan stage 04: Four product agents

Implement stage `04` of `docs/implementation-plan` only. Requires stage `03` = `done`. Historical stage: status `done` in the original plan.

## Repo context

- Repo `se-harness`. Agents are published under `agents/`, copied into consuming projects by setup. Facilitator is not an agent.
- Four agents only: Architect, Implementer, Consultant, Reviewer. Consultant is a loop inside Implementer, not a user skill.
- Bodies read `harness.config.json` at run time and call `.seh/scripts/` for git and Jira. No interpolated runtime values, no product line.
- Read `docs/prd.md` first (Agents, Consultant loop and caps, Reviewer acceptance and git order, Modes, Statuses, Decisions 5–10, 17).
- Versioning: `agents/` shipped → version bump in the same change (CLAUDE.md).

## Stage spec

### Goal

Publish Architect, Implementer, Consultant and Reviewer under `agents/`.

### Scope in

- `agents/architect.md` (opus template default): spec + prompt + first log row on the active tracker; status stays `todo`; read-only on application code; no git writes.
- `agents/implementer.md` (sonnet): feature or bug; 2–6 phase plan; Consultant after each phase; calls `start-task`.
- `agents/consultant.md` (haiku): quality on the phase diff; structured report; no product code edits; no user talk; no spec judging.
- `agents/reviewer.md` (sonnet): spec compliance only; git allowlist after acceptance; update-from-base.
- Shared: modes `interactive` / `critical` / `autonomous`; `Q<n>` questions with one recommended answer; `BLOCKED:` stops; tracker writes only on the active tracker, never mirrored; Jira only via `.seh/scripts/jira`; status keys are configured English strings; run the project's own test/lint.
- Architect: confirm title in interactive mode; may split tasks with `depends` / `relates` (a `depends` basename must be `done` before implementation); paths in spec are constraints, not steps; brainstorm needed → stop and ask `/<prefix>grillit`.
- Implementer: `start-task` before work; status `in progress`; 2–6 phases (merge extras into the last); Consultant per phase, do not continue until `continue`; do not edit `CHANGELOG.md`; stop if the project test command fails on untouched code; set `implemented` when all phases have `continue`.
- Consultant report:

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

  Loop caps, anti-thrash and debt protocol copied from the PRD. Consultant never talks to the user.
- Reviewer: spec and AC only, not style, not Consultant `should-fix`. Gate `implemented` (first round) or `in review` (later); set `in review` before review; ❌ → `in progress`; max three rounds; same ❌ with no code change ends the loop; spec-contradicting ❌ goes to user. Acceptance only with no open ❌; interactive waits for explicit user acceptance. After acceptance, in order: final review in log → `done` → `CHANGELOG.md` entry → `commit-task` → `push-task` → `open-pr` → `return-to-base`. No merge. Update only when asked (`update-from-base`).

### Scope out

- Facilitator (stage 07). Live copies in host dirs (stage 05). Interpolating runtime config. Worktrees (stage 10). A fifth role. A user-facing Consultant skill.

### Acceptance criteria

- Four files in `agents/`; no facilitator there.
- No baked product line; no interpolated runtime values.
- Consultant has the report shape, 2-pass cap, debt protocol.
- Implementer calls `start-task` and launches Consultant per phase; Reviewer calls the other five scripts in PRD order.

### Depends on

- 03 = `done`.

## Constraints

- Do not commit unless the user asks. Do not touch `.env` files.
- Ask one question at a time; recommended option first, labelled **(Recommended)**.

## Definition of done

- Acceptance criteria PASS with grep evidence (file:line).
- Report: changed files, deviations.
