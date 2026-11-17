# `harness.config.json` skeleton

Source of truth at run time is the live project-root `harness.config.json` (valid JSON). `/{{prefix}}setit-se` writes it from this skeleton plus answers. Agents and `.seh/scripts/` **read** that live file.

Parseable defaults: `harness.config.json` in this directory. External tracker shape: `harness.tracker.json` for Jira (`kind`: `"jira"`) or `harness.tracker.ado.json` for Azure DevOps Boards (`kind`: `"ado"`). Copy the matching object to `agents.tracker` only when that tracker is connected; omit `agents.tracker` on the files tracker. Exactly one external tracker per project — never Jira and ADO together. Legacy configs without `kind` are treated as Jira when `url` and `user` are present. Never put credentials in either file (tokens live in a local ignored file; never in git, never in chat).

`seh.generatedFrom` is set by setup to the contents of `.seh/VERSION`. `seh.generatedPrefix` is set by setup to the contents of `.seh/PREFIX` (the skill-name prefix; may be empty). `agents.baseBranch` has no value until setup asks (suggested default `dev`). **Empty string or `null` disables git** for the harness: no worktrees, branches, commits, PRs or `update`; tasks run sequentially; the git scripts print `UNCHANGED` + `git: disabled`. Setup leaves it empty when the project has no git repo or the user answers “no git”. Optional role `rules`; reviewer may use `checklist`. `jiraOffer` is `declined` when they decline the first offer (`null` until then). `agents.brainstorm.consult` is `any` | `significant` (default if unset) | `broad`. Members themselves are not this template’s job.

Supported hosts are **not** a tree in this config. They live in `hosts.json` in this directory (`.seh/references/hosts.json` after install). Install and `/{{prefix}}setit-se` always write every row. Adding a host is a new row plus a path/frontmatter adapter (rules extension, agent format, `modelSuggest`). Codex is the fourth row: `agentFormat: "codex-toml"` (TOML agents via `codex-adapters.cjs`), `skillHide: "openai-yaml"` (work skills get `agents/openai.yaml`), `rulesIndex: "agents-md"` (a seh-managed section in `AGENTS.md` points at `rulesDir`), skills in `.agents/skills`, invoked as `$<prefix><name>`.

`agents.roles.<role>.model` is a map keyed by host `id`. `/{{prefix}}setit-se` writes `model:` in that host’s `agentsDir` from that entry only. Do not copy another host’s model. On a `codex-toml` row an empty string `""` is valid and means no change: the live agent has no `model` and the session model is inherited. A legacy string is invalid for generation: migrate first (prefill every host, then confirm per host). `agents.brainstorm.model` uses the same map shape and is written by `/{{prefix}}grillit`, not `/{{prefix}}setit-se`.

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
      "consultant": { "model": { "claude-code": "haiku", "cursor": "composer-2.5", "opencode": "anthropic/claude-haiku-5-5", "codex": "gpt-6-luna" } },
      "reviewer": { "model": { "claude-code": "sonnet", "cursor": "cursor-grok-4.6-medium", "opencode": "anthropic/claude-sonnet-5-5" } }
    },
    "brainstorm": { "consult": "significant" }
  }
}
```

When Jira is connected, add `agents.tracker` from `harness.tracker.json` (includes `"kind": "jira"`). When Azure DevOps is connected, use `harness.tracker.ado.json` instead (`"kind": "ado"`; `organizationUrl`, `project`, `workItemTypes` — not Jira `url` / `user` / `projectKey`).

Credentials in `harness.credentials.local.json`: `jiraToken` for Jira; `adoPat` for ADO (may coexist only when the other tracker is disconnected and the unused key is empty). Setup must not require both tokens active at once.

`readOnly` (boolean, default `false` when missing): when `false` (full write), spec, prompt, log, and status live only on the work item / issue (map `fields.spec` / `prompt` / `log` and status keys in `/{{prefix}}setit-se`); no repo files for task artifacts. When `true`, seh only reads the tracker (`meta`, `get`); `create` / `set` / `comment` / `transition` / `link` are `BLOCKED:` with no HTTP. Spec, prompt, log, and status live in repo files (`agents.statuses`). Ignores `fields`, `issueTypes` / `workItemTypes`, and status keys other than `blocker`. `statuses.blocker` is required when a `depends` entry is a tracker key with no local spec (`null` = no such dependencies). `fetchFields` still applies to `get`. Same for Jira and ADO.

Jira skeleton:

```json
{
  "kind": "jira",
  "readOnly": false,
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
  "readOnly": false,
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
