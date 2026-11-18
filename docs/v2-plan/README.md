# v2 plan: candidates from Deferred

Goal: list the PRD Deferred items as v2 candidates. This is a scope boundary, not a backlog. Each item needs its own scope decision before it can enter any version. Nothing here is approved.

Planning: draft

Migrated from `docs/v2-plan.md` (originally written in Polish; translated to English during migration, content unchanged in substance). Status in the original: "draft, no approved scope". Candidate list synced with PRD Deferred on 2026-11-17.

## Open questions

PRD references are section names in `docs/prd.md` (line numbers drift).

1. Auto-install of a newer version: only notify (current; Non-goals), or install after explicit consent?
2. Consultant as a user-facing skill: today Consultant runs only inside the Implementer loop (Consultant (quality loop)). A standalone skill would skip the Implementer loop.
3. Changing `agents.contentLanguage` mid-task: the PRD does not describe a change between tasks (`/<prefix>setit-se` (detail)). A change mid-task gives artifacts in two languages.
4. Status and log helpers for the file tracker in `.seh/scripts/`: today agents write status and log themselves (Git, note under the script table; Decisions, item 14).
5. Jira Server / Data Center: only Jira Cloud REST v3 today (Jira tracker). Server/DC uses a different API (usually v2), different description format and different auth.
6. Local git without remote or `gh` as a separate mode: git enabled means the full flow today (Git, "Git disabled"). Partly covered by optional git (empty base disables git; `docs/archive/optional-git/`).
7. Running `.seh/scripts/` on Windows: v1 supports only hosts with `sh` (Git).
8. Symlinks from live agents to `.seh/agents/`: today agents are copies (What `/<prefix>setit-se` does; Decisions, item 17).

Removed: auto-merge. It left Deferred in 1.3.0 as opt-in (`/<prefix>shipit`, `merge-pr`; plan `docs/archive/parallel-ship/`).

Out of this list: trackers other than files, Jira and Azure DevOps were removed from Deferred and have no plan. Non-goal "trackers other than files/Jira/ADO" (`docs/prd.md`, Non-goals) still applies in v1.

## Stage table

| NN | name | status | verification |
|----|------|--------|--------------|
| 01 | [candidates](01-candidates.md) | draft | not started |

Stage execution is blocked while `Planning: draft`.
