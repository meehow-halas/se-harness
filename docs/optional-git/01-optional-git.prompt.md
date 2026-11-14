# Prompt — optional-git stage 01: Optional git

Implement stage `01` of `docs/optional-git` only. Historical stage: status `done` in the original plan. Use this prompt to verify or re-create it.

## Repo context

- Repo `se-harness`. Git helpers are POSIX `sh` in `scripts/`. No `seh git` subcommand.
- Config: project `harness.config.json`, `agents.baseBranch`. Empty or `null` = git disabled. Key absent or unreadable = `BLOCKED` (setup not finished).
- Read `docs/prd.md` first. PRD wins over this plan. Decisions 9, 16, 20 get the "git disabled" exception.
- Versioning: shipped dirs → version bump in the same change (CLAUDE.md); minor → propose to user.

## Stage spec

### Goal

Make git optional. `agents.baseBranch` empty or `null` = git disabled. Tasks run sequentially; session fan-out is off.

### Scope in

1. Setup (`skills/setit-se/SKILL.md`): detect repo before asking; no repo → no question, empty base, say git is skipped; repo → ask (suggest `dev`), accept "no git"; later run can change the key. Gate: git detected = repo and `origin`. Not detected → no question, no manual branch accepted. First run declined → empty. Later run connects only when detected; disconnect always allowed; set but undetected → offer disconnect. Offer to connect only when the user names git or base branch.
2. Scripts (`scripts/lib.sh`, `start-task`, `commit-task`, `push-task`, `open-pr`, `update-from-base`, `return-to-base`, `fanout-plan`): shared `git_gate` in `lib.sh` prints `UNCHANGED` and `git: disabled`, exit 0, before any git call (key present but empty, whitespace or `null`). `read_base_branch` as backstop. `_extract_base_branch` exit codes: 0 value or empty, 2 unreadable JSON, 3 key absent. Key absent or unreadable → `BLOCKED`. `start-task` without git prints `worktree: <launch checkout>`. `fanout-plan` without git: `mode: sequential`, `max: 1`. `jira` / `lib-jira.sh` no longer require git. `check-update` unchanged.
3. Agents: Implementer skips `start-task`, works in the launch checkout, no worktree or branch in report. Reviewer: after acceptance → changelog and `done`; skip commit, push, PR, return; `update` variant → `BLOCKED: update needs git`. Consultant: no `git diff`; reads files or the diff in the prompt. Without git, "done" = accepted and written to files.
4. Skills (`doit`, `checkit`, `shipit`, `planit`): skip `start-task`, `Worktree:`, worktree paths. Several keys: sequential loop, no `sessionSpawn`. Reports omit `worktree:` and PR URL.
5. References: `references/harness.config.md` ("empty = no git"); `references/AGENTS.md` script note; `references/session-fanout.md` disabled when git is off.
6. Docs: `docs/prd.md` sections Git, setit-se, Reviewer, Implementer, parallel; `docs/implementation-plan/README.md` note. `README.md` not touched.
7. Tests (`scripts/git-disabled.test.js`): each git script with empty base → exit 0, `UNCHANGED`, `git: disabled`, no ref or file change; fixtures use a non-`dev` base, git on and off; `start-task` off → launch path; `fanout-plan` off → sequential; set base still runs git path.

### Scope out

- `seh install` / `uninstall`. `check-update`. Local git without remote as a separate mode.

### Acceptance criteria

- Empty or `null` base → every git script exits 0 with `UNCHANGED` and `git: disabled`, no ref or file change.
- Missing key or unreadable config → `BLOCKED:`.
- `start-task` and `fanout-plan` behave as described when disabled.
- Set base still runs the git path.

### Depends on

- Implementation plan phases 2, 4, 5, 6, 10 = `done`.

## Constraints

- Do not commit unless the user asks. Do not touch `.env` files.
- Ask one question at a time; recommended option first, labelled **(Recommended)**.

## Definition of done

- Acceptance criteria PASS with `node --test scripts/git-disabled.test.js` output and `npm test` output quoted.
- Report: changed files, deviations.
