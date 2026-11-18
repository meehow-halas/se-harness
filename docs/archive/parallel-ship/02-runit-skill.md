# 02 — `runit` skill (parallel sessions, dependency waves, auto-merge)

## Goal

Add the work skill `/<prefix>runit`: given a set of specced tasks (named keys, or all `todo` tasks in a repo-file tracker), start one session per task in parallel, each running `/<prefix>shipit <KEY>` with auto-merge, and start a dependent task only after the task it depends on is merged into `agents.baseBranch`.

## Scope in

- New `skills/runit/SKILL.md`.
- `scripts/fanout-plan` (+ test): accept `--skill runit`.
- `references/session-fanout.md`: `runit` placement row; `Auto-merge: yes` allowed in the prompt check for `runit` only; wake step uses `pr-state` for `runit`.
- Registration of the new skill name everywhere work skills are listed: `src/cli.js` `INVOKE_SKILLS` (+ `src/cli.test.js`), `skills/setit-se/SKILL.md` (generation list, prefix cleanup lists, `invokePrefix` names, command cleanup), `references/AGENTS.md` (work list + table row).
- `docs/prd.md`: skills table row, a `/<prefix>runit` section, session fan-out paragraph, principle 20 ("no extra skill") amended for `runit`, `/<prefix>setit-se` "must not be offered" list.
- Final run report written by the parent to `docs/run-reports/` in the launch checkout (see **Run report**).
- `CHANGELOG.md`: extend `## [1.3.0]` (no new bump).

## Scope out

- Merge mechanics (stage 01).
- Jira/ADO search: no-key mode on a full-write external tracker is `BLOCKED:`.
- Running Architect for missing specs (`runit` never specs; use `/<prefix>planit`).
- Auto-merge for `/<prefix>doit`, `/<prefix>checkit`, user-launched `/<prefix>shipit`.
- Git-disabled runs (no PRs to merge).
- `README.md` at repo root.
- Writing the run report to Jira/ADO (never; trackers get only the normal per-task log/comments from the agents).
- Committing the run report (the user commits it if wanted).

## Decisions taken

1. Dedicated skill `runit`, not a `/<prefix>shipit` extension. Why: user choice; keeps `/<prefix>shipit` unchanged and avoids confusing the existing multi-key behaviour.
2. Opt-in = invoking `/<prefix>runit`; no config key. Why: user choice; less setup.
3. Mode from intent (default `interactive`; `autonomous` on `samodzielnie` / `bez pytań` / `autonomous` …), passed to every child. Merge after acceptance in any mode. Why: user choice; consistent with PRD.
4. Key selection: `/<prefix>runit K1 K2 …`, or no keys = every task with spec + prompt and status `todo` in the files tracker, or in repo files when `agents.tracker.readOnly` is `true`. Full-write Jira/ADO with no keys → `BLOCKED: /<prefix>runit needs keys with a Jira/ADO tracker — name the keys`. Why: user choice; tracker scripts have no search verb.
5. Before starting, the parent shows the keys, `depends` edges, first wave (`ready`) and the rest (`waiting` / `blocked`), and asks once for go-ahead. Why: user choice; merge into base is irreversible.
6. A key counts as finished for dependents only when `pr-state <KEY>` is `merged`. A child that ended without a merged PR is removed from `--keys` on the next planner call, so its dependents report `blocked`, and the key is reported with its `BLOCKED:` / `Q<n>`. Why: `fanout-plan` is stateless and would re-list it as `ready`.
7. `depends` outside the invocation: satisfied when `pr-state` is `merged` (or, for a read-only tracker key with no local spec, tracker status equals `agents.tracker.statuses.blocker`, as today). Otherwise blocked.
8. Key already at `done`: `merged` → passed as `--done`, no session; `open` → `BLOCKED: <KEY> is done but its PR is not merged — merge it, then rerun /<prefix>runit` (dependents wait). Key without spec or prompt → `BLOCKED: run /<prefix>planit <KEY> first`.
9. Child prompt lines (exactly): `/<prefix>shipit <KEY>`, `Mode: <mode>`, `Conversation language: <lang>`, `Fan-out child: yes`, `Auto-merge: yes`. No `Worktree:` line (shipit placement: Architect in launch checkout, Implementer/Reviewer in the worktree they create). Why: reuse `/<prefix>shipit` unchanged plus stage 01 marker.
10. Git disabled → `BLOCKED: /<prefix>runit needs git — set agents.baseBranch with /<prefix>setit-se`. Assumption accepted with the plan.
11. `sessionSpawn: manual` hosts: print one command block per `ready` key (with the five lines), then stop; rerunning `/<prefix>runit` recomputes from `pr-state` and tracker status (keys `in progress` / `implemented` / `in review` count as `--running`) and prints the next wave. Assumption accepted with the plan.
12. Default `--max 4`; more needs the user's yes (as in session fan-out).
13. When the fan-out ends (`ready` empty and nothing running, including after blocks), the parent writes one run report to `docs/run-reports/<YYYY-MM-DD-HHMM>-runit.md` in the launch checkout, regardless of tracker. Never to Jira/ADO. Not committed. Why: user request during plan review.
14. Report language: `agents.contentLanguage` (same as other repo artifacts). Why: it is a repo artifact, not a chat message.
15. Timing source: the parent records its own timestamps (run start, each session start, the wake on which it saw the session end); merge time comes from `pr-state` `merged_at:`. A value the parent cannot know (e.g. `manual` host session times) is written as `n/a`, never estimated. Why: no other reliable clock; no invented numbers.
16. `manual` hosts: the report is written on the rerun that finds nothing left to start and nothing running.

