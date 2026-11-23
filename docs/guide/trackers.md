# Trackers and statuses

[← README](../../README.md) · Contracts in full: [`docs/prd.md`](../prd.md)

## One active tracker

**Exactly one tracker:** files, Jira, **or** Azure DevOps, never two at once. Agents write spec, prompt, log, and status to the active tracker only. They do not mirror. The one exception is read-only mode (below): the tracker is only read, and spec, prompt, log, and status are written to repo files.

Which tracker is active is in `harness.config.json`. If `agents.tracker` is present, its `kind` (`jira` or `ado`) is the active tracker; a config without `kind` is Jira. If it is absent, the files tracker is active.

Jira and Azure DevOps run in one of two modes, chosen in `/_setit-se` right after you pick the tracker (`agents.tracker.readOnly`):

- **Full write** (default, `readOnly: false`): SE Harness creates items, writes spec, prompt, and log on them, and moves statuses. No repo files for tasks.
- **Read-only** (`readOnly: true`): SE Harness only reads the tracker, e.g. so you can point the Architect at an existing item. It never creates, edits, comments, transitions, or links. Spec, prompt, log, and status live in repo files, as with the files tracker, named by the item key when the task exists on the tracker.

Switching does **not** migrate. Connect Jira or Azure DevOps → new work is tickets / work items only; leftover `docs/features` (etc.) are ignored. Remove the tracker → new work is files only; existing tickets are not copied into files.

`CHANGELOG.md` and code stay in git on both modes. Settled brainstorm records stay under `docs/brainstorm/` (not a task tracker).

