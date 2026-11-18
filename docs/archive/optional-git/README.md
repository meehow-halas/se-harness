# Optional git

Goal: git is optional. An empty `agents.baseBranch` (or `null`) disables all git flow. Tasks then run sequentially in the launch checkout, no worktrees, no PR. Trackers keep working without a repo.

Planning: complete

Migrated from the pre-`_make-plan` layout (`plan.md`, single file, one stage). The original status was "implemented (scripts + tests, agents, skills, references, PRD)". Stage status below is that status. Not re-verified during migration. Implementation roadmap order: PRD → implementation plan note → `lib.sh` + scripts with tests → agents → skills → references.

## Open questions

None.

## Stage table

| NN | name | status | verification |
|----|------|--------|--------------|
| 01 | [optional-git](01-optional-git.md) | done | legacy: not re-run |

Depends on (implementation plan): phases 2, 4, 5, 6, 10 (see `docs/implementation-plan/`).

## Out of scope

- `seh install` / `uninstall` changes. `check-update` (reads GitHub tags, not the project repo).
- Local git without remote / `gh` as a separate mode (candidate for Deferred, see `docs/v2-plan/`).
