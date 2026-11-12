# Optional git — plan

Status: implemented (scripts + tests, agents, skills, references, PRD). PRD (`docs/prd.md`) is updated first and wins over this file.

## Decisions

- Switch: `agents.baseBranch` empty or `null` = git disabled. No new config key.
- Git disabled: tasks run **sequentially only**; session fan-out is off.
- Repo exists but has no remote / `gh`: out of scope. `baseBranch` set = full flow as today (existing `BLOCKED:` from `push-task` / `open-pr`). Candidate for Deferred: "local git without remote".
- Gate lives in **both** agents/skills (skip the steps) and scripts (refuse safely).

## Changes

1. **`/setit-se`** (`skills/setit-se/SKILL.md`)
   - Detect repo (`git rev-parse --is-inside-work-tree`) before asking about `baseBranch`.
   - No repo: do not ask; leave `baseBranch` empty; tell the user git is skipped.
   - Repo: ask as today (suggest `dev`); accept "no git" as an answer (empty).
   - Later run can change it through the same key.

2. **Scripts** (`scripts/lib.sh`, `start-task`, `commit-task`, `push-task`, `open-pr`, `update-from-base`, `return-to-base`, `fanout-plan`)
   - Shared helper in `lib.sh`: empty `baseBranch` → print `UNCHANGED` + `git: disabled`, exit 0, before any git call.
   - `start-task` without git prints `worktree: <launch checkout>`.
   - `fanout-plan` without git plans sequentially.
   - `check-update` unchanged (reads GitHub tags, not the project repo).

3. **Agents**
   - Implementer: no `start-task`, works in the launch checkout; no worktree/branch in report.
   - Reviewer: after acceptance → changelog + status `done`; skip commit, push, PR, return. Variant `update` → `BLOCKED: update needs git`.
   - Architect: no change beyond wording.
   - Consultant: no `git diff`; read files or the diff passed in the prompt.
   - Without git, "done" = accepted and written to files.

4. **Skills** (`doit`, `checkit`, `shipit`, `planit`)
   - Skip `start-task`, `Worktree:`, `.git/seh-worktrees/<task>`.
   - Several keys: sequential loop, no `sessionSpawn`.
   - Reports omit `worktree:` and PR URL.

5. **References**
   - `references/harness.config.md`: "empty = no git".
   - `references/AGENTS.md`: script table note.
   - `references/session-fanout.md`: disabled when git is off.

6. **Docs**
   - `docs/prd.md`: Git, setit-se, Reviewer, Implementer, parallel sections; decisions 9, 16, 20 get a "git disabled" exception; Deferred entry.
   - `docs/implementation-plan.md`: new phase pointing here; notes in `02-git-scripts`, `04-agents`.
   - `README.md`: not touched (AGENTS.md rule).

7. **Tests** (`npm test`, next to units)
   - Each git script with empty `baseBranch`: exit 0, `UNCHANGED`, `git: disabled`, no ref or file changes.
   - Fixtures use a non-`dev` `baseBranch`, git on and off.
   - `start-task` off → launch checkout path.
   - `fanout-plan` off → sequential.
   - Install test (copied `.seh/` files contain the no-git rules): not added; the rules are prose, a test would only restate the source.

## Setup gate (added after review)

- Git detected = repo **and** `origin`. Not detected → no question, no manual branch accepted, say what is missing.
- First run: detected but the user declines → empty. Later run: connect only when detected; disconnect always allowed; set-but-undetected → offer to disconnect. No nagging: offer to connect only when the user names git/base branch.
- Remote added to the decision list: git enabled needs repo + `origin` (gh not checked here).

## Order

PRD → implementation plan note → `lib.sh` + scripts with tests → agents → skills → references.

## Implementation notes

- `scripts/lib.sh`: `project_root` (git toplevel, else cwd), `config_path` uses it; `_extract_base_branch` exit codes (0 value or empty, 2 unreadable JSON, 3 key absent); `git_gate` (call before `require_git`) prints `UNCHANGED` + `git: disabled` when the key is present but empty/whitespace/`null`; `read_base_branch` does the same as a backstop.
- Key **absent** or config unreadable stays `BLOCKED` (setup not finished); only an explicit empty/`null` disables git.
- `jira` / `lib-jira.sh` no longer require git (tracker works without a repo).
- `fanout-plan`: `mode: sequential`, `max: 1` when disabled.
- Tests: `scripts/git-disabled.test.js` (all git scripts × empty/whitespace/null × repo/no repo, `start-task` path, `fanout-plan`, set `baseBranch` still runs git path).
- Out of scope, unchanged: `seh install`/`uninstall`, `check-update`.
