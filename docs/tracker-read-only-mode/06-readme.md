# Phase 6 — README

## Goal

User-facing `README.md` describes read-only mode for Jira and Azure DevOps. This phase is the **explicit user request** to change the README for this initiative (AGENTS.md: README is edited only when the user asks).

## In scope

`README.md` only, sections that already cover trackers:

- **2. Setup** (first-run summary) and **`/_setit-se` → First run / What you can set or change**: the tracker offer includes the read-only question; Change can toggle it.
- **Trackers and statuses → One active tracker**: the read-only exception (tracker read, files written, no mirroring); switching / toggling does not migrate; task naming per Q1 (tracker key for existing items, basename for new ones).
- **Jira tracker** and **Azure DevOps tracker**: a short "Read-only mode" paragraph each — what seh still reads (`get`), what it never does (create, edit, comment, transition, link), where spec / prompt / log / status live, `blocker` for `depends` (Q2), what setup skips (Q4).
- Disambiguate the existing ADO/Jira wording that calls `artifactsOnTrackerOnly: false` "use the tracker only to read task info": that mode still creates items and transitions; point to read-only mode for "never change the tracker".
- **Agents** table / Architect line "on the **active tracker**": add the read-only case in a few words if the sentence would otherwise be false.

## Out of scope

- Rewriting unrelated README sections, re-syncing README with the whole PRD.
- New examples beyond one trigger phrase (e.g. "connect Jira read-only").

## Done when

- README says the same as PRD and `/_setit-se` after phases 1–4 for read-only; no sentence left that claims seh always writes to the active tracker.
- Only tracker-related sections changed (`git diff README.md` limited to them).
