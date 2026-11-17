# Parallel ship with auto-merge

Goal: after a set of tasks has specs, run all of them at once, one session per task, respecting `depends` (a dependent task starts only after the task it depends on is merged), and merge each PR into `agents.baseBranch` automatically after acceptance.

Planning: complete

## Decisions so far

1. Auto-merge enters scope as **opt-in**, new **minor** version. Default v1 behaviour (human merges) stays. Removes "Auto-merge" from PRD Deferred. Merge only after a clean Reviewer / acceptance.
2. Dedicated skill `runit` (`/<prefix>runit K1 K2 …`), not an extension of `/<prefix>shipit`: keeps shipit unchanged and unambiguous. It reuses `fanout-plan` and the session fan-out procedure; each child session runs `/<prefix>shipit <KEY>` with an auto-merge marker.
3. Opt-in = invoking `/<prefix>runit`. No new config key. `/<prefix>shipit` still never merges on its own.
4. Mode from intent, as everywhere in seh: default `interactive`, `autonomous` when the user asks for independent work. Merge happens after acceptance in any mode (interactive: after the user accepts in that child session).
5. Merge method: new script `merge-pr` → `gh pr merge --squash` (no rebase, no force). On conflict: `update-from-base`, resolve, `commit-task`, `push-task`, one retry. Required checks not green or unresolved conflict → `BLOCKED:` for that key; its dependents wait, siblings continue.
6. The child's Reviewer merges: after `open-pr`, only when the launch has `Auto-merge: yes`, it runs `merge-pr`, then `return-to-base`. The parent, when woken, checks each key's PR state with a read-only script (`merged` / `open` / `none`); only `merged` keys go to `fanout-plan --done`.
7. Key selection: `/<prefix>runit K1 K2 …`, or `/<prefix>runit` with no keys = every task in the active tracker with spec + prompt and status `todo`. The parent shows the keys and wave order and asks once for go-ahead before starting.
8. No-key mode only for repo-file specs (files tracker, or `agents.tracker.readOnly: true`). Full-write Jira/ADO needs named keys (`BLOCKED:` otherwise); no tracker `search` verb.
9. Two stages: 01 merge path (scripts + Reviewer/shipit + PRD Deferred removal + version 1.3.0), 02 `runit` skill (selection, waves, registration, docs).
10. Run report: when the run ends, the parent writes `docs/run-reports/<YYYY-MM-DD-HHMM>-runit.md` (any tracker; never Jira/ADO; not committed) with timing, per-task results, agent runs as counts only (Implementer phases, Consultant passes, Reviewer rounds; no personae, no copied log rows), what was done / not done and why / left, agent decisions, open warnings, dependency order, and next actions for the user. `pr-state` also prints `merged_at:` / `merge_commit:` for it. Details: stage 02 spec, **Run report**.

Assumptions (confirmed with the plan): git disabled → `/<prefix>runit` is `BLOCKED:`; on `sessionSpawn: manual` hosts it prints the current wave's commands and a rerun computes the next wave; the remote task branch is not deleted after merge; `/<prefix>shipit` honours `Auto-merge: yes` only together with `Fan-out child: yes`.

## Open questions

None.

## Stage table

| NN | name | status | verification |
|----|------|--------|--------------|
| 01 | [merge-path](01-merge-path.md) ([prompt](01-merge-path.prompt.md)) | planned | not started |
| 02 | [runit-skill](02-runit-skill.md) ([prompt](02-runit-skill.prompt.md)) | planned | not started |

Stage gate: stage `NN` may start only when stage `NN-1` is `done` (all criteria `PASS`, tests green, zero open gaps). Execution requires `Planning: complete`.