Name a task to a skill with the **active** tracker’s key: a file basename (`001-login`) or a Jira issue key (`PROJ-12`), or an Azure DevOps work item id (`1234`). See [Skills](workflow.md#skills) for examples.

Same artifact shape on both trackers (markdown files, or mapped Jira / Azure DevOps fields / description / comments):

- **Spec** — abstract, requirements, acceptance criteria, architectural decisions (choices and why, not a tutorial)
- **Prompt** — phase-grain order, what not to change; the Implementer still writes their own plan
- **Log** — `Q<n>` decisions, `C<id>` Consultant items

## Files tracker (default)

One task = three files, same basename (example `001-feature-example-name`):

| Path | Role |
|------|------|
| `docs/features/<basename>.feature.md` | Spec |
| `docs/prompt/<basename>.prompt.md` | Implementation prompt |
| `docs/feature-log/<basename>.log.md` | Append-only log |

Task key = basename. Branch name = basename.

Status lives in the spec file frontmatter. The strings come from `agents.statuses` in config. Do not translate them from the conversation language. Change those strings with `/_setit-se` (config only).

When Implementer or Reviewer starts a worktree, `start-task` copies this task’s three files from the launch working tree into the worktree when they exist there, and removes their uncommitted copies from the launch working tree. From then on the task's files live in the worktree, and after the PR on the task branch.

## Jira tracker

Connect, change, or remove only through `/_setit-se` (`"connect Jira"` / the first-run offer). There is no `seh` CLI for Jira. Agents and setup call `.seh/scripts/jira` (Jira Cloud REST). They do not use MCP and do not compose `curl`.

Credentials: you put the token in a project-local ignored file `harness.credentials.local.json`:

```json
{ "jiraToken": "…" }
```

`seh install` already ignores that filename. Never paste the token in chat. Never write it into git or `harness.config.json`. Project key and field mapping live in config under `agents.tracker`.

**Scoped token (optional, safer).** Instead of a full-access token, create a Jira Cloud API token with scopes. Scopes are an upper limit; the user also needs the project permissions below.

Classic scopes (recommended by Atlassian):
- `read:jira-work`: read issues, comments, statuses, transitions, and field metadata. Enough for read-only mode.
- `write:jira-work`: create and edit issues, add comments, transition issues, link issues. Needed for full write only.

Granular scopes (use only if classic scopes are not allowed):
- `read:issue:jira`, `read:issue-meta:jira`, `read:issue-type:jira`, `read:field-configuration:jira`: read issue data and field/type metadata.
- `read:issue.transition:jira`, `read:status:jira`, `read:issue-status:jira`: read available transitions and status names.
- `read:comment:jira`: read comments.
- `read:project:jira`: read project data; needed to check that the project key exists during `meta`.
- `write:issue:jira`: create and edit issues.
- `write:comment:jira`: add comments.
- `write:issue.property:jira`: set issue properties during transitions.
- `write:issue-link:jira`: link issues.

Atlassian does not state whether all granular scopes are required or any one suffices, so use classic scopes unless you must use granular ones and verify the result.

Project permissions the user also needs in the Jira project: Browse projects (without it the project looks missing even when the key is right); Create issues and Edit issues; Transition issues; Add comments; Link issues (full write only).

**Add** (no tracker yet, or you accept the first-run offer). First: read-only mode, yes or no (see [One active tracker](#one-active-tracker)). Then, either way, one question at a time: URL, user, project key. Put the token in `harness.credentials.local.json`. Setup writes those keys, then `.seh/scripts/jira meta` lists that project’s statuses, issue types, and fields. Read-only: map only `blocker` (if you use `depends`) and `fetchFields`; status moves are writes, so nothing else is mapped. Full write: map each workflow step `todo`, `inProgress`, `codeReview`, `inReview`, `done` to a status from that list, or skip = `null`. Map `blocker` if you use `depends`. Map where spec and prompt live (two custom fields, description, or comments) and issue types for `feature` and `bug`. Agents transition only to those exact strings; they do not invent Jira status names.

`null` means that step does not call a Jira transition. There is no file fallback. If a mapped status is missing from that issue type’s workflow, work stops — fix the mapping in `/_setit-se`.

**Change** (tracker already there): change the integration (same mapping questions; token stays unless you rotate it in the credentials file), toggle read-only (to full write asks the maps still missing; no migration), or remove it.

**Remove:** confirm, drop `agents.tracker` from config, delete or clear `harness.credentials.local.json`. The project is files-only again. A first-run decline (`jiraOffer: declined`) does not block a later add.

**Read-only mode** (`readOnly: true`): `jira get <key>` reads the issue fields from Jira. Spec, prompt, and log come from `docs/features/`, `docs/prompt/`, and `docs/feature-log/` for that key, with status in spec frontmatter. `jira create`, `set`, `comment`, `transition`, and `link` are `BLOCKED:` before any HTTP request. Setup maps only `blocker` and `fetchFields`. The table below applies to full write only.

Task key = issue key (`PROJ-123`). Branch name = that key. Full write: spec, prompt, log, and status live **only** on the ticket. Agents do not create or edit `docs/features/`, `docs/prompt/`, or `docs/feature-log/` while Jira is active. While Jira is the tracker, `agents.statuses` is not written onto the ticket. After Remove, file-tracker strings from `agents.statuses` apply again.

| When | On the ticket |
|------|----------------|
| Architect creates the task | Create issue (`feature` / `bug` type from mapping). Title. Spec and prompt where mapping says. Transition to mapped `todo` when not `null`. |
| Architect updates spec or prompt | Overwrite the mapped spec/prompt location. |
| Implementer starts | Transition to mapped `inProgress` when not `null`. |
| Consultant pass | Nowhere (noise). |
| User decision `Q<n>` and other log rows | Comment, or the mapped log field if one exists. |
| Implementer finishes | Transition to mapped `codeReview` when not `null`. |
| Reviewer starts a round | Transition to mapped `inReview` when not `null`. |
| Reviewer sends the task back (❌) | Transition to mapped `inProgress` when not `null`. |
| Reviewer report (✅/❌/⚠️) | Comment. |
| Acceptance (clean review, PR opened) | Transition to mapped `done` when not `null`. |

## Azure DevOps tracker

Connect, change, or remove only through `/_setit-se` (`"connect Azure DevOps"` / the first-run offer). There is no `seh` CLI for it. Agents and setup call `.seh/scripts/ado` (Azure DevOps Boards, WIT REST `api-version=7.1`). They do not use MCP, `az boards`, or `curl`.

Credentials: you put the PAT in the same ignored file `harness.credentials.local.json`:

```json
{ "adoPat": "…" }
```

Never paste the PAT in chat. Never write it into git or `harness.config.json`. Organization URL, project, and field mapping live in config under `agents.tracker` (`kind: "ado"`; skeleton `.seh/references/harness.tracker.ado.json`).

**Add.** First: read-only mode, yes or no (see [One active tracker](#one-active-tracker)). Then, either way, one question at a time: `organizationUrl` (`https://dev.azure.com/{org}`, no trailing slash), then `project` (name or GUID). Setup creates `harness.credentials.local.json` with an empty `adoPat` if the file is missing (an existing file is never overwritten). You paste the PAT there and confirm. Setup runs `.seh/scripts/ado meta`; on `BLOCKED:` you fix the PAT, URL, or project and it retries until `OK`.

Read-only: map only `blocker` (if you use `depends`) and `fetchFields`. Full write: map `todo`, `inProgress`, `codeReview`, `inReview`, `done` to an exact state name from the `meta` list (numbered), or skip = `null`. Map `blocker` if you use `depends`. Map `workItemTypes.feature` / `.bug`. Map where spec, prompt, and optional log live (`fields.*`: a field `referenceName`, `description`, `comment`, or `history`). Agents transition only to mapped states. The state list is the union over all work item types: a state missing on a given type makes `ado transition` stop with `BLOCKED:` for that type.

`null` means that step does not change state. No file fallback. Current state already equal to the target → `UNCHANGED`. ADO has no transitions API: the script PATCHes `System.State` and ADO rejects illegal moves.

**Change:** change the mapping, rotate the PAT in the credentials file, or toggle read-only (to full write asks the maps still missing; no migration). Switching to Jira = Remove, then Add (no migration).

**Remove:** confirm, drop `agents.tracker`, delete or clear the `adoPat` key in `harness.credentials.local.json`. Files-only again. A first-run decline does not block a later add.

**Read-only mode** (`readOnly: true`): `ado get <id>` reads the work item fields from Azure DevOps. Spec, prompt, and log come from `docs/features/`, `docs/prompt/`, and `docs/feature-log/` for that id, with status in spec frontmatter. `ado create`, `set`, `comment`, `transition`, and `link` are `BLOCKED:` before any HTTP request. Setup maps only `blocker` and `fetchFields`. The paragraphs below apply to full write only, except where they say otherwise.

Task key = numeric work item id. Branch and worktree name = that id.

Full write: spec, prompt, and log live **only** on the work item. ADO stores HTML; `ado get` returns plain text, and `ado set` writes plain text as minimal HTML. `ado set log` appends (a `history` mapping or a `comment` mapping adds an entry). `agents.statuses` is not written onto the work item. Read-only: they live in `docs/features/<id>.feature.md`, `docs/prompt/<id>.prompt.md`, `docs/feature-log/<id>.log.md`, with status in spec frontmatter (`agents.statuses`); `ado get` reads those files and every `ado` write verb is `BLOCKED:`.

`ado create` makes the work item (type from `workItemTypes`); the Architect then sets `todo` with `ado transition`. Lifecycle rows are the same as the Jira table above, with comments via `ado comment` and `depends` / `relates` via `ado link` (if linking fails, a comment says so and the task continues). Reviewer ❌ moves the item back to `inProgress`.

Auth: PAT from `adoPat`, Basic with empty user, passed to curl through a temp config, never in argv. Cloud (`dev.azure.com`) is the supported shape; `api-version=7.1` is pinned in the script. Azure DevOps Server is not covered.

## Statuses

The five workflow steps are the same on every tracker. On files, the labels are the strings in `agents.statuses`. On Jira and Azure DevOps, each step uses the mapped `agents.tracker.statuses` name (or is skipped when that key is `null`).

```text
todo → in progress → implemented → in review → done
```

| Status | Meaning | Who may run |
|--------|---------|-------------|
| `todo` | Spec and prompt exist or are being written. Architect does not advance past this. | Architect; then Implementer |
| `in progress` | Implementation + Consultant loop. | Implementer (+ Consultant, launched by them) |
| `implemented` | Implementation finished; the Reviewer may start. | Implementer (end of its run) |
| `in review` | A review round is running or waiting for your acceptance. ❌ moves it back to `in progress`. | Reviewer |
| `done` | Clean review accepted: commit + push + PR opened (git disabled: changelog only). The feature is finished. | Reviewer, at acceptance |

You merge the PR on GitHub (`/_shipit` merges it for you). The merge does not change the status; `done` is already set. Without git the statuses are the same; only the git actions are skipped.
