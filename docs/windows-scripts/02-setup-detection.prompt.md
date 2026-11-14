# Implement stage 02: setup detection of `sh` on Windows and manual test checklist

You are implementing one stage in the repo `se-harness` at `/Users/michal.halas@stxnext.pl/projects/se-harness`. Read `CLAUDE.md` first and follow it: tests next to units, `npm test` narrowest first, changelog rules, no commit, do not touch `.env`, do not write to `~/.claude/`, do not install global npm packages, do not edit `README.md`.

Stage 01 must be `done` in `docs/windows-scripts/README.md` before you start. If it is not, stop and reply `BLOCKED: stage 01 is not done`.

## Context

- Package: `seh`. Shipped dirs: `agents/`, `packs/`, `skills/`, `brainstorm/`, `references/`, `scripts/`, `src/`.
- The PRD (`docs/prd.md`) wins over this file.
- Stage 01 already moved Windows to "supported through Git Bash or WSL" in the PRD and added `BLOCKED:` tool checks in `scripts/`. Version is already `1.3.0` with a CHANGELOG entry from stage 01.

## Goal

`/<prefix>setit-se` detects whether the host can run `sh` scripts and tells the user what to install when it cannot. Add a manual Windows test checklist.

## Scope in

- Setup skill (the `/<prefix>setit-se` source under `skills/`; locate with Grep for `setit-se`):
  - At start, detect the platform. On Windows (`uname -s` MINGW/MSYS/CYGWIN, or `OS=Windows_NT` with no `sh` on PATH), check `command -v sh`.
  - If `sh` is found: continue. On Windows, record the runtime in the setup summary only: `windows-git-bash` (MINGW/MSYS) or `windows-wsl` (Linux with `microsoft` in `uname -r`). No config key.
  - If `sh` is missing: stop before writing any files. Reply `BLOCKED: sh not found — install Git for Windows (Git Bash) or WSL, then run /<prefix>setit-se again.`
- Agent and skill text that says "if the host cannot run `sh`, stop and tell the user": keep the rule and point to the same BLOCKED line. Grep `skills/` and `agents/` for `sh` wording first. Change only sentences about the Windows limitation.
- `docs/windows-scripts/manual-test.md` (new): checklist for a human on Windows with two columns (Git Bash, WSL). Steps: install, run `/<prefix>setit-se`, run `start-task` on a test repo, run `check-update`. Give expected output per step.
- `CHANGELOG.md`: add a line under `1.3.0` (Added) only if stage 01 did not already cover it. Do not bump the version again.

## Scope out

- No PowerShell or cmd detection beyond the `sh` check.
- No new `harness.config.json` key.
- No changes to `seh install` (`src/`). If the setup skill cannot work without it, stop and ask one question.
- No CI matrix for Windows. No README edits. No commit.

## Decisions taken

- Detection runs in setup and the agent, not inside scripts.
- Runtime is recorded in the setup summary only.
- Windows verification is the stub-based automated test plus the manual checklist.

## Files likely touched

- `skills/<setit-se skill>/SKILL.md` (locate)
- Agent or skill files with the Windows sentence (locate with Grep)
- `docs/windows-scripts/manual-test.md` (new)
- `CHANGELOG.md` (maybe)
- A test next to the setup skill, only if such a test harness exists

## Acceptance criteria

1. Setup with `sh` on PATH on a stubbed Windows host (`uname` → `MINGW64_NT`): continues, and the summary names `windows-git-bash`.
2. Setup with `sh` removed from PATH on the same stubbed host: no files written (assert the target dir is unchanged); first `BLOCKED:` line names `sh` and mentions Git Bash and WSL.
3. Setup on Linux/macOS with `sh`: no runtime line; behaviour unchanged.
4. `docs/windows-scripts/manual-test.md` exists with Git Bash and WSL steps and expected output.
5. Grep for `out of v1` in `docs/prd.md`, `agents/`, `skills/` returns no Windows-limitation sentence.

## Tests to write and run

Narrowest first.

1. The setup skill test, if one exists next to it: `sh` absent, `uname` stubbed to MINGW → `BLOCKED:`, no file written.
2. Same with `sh` present → continue and runtime line.
3. `npm test` once at the end.
4. The manual checklist is not automated. Say in your report that it was not run on real Windows.

Tests must observe exit status, the `BLOCKED:` line, and filesystem state, not the source text. Each must fail if the check is removed or if files are written before it.

## Definition of done

- All criteria verified; real command output quoted.
- Narrow tests green; full `npm test` output quoted.
- Report: changed files, test output, criteria not verified (Windows manual run), any decision not in this file.
- Ask one question at a time with a recommended option first if something blocks you.
