# Stage 01: Windows runtime for `.seh/scripts/` (PRD + script checks)

## Goal

Make the POSIX `sh` scripts in `scripts/` usable on Windows through Git Bash or WSL. Update the PRD first, then add a shared tool check so a script that runs under `sh` but misses a required tool (`git`, `node`, `gh`) stops with the `BLOCKED:` contract and a Git Bash/WSL hint.

## Scope in

- `docs/prd.md`:
  - Remove "Running `.seh/scripts/` on Windows (`sh` hosts only in v1)" from the **Deferred** list (line ~749).
  - Replace "Windows is out of v1: if the host cannot run `sh`, stop and tell the user." (line ~456) with: Windows is supported through Git Bash or WSL, which provide `sh`. There is no native PowerShell port. If `sh` is missing, the agent stops and tells the user to install Git Bash or WSL.
  - Keep the PRD internally consistent (no other "v1 Windows out" statements). Grep `docs/prd.md` for `Windows` and `sh` before editing.
- `scripts/lib.sh`: add a shared helper (name: `seh_require_tools`) that checks the tools the calling script needs. On a missing tool, print one `BLOCKED:` line naming the tool and the hint `install Git for Windows (Git Bash) or WSL`, then exit non-zero. Callers pass the tool list.
- Each script in `scripts/` that uses a tool calls the helper before the first real action, with only the tools it uses:
  - git scripts: `git`
  - `ado`, `jira`, `check-update`, `fanout-plan`, `*-json.js` callers: `node`
  - `open-pr` and any script calling `gh`: `gh`
- Windows detection is informational only: `uname -s` values `MINGW*`, `MSYS*`, `CYGWIN*` append `(Windows: Git Bash)` to the BLOCKED hint. Behaviour does not branch on it.
- `package.json` version bump to `1.3.0` and `CHANGELOG.md` entry `## [1.3.0]` (Added: Windows runtime through Git Bash/WSL; Changed: PRD Windows section).

## Scope out

- No `.ps1` files, no PowerShell port, no Node rewrite of scripts.
- No detection of `sh` itself (no script can run without it). That is stage 02.
- No change to `harness.config.json` keys or to the `OK` / `UNCHANGED` / `BLOCKED:` contract shape.
- No change to `seh install` copy logic.
- No README edits (CLAUDE.md).
- No commit.

## Decisions taken

- Runtime is Git Bash or WSL (user, Q1).
- Missing-`sh` detection lives in setup and the agent. Scripts only validate tools they can see (user, Q3 "setup detects, script validates tools").
- Version: minor `1.3.0` (user, Q5). Changelog Added/Changed per CLAUDE.md.

## Files likely touched

- `docs/prd.md`
- `scripts/lib.sh`
- `scripts/*` (each script that uses git, node, or gh; check with Grep for `git `, `gh `, `node `)
- `scripts/*.test.js` (tests next to units; add cases here)
- `package.json`, `CHANGELOG.md`

## Acceptance criteria

1. PRD: `Running .seh/scripts/ on Windows` is absent from the Deferred section. The Git section no longer says Windows is out of v1, and says Git Bash or WSL is the supported runtime.
2. With `git` removed from PATH, a git script (e.g. `start-task`) exits non-zero and its stdout contains a line starting with `BLOCKED:` that names `git` and the Git Bash/WSL hint. It creates no branch, worktree, or file.
3. With `node` removed from PATH, a node-using script (e.g. `check-update`) exits non-zero and prints `BLOCKED:` naming `node`.
4. With all tools present, behaviour is unchanged: existing `OK` / `UNCHANGED` output and exit codes match the pre-change tests.
5. Simulated Windows: when `uname -s` returns `MINGW64_NT` (stubbed), the BLOCKED hint includes `(Windows: Git Bash)`. With `uname` returning `Linux`, it does not.
6. `package.json` version is `1.3.0`; `CHANGELOG.md` has a `1.3.0` entry in Keep a Changelog form.

## Tests to write and run

Narrowest first. Tests must exercise the real script with a controlled `PATH`. Stub only the external boundary (the missing tool is removed from PATH; `uname` is stubbed via a fixture directory placed first on PATH).

1. `npm test -- scripts/lib.test.js` (or the project's single-file equivalent; check `package.json` scripts) for `seh_require_tools`: vary the tool list and the missing tool name. Do not hardcode `git` as the only case.
2. `scripts/start-task.test.js`: `git` absent from PATH → `BLOCKED:` line, exit non-zero, no git side effect (assert no new branch or worktree via `git` refs in a fixture repo).
3. `scripts/check-update.test.js`: `node` absent → `BLOCKED:` naming `node`.
4. One existing `OK` test per changed script still passes.
5. Full `npm test` only at the end of the stage, once narrow tests pass.

Each test must fail if: the helper is removed; the wrong tool name is printed; the hint is missing; or a side effect happens before the check.

## Depends on

- Nothing inside `windows-scripts`. Stage 02 depends on this stage having status `done`.
