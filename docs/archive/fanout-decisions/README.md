# Fan-out: decisions and solutions

Goal: record the decisions behind session fan-out (one active session turns several keys into child sessions), so the next host can add fan-out. Normative behaviour is in `references/session-fanout.md`, `references/hosts.json` and the skills. This folder explains the choices; where it differs from those files or `docs/prd.md`, they win.

Planning: complete

Migrated from `docs/fanout-decisions.md` (single file, treated as a one-stage plan that records decisions). Status in the original: "manually tested on each host (Claude Code desktop, Cursor, OpenCode). Cursor and OpenCode are set to `manual`." Not re-verified during migration.

Later changes (1.3.0–1.3.2, see `CHANGELOG.md`): opt-in auto-merge via the parallel skill; skill names swapped in 1.3.1 (`runit` = single task, `shipit` = parallel run with auto-merge); `runit` fan-out without specs. Plans: `docs/archive/parallel-ship/`, `docs/archive/skill-name-swap/`, `docs/archive/runit-fanout-missing-spec/`.

## Open questions

None.

## Stage table

| NN | name | status | verification |
|----|------|--------|--------------|
| 01 | [decisions](01-decisions.md) | done | manual test in [manual-test.md](manual-test.md) |

## Open items (from the original)

- Reviewer final report sometimes comes back in English even with the `Conversation language` launch line. Next step: export the transcript and check the Agent call input.
- Commit trailer `Co-Authored-By` is missing when `commit-task` is called with a message that has no trailer. Accepted as not critical.
- Existing projects migrate only through a version bump and `/<prefix>setit-se`.
