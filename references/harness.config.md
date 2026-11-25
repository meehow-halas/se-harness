# `harness.config.json` skeleton

Source of truth at run time is the live project-root `harness.config.json` (valid JSON). `/{{prefix}}setit-se` writes it from this skeleton plus answers. Agents and `.seh/scripts/` **read** that live file.

Parseable defaults: `harness.config.json` in this directory. External tracker shape: `harness.tracker.json` for Jira (`kind`: `"jira"`) or `harness.tracker.ado.json` for Azure DevOps Boards (`kind`: `"ado"`). Copy the matching object to `agents.tracker` only when that tracker is connected; omit `agents.tracker` on the files tracker. Exactly one external tracker per project — never Jira and ADO together. Legacy configs without `kind` are treated as Jira when `url` and `user` are present. Never put credentials in either file (tokens live in a local ignored file; never in git, never in chat).

`seh.generatedFrom` is set by setup to the contents of `.seh/VERSION`. `seh.generatedPrefix` is set by setup to the contents of `.seh/PREFIX` (the skill-name prefix; may be empty). `agents.baseBranch` has no value until setup asks (suggested default `dev`). **Empty string or `null` disables git** for the harness: no worktrees, branches, commits or PRs; tasks run sequentially; the git scripts print `UNCHANGED` + `git: disabled`. Setup leaves it empty when the project has no git repo or the user answers “no git”. Optional role `rules`; reviewer may use `checklist`. `jiraOffer` is `declined` when they decline the first offer (`null` until then). `agents.brainstorm.consult` is `any` | `significant` (default if unset) | `broad`. `agents.git` (booleans `worktree`, `commit`, `push`, `pr`) says which git operations seh runs; setup asks it in one question when a base branch is set. With a base branch and no `agents.git` all four are `true` (a later `/{{prefix}}setit-se` asks once); with git disabled it is ignored. Chain `pr` ⇒ `push` ⇒ `commit` ⇒ `worktree`: an operation is enabled only when it and every one before it are `true`; a disabled one answers `UNCHANGED` + `git: <op> disabled`, and `/{{prefix}}shipit` needs all four. `agents.reportChange` (boolean) is asked by setup (proposal `true` when project-root `CHANGELOG.md` exists, else `false`; a later run asks once when the key is missing). At run time a missing key means `true`. `false` means agents write no change entries (the project may still keep a changelog by hand). `record-change` then writes nothing and `commit-task` does not add `CHANGELOG.md` by itself (it still commits it when listed); the flow does not stop. `record-change` puts entries under `## [Unreleased]` → `### Changed` (created above the first `## ` heading when missing). Members themselves are not this template’s job.

Supported hosts are **not** a tree in this config. They live in `hosts.json` in this directory (`.seh/references/hosts.json` after install). Install and `/{{prefix}}setit-se` always write every row. Adding a host is a new row plus a path/frontmatter adapter (rules extension, agent format, `modelSuggest`). Codex is the fourth row: `agentFormat: "codex-toml"` (TOML agents via `codex-adapters.cjs`), `skillHide: "openai-yaml"` (work skills get `agents/openai.yaml`), `rulesIndex: "agents-md"` (a seh-managed section in `AGENTS.md` points at `rulesDir`), skills in `.agents/skills`, invoked as `$<prefix><name>`.

`agents.designer.enabled` (boolean) turns the Designer stage on. First run: `/{{prefix}}setit-se` asks once, recommending `true` when a UI stack was detected, else `false`; a config without the key means `false`. `agents.roles.<role>.model` is a map keyed by host `id`; roles are architect, designer, implementer, consultant, reviewer. `/{{prefix}}setit-se` writes `model:` in that host’s `agentsDir` from that entry only. Do not copy another host’s model. On a `codex-toml` row an empty string `""` is valid and means no change: the live agent has no `model` and the session model is inherited. A legacy string is invalid for generation: migrate first (prefill every host, then confirm per host). `agents.brainstorm.model` uses the same map shape and is written by `/{{prefix}}grillit`, not `/{{prefix}}setit-se`.

```json
{
  "seh": { "generatedFrom": "", "generatedPrefix": "" },
  "product": "",
  "packsIgnored": [],
  "jiraOffer": null,
  "agents": {
    "docs": [],
    "baseBranch": "",
    "contentLanguage": "",
    "statuses": {
      "todo": "todo",
      "in progress": "in progress",
      "implemented": "implemented",
      "in review": "in review",
      "done": "done"
    },
    "roles": {
      "architect": { "model": { "claude-code": "opus", "cursor": "cursor-grok-4.6-medium", "opencode": "anthropic/claude-opus-5-5", "codex": "gpt-6-sol" } },
      "implementer": { "model": { "claude-code": "sonnet", "cursor": "cursor-grok-4.6-medium", "opencode": "anthropic/claude-sonnet-5-5", "codex": "gpt-6.1-sol" } },
      "designer": { "model": { "claude-code": "sonnet", "cursor": "cursor-grok-4.6-medium", "opencode": "anthropic/claude-sonnet-5-5", "codex": "gpt-6.1-sol" } },
      "consultant": { "model": { "claude-code": "haiku", "cursor": "composer-2.5", "opencode": "anthropic/claude-haiku-5-5", "codex": "gpt-6-luna" } },
      "reviewer": { "model": { "claude-code": "sonnet", "cursor": "cursor-grok-4.6-medium", "opencode": "anthropic/claude-sonnet-5-5" } }
    },
    "designer": { "enabled": false },
    "brainstorm": { "consult": "significant" },
    "reportChange": true,
    "git": { "worktree": true, "commit": true, "push": true, "pr": true }
  }
}
```

