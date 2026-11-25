# Trackers and statuses

[← README](../../README.md) · Contracts in full: [`docs/prd.md`](../prd.md)

## One active tracker

**Exactly one tracker:** files, Jira, **or** Azure DevOps, never two at once. With Jira or Azure DevOps you choose per [write action](#write-actions) what goes to the tracker; the rest stays in repo files. Spec, prompt, log and status each live in one place, never both.

Which tracker is active is in `harness.config.json`. If `agents.tracker` is present, its `kind` (`jira` or `ado`) is the active tracker; a config without `kind` is Jira. If it is absent, the files tracker is active.

Switching trackers does **not** migrate. Connect Jira or Azure DevOps → new work follows the write actions; leftover files of tasks not [bound](#binding) to an item stay as they are. Remove the tracker → new work is files only; existing tickets are not copied into files.

`CHANGELOG.md` (when [on](setup.md#change-record)) and code stay in git with every tracker. Settled brainstorm records stay under `docs/brainstorm/` (not a task tracker).

Name a task to a skill by its file basename (`001-login`), or its Jira issue key (`PROJ-12`) or Azure DevOps work item id (`1234`). See [Skills](workflow.md#skills) for examples.

Same artifact shape on both trackers (markdown files, or mapped Jira / Azure DevOps fields / description / comments):

- **Spec** — abstract, requirements, acceptance criteria, architectural decisions (choices and why, not a tutorial)
- **Prompt** — phase-grain order, what not to change; the Implementer still writes their own plan
- **Log** — `Q<n>` decisions, `C<id>` Consultant items

## Write actions

Reading a connected tracker is always on. Writes are chosen in `/_setit-se`, in one question with five actions (`agents.tracker.write`). Nothing is preselected. Reply for example `all`, `none`, or `spec, status`. The same actions apply to Jira and Azure DevOps.

| Action | On: SE Harness | Off: where it is kept |
|--------|----------------|-----------------------|
| `create` | creates the issue / work item and its links | No item and no links. The task keeps a file basename; you may [bind](#binding) it by hand. |
| `spec` | writes the spec to the item | `docs/features/<basename>.feature.md` |
| `prompt` | writes the prompt to the item | `docs/prompt/<basename>.prompt.md` |
| `log` | writes log rows and comments (`Q<n>`, Reviewer reports, failed links) | `docs/feature-log/<basename>.log.md` |
| `status` | moves the item's status | `status:` in the spec file frontmatter (`agents.statuses`). With `spec` on, that file holds frontmatter only. |

Off means not automatic: the script refuses the write with `BLOCKED:` before contacting the tracker, unless [you asked for it](setup.md#on-your-request). `ado get` / `jira get` reads each part from wherever its action puts it.

Change the actions later in `/_setit-se`. The change itself copies nothing. After you turn an action on, a bound task's local content moves to the tracker at the next step that touches it; turning one off copies nothing back to files.

### Upgrading from 1.x

2.0 replaces `agents.tracker.readOnly` with `agents.tracker.write`. Until you run `/_setit-se`, `get` and every write stop with `BLOCKED: tracker config predates 2.0 — run /_setit-se`. Setup migrates once and shows the result:

| 1.x config | 2.0 `write` |
|------------|-------------|
| `readOnly: true` | all five off |
| `readOnly: false`, or no `readOnly` | all five on |

An action turned on by the migration that lacks a mapping asks for it.

## Binding

A task is **bound** to an item when `tracker:` in its spec frontmatter holds the key, or its file basename is the key. An unbound task keeps everything, status included, in repo files, whatever the actions say.

- **Naming.** An existing item gives the task its key as name and branch. A new task with `create` on: the item is created first and the key is the name. With `create` off it gets a file basename (`001-feature-x`) and an empty `tracker:`.
- **Binding later.** Set `tracker:` by hand, or let SE Harness create the item. The basename and branch never change.
- **Local spec file.** With `spec` on, a bound task keeps one only when its basename differs from the key or `status` is off. It holds frontmatter only.
- **Moving content.** At the first step that touches a bound task with local spec, prompt or log for an action that is on, that content is written to the tracker once, and the local copies are removed. With `status` on, a `status:` line left in the local spec is moved the same way: the item gets that status and the line is removed. Content of actions that are off stays local. If both the tracker and the file have content, the step stops with `BLOCKED:` and overwrites nothing; a log kept in comments (or ADO history) is simply added there. A failed write leaves the files in place.

**Dependencies.** `depends` reads each status where that task keeps it: the tracker (must equal the mapped `blocker`) for a bound task with `status` on, otherwise the local frontmatter (must be done). A tracker key that no local spec holds is always checked on the tracker.

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
- `read:jira-work`: read issues, comments, statuses, transitions, and field metadata. Enough when every write action is off.
- `write:jira-work`: create and edit issues, add comments, transition issues, link issues. Needed for any write action, on or on request.

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

Project permissions the user also needs in the Jira project: Browse projects (without it the project looks missing even when the key is right); Create issues and Edit issues; Transition issues; Add comments; Link issues. The write permissions are needed only for writes you turn on or ask for.

**Add** (no tracker yet, or you accept the first-run offer). One question at a time: URL, user, project key. Setup creates `harness.credentials.local.json` with an empty `jiraToken` if the file is missing; put the token there and confirm. Setup runs `.seh/scripts/jira meta`, which lists the project's statuses, issue types, and fields, then asks the [write actions](#write-actions). Then it maps only what the enabled actions need, one question per group: `status` → each workflow step `todo`, `inProgress`, `codeReview`, `inReview`, `done` to a status from that list, or skip = `null`; `spec` / `prompt` / `log` → where each lives (a custom field, description, or comments); `create` → issue types for `feature` and `bug`. `blocker` (if you use `depends`) and `fetchFields` are always asked. Agents transition only to those exact strings; they do not invent Jira status names.

`null` means that step does not call a Jira transition. There is no file fallback for it. If a mapped status is missing from that issue type’s workflow, work stops — fix the mapping in `/_setit-se`.

**Change** (tracker already there): change the integration (same mapping questions; token stays unless you rotate it in the credentials file), toggle write actions (a newly enabled one asks only for its missing maps), or remove it.

**Remove:** confirm, drop `agents.tracker` from config, delete or clear `harness.credentials.local.json`. The project is files-only again. A first-run decline (`jiraOffer: declined`) does not block a later add.

Task key = issue key (`PROJ-123`), or a file basename with the key in `tracker:` (see [Binding](#binding)). For an action that is on, agents do not create or edit the matching file in `docs/features/`, `docs/prompt/`, or `docs/feature-log/` (except the frontmatter-only spec). With `status` on, `agents.statuses` is not written onto the ticket.

The table shows a bound task with every action on. A row whose [action](#write-actions) is off writes to repo files instead.

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
| Acceptance, after the last enabled [git operation](setup.md#git-operations) | Transition to mapped `done` when not `null`. |

## Azure DevOps tracker

Connect, change, or remove only through `/_setit-se` (`"connect Azure DevOps"` / the first-run offer). There is no `seh` CLI for it. Agents and setup call `.seh/scripts/ado` (Azure DevOps Boards, WIT REST `api-version=7.1`). They do not use MCP, `az boards`, or `curl`.

Credentials: you put the PAT in the same ignored file `harness.credentials.local.json`:

```json
{ "adoPat": "…" }
```

Never paste the PAT in chat. Never write it into git or `harness.config.json`. Organization URL, project, and field mapping live in config under `agents.tracker` (`kind: "ado"`; skeleton `.seh/references/harness.tracker.ado.json`).

**Add.** One question at a time: `organizationUrl` (`https://dev.azure.com/{org}`, no trailing slash), then `project` (name or GUID). Setup creates `harness.credentials.local.json` with an empty `adoPat` if the file is missing (an existing file is never overwritten). You paste the PAT there and confirm. Setup runs `.seh/scripts/ado meta`; on `BLOCKED:` you fix the PAT, URL, or project and it retries until `OK`. Then it asks the [write actions](#write-actions).

Then only the maps the enabled actions need, one question per group: `status` → `todo`, `inProgress`, `codeReview`, `inReview`, `done` to an exact state name from the `meta` list (numbered), or skip = `null`; `spec` / `prompt` / `log` → `fields.*` (a field `referenceName`, `description`, `comment`, or `history`); `create` → `workItemTypes.feature` / `.bug`. `blocker` (if you use `depends`) and `fetchFields` are always asked. Agents transition only to mapped states. The state list is the union over all work item types: a state missing on a given type makes `ado transition` stop with `BLOCKED:` for that type.

`null` means that step does not change state. No file fallback. Current state already equal to the target → `UNCHANGED`. ADO has no transitions API: the script PATCHes `System.State` and ADO rejects illegal moves.

**Change:** change the mapping, rotate the PAT in the credentials file, or toggle write actions (a newly enabled one asks only for its missing maps). Switching to Jira = Remove, then Add (no migration).

**Remove:** confirm, drop `agents.tracker`, delete or clear the `adoPat` key in `harness.credentials.local.json`. Files-only again. A first-run decline does not block a later add.

Task key = numeric work item id, or a file basename with the id in `tracker:` (see [Binding](#binding)). Branch and worktree name = the basename. For an action that is on, agents do not create or edit the matching repo file (except the frontmatter-only spec).

ADO stores HTML; `ado get` returns plain text, and `ado set` writes plain text as minimal HTML. `ado set log` appends (a `history` mapping or a `comment` mapping adds an entry). With `status` on, `agents.statuses` is not written onto the work item.

`ado create` makes the work item (type from `workItemTypes`); the Architect then sets `todo` with `ado transition`. Lifecycle rows are the same as the Jira table above, with comments via `ado comment` and `depends` / `relates` via `ado link` (if linking fails, a log entry says so and the task continues). Reviewer ❌ moves the item back to `inProgress`.

Auth: PAT from `adoPat`, Basic with empty user, passed to curl through a temp config, never in argv. Cloud (`dev.azure.com`) is the supported shape; `api-version=7.1` is pinned in the script. Azure DevOps Server is not covered.

## Statuses

The five workflow steps are the same on every tracker. In repo files (files tracker, `status` off, or an unbound task) the labels are the strings in `agents.statuses`. On Jira and Azure DevOps with `status` on, each step uses the mapped `agents.tracker.statuses` name (or is skipped when that key is `null`).

```text
todo → in progress → implemented → in review → done
```

| Status | Meaning | Who may run |
|--------|---------|-------------|
| `todo` | Spec and prompt exist or are being written. Architect does not advance past this. | Architect; then Implementer |
| `in progress` | Implementation + Consultant loop. | Implementer (+ Consultant, launched by them) |
| `implemented` | Implementation finished; the Reviewer may start. | Implementer (end of its run) |
| `in review` | A review round is running or waiting for your acceptance. ❌ moves it back to `in progress`. | Reviewer |
| `done` | Clean review accepted and every enabled [git operation](setup.md#git-operations) finished (by default commit, push, PR). The feature is finished. | Reviewer, at acceptance |

You merge the PR on GitHub (`/_shipit` merges it for you). The merge does not change the status; `done` is already set. Without git, or with operations off, the statuses are the same; only those git actions are skipped.
