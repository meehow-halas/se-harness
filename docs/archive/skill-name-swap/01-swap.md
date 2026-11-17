# 01 — swap skill names `shipit` ↔ `runit`

## Goal

Swap the two skill names. Today `shipit` = one task, no merge; `runit` = many tasks in parallel with auto-merge. After: `shipit` = many tasks, parallel, auto-merge (start-to-finish delivery); `runit` = one task (Architect → Implementer → Reviewer, no merge). Behaviour, config and scripts stay as they are. Names only.

## Scope in

- Directories: `skills/shipit/` ↔ `skills/runit/`; frontmatter `name:` and `description:` of both.
- Every reference to either name in shipped dirs: `skills/`, `agents/`, `references/`, `scripts/`, `src/` (code and tests).
- `docs/prd.md`: skills tables, both skill sections, session fan-out paragraph, principles, script table, all other mentions.
- Child prompt contract: new `shipit` (parent) starts children with `/<prefix>runit <KEY>`; session title `shipit <KEY>`; `Fan-out child: yes` and `Auto-merge: yes` are honoured by `runit` (the child). Run report path `docs/run-reports/<YYYY-MM-DD-HHMM>-shipit.md`.
- `package.json` → `1.3.1`; `CHANGELOG.md` new `## [1.3.1]` entry (Changed), with a migration note: old `/shipit` is now `/runit`, old `/runit` is now `/shipit`.
- New/updated tests (see Tests).

## Scope out

- Root `README.md` (CLAUDE.md: not edited unless asked).
- Historical plans: `docs/parallel-ship/`, `docs/implementation-plan/`, `docs/azure-dev-ops/`, `docs/optional-git/`, `docs/fanout-decisions/`, `docs/tracker-read-only-mode/`, `docs/codex-support/`, `docs/v2-plan/`. They keep the names they were written with.
- Released `CHANGELOG.md` entries and the unreleased `1.3.0` text (history stays as written).
- Any behaviour change, new config key, alias or compatibility shim for the old meaning.
- Legacy pre-prefix cleanup names in `skills/setit-se/SKILL.md` (`seh-shipit`, …) stay.

## Decisions taken

1. Swap (not merge, not a new name). Why: user choice; `shipit` = deliver tasks start to finish.
2. Version `1.3.1` (patch). Why: user choice. Assumption flagged: CLAUDE.md would treat a name/meaning change as major; the user explicitly chose `1.3.1`.
3. Method: mechanical swap through a temporary placeholder (never two sequential `sed` passes), then read every changed line of prose. Why: a naive rename collapses both names into one.
4. Historical plans and released changelog entries untouched. Why: assumption; they are records, not norms.
5. No alias for the old meaning. Why: assumption; an alias would keep the ambiguity the swap removes.
6. Both names already exist in `setit-se` copy/cleanup lists and `INVOKE_SKILLS`; `setit-se` regenerates both on the version change, so no stale directory remains. Verify, do not add cleanup logic.

## Files likely touched

- `skills/shipit/SKILL.md`, `skills/runit/SKILL.md` (contents swapped)
- `skills/planit/SKILL.md`, `skills/doit/SKILL.md`, `skills/checkit/SKILL.md`, `skills/grillit/SKILL.md`, `skills/setit-se/SKILL.md`
- `agents/implementer.md`
- `references/AGENTS.md`, `references/BLOCKED.md`, `references/session-fanout.md`
- `scripts/fanout-plan`, `scripts/fanout-plan.test.js`
- `src/cli.js`, `src/cli.test.js`
- `docs/prd.md`, `CHANGELOG.md`, `package.json`

## Acceptance criteria

1. `skills/shipit/SKILL.md` has `name: shipit` and the fan-out + auto-merge behaviour (waves, `fanout-plan --skill shipit`, run report). Its children run `/{{prefix}}runit <KEY>`. Body equals the old `skills/runit/SKILL.md` body with names swapped.
2. `skills/runit/SKILL.md` has `name: runit` and the single-task behaviour ("One task only", no merge unless `Fan-out child: yes` + `Auto-merge: yes`). Body equals the old `skills/shipit/SKILL.md` body with names swapped.
3. `scripts/fanout-plan` accepts the same set of skills; its error hints list `planit, doit, checkit, runit or shipit` consistently with `--skill` usage text; tests renamed accordingly and pass.
4. `references/session-fanout.md`: placement table rows swapped; `Auto-merge: yes` allowed in the prompt check only for `shipit`'s children; wake step uses `pr-state` for `shipit`.
5. `docs/prd.md`: `/<prefix>shipit` section describes the parallel auto-merge skill, `/<prefix>runit` section describes the single task; skills tables, script table (`pr-state`, `merge-pr` callers), principles and host paragraph consistent; no sentence pairs one name with the other's behaviour.
6. Run report path in skill and PRD ends `-shipit.md`; session title `shipit <KEY>`.
7. `seh install --prefix q_` renders `/q_shipit` and `/q_runit` in the right places; `.seh/skills/shipit/` and `.seh/skills/runit/` both installed, no `*.test.js` copied.
8. `package.json` is `1.3.1`; `CHANGELOG.md` has `## [1.3.1]` → Changed with the migration note.
9. `git diff --stat` shows no change to root `README.md` or the historical plan dirs listed in Scope out.
10. `npm test` green.

## Tests to write/run

- Update `scripts/fanout-plan.test.js` (skill names/hints) — run `node --test scripts/fanout-plan.test.js`.
- Update `src/cli.test.js` prefix test (~line 1157): add content discriminators so a missed swap fails — installed `skills/shipit/SKILL.md` contains `fanout-plan` and `/q_runit` and does not contain the single-task marker; installed `skills/runit/SKILL.md` does not contain `fanout-plan --skill`, and contains `Fan-out child`. Pick markers by reading the real files. Run `node --test src/cli.test.js`.
- Final: `npm test`.
- Self-check before finishing: `git grep -n -E 'shipit|runit' -- skills agents references scripts src docs/prd.md` and read every hit.

## Versioning / CHANGELOG

Shipped dirs change → bump to `1.3.1` (user-approved level). Add `## [1.3.1]` with `### Changed`: skills renamed (swap), plus migration note.

## Depends on

None (single stage). Stage gate: a later stage may start only when this stage is `done` (all criteria PASS, tests green, zero open gaps).
