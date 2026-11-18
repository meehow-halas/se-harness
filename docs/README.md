# docs/

Four kinds of things live here. Only the PRD is normative.

## Normative

| Path | What |
|------|------|
| [prd.md](prd.md) | Product requirements. Wins over every other doc here. |

## Active work

| Path | What | Status |
|------|------|--------|
| `<slug>/` | A feature plan being executed (`docs/<slug>/`). Moved to `archive/` when every stage is `done`. | `Planning: complete` |

## Not approved, for later

| Path | What | Status |
|------|------|--------|
| [backlog/](backlog/) | Parked ideas (`/_parkit`), no scope, no structure. Not tickets. | ideas |
| [v2-plan/](v2-plan/README.md) | The PRD Deferred list as v2 candidates. A closed list with its own stage, not a backlog: scope boundary, nothing approved. | `Planning: draft` |

## Archive

[archive/](archive/) holds history only (not a source of norms). Stage prompts were removed (in git history).

- Plans: [implementation-plan](archive/implementation-plan/README.md) (v1 build log), [azure-dev-ops](archive/azure-dev-ops/README.md), [tracker-read-only-mode](archive/tracker-read-only-mode/README.md), [optional-git](archive/optional-git/README.md), [codex-support](archive/codex-support/README.md), [parallel-ship](archive/parallel-ship/README.md) (pre-1.3.1 skill names), [skill-name-swap](archive/skill-name-swap/README.md), [runit-fanout-missing-spec](archive/runit-fanout-missing-spec/README.md), [designer-agent](archive/designer-agent/README.md), [report-change](archive/report-change/README.md), [designit](archive/designit/README.md).
- Manual end-to-end scenarios sit with their plan as `manual-test.md`: [designer-agent](archive/designer-agent/manual-test.md), [tracker-read-only-mode](archive/tracker-read-only-mode/manual-test.md), [fanout-decisions](archive/fanout-decisions/manual-test.md) (last run 2026-11-14). Not re-run automatically; a new plan touching that feature may reuse them.
- Decision records (not plans): [fanout-decisions](archive/fanout-decisions/README.md), why session fan-out works the way it does (behaviour is in `references/session-fanout.md`).
