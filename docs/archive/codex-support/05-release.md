# 05 — Release

## Goal

Ship the Codex change set.

## Scope in

- `package.json`: minor bump (approved). `CHANGELOG.md`: Added entry covering the Codex host (extend the entry if the current version is untagged).
- Full `npm test`. Never fix a failure by weakening a test.
- README last: document Codex only (supported hosts, `$<prefix>setit-se` invocation, trust and `/hooks` review note). No other README sync (user asked explicitly).

## Scope out

- Any other README change.

## Decisions taken

- Minor version bump (approved, decision 7).

## Files likely touched

- `package.json`, `CHANGELOG.md`, `README.md`

## Acceptance criteria

- `npm test` passes.
- Changelog and version match.
- README documents Codex.

## Tests

- Full `npm test`; report actual output.

## Versioning

Minor bump in `package.json` and `CHANGELOG.md` (this stage owns it).

## Depends on

- 04 = `done`.