## Run report

Path: `docs/run-reports/<YYYY-MM-DD-HHMM>-runit.md` (local time of run start; add `-2`, `-3` … if the name exists). Sections, in order:

1. **Header**: run start / end, total duration, mode, host, `agents.baseBranch`, base commit before (`git rev-parse origin/<base>` at start) and after (at end), key selection (named keys or "all `todo`"), `--max`.
2. **Summary counts**: merged / blocked / question pending / not started (dependency blocked) / skipped (already merged before the run).
3. **Per-task table**: key, title (from spec), wave number, session link, start, end, duration, status, PR URL, merge commit, merged at, result (`merged` / `BLOCKED: …` / `Q<n>` / not started).
4. **Done**: per merged task, what was delivered (one or two lines from the spec goal / CHANGELOG line the child added).
5. **Agent runs**: one line per task, counts only, read from the task log, plus the log path (no copying of log rows): `Implementer phases N · Consultant passes N (C items N, debt accepted N) · Reviewer rounds N (❌ N, ⚠️ N)`. Full-write Jira/ADO: Consultant `n/a` (not logged on the work item). Brainstorm personae are not reported (they do not run inside `/<prefix>runit`).
6. **Not done and why**: per task not merged, the exact `BLOCKED:` line or open `Q<n>` and the session where it is; tasks never started and which dependency stopped them.
7. **Decisions taken by agents** (`autonomous` / `critical`): the `Q<n>` decisions recorded in each task log, as facts, so the user can review them.
8. **Open warnings**: ⚠️ items the Reviewer left (not blocking, not fixed).
9. **Dependency graph and actual order**: edges from `depends` and the waves as they ran.
10. **What is left**: tasks still `todo` / `in progress` / with an open PR, with their status.
11. **Next actions for the user**: concrete commands or steps (e.g. answer `Q<n>` in session X, `/<prefix>checkit update <KEY>`, merge PR Y by hand, `/<prefix>planit <KEY>`, rerun `/<prefix>runit <keys>` for the rest, commit the report), most important first.

The chat end report is a short table plus the report path; the file holds the detail.

## Files likely touched

- `skills/runit/SKILL.md` (new)
- `scripts/fanout-plan`, `scripts/fanout-plan.test.js`
- `references/session-fanout.md`
- `src/cli.js`, `src/cli.test.js`
- `skills/setit-se/SKILL.md`
- `references/AGENTS.md`
- `docs/prd.md`
- `CHANGELOG.md`

(The run report path is in the consuming repo, not in this repo.)

## Acceptance criteria

1. `fanout-plan --skill runit --keys A,B,C --depends C:A` prints `OK`, `ready: A,B`, and `C` under `waiting`; with `--done A` C is `ready`; unknown skills still `BLOCKED:`; the `BLOCKED:` hint lists `runit`.
2. `fanout-plan --skill runit` with git disabled prints `mode: sequential` (existing behaviour, now for `runit` too).
3. `seh install --prefix X` renders `/runit` references as `/Xrunit` in copied text (`src/cli.test.js`), and `skills/runit/` is installed under `.seh/skills/runit/` without `*.test.js`.
4. `skills/runit/SKILL.md` has: the same guard as `/<prefix>shipit`; git-disabled `BLOCKED:`; key selection per decision 4 (including the Jira/ADO `BLOCKED:` line); resolve rules per decisions 7–8; the single go-ahead question; the child prompt with exactly the five lines of decision 9; wake handling via `pr-state` per decision 6; `manual` host behaviour per decision 11; a final report table (key, session link, state); "children never spawn children"; the parent never merges and never does child work.
5. `references/session-fanout.md` lists `runit` in the placement table and allows `Auto-merge: yes` in the prompt check only for `runit`; other skills' prompt check unchanged.
6. `skills/setit-se/SKILL.md` and `references/AGENTS.md` list `runit` wherever the other work skills are listed (generation, prefix cleanup, `invokePrefix` names, `commandsDir` cleanup, work list/table).
7. `docs/prd.md` documents `/<prefix>runit` (skills table, section, fan-out paragraph, principle 20) and keeps `/<prefix>shipit` as one task with no merge.
8. `CHANGELOG.md` `## [1.3.0]` has an Added line for `/<prefix>runit`; `package.json` stays `1.3.0`.
9. `skills/runit/SKILL.md` specifies the run report exactly as in **Run report** and decisions 13–16: path and name collision rule, all eleven sections (agent runs as counts only, never copied log rows), `agents.contentLanguage`, `n/a` for unknown values, written on the end of the fan-out (including a stop on blocks) and on the final `manual` rerun, never sent to Jira/ADO, not committed, and the chat end report points to the file.
10. `npm test` green.

## Tests to write/run

```bash
node --test scripts/fanout-plan.test.js
```

```bash
node --test src/cli.test.js
```

```bash
npm test
```

Skill markdown has no unit test; the verifier checks it against criteria 4–7. A manual run on the desktop app (two independent keys + one dependent) is recommended after `done`, recorded like `docs/session-fanout-manual-test/`, but is not part of this stage's gate.

## Versioning / CHANGELOG

No new bump: extend the unreleased `## [1.3.0]` entry from stage 01.

## Depends on

Stage 01 (`01-merge-path`). This stage may start only when stage 01 has status `done`: verification finished with all criteria `PASS`, tests green, zero open gaps.
