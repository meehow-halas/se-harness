# 06 — README

## Goal

User-facing `README.md` describes read-only mode for Jira and Azure DevOps. This stage is the explicit user request to change the README for this initiative (CLAUDE.md: README is edited only when the user asks).

## Scope in

`README.md`, tracker-related sections only:

- Setup (first-run summary) and the `/_setit-se` First run / What you can set or change: the tracker offer includes the read-only question; Change can toggle it.
- Trackers and statuses → One active tracker: the read-only exception (tracker read, files written, no mirroring); switching / toggling does not migrate; task naming per Q1.
- Jira tracker and Azure DevOps tracker: a short "Read-only mode" paragraph each: what seh still reads (`get`), what it never does (create, edit, comment, transition, link), where spec / prompt / log / status live, `blocker` for `depends` (Q2), what setup skips (Q4).
- Disambiguate the existing wording that calls `artifactsOnTrackerOnly: false` "use the tracker only to read task info": that mode still creates items and transitions; point to read-only mode for "never change the tracker".
- Agents table / Architect line "on the active tracker": add the read-only case in a few words if the sentence would otherwise be false.

## Scope out

- Rewriting unrelated README sections; re-syncing README with the whole PRD.
- New examples beyond one trigger phrase (e.g. "connect Jira read-only").

## Decisions taken

- Match the README's existing tone and the `_` default prefix used in it.

## Files likely touched

- `README.md`

## Acceptance criteria

- README says the same as PRD and `/_setit-se` for read-only; no sentence left that claims seh always writes to the active tracker.
- Only tracker-related sections changed (`git diff README.md` limited to them).

## Tests

- Grep and diff review; no `npm test` requirement.

## Versioning

Docs only; no bump beyond the owning stages.

## Depends on

- 05 = `done`.
