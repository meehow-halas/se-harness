# Stage 5 — Release

## Goal

Ship the change set.

## In scope

- `package.json`: minor bump (approved). `CHANGELOG.md`: Added entry (extend it if the current version is untagged).
- Full `npm test`.
- **README last:** document Codex only (supported hosts, `$<prefix>setit-se` invocation, trust and `/hooks` review note). No other README sync. The user asked for this explicitly.
- Do not commit unless the user asks.

## Done when

`npm test` passes; changelog and version match; README documents Codex.