When Jira is connected, add `agents.tracker` from `harness.tracker.json` (includes `"kind": "jira"`). When Azure DevOps is connected, use `harness.tracker.ado.json` instead (`"kind": "ado"`; `organizationUrl`, `project`, `workItemTypes` — not Jira `url` / `user` / `projectKey`).

Credentials in `harness.credentials.local.json`: `jiraToken` for Jira; `adoPat` for ADO (may coexist only when the other tracker is disconnected and the unused key is empty). Setup must not require both tokens active at once.

`agents.tracker.write` holds the booleans `create`, `spec`, `prompt`, `log`, `status`; `/{{prefix}}setit-se` asks them in one question with nothing preselected (the `false` values in the skeletons are placeholders). Reading the tracker (`meta`, `get`) is always on. An action that is ON writes to the work item / issue. An action that is OFF is not done automatically: it is `BLOCKED:` in the script with no HTTP and its artifact falls back to the files tracker (the user’s explicit request still runs it, see below):

| Action | Verbs refused when OFF | When OFF |
|--------|------------------------|----------|
| `create` | `create`, `link` | No item; files basename, `tracker:` empty; binding by hand is allowed |
| `spec` | `set spec` | `docs/features/<basename>.feature.md` |
| `prompt` | `set prompt` | `docs/prompt/<basename>.prompt.md` |
| `log` | `set log`, `comment` | `docs/feature-log/<basename>.log.md` |
| `status` | `transition` | `status:` in local spec frontmatter (`agents.statuses`) |

Mappings are asked only for enabled actions: status keys `todo`…`done` with `status`, `fields.spec` / `prompt` / `log` with the matching action, `issueTypes` / `workItemTypes` with `create`. `statuses.blocker` and `fetchFields` are always asked; `blocker` is required when a `depends` entry is read from the tracker (`null` = no such dependencies). A tracker config with no `write` block is `BLOCKED:` run `/{{prefix}}setit-se`. A config from before 2.0 has `readOnly` instead: a later `/{{prefix}}setit-se` migrates it once (`true` → all actions `false`; `false` or missing → all `true`) and deletes it; scripts read only `write`. Same for Jira and ADO.

Explicit user request: OFF means seh does not do the action automatically; when the user explicitly asks for it, seh does it. Pass `--user-request "<the user's words>"` to the write verb or `get`; it lifts the guard for that call only (empty value: `BLOCKED:`). The words come from the user in this session or from a launch line that carries them verbatim; seh never adds the flag for its own steps, in any mode. The write is a one-off copy: repo files stay the source, nothing is synced, local status is unchanged; ask before overwriting a non-empty target field. `get <key> --user-request` reads every part from the tracker. Missing mapping: list values from `meta`, ask, save it to config with the user's consent, run the action; the action stays OFF. A requested `create` binds the task (`tracker:`); a later switch to ON moves local content once and is `BLOCKED:` when both sides are non-empty.

Jira skeleton:

```json
{
  "kind": "jira",
  "write": { "create": false, "spec": false, "prompt": false, "log": false, "status": false },
  "url": "",
  "user": "",
  "projectKey": "",
  "issueTypes": { "feature": "", "bug": "" },
  "fields": { "spec": "", "prompt": "", "log": "" },
  "fetchFields": [],
  "statuses": {
    "todo": null,
    "inProgress": null,
    "codeReview": null,
    "inReview": null,
    "done": null,
    "blocker": null
  }
}
```

`null` on a tracker status means that step does not transition.

ADO skeleton (`harness.tracker.ado.json`):

```json
{
  "kind": "ado",
  "write": { "create": false, "spec": false, "prompt": false, "log": false, "status": false },
  "organizationUrl": "",
  "project": "",
  "workItemTypes": { "feature": "", "bug": "" },
  "fields": { "spec": "", "prompt": "", "log": "" },
  "fetchFields": [],
  "statuses": {
    "todo": null,
    "inProgress": null,
    "codeReview": null,
    "inReview": null,
    "done": null,
    "blocker": null
  }
}
```

Field map values for ADO: a custom field reference name (`Custom.<Name>`), `description` (`System.Description`), `comment` (work item comments), or `history` (`System.History`).
