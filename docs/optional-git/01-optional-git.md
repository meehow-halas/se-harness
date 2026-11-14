# 01 — Optional git

## Goal

Make git optional. `agents.baseBranch` empty or `null` = git disabled. Tasks run sequentially, session fan-out is off. The PRD (`docs/prd.md`) is updated first and wins over this file.

## Scope in

1. Setup (`/<prefix>setit-se`, `skills/setit-se/SKILL.md`):
   - Detect repo (`git rev-parse --is-inside-work-tree`) before asking about `baseBranch`.
   - No repo: do not ask; leave `baseBranch` empty; say git is skipped.
   - Repo: ask as today (suggest `dev`); accept "no git" (empty).
   - Later run can change it through the same key.
   - Setup gate: git detected = repo **and** `origin`. Not detected → no question, no manual branch accepted, say what is missing. First run: detected but declined → empty. Later run: connect only when detected; disconnect always allowed; set but undetected → offer to disconnect. Offer to connect only when the user names git or base branch.
2. Scripts (`scripts/lib.sh`, `start-task`, `commit-task`, `push-task`, `open-pr`, `update-from-base`, `return-to-base`, `fanout-plan`):
   - Shared helper in `lib.sh`: empty `baseBranch` → print `UNCHANGED` and `git: disabled`, exit 0, before any git call.
   - `start-task` without git prints `worktree: <launch checkout>`.
   - `fanout-plan` without git plans sequentially.
   - `check-update` unchanged.
3. Agents:
   - Implementer: no `start-task`; works in the launch checkout; no worktree or branch in the report.
   - Reviewer: after acceptance → changelog and status `done`; skip commit, push, PR, return. Variant `update` → `BLOCKED: update needs git`.
   - Architect: wording only.
   - Consultant: no `git diff`; reads files or the diff passed in the prompt.
   - Without git, "done" = accepted and written to files.
4. Skills (`doit`, `checkit`, `shipit`, `planit`): skip `start-task`, `Worktree:`, `.git/seh-worktrees/<task>`. Several keys: sequential loop, no `sessionSpawn`. Reports omit `worktree:` and PR URL.
5. References: `references/harness.config.md` ("empty = no git"); `references/AGENTS.md` script table note; `references/session-fanout.md` disabled when git is off.
6. Docs: `docs/prd.md` Git, setit-se, Reviewer, Implementer and parallel sections; decisions 9, 16, 20 get a "git disabled" exception; Deferred entry. `docs/implementation-plan/README.md` gets a note pointing here. `README.md` not touched (CLAUDE.md rule).
7. Tests (`npm test`, next to units): each git script with empty baseBranch → exit 0, `UNCHANGED`, `git: disabled`, no ref or file changes; fixtures use a non-`dev` base, git on and off; `start-task` off → launch checkout path; `fanout-plan` off → sequential.

Implementation notes (from the original plan):

- `project_root` (git toplevel, else cwd); `config_path` uses it.
- `_extract_base_branch` exit codes: 0 value or empty, 2 unreadable JSON, 3 key absent.
- `git_gate` runs before `require_git`: prints `UNCHANGED` and `git: disabled` when the key is present but empty, whitespace or `null`. `read_base_branch` does the same as a backstop.
- Key **absent** or config unreadable stays `BLOCKED` (setup not finished). Only explicit empty or `null` disables git.
- `jira` / `lib-jira.sh` no longer require git.
- `fanout-plan`: `mode: sequential`, `max: 1` when disabled.
- Test file `scripts/git-disabled.test.js` (all git scripts × empty/whitespace/null × repo/no repo; `start-task` path; `fanout-plan`; a set `baseBranch` still runs the git path).

## Scope out

- `seh install` / `uninstall`. `check-update`. Local git without remote as a separate mode.
- Installing a test for copied rule prose (would only restate the source).

## Decisions taken

- Empty or `null` disables; absent is `BLOCKED`.
- Git enabled needs repo and `origin`. `gh` is not checked in setup.

## Files likely touched

- `skills/setit-se/SKILL.md`, `scripts/lib.sh`, `scripts/start-task`, `scripts/commit-task`, `scripts/push-task`, `scripts/open-pr`, `scripts/update-from-base`, `scripts/return-to-base`, `scripts/fanout-plan`, `scripts/git-disabled.test.js`, `agents/*.md`, `skills/doit/`, `skills/checkit/`, `skills/shipit/`, `skills/planit/`, `references/harness.config.md`, `references/AGENTS.md`, `references/session-fanout.md`, `docs/prd.md`, `docs/implementation-plan/README.md`

## Acceptance criteria

- Every git script with empty `baseBranch` exits 0 with `UNCHANGED` and `git: disabled`, and changes no ref or file.
- Missing key or unreadable config → `BLOCKED:` (not disabled).
- `start-task` and `fanout-plan` behave as described when disabled.
- Set `baseBranch` still runs the git path.

## Tests

- `scripts/git-disabled.test.js` plus existing script tests; `npm test`.

## Versioning

Shipped dirs change: minor bump, propose to user (new config semantics). Not recorded in the legacy plan.

## Depends on

- Implementation plan phases 2, 4, 5, 6, 10 = `done`.
