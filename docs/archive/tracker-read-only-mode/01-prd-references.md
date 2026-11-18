# 01 — PRD and references

## Goal

Admit `agents.tracker.readOnly` into the product spec and config skeletons, including the exception to "one active tracker".

## Scope in

- `docs/prd.md`:
  - Feature tracking: "One active tracker connection" gains the read-only exception (tracker = read source, files = write store, no mirroring). "Switching does not migrate" also covers toggling `readOnly`.
  - Jira tracker and Azure DevOps tracker: a `readOnly: true` paragraph (bodies and status in files, hybrid keys per Q1, `depends` rule per Q2, no create/set/comment/transition/link). Note `artifactsOnTrackerOnly` is ignored when `readOnly` is `true`.
  - Statuses: "Agents update status only on the active tracker" → in read-only, status lives in spec frontmatter (`agents.statuses`).
  - Script table (`jira` and `ado` rows): `create`/`set`/`comment`/`transition`/`link` → `BLOCKED:` with no HTTP when `readOnly`; `get` reads bodies from files when `readOnly`.
  - `/<prefix>setit-se` tracker table: Add/Change/Remove rows mention the read-only question, skipped maps, toggle (Q4).
  - Numbered invariant 14 (One tracker): add the exception in one sentence.
- `docs/implementation-plan/README.md`: product invariant "One tracker connection": one-sentence exception linking to this folder.
- `references/harness.tracker.json`, `references/harness.tracker.ado.json`: add `"readOnly": false`.
- `references/harness.config.md`: document `readOnly` (default, what it ignores, `blocker` requirement).

## Scope out

- Scripts, setup skill, agents (stages 02–04).
- README.md (stage 06).

## Decisions taken

- Q1–Q5 as in the README table. Keep PRD edits minimal: add read-only rules next to the existing `artifactsOnTrackerOnly` paragraphs, same wording shape for Jira and ADO.

## Files likely touched

- `docs/prd.md`, `docs/implementation-plan/README.md`, `references/harness.tracker.json`, `references/harness.tracker.ado.json`, `references/harness.config.md`

## Acceptance criteria

- PRD describes read-only for both Jira and ADO with Q1–Q5 semantics; no contradicting sentence left (grep "one active tracker", "only on the active tracker", "artifactsOnTrackerOnly").
- Skeletons contain `readOnly: false`; JSON stays valid.
- `harness.config.md` documents the key.

## Tests

- JSON parse of both skeletons (`node -e`) or an existing test reading them.

## Versioning

Shipped dirs (`references/`) change: minor bump, propose to user. Not recorded in the legacy plan.

## Depends on

- None.
