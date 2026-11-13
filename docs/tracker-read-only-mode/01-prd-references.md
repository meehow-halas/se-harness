# Phase 1 — PRD + references

## Goal

Admit `agents.tracker.readOnly` into the product spec and config skeletons, including the exception to "one active tracker".

## In scope

- `docs/prd.md`:
  - **Feature tracking**: "One active tracker connection" gains the read-only exception (tracker = read source, files = write store, no mirroring). "Switching does not migrate" also covers toggling `readOnly`.
  - **Jira tracker** and **Azure DevOps tracker**: a `readOnly: true` paragraph (bodies and status in files, hybrid keys per Q1, `depends` rule per Q2, no create/set/comment/transition/link). Note `artifactsOnTrackerOnly` is ignored when `readOnly` is `true`.
  - **Statuses**: "Agents update status only on the active tracker" → in read-only, status lives in spec frontmatter (`agents.statuses`).
  - **Script table** (`jira` and `ado` rows): `create`/`set`/`comment`/`transition`/`link` → `BLOCKED:` with no HTTP when `readOnly`; `get` reads bodies from files when `readOnly`.
  - **`/<prefix>setit-se` tracker table**: Add/Change/Remove rows mention the read-only question, skipped maps, toggle (Q4).
  - Numbered invariant **14 (One tracker)**: add the exception in one sentence.
- `docs/implementation-plan.md`: product invariant "One tracker connection" — one-sentence exception linking here.
- `references/harness.tracker.json`, `references/harness.tracker.ado.json`: add `"readOnly": false`.
- `references/harness.config.md`: document `readOnly` (default, what it ignores, `blocker` requirement).

## Out of scope

- Scripts, setup skill, agents (phases 2–4).
- `README.md` (phase 6).

## Done when

- PRD describes read-only for both Jira and ADO with Q1–Q5 semantics and no contradicting sentence left (grep "one active tracker", "only on the active tracker", "artifactsOnTrackerOnly").
- Skeletons contain `readOnly: false`; existing JSON stays valid (`node -e 'JSON.parse(...)'` or any test reading them passes).
- `harness.config.md` documents the key.
