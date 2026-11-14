# Prompt — tracker-read-only-mode stage 01: PRD and references

Implement stage `01` of `docs/tracker-read-only-mode` only. Stage 01 has no dependencies.

## Repo context

- Repo: `se-harness`. CLI in v1: `seh install` and `seh uninstall` only. No global install, no machine-wide paths.
- `docs/prd.md` wins until this stage updates it. Read it first.
- Read-only mode: `agents.tracker.readOnly` (`true` | `false`, missing = `false`) for `kind: "jira"` and `kind: "ado"`. With `true`, the tracker is a read source and the repo files are the write store. Nothing is mirrored.
- Settled decisions Q1–Q5 (do not reopen):
  - Q1 task keys: hybrid. Existing tracker item → tracker key for files and branch (`docs/features/PROJ-123.feature.md`, branch `PROJ-123`). New task → files basename (`001-feature-x`).
  - Q2 status and `depends`: local. Status is spec frontmatter (`agents.statuses`). `depends` with local spec → local `done`. `depends` with no local spec and tracker key → `get`; tracker status must equal `agents.tracker.statuses.blocker`.
  - Q3 enforcement: script + agents. `jira` / `ado` refuse every write verb with `BLOCKED:`, no HTTP.
  - Q4 setup: ask once, skip write maps on yes.
  - Q5 switching: no migration.
- Versioning (CLAUDE.md): `references/` is shipped. Minor bump for new config key → propose to user; do not bump silently.

## Stage spec

### Goal

Admit `agents.tracker.readOnly` into the product spec and config skeletons, including the exception to "one active tracker".

### Scope in

- `docs/prd.md`:
  - Feature tracking: "One active tracker connection" gains the read-only exception (tracker = read source, files = write store, no mirroring). "Switching does not migrate" also covers toggling `readOnly`.
  - Jira tracker and Azure DevOps tracker: a `readOnly: true` paragraph (bodies and status in files, hybrid keys per Q1, `depends` rule per Q2, no create/set/comment/transition/link). Note `artifactsOnTrackerOnly` is ignored when `readOnly` is `true`.
  - Statuses: "Agents update status only on the active tracker" → in read-only, status lives in spec frontmatter (`agents.statuses`).
  - Script table (`jira` and `ado` rows): `create`/`set`/`comment`/`transition`/`link` → `BLOCKED:` with no HTTP when `readOnly`; `get` reads bodies from files when `readOnly`.
  - `/<prefix>setit-se` tracker table: Add/Change/Remove rows mention the read-only question, skipped maps, toggle (Q4).
  - Numbered invariant 14 (One tracker): add the exception in one sentence.
- `docs/implementation-plan/README.md`: product invariant "One tracker connection": one-sentence exception linking to `docs/tracker-read-only-mode/`.
- `references/harness.tracker.json`, `references/harness.tracker.ado.json`: add `"readOnly": false`.
- `references/harness.config.md`: document `readOnly` (default, what it ignores, `blocker` requirement).

### Scope out

- Scripts, setup skill, agents (stages 02–04).
- `README.md` (stage 06).

### Decisions taken

- Keep PRD edits minimal: add read-only rules next to the existing `artifactsOnTrackerOnly` paragraphs, not rewriting sections. Same wording shape for Jira and ADO.

### Files likely touched

- `docs/prd.md`, `docs/implementation-plan/README.md`, `references/harness.tracker.json`, `references/harness.tracker.ado.json`, `references/harness.config.md`

### Acceptance criteria

- PRD describes read-only for both Jira and ADO with Q1–Q5 semantics; no contradicting sentence left (grep "one active tracker", "only on the active tracker", "artifactsOnTrackerOnly").
- Skeletons contain `readOnly: false`; JSON stays valid.
- `harness.config.md` documents the key.

### Tests

- JSON parse of both skeletons (`node -e`) or an existing test reading them.

### Depends on

- None.

## Constraints

- Do not edit `README.md`. Do not commit unless the user asks.
- Do not touch `.env` files. Do not write to `~/.claude/`.
- Ask one question at a time if a choice is not covered; recommended option first, labelled **(Recommended)**.

## Definition of done

- Acceptance criteria PASS with evidence (grep output, file:line, JSON parse output).
- `CHANGELOG.md` updated under the current version when shipped dirs change.
- Report: changed files, criteria PASS/GAP, deviations.
