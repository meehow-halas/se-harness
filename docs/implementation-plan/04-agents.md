# Phase 4 — Four product agents

## Goal

Publish Architect, Implementer, Consultant, and Reviewer under package `agents/`, written against the PRD. Facilitator is **not** an agent.

## In scope

| File (suggested) | Role | Default model (frontmatter in the **template**; live `model:` is applied by setup) |
|------------------|------|------|
| `agents/architect.md` | Spec + prompt + first log row on the active tracker. Status stays `todo`. Read-only on application code. No git writes | opus |
| `agents/implementer.md` | Implement the spec (feature or bug). Own 2–6 phase plan. After each phase, launch Consultant. Calls `start-task` | sonnet |
| `agents/consultant.md` | Quality on the phase diff. Structured report. Does not edit product code, does not talk to the user, does not judge spec compliance | haiku |
| `agents/reviewer.md` | Spec compliance only. Git allowlist after acceptance. Update-from-base and close | sonnet |

Bodies must instruct: **read** `harness.config.json` for base branch, statuses, tracker maps, `fetchFields`, content language, product line; **call** `.dhs/scripts/` for git and for Jira.

## Out of scope

- Putting facilitator templates into `agents/`. Facilitator templates belong in `brainstorm/` (phase 7).
- Generating live copies into `.claude/agents/` (phase 5 `/dhs-setup`).
- Interpolating `agents.baseBranch`, status strings, Jira maps, `fetchFields`, content language, or product line into the template body as the project’s values.
- Worktrees, merging PRs, a fifth role.
- Architect writing file-by-file / line-level implementation recipes.
- User-facing Consultant skill.

## Inputs

- PRD: Agents (all four); Consultant loop, caps, debt protocol; Reviewer acceptance and git order; Artifact contract; Statuses; Modes; Git; Decisions 5–10, 17.
- Do not bake a product-line sentence or a `BLOCKED: rule=` shape. Reviewer is spec-only.

## Outputs

`agents/architect.md`, `agents/implementer.md`, `agents/consultant.md`, `agents/reviewer.md` (names may match host frontmatter `name:`). No other files in `agents/`.

## Behaviour (must be in the templates)

### Shared

- Modes: `interactive` / `critical` / `autonomous` as PRD Modes. Questions use `Q<n>` and one recommended answer.
- Stops use PRD `BLOCKED:` line.
- Tracker: write spec, prompt, log, and status **only** on the active tracker (files or Jira). Never both. Never mirror.
- File tracker paths and basename rules: PRD Feature tracking + Artifact contract.
- Jira: call `.dhs/scripts/jira` (not MCP, not raw `curl`); create/transition/comment only using `agents.tracker` maps; `null` means skip that transition; do not invent status names; Consultant pass is not written on the ticket.
- Languages: conversation language vs `agents.contentLanguage` from config (read at run time). Status keys stay configured English strings; do not translate them from the conversation.
- Follow generated rules that load on Read/Write/Edit. Run the **project’s** test/lint/typecheck, not a dhs command.

### Architect

- Input: a sentence, or existing files / Jira.
- Output: spec + prompt + first log row. Status stays `todo`. Does not advance past `todo`.
- Does not create or switch branches. Does not call git scripts.
- Interactive: confirm title, then spec+prompt, before write. Critical/autonomous: write once Questions is satisfied.
- May split tasks; `depends` / `relates`. A basename in `depends` must be `done` before implementation starts.
- Paths in the spec are constraints, never a step list.
- If a brainstorm round is needed: stop and ask `/dhs-brainstorm` (do not interview personae in-process). Details: PRD Brainstorm; full skill in phase 7.
- Read-only on application code.

### Implementer

- Same agent for `type: feature` and `type: bug`.
- Before work: `.dhs/scripts/start-task` with the task basename/key. Then set status `in progress` (files string or Jira `inProgress` map).
- Plan 2–6 phases (coherent slices, not one file). More than 6: merge remaining work into the last phase.
- After **each** phase: launch Consultant. Do not start the next phase until the Consultant protocol says `continue`.
- Do not edit `CHANGELOG.md`.
- Unclear spec: follow Questions; do not invent architecture beyond that.
- If the project test/lint command fails on code they did not touch: stop and tell the user. Do not label it unrelated and continue.
- When all phases have `continue`, leave status `in progress`. Reviewer moves it to `code review`.

### Consultant

Required report shape (PRD):

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

Loop, hard caps, anti-thrash, and debt protocol: copy the rules from PRD Consultant, do not invent a third pass or extra launches. Implementer talks to the user when debt protocol requires it; Consultant never does.

### Reviewer

- Spec requirements + AC only. Not style. Not Consultant `should-fix`. May ❌ leftover `must-fix` only when it misses an AC.
- First review while `in progress` → set `code review`.
- ❌ → back to Implementer with only those items (Consultant again only on phases those fixes belong to, same caps). ⚠️ do not start a round.
- Max three Reviewer rounds. Same ❌ with no code change ends the loop.
- An ❌ that contradicts the spec goes to the user; changing the spec is Architect work.
- Acceptance only with no open ❌. Interactive: wait for explicit user acceptance (no changelog/commit/push/PR until then). Critical/autonomous: this run is acceptance; then git steps; do not merge.
- After acceptance, in order: final review in the log → status `in review` → `CHANGELOG.md` entry → `.dhs/scripts/commit-task` → `push-task` → `open-pr` → `return-to-base`.
- **Update** only when asked: `update-from-base`; stop on conflicts.
- **Close** only when the user says the PR is merged: verify, set `done`, `return-to-base` if still on the task branch.
- If the task branch is missing, Reviewer may call `start-task`. Architect and Consultant never call git scripts.

## Done when

- Four files in `agents/`; no facilitator there.
- No baked product line, no interpolated runtime config values.
- Consultant exists with the PRD report shape, 2-pass cap, debt protocol.
- Implementer calls `start-task` and launches Consultant per phase; Reviewer calls the other five scripts in the PRD order.

## Handoff

Phase 5 copies these into each host `agentsDir`. Phase 9 writes `model:` from `agents.roles.<role>.model[<host.id>]`. Changing base branch or statuses later must not require regenerating agent **bodies**.
