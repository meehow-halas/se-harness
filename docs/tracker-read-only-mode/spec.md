# Tracker read-only mode — spec

Behaviour for an optional **read-only** mode of the external tracker (Jira or Azure DevOps). This is the **slice spec**. When it conflicts with [prd.md](../prd.md), **the PRD wins** until phase 1 updates the PRD to admit this mode.

## Problem

Some teams may let seh read their Jira / ADO but not change it: no new issues, no field edits, no comments, no transitions, no links. seh must still read tasks from the tracker ("Work on PROJ-123", "Show me task 42") and must still keep the full spec / prompt / log / status history somewhere. That somewhere is the files tracker, running alongside the read-only external tracker.

## Decisions (accepted)

| Id | Decision | Recommended (chosen) | Rejected |
|----|----------|----------------------|----------|
| Q1 | Task keys | **Hybrid.** A task that exists on the tracker uses its key for file names and branch (`docs/features/PROJ-123.feature.md`, branch `PROJ-123`). A new task with no tracker item uses a files-tracker basename (`001-feature-x`). | Tracker keys only (Architect BLOCKED for new tasks); always basename with `trackerKey` in frontmatter |
| Q2 | Status and `depends` | **Local.** Status is spec frontmatter (`agents.statuses`). A `depends` entry with a local spec must be at local `done`. A `depends` entry with no local spec that is a tracker key is read with `get`; its tracker status must equal `agents.tracker.statuses.blocker`. | Local only (missing file = BLOCKED); tracker status as gate |
| Q3 | Enforcement | **Script + agents.** `jira` / `ado` refuse every write verb with `BLOCKED:` and send no HTTP request. Agents never call write verbs. `get` and `meta` work as usual. | Agent instructions only |
| Q4 | Setup | **Ask once, skip write maps.** One question right after `meta` is `OK` (default: no = full write). On yes, skip status map `todo`…`done`, `fields`, `issueTypes` / `workItemTypes`, and `artifactsOnTrackerOnly`; ask only for `blocker` (and `fetchFields` as today). Later Change toggles the flag; ro → rw asks the missing maps. | Map everything even in read-only |
| Q5 | Switching | **No migration** (PRD "switching does not migrate"). Files stay in the repo. | Local files win after ro → rw |

## Config

| Key | Values | Default |
|-----|--------|---------|
| `agents.tracker.readOnly` | `true` \| `false` | `false` when missing (current behaviour unchanged) |

When `readOnly` is `true`:

- `artifactsOnTrackerOnly` is ignored and treated as `false` (bodies in repo files).
- `agents.tracker.statuses` needs only `blocker` (required when a `depends` entry points at a tracker key without a local spec). Other status keys are ignored.
- `fields`, `issueTypes` / `workItemTypes` are ignored and may be absent.
- `fetchFields` keeps its meaning for `get`.

Applies to both `kind: "jira"` and `kind: "ado"` with the same key and semantics.

## PRD exception: two stores at once

The PRD rule "one active tracker connection, no mirroring" gets one exception: with `readOnly: true`, the external tracker is a **read source** and the files tracker is the **write store**. Nothing is mirrored: the tracker is never written, the files hold seh's spec / prompt / log / status. Tracker data (title, description, `fetchFields`, tracker status) is input for the Architect, not copied verbatim as the spec.

## Task identity

| Situation | Key | Files | Branch |
|-----------|-----|-------|--------|
| Request names a tracker item (`PROJ-123`, ADO id `42`) | tracker key | `docs/features/<key>.feature.md`, `docs/prompt/<key>.prompt.md`, `docs/feature-log/<key>.log.md` | `<key>` |
| New task, no tracker item | files basename `NNN-<type>-<slug>` | files-tracker paths | basename (or `-N` rule) |

The Architect does not invent a tracker key and does not call `create`. Spec frontmatter `id` = the key used for the file names.

Distinguishing a key: Jira keys match the issue-key form (`[A-Z][A-Z0-9]+-[0-9]+`); ADO ids are all digits; files basenames start with a zero-padded number followed by `-` and a slug. Agents check the local file first, then call `get` only for tracker-shaped keys.

## Script surface in read-only

| Verb | `readOnly: true` |
|------|------------------|
| `meta` | unchanged |
| `get <key>` | GET the item: scalars (summary/title, status, type, description, `fetchFields`) from the tracker; `BEGIN spec` / `prompt` / `log` bodies from repo files for that key (empty if missing). Same as `artifactsOnTrackerOnly: false` today. |
| `create`, `set`, `comment`, `transition`, `link` | `BLOCKED: tracker is read-only — edit repo files (agents.tracker.readOnly)`; exit non-zero; **no HTTP request**; credentials not required for the refusal. |

The refusal is checked before credentials and before argument validation for the network call, so it is deterministic offline.

## Agent behaviour in read-only

| When | Full write (today) | Read-only |
|------|--------------------|-----------|
| Architect creates a task | `create` + `set` / files + `transition todo` | Existing tracker item: `get`, write the three files under its key. New: files basename. Status `todo` in frontmatter. |
| Architect updates spec/prompt | tracker or files | files only |
| `depends` / `relates` | `link` | frontmatter only (no link, no comment) |
| User decision `Q<n>`, reviewer report, other log rows | comment / log field | append to log file |
| Implementer / Reviewer status steps | `transition` | frontmatter `status` from `agents.statuses` |
| Reads | `get` | `get` (tracker scalars + file bodies) |

`start-task` copies the task's three files into the worktree (existing behaviour for files-tracker paths; must work for tracker-key names too).

## Setup (`/<prefix>setit-se`)

- **Add (Jira or ADO):** after `meta` is `OK`, one question: "Read-only mode — seh reads the tracker but never changes it; spec/prompt/log/status go to repo files?" Default **no**. Yes → write `readOnly: true`, ask `blocker` only (allow `null` = no tracker-key dependencies), keep `fetchFields` question. No → today's flow.
- **Change:** may toggle `readOnly`. ro → rw: ask the maps that are missing (statuses `todo`…`done`, types, `artifactsOnTrackerOnly`, fields when needed). rw → ro: keep existing maps in config untouched (unused).
- **Remove:** drops `agents.tracker` including `readOnly`.
- No agent regeneration for this key (runtime config).

## Out of scope

- Migration of files ↔ tracker on toggle.
- Read-only for trackers other than Jira / ADO.
- Partial read-only (e.g. comments allowed, transitions denied).
- README changes outside phase 6 (tracker sections only).
