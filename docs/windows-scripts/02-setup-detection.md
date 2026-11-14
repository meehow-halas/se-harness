# Stage 02: Setup detection of `sh` on Windows and manual test checklist

## Goal

`/<prefix>setit-se` detects whether the host can run `sh` scripts and tells the user what to install when it cannot. Add a manual Windows test checklist.

## Scope in

- Setup skill (the `/<prefix>setit-se` skill source under `skills/`; locate with Grep for `setit-se`):
  - At start, detect the platform. On Windows (`uname -s` MINGW/MSYS/CYGWIN, or `OS=Windows_NT` with no `sh` on PATH), check `command -v sh`.
  - If `sh` is found: continue. On Windows, record the runtime as `windows-git-bash` (MINGW/MSYS) or `windows-wsl` if `uname -r` contains `microsoft` under Linux, in the setup summary only. Do not add a config key.
  - If `sh` is missing: stop setup before writing files. Reply with `BLOCKED: sh not found — install Git for Windows (Git Bash) or WSL, then run /<prefix>setit-se again.`
- Agent and skill text that says "if the host cannot run `sh`, stop and tell the user": keep the rule, reference the same BLOCKED line from setup. Grep `skills/` and `agents/` for `sh` wording before editing. Change only the sentences that name the Windows limitation.
- `docs/windows-scripts/manual-test.md`: checklist for a human on Windows, two columns (Git Bash, WSL). Steps: install, run `/<prefix>setit-se`, run `start-task` on a test repo, run `check-update`. Expected output per step.
- Version: no new bump. Stage 01 already bumped to `1.3.0` in the same change set. Add a `CHANGELOG.md` line under `1.3.0` (Added) if not already present. Per CLAUDE.md, add to the unreleased entry, do not bump again.

## Scope out

- No native PowerShell or cmd detection beyond the `sh` check.
- No new `harness.config.json` key.
- No changes to `seh install` (`src/`), except if the setup skill cannot run without it. If so, stop and ask.
- No CI matrix for Windows.
- No README edits.
- No commit.

## Decisions taken

- Detection runs in setup and the agent, not inside scripts (stage 01 decision).
- Runtime is recorded in the setup summary only, no config key (avoids a config change, which would need a major/minor approval).
- Manual checklist is the only Windows verification (user, Q2: tests with `sh` removed from PATH + manual checklist).

## Files likely touched

- `skills/<setit-se skill>/SKILL.md` (locate)
- Agent or skill files with the Windows sentence (locate with Grep)
- `docs/windows-scripts/manual-test.md` (new)
- `CHANGELOG.md` (one line under 1.3.0)
- Tests if the setup skill has a test file next to it (check; add a case only if a test harness exists for skills)

## Acceptance criteria

1. Setup on a host with `sh` on PATH: continues, and its summary names the runtime when on Windows (stub `uname` as `MINGW64_NT`).
2. Setup with `sh` removed from PATH on a stubbed Windows host: no files written (assert the target directory is unchanged), and the reply's first `BLOCKED:` line names `sh` and mentions Git Bash and WSL.
3. Setup on Linux/macOS with `sh`: no runtime line, no change in behaviour.
4. `docs/windows-scripts/manual-test.md` exists and has steps for Git Bash and WSL with expected output.
5. The Windows sentence in `docs/prd.md` and in agents/skills match. Grep for `out of v1` returns no Windows match.

## Tests to write and run

Narrowest first.

1. The setup skill test (if one exists next to it): case where `sh` is absent and `uname` is stubbed to MINGW. Assert: `BLOCKED:` line, no file written, exit reflects stop.
2. The same with `sh` present: assert continue and the runtime line.
3. Run `npm test` once at the end of the stage.
4. Manual checklist is not automated; the stage's report must say it was not run on real Windows.

## Depends on

- Stage 01 `done`.
