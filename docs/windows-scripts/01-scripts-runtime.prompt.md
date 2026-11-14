# Implement stage 01: Windows runtime for `.seh/scripts/`

You are implementing one stage in the repo `se-harness` at `/Users/michal.halas@stxnext.pl/projects/se-harness`. Read `CLAUDE.md` first and follow it: tests next to units, `npm test` narrowest first, changelog and version rules, no commit, do not touch `.env`, do not write to `~/.claude/`, do not install global npm packages, do not edit `README.md`.

Do not start stage 02. Do not implement anything from the PRD Deferred list except the Windows item this stage explicitly covers.

## Context

- Package: `seh` (npm `se-harness`). Shipped dirs: `agents/`, `packs/`, `skills/`, `brainstorm/`, `references/`, `scripts/`, `src/`. A change to any of them needs a version bump and a CHANGELOG entry in the same change.
- Scripts in `scripts/` are POSIX `sh`. Each has a `*.test.js` next to it.
- The PRD (`docs/prd.md`) wins over this file. Read its Git section (around line 450–460) and its Deferred section (around line 738–750) before editing.

## Goal

Make the POSIX `sh` scripts in `scripts/` usable on Windows through Git Bash or WSL. Update the PRD first, then add a shared tool check so a script that runs under `sh` but misses a required tool (`git`, `node`, `gh`) stops with the `BLOCKED:` contract and a Git Bash/WSL hint.

## Scope in

- `docs/prd.md`:
  - Remove "Running `.seh/scripts/` on Windows (`sh` hosts only in v1)" from the **Deferred** list (line ~749).
  - Replace "Windows is out of v1: if the host cannot run `sh`, stop and tell the user." (line ~456) with: Windows is supported through Git Bash or WSL, which provide `sh`. There is no native PowerShell port. If `sh` is missing, the agent stops and tells the user to install Git Bash or WSL.
  - Keep the PRD consistent: grep `docs/prd.md` for `Windows` and `sh` before editing.
- `scripts/lib.sh`: add a shared helper `seh_require_tools` that checks the tools the calling script needs. On a missing tool, print one `BLOCKED:` line naming the tool and the hint `install Git for Windows (Git Bash) or WSL`, then exit non-zero. Callers pass the tool list.
- Each script that uses a tool calls the helper before its first real action, passing only the tools it uses:
  - git scripts: `git`
  - `ado`, `jira`, `check-update`, `fanout-plan`, and callers of `*-json.js`: `node`
  - `open-pr` and any script calling `gh`: `gh`
- Windows detection is informational only: `uname -s` values `MINGW*`, `MSYS*`, `CYGWIN*` append `(Windows: Git Bash)` to the BLOCKED hint. Behaviour does not branch on it.
- `package.json` version `1.2.0` → `1.3.0`. `CHANGELOG.md`: new `## [1.3.0]` entry (Added: Windows runtime through Git Bash/WSL; Changed: PRD Windows section).

## Scope out

- No `.ps1` files, no PowerShell port, no Node rewrite of scripts.
- No detection of `sh` itself (stage 02).
- No change to `harness.config.json` keys or to the `OK` / `UNCHANGED` / `BLOCKED:` contract shape.
- No change to `seh install` copy logic.
- No README edits. No commit.

## Decisions taken

- Runtime is Git Bash or WSL.
- Missing-`sh` detection is in setup and the agent. Scripts validate only the tools they can see.
- Version: minor `1.3.0`.

## Files likely touched

- `docs/prd.md`
- `scripts/lib.sh`
- `scripts/*` (scripts that use git, node, or gh; find with Grep for `git `, `gh `, `node `)
- `scripts/*.test.js`
- `package.json`, `CHANGELOG.md`

## Acceptance criteria

1. PRD: the Windows Deferred item is absent from Deferred. The Git section says Git Bash or WSL is the supported runtime and no longer says Windows is out of v1.
2. With `git` removed from PATH, a git script (e.g. `start-task`) exits non-zero; stdout has a line starting `BLOCKED:` naming `git` and the Git Bash/WSL hint. It creates no branch, worktree, or file.
3. With `node` removed from PATH, a node-using script (e.g. `check-update`) exits non-zero and prints `BLOCKED:` naming `node`.
4. With all tools present, behaviour is unchanged: existing `OK` / `UNCHANGED` output and exit codes match the pre-change tests.
5. With `uname -s` stubbed to `MINGW64_NT`, the BLOCKED hint includes `(Windows: Git Bash)`. With `Linux`, it does not.
6. `package.json` version is `1.3.0`; `CHANGELOG.md` has a `1.3.0` entry in Keep a Changelog form.

## Tests to write and run

Narrowest first. Use the real script with a controlled `PATH`. Stub only the external boundary: remove the missing tool from PATH; stub `uname` via a fixture directory placed first on PATH.

1. Test `seh_require_tools` in `scripts/lib.test.js` (check `package.json` for the single-file test command). Vary the tool list and the missing tool. Do not use only `git`.
2. `scripts/start-task.test.js`: `git` absent → `BLOCKED:` line, non-zero exit, no git side effect (assert no new branch or worktree in a fixture repo).
3. `scripts/check-update.test.js`: `node` absent → `BLOCKED:` naming `node`.
4. Existing `OK` test per changed script still passes.
5. Full `npm test` only after narrow tests pass.

Each new test must fail if: the helper is removed; the wrong tool name is printed; the hint is missing; or a side effect happens before the check. Write tests that observe exit status, the `BLOCKED:` line, files, and git refs, not the source text.

## Definition of done

- All acceptance criteria verified by command output you ran. Quote the real output in your report.
- Narrow tests green; full `npm test` run at the end and its real output quoted.
- `CHANGELOG.md` and `package.json` updated together.
- Report: changed files, test output, any criterion you could not verify, and any decision you took that is not in this file.
- If a question comes up, ask one question at a time with a recommended option first.
