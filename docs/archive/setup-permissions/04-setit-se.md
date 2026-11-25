# 04 — `/<prefix>setit-se`

## Goal

Three fast questions plus migration; minimum follow-ups.

## Scope

In `skills/setit-se/SKILL.md` and `CHANGELOG.md` `[2.0.0]` lines:
- **Changelog** (first run; later run when `agents.reportChange` is missing): one yes/no, proposal `yes` when project-root `CHANGELOG.md` exists, else `no`; state why. Later run: changeable parameter.
- **Git operations** (only when git is connected and `agents.baseBranch` set; first run right after base branch; later run once when `agents.git` is missing): one question, table of the four ops with the chain explained, one reply (e.g. "all", "worktree, commit"). Reply violating the chain → state the corrected set and confirm in the same turn. Later run: changeable parameter.
- **Tracker actions** (Jira / ADO Add and Change): replaces the read-only question. After connection + `meta` OK: one question with the five actions (no preselection, read shown as always on), one reply. Then mappings for enabled actions only, grouped: `status` ON → all five status keys in one numbered-list question; `spec` / `prompt` / `log` ON → field mapping in one question; `create` ON → feature / bug types in one question; always `blocker` + `fetchFields` (one question). Change: toggle actions in one reply; newly enabled actions ask only maps still at skeleton values.
- Both questions (git ops, tracker actions) say that OFF means "not automatically": seh still does it on the user's explicit request (Q12–Q14).
- **Migration** (later run, once): `readOnly: true` → all actions `false`; `false` or missing → all `true`; show the resulting table; delete `readOnly`.

Out: other skills, agents, scripts.

## Decisions

Q1, Q2, Q3, Q5, Q8, Q12, Q14.

## Detailed plan

| Key | Values | Missing means |
|-----|--------|---------------|
| `agents.reportChange` | `true` \| `false` | `true` at run time (unchanged); later `/<prefix>setit-se` asks once |
| `agents.git` | `{ "worktree", "commit", "push", "pr" }` booleans | all `true` when `agents.baseBranch` is set; later `/<prefix>setit-se` asks once **(A)** |
| `agents.baseBranch` | branch \| empty | empty = git disabled, as today; `agents.git` is ignored |
| `agents.tracker.write` | `{ "create", "spec", "prompt", "log", "status" }` booleans | setup migrates from `readOnly`; a config with neither is `BLOCKED:` run `/<prefix>setit-se` **(A)** |
| `agents.tracker.readOnly` | — | removed |

## Acceptance criteria

- [x] Jira with all actions ON: no more questions than today's full-write path; no path asks one question per action.
- [x] The skill text contains no default selection for tracker actions.
- [x] Changelog proposal depends on project-root `CHANGELOG.md`; the user still answers.
- [x] Migration rule matches Q5 and runs once.
- [x] `npm test` green.
- [x] Neither question describes OFF as forbidden.

## Verification

`npm test`; review of the skill diff against the criteria.

## Files / materials

`skills/setit-se/SKILL.md`, `references/harness.config.md`, `CHANGELOG.md`

## Depends on

03 (`done`)
