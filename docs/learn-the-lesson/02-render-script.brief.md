# Brief: 02-render-script

You execute one stage of the plan in `docs/learn-the-lesson/` in the se-harness repo (`seh`: skills, agents, rule packs, small CLI).

## Context
- Read first: `AGENTS.md` (project rules), `docs/learn-the-lesson/README.md` (decisions Q1–Q15, assumptions), `docs/prd.md` (normative; wins over everything else).
- Shipped directories: `agents/`, `packs/`, `skills/`, `brainstorm/`, `references/`, `scripts/`, `src/`. Skill names in `skills/` have no prefix; `{{prefix}}` is rendered at install.
- Tests: `npm test`; `*.test.js` next to the unit; assert observable behaviour (exit status, `OK` / `UNCHANGED` / `BLOCKED:`, files), vary every input the contract reads, never restate the implementation.

## Constraints
- Do not change `package.json` version or `CHANGELOG.md` (Q9: decided after execution).
- Do not edit `README.md` outside stage 05.
- No commits, no pushes, no `.env`, no new dependencies, nothing outside this repo.
- Do not touch files of other stages beyond what this spec lists.

## Definition of done
Every acceptance criterion below holds, the listed verification passes with real output quoted, and the stage spec checkboxes are ticked.

## Spec (copied)

# 02 lessons-render script and Codex section

## Goal

A deterministic script that renders `docs/lessons/` into every host `rulesDir`, so all hosts load the same lessons and nothing drifts.

## Scope

In:
- `scripts/lessons-render` (POSIX `sh`, sources `lib.sh`) plus a node helper if parsing needs it (pattern: `scripts/ado-json.js`).
- `scripts/lessons-render.test.js`.
- `references/codex-adapters.cjs` `rules-section`: accept `lesson-*` files next to `seh-*`; test in `references/codex-adapters.test.js`.

Out: the skill (03), `/<prefix>setit-se` wiring (04). The script does not read `agents.lessons.enabled` (rendering and removal work when lessons are disabled, Q7).

## Decisions

Q5, Q7, Q10, Q12, Q15.

## Detailed plan

Contract `lessons-render [--root <dir>]`:
1. Read `.seh/references/hosts.json`; every row, no hardcoded host.
2. Source: every `docs/lessons/<group>/<topic>.md` (not `LESSONS.md`). Frontmatter `paths:` list optional; group `general` must have none.
3. Write `<rulesDir>/lesson-<group>-<topic><rulesExt>`:
   - `.md`: body plus `paths:` when present; no frontmatter `paths` when absent (always on).
   - `.mdc`: `description` (topic line), `globs` from `paths`, `alwaysApply: false`; without `paths`: `alwaysApply: true`, no `globs`.
4. Delete `lesson-*` files in each `rulesDir` that have no source any more. Never touch other files.
5. OpenCode: ensure `.opencode/rules/*.md` in `.opencode/opencode.json` `instructions` (same rules as `/<prefix>setit-se`).
6. `rulesIndex` `agents-md` rows: rewrite the seh-managed section via `codex-adapters.cjs rules-section` with the current `seh-*` and `lesson-*` files (Q15).
7. Output contract: `OK` + list of written/removed paths; `UNCHANGED` when nothing differs; `BLOCKED: <reason>. <what to do>` on invalid frontmatter, `paths` in `general`, bad group/topic name, invalid `.opencode/opencode.json`, unbalanced marker.

## Acceptance criteria

- [ ] A fixture with two groups, one path-scoped and one `general` lesson renders the right file name, frontmatter and body for every row of a test `hosts.json` (not the real table values hardcoded in the script).
- [ ] A second run prints `UNCHANGED` and changes no file.
- [ ] Removing a source removes only its `lesson-*` files; an unrelated rule file and `seh-*` files stay.
- [ ] `paths:` in a `general` lesson → `BLOCKED:`, exit non-zero, no file written.
- [ ] OpenCode glob added once; other `instructions` kept.
- [ ] Codex section lists both `seh-*` and `lesson-*` files; text outside markers unchanged; regenerate with only `seh-*` input keeps lesson pointers when lesson files exist in `rulesDir`.
- [ ] Assumption on always-on loading per host checked against host docs; result noted in the PRD or README assumptions.
- [ ] `npm test` passes.

## Verification

`node --test scripts/lessons-render.test.js references/codex-adapters.test.js`, then `npm test`.

## Files

`scripts/lessons-render`, optional `scripts/lessons-render.js`, `scripts/lessons-render.test.js`, `references/codex-adapters.cjs`, `references/codex-adapters.test.js`.

## Depends on

01 (`done`).
