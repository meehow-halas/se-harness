# `harness.config.json` skeleton

Source of truth at run time is the live project-root `harness.config.json` (valid JSON). `/dhs-setup` writes it from this skeleton plus answers. Agents and `.dhs/scripts/` **read** that live file.

Parseable defaults: `harness.config.json` in this directory. Jira object shape: `harness.tracker.json` — copy that object to `agents.tracker` only when Jira is connected; omit `agents.tracker` on the files tracker. Never put credentials in either file (token lives in a local ignored file; never in git, never in chat).

`dhs.generatedFrom` is set by setup to the contents of `.dhs/VERSION`. `agents.baseBranch` has no value until setup asks (suggested default `dev`). Optional role `rules`; reviewer may use `checklist`. `jiraOffer` is `declined` when they decline the first offer (`null` until then). `agents.brainstorm.consult` is `any` | `significant` (default if unset) | `broad`. Members themselves are not this template’s job.

Supported hosts are **not** in this config. They live in `hosts.json` in this directory (`.dhs/references/hosts.json` after install). Install and `/dhs-setup` always write every row. Adding a host is a new row plus a path/frontmatter adapter (rules extension, agent format). A Codex adapter (TOML agents, `.codex/` or `.agents/skills`) is out of this version. One `agents.roles.<role>.model` string is copied to every live agent file.

```json
{
  "dhs": { "generatedFrom": "" },
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
      "code review": "code review",
      "in review": "in review",
      "done": "done"
    },
    "roles": {
      "architect": { "model": "opus" },
      "implementer": { "model": "sonnet" },
      "consultant": { "model": "haiku" },
      "reviewer": { "model": "sonnet" }
    },
    "brainstorm": { "consult": "significant" }
  }
}
```

When Jira is connected, add `agents.tracker`:

```json
{
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
