# Prompt — codex-support stage 05: Release

Implement stage `05` of `docs/codex-support` only. Requires stage `04` = `done` in `docs/codex-support/README.md`. If not, stop and say so.

## Repo context

- Repo: `se-harness`. `package.json` `version` is SemVer; `seh install` writes it to `.seh/VERSION`.
- Minor bump approved for the whole Codex change set (decision 7). Extend the `CHANGELOG.md` entry if the current version is untagged.
- README is updated last, Codex additions only (user request): supported hosts, `$<prefix>setit-se` invocation, trust and `/hooks` review note. No other README sync.

## Stage spec

### Goal

Ship the Codex change set.

### Scope in

- `package.json`: minor bump. `CHANGELOG.md`: Added entry covering the Codex host.
- Full `npm test`. Never fix a failure by weakening a test.
- README.md last, Codex additions only.

### Scope out

- Any other README change.

### Acceptance criteria

- `npm test` passes.
- Changelog and version match.
- README documents Codex.

### Tests

- Full `npm test`; report actual output.

### Depends on

- 04 = `done`.

## Constraints

- Do not commit unless the user asks.
- Ask one question at a time; recommended option first, labelled **(Recommended)**.

## Definition of done

- Acceptance criteria PASS with evidence; `npm test` output quoted.
- Report: changed files, deviations, unconfirmed Codex doc facts.
