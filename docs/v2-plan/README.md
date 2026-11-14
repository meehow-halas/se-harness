# v2 plan: candidates from Deferred

Goal: list the PRD Deferred items as v2 candidates. This is a scope boundary, not a backlog. Each item needs its own scope decision before it can enter any version. Nothing here is approved.

Planning: draft

Migrated from `docs/v2-plan.md` (originally written in Polish; translated to English during migration, content unchanged in substance). Status in the original: "draft, no approved scope".

## Open questions

1. Auto-merge: should the harness merge the PR after Reviewer acceptance? Today the human merges on GitHub (`docs/prd.md`, lines 444 and 474). Risk: merge without a human.
2. Auto-install of a newer version: only notify (current, `docs/prd.md` line 114), or install after explicit consent (`docs/prd.md` lines 114 and 735)?
3. Consultant as a user-facing skill: today Consultant runs only inside the Implementer loop (`docs/prd.md` line 536). A standalone skill would skip the Implementer loop.
4. Changing `agents.contentLanguage` mid-task: today the PRD does not describe a change between tasks (`docs/prd.md` line 551). A change mid-task gives artifacts in two languages.
5. Status and log helpers for the file tracker in `.seh/scripts/`: today agents write status and log themselves (`docs/prd.md` lines 478 and 728).
6. Jira Server / Data Center: only Jira Cloud REST v3 today (`docs/prd.md` line 478). Server/DC uses a different API (usually v2), different description format and different auth.
7. Local git without remote or `gh` as a separate mode: git enabled means the full flow today (`docs/prd.md` line 454). Partly covered by `docs/optional-git/` (empty base disables git).
8. Running `.seh/scripts/` on Windows: v1 supports only hosts with `sh` (`docs/prd.md` line 456).
9. Symlinks from live agents to `.seh/agents/`: today agents are copies.

Out of this list: trackers other than files, Jira and Azure DevOps were removed from Deferred and have no plan. Non-goal "trackers other than files/Jira/ADO" (`docs/prd.md` line 141) still applies in v1.

## Stage table

| NN | name | status | verification |
|----|------|--------|--------------|
| 01 | [candidates](01-candidates.md) | draft | not started |

Stage execution is blocked while `Planning: draft`.
