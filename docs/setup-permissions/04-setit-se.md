# 04 — `/<prefix>setit-se`

## Goal

Three fast questions plus migrations; minimum follow-ups.

## Scope in

- **Changelog** (first run; later run when `agents.reportChange` missing): one yes/no, proposal `yes` when project-root `CHANGELOG.md` exists, else `no`; state why. Later run: changeable parameter.
- **Git operations** (only when git is connected and `agents.baseBranch` set; first run right after base branch; later run once when `agents.git` missing): one question, table of the four ops with the chain explained, one reply (e.g. "all", "worktree, commit", "none of push/pr"). Reply violating the chain → state the corrected set and confirm in the same turn. Later run: changeable parameter.
- **Tracker actions** (Jira / ADO Add, and Change): replaces the read-only question. After connection + `meta OK`: one question with the five actions (no preselection, read shown as always on), one reply. Then mapping for enabled actions only, grouped: `status` ON → all five status keys in one numbered-list question; `spec`/`prompt`/`log` ON → field mapping in one question; `create` ON → feature/bug types in one question; always `blocker` + `fetchFields` (one question). Change: toggle actions in one reply; newly enabled actions ask only maps still at skeleton values.
- **Migration** (later run, once): `readOnly` → `write` per README Q5; tell the user the resulting table; delete `readOnly`.

## Acceptance criteria

- First run with Jira, all actions ON: no more questions than today's full-write path; per-action path never asks one question per action.
- Skill text contains no default selection for tracker actions.
