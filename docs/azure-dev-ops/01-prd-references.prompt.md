# Prompt — azure-dev-ops stage 01: PRD admission and references

Implement stage `01` of `docs/azure-dev-ops` only. Stage 01 has no dependencies.

## Repo context

- Repo: `se-harness`. Product sources: `agents/`, `packs/`, `skills/`, `brainstorm/`, `references/`, `scripts/`, `src/`. CLI in v1: `seh install` and `seh uninstall` only. No `seh ado`.
- Azure DevOps (ADO) is an optional tracker. Recommended architecture: REST `api-version=7.1`; POSIX `sh` + `curl` + Node helper; PAT in `harness.credentials.local.json` as `adoPat`; transient `curl --config`; numeric work item id as task key.
- Config: `agents.tracker.kind` = `"jira"` | `"ado"`. Missing `kind` with `url` + `user` = Jira.
- Contract: `OK` / `UNCHANGED` / `BLOCKED:`. Token never in argv, stdout, chat, or git.
- Read `docs/prd.md` first. PRD wins over this file. Do not implement PRD Deferred items outside this stage.
- Versioning (CLAUDE.md): changes to shipped dirs need a version bump in the same change; minor → propose to the user, do not bump silently.

## Stage spec

### Goal

Move Azure DevOps from "idea in chat" to documented product scope: PRD admits one `ado` tracker, references ship a config skeleton, docs point agents at a future `scripts/ado`.

### Scope in

- PRD: remove ADO from Deferred (or narrow Deferred to "other trackers"); add `ado` script table rows parallel to `jira`; `/<prefix>setit-se` tracker section for ADO; one-tracker rule includes `kind`.
- `agents.tracker.kind`: `"jira"` | `"ado"` (existing projects without `kind` treated as Jira when `url` + `user` present).
- `references/harness.tracker.ado.json` skeleton (field names per the config shape below).
- `references/harness.config.md`: document `kind`, `adoPat`, mutual exclusion with Jira fields.
- `references/harness.tracker.json`: `"kind": "jira"` note or field for new setups (backward compatible).
- Short cross-link from `docs/implementation-plan/README.md` ("Out of this v1 plan" or a "Post-v1" line, one paragraph).

Config shape (`agents.tracker`, `kind: "ado"`): `organizationUrl`, `project`, `workItemTypes.feature` / `.bug`, `fields.spec` / `prompt` / `log` (`referenceName`, `description`, `comment`, or `history`), `fetchFields`, `statuses` (`todo`, `inProgress`, `codeReview`, `inReview`, `done`, `blocker` → state string or `null`), `artifactsOnTrackerOnly` (default `true`).

### Scope out

- Implementing `scripts/ado`.
- Changing live `harness.config.json` in consuming repos.
- README.md unless the user asks.

### Decisions taken

- `kind` values `"jira"` | `"ado"`; missing `kind` with `url` + `user` = Jira (backward compatible). Recommended.

### Files likely touched

- `docs/prd.md`
- `references/harness.tracker.ado.json` (new)
- `references/harness.config.md`
- `references/harness.tracker.json`
- `docs/implementation-plan/README.md` (cross-link only)

### Acceptance criteria

- PRD explicitly allows files | Jira | ADO, still exactly one external tracker.
- Skeleton is valid JSON; field names match the config shape above.
- No implementation code in `scripts/ado` (stage 02+).

### Tests

- JSON validity of the skeleton (`node -e` parse or existing test). No behaviour tests in this stage.

### Versioning

Changes `references/` (shipped). Patch bump without asking if wording only; minor (new config key `kind`, `adoPat`) → propose the level and wait for the user.

### Depends on

- None.

## Constraints

- Do not commit unless the user asks.
- Do not touch `.env` files. Do not write to `~/.claude/` or other machine-wide paths.
- Do not edit repo-root `README.md`.
- Ask the user one question at a time if a design choice is not covered above; recommended option first.

## Definition of done

- All acceptance criteria verified against files, with evidence (file:line or command output).
- Skeleton JSON validated.
- `CHANGELOG.md` updated under the current version if a shipped dir changed.
- Report: list of changed files, criteria PASS/GAP, any deviations.
