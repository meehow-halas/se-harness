# Prompt — fanout-decisions stage 01: Fan-out decisions

Historical record. Status `done` (manual test recorded). Use this prompt only to verify the record against the normative files or to extend it when fan-out changes.

## Repo context

- Repo `se-harness`. Normative fan-out files: `references/session-fanout.md`, `references/hosts.json`, `skills/*`, `scripts/fanout-plan`, `scripts/start-task`, `scripts/open-pr`.
- Read `docs/prd.md` first. PRD wins.
- Versioning: any shipped change → version bump in the same change (CLAUDE.md).

## Stage spec (summary)

Goal: record fan-out decisions (what fan-out is; `sessionSpawn`; status flow; acceptance and approval; branches and PRs; language; models; testing; pitfalls; v1 out-of-scope). Full text in `01-decisions.md`.

## Constraints

- Do not commit unless the user asks. Do not edit `README.md`.
- Ask one question at a time; recommended option first, labelled **(Recommended)**.

## Definition of done

- Each decision in the record matches the normative files, with file:line evidence; mismatches reported, not silently fixed.
