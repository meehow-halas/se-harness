# Implementation plan: v1 build log

Status: archived. This is the record of how seh v1 was built, stage by stage. It is not a source of norms. Behaviour is defined in [../prd.md](../../prd.md). Where this log and the PRD differ, the PRD wins. Feature plans in `docs/<slug>/` are separate and are not subordinate to this log.

Planning: complete

Migrated from the pre-`_make-plan` layout (`docs/implementation-plan.md` as index, `NN-*.md` phase files, `NN-*.prompt.md` for some phases). Phase files were condensed to the `_make-plan` spec headings; every decision and acceptance item of the original is kept. The full original text is in git history (`git show <commit>:docs/implementation-plan/NN-*.md`). Phases 08, 09, 11, 13, 14 and 16 had no prompt file; prompts were created during migration. Stage statuses are the statuses recorded in the original phase index. They were not re-verified during migration.

## Open questions

None.

## Stage table

| NN | name | status | verification |
|----|------|--------|--------------|
| 01 | [package-and-cli](01-package-and-cli.md) | done | legacy: not re-run |
| 02 | [git-scripts](02-git-scripts.md) | done | legacy: not re-run |
| 03 | [references](03-references.md) | done | legacy: not re-run |
| 04 | [agents](04-agents.md) | done | legacy: not re-run |
| 05 | [seh-setup](05-seh-setup.md) | done | legacy: not re-run |
| 06 | [work-skills](06-work-skills.md) | done | legacy: not re-run |
| 07 | [brainstorm](07-brainstorm.md) | done | legacy: not re-run |
| 08 | [multi-host](08-multi-host.md) | done | legacy: not re-run |
| 09 | [per-host-models](09-per-host-models.md) | done | legacy: not re-run |
| 10 | [parallel-worktrees](10-parallel-worktrees.md) | done | legacy: not re-run |
| 11 | [session-update-check](11-session-update-check.md) | done | legacy: not re-run |
| 12 | [jira-rest-scripts](12-jira-rest-scripts.md) | done | legacy: not re-run |
| 13 | [opencode-host](13-opencode-host.md) | done | legacy: not re-run |
| 14 | [artifacts-on-tracker-only](14-artifacts-on-tracker-only.md) | done | legacy: not re-run |
| 15 | [optional-git](../optional-git/README.md) | done | legacy: not re-run (lives in `docs/archive/optional-git/`) |
| 16 | [opencode-full-support](16-opencode-full-support.md) | done | legacy: not re-run; manual checks recorded in the stage spec |

Phase 1 may leave payload directories thin. Later phases fill them.

## Where the rules live

- Product invariants, package layout, binding user flow, stops, modes, statuses, agents, git, skills, CLI and the Deferred list: [../prd.md](../../prd.md).
- Repo working rules (tests, commits, versioning): `AGENTS.md`.
- Post-v1 tracker work: [../azure-dev-ops/README.md](../azure-dev-ops/README.md) and other feature plans in `docs/<slug>/`.

## Repo state before phase 1

Historical snapshot, not a TODO. Present at the time: [prd.md](../../prd.md), [packs/](../../../packs/), stub [package.json](../../../package.json) (no `bin`, no `src/`). Missing: `src/`, `agents/`, `skills/`, `brainstorm/`, `references/`, `scripts/`.
