# 05 README and guide

## Goal

Users can read how the skill works without opening the PRD.

## Scope

In:
- `docs/guide/lessons.md` (new, English): what a lesson is and is not; intent triggers and proactive offers; purpose → storage table; `docs/lessons/` layout, `LESSONS.md`, groups, "Rule" / "In this project"; rendering per host and why pack regeneration keeps lessons; acceptance, dedupe, deviations, list/change/remove; disabling via a later `/_setit-se`; one anonymised example (review fix → two lessons).
- `README.md`: one sentence about the skill and a **Guide** entry (Q8).
- `docs/guide/setup.md`: the later-run parameter `agents.lessons.enabled`.
- `docs/guide/workflow.md`: skill entry.
- `docs/guide/hosts.md`: where each host loads lessons.
- `docs/README.md`: active plan row while this plan runs.

Out: PRD (01), version and CHANGELOG (Q9).

## Decisions

Q7, Q8, Q9.

## Acceptance criteria

- [ ] `docs/guide/lessons.md` covers every item in Scope and agrees with the PRD (PRD wins on conflict).
- [ ] README change limited to one sentence plus one Guide entry.
- [ ] Example has no client, repo, or person names.
- [ ] Every new relative link resolves to an existing file/heading.
- [ ] No change to `package.json` or `CHANGELOG.md`.

## Verification

Link check (grep new links, `ls` targets); diff review against the PRD.

## Files

`docs/guide/lessons.md`, `README.md`, `docs/guide/setup.md`, `docs/guide/workflow.md`, `docs/guide/hosts.md`, `docs/README.md`.

## Depends on

04 (`done`).
