# AGENTS.md

## Product

`seh` is an SE harness for coding assistants: skills, agents, rule packs, and a small CLI (`seh`). The npm package is `se-harness`. The binary is `seh`.

Behaviour is defined in `docs/prd.md`. That file wins over old agent files and chat history. Feature plans in `docs/<slug>/` (`Planning: complete`) cover new scope. Finished plans live in `docs/archive/<slug>/` (history, not a source of norms; their stage prompts were removed and stay in git history). `docs/archive/implementation-plan/README.md` is the v1 build log and does not outrank any other plan. Manual end-to-end scenarios live with their plan in `docs/archive/<slug>/manual-test.md`. Other `docs/` folders are not plans: `docs/backlog/` (parked ideas, `/_parkit`), `docs/v2-plan/` (PRD Deferred as v2 candidates, scope boundary). Finished decision records live in `docs/archive/` too (`docs/archive/fanout-decisions/`). Index: `docs/README.md`.

CLI in v1: `seh install [--prefix P]` and `seh uninstall` only. Skill names in `skills/` have no prefix; install adds it (default `_`) and renders `{{prefix}}` in copied text. Never `npm install -g`. Never write to `~/.claude/` or another machine-wide path. Setup is `/<prefix>setit-se`. Git allowlist helpers and Jira Cloud REST (`jira`) are POSIX scripts under `scripts/` (installed as `.seh/scripts/`), not CLI subcommands.

## Package directories

Product sources in **this** repo are `agents/`, `packs/`, `skills/`, `brainstorm/`, `references/`, `scripts/`, and `src/` (CLI). `seh install` copies the first six into a consuming repo as `.seh/<same-name>/` and writes `.seh/VERSION`. Write files in those directories; do not invent a parallel tree and rename on copy.

## Deferred (not a backlog)

PRD **Deferred** is a **scope boundary**. They record decisions we considered and postponed. They are not tickets, not leftover audit work, and not items to implement “while here”. A ticket exists only when someone opens a **new** version scope. Read the list before new work: if it is Deferred, it is not v1.

The plan’s “Repo state before phase 1” is a historical snapshot, not TODO.

## Tests

Write tests that would fail if the promised behaviour broke, not tests that restate the code.

- Assert what a caller can observe: exit status, the `OK` / `UNCHANGED` / `BLOCKED:` contract, files, git refs, and command argv. Do not assert that the source matches the implementation you just wrote.
- Vary every input the contract claims to read. If the code must use a configured value, the fixture must not be the value someone would hardcode.
- Name the invariant, then break it in your head. If a plausible bug (hardcoded default, extra side effect, wrong target) would still pass, the test is incomplete.
- Exercise the real command. Stub only an external boundary. A scan of the implementation is not a behaviour test.

Run with `npm test`. Keep `*.test.js` next to the unit. `seh install` must not copy those files into `.seh/`.

## Versioning

The version is `version` in `package.json` (SemVer). `seh install` writes it to `.seh/VERSION`, and `/<prefix>setit-se` regenerates installed agents, skills, and packs only when that value changes. So every change to a shipped directory (`agents/`, `packs/`, `skills/`, `brainstorm/`, `references/`, `scripts/`, `src/`) needs a version bump in the same change.

- **Patch** (fix, wording, no new or removed behaviour or config key): bump without asking.
- **Minor** (new behaviour or config key, backward compatible) and **major** (removed or changed behaviour or config key, a breaking install or config change): propose the level and wait for the user's approval.
- One bump per unreleased change set: if `CHANGELOG.md` already has an entry for the current version that is not yet tagged, add to it instead of bumping again.
- Every bump adds or extends the matching `CHANGELOG.md` entry (Keep a Changelog: Added / Changed / Fixed / Removed).

## Commands

- Tests: `npm test`. See **Tests**.
- Before you finish a change to a shipped directory, update `CHANGELOG.md` under the current version (see **Versioning**). A change without a changelog line is not done.
- Do not commit unless the user asks.
- Do not edit, “improve”, or sync `README.md` with the PRD, the plan, or the code unless the user explicitly asks to change the README.
