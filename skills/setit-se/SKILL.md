---
name: setit-se
description: First-time seh setup and later parameter changes. Use when the user runs /{{prefix}}setit-se or needs to configure this project's seh install, models, base branch, packs, AGENTS.md, or Jira / Azure DevOps tracker.
---

# /{{prefix}}setit-se

Finish first-time setup, or later change the same config. The CLI does not configure the project.

Generate from `.seh/` only. Do not invent CLI commands. Do not `npm install -g`. Do not write to `~/.claude/`, `~/.cursor/`, `~/.config/opencode/`, `~/.codex/`, or any other machine-wide path. Do not commit.

Read `.seh/references/hosts.json`. Install and this skill **always write every row**. Do not ask which hosts to use. If that file is missing, stop:

```text
BLOCKED: seh install has not been run here — run seh install (npx -p se-harness seh install or npx -p github:meehow-halas/se-harness seh install), then /{{prefix}}setit-se again
```

Ask **one question at a time**. Wait. Do not dump a questionnaire. Stops (not questions) are one line:

```text
BLOCKED: <what stopped> — <what the user or another skill must do>
```

---

## Entry

1. If `.seh/` is missing, or `/{{prefix}}setit-se` is absent from **every** `skillsDir` in `.seh/references/hosts.json` (present in **any** listed `skillsDir` is enough):

```text
BLOCKED: seh install has not been run here — run seh install (npx -p se-harness seh install or npx -p github:meehow-halas/se-harness seh install), then /{{prefix}}setit-se again
```

2. If `.seh/VERSION` is missing: same stop.

These are the only two reasons for that stop. Check each with its own plain command; never chain checks with `&&` / `||`, and never fold a git probe into them: a failing command is not “seh install has not been run”.

**Setup skill check.** The skill lives in the directory `{{prefix}}setit-se` (the skill name, not what the user types). Test the literal path in single quotes, for example `test -e '<skillsDir>/{{prefix}}setit-se/SKILL.md'`. Never write the typed invocation (`$`, `/` plus the name) inside a shell command: with the default prefix `_`, a shell reads `$_setit-se` as the special parameter `$_` followed by `setit-se`, the path comes out wrong, and a good install looks missing.

Git is optional. A project that is not a git repository is normal (git disabled, `agents.baseBranch` empty), never a `BLOCKED`. When a later step needs to know, probe git alone with `git rev-parse --is-inside-work-tree 2>/dev/null || echo no-git` and treat `no-git` as “git not detected”.

3. If `harness.config.json` is **missing** → **First run**. If it is **present** → **Later run**.

Do not overwrite keys the user did not confirm. Do not regenerate generated files as a silent first-run repeat. A later-run template mismatch (`.seh/VERSION` ≠ `seh.generatedFrom`) is not a first-run repeat: finish incomplete role `model` maps first, then regenerate live agents, work skills, and rules, then continue the later-run path.

---

## Role model maps

`agents.roles.<role>.model` must be an object whose keys are every `id` in `.seh/references/hosts.json`. Each value is a non-empty string, except on a row with `agentFormat` `codex-toml`, where `""` is valid and means **no change**: the live agent has no `model` and Codex uses the session model. A JSON string is not a map. Do not copy another host’s model onto a live file.

Interview defaults come from that host row’s `modelSuggest` (`architect` / `implementer` / `consultant` / `reviewer`). If that field is missing, ask without a suggestion. Do not translate one host’s model id into another’s. Do not `if (id === "claude-code")` for suggestion text.

If generation needs a model and `agents.roles.<key>.model[<host.id>]` is missing (or empty on a row that is not `codex-toml`):

```text
BLOCKED: role model missing for host <id> — run /{{prefix}}setit-se
```

On a `codex-toml` row the helper text adds: a model name is passed through as given and its availability depends on the account; reply `none` (or `no change`) for a role to omit `model` and inherit the session model. Store `""` for it. Tell the user once that the suggested ids come from the docs and are unverified for their account.

**Per-host confirm (first run, legacy, missing host).** For each host in `.seh/references/hosts.json` (table order), prefill all four roles for that host’s `id`, show a table (architect / implementer / consultant / reviewer → model), then **one question per host**: whether to change any of those models. Skip / no = accept the table. Yes = the user may reply once with overrides (e.g. `architect: opus`); apply only named roles; leave the rest from prefill. If parsing is unclear, one follow-up question only. Do not stamp live `model:` until every host is confirmed.

**Show each table once.** The table and its question appear once, in the question itself. Do not repeat the same table or the same question in a message before it, after it, or in the closing summary. The same rule applies to every confirmation in this skill (project name, tracker, language, tracker offer): one message per question, no re-printed copies.

**Question wording.** Frame the question as **change**, not **keep**. Do not ask “Keep these models?”, “Czy zostawić te modele?”, or similar — **yes** on a keep-framed question means accept, but this flow treats **yes** as “I want overrides”. After the table, use a **change** question plus helper text in this shape (replace `<host label>` with a readable name from the host row’s `id`, e.g. `claude-code` → Claude Code):

```text
Change any role models for <host label>? Reply skip or no to keep the table as shown. Reply yes and list overrides in one message (e.g. architect: opus).
```

**Reply mapping.** Accept the table: `skip`, `no`, `nie`, empty / Enter, or clear “keep / ok / leave as shown” intent (including Polish *zostaw*, *git*). Apply overrides: `yes`, `tak`, `change`, or a `role: model` list without yes. If you asked a keep-framed question by mistake and the user answered as if keeping (e.g. **tak** with no override list), accept the table; do not ask again for overrides.

**Legacy string.** If `model` is a string, the map is incomplete. Prefill every role on every host `id` with that string. Then use **per-host confirm** on each host (mention `modelSuggest` for that host in helper text when a role’s suggest differs from the prefill). Write the map when all hosts are confirmed.

**Missing host key.** Same **per-host confirm** when the table has an `id` the map does not (for example a new row after upgrade). Prefill that host’s four roles from that row’s `modelSuggest` when present; if `modelSuggest` is missing for a role, ask for that role in the follow-up for that host only.

---

## First run

`harness.config.json` is missing.

### 1. Read the repo

Read the tree (README, manifests, existing docs, default-branch clues, `AGENTS.md` / `CLAUDE.md` / host dirs from `hosts.json`). State inferred choices so the user can object. Do not silently take `main`, `master`, or the current checkout as the base branch.

### 2. Project PRD

Look for an existing product requirements document (typical `docs/prd.md`, or a path the repo already treats as the PRD).

- If one exists: **use it. Do not rewrite it.** Put that path in `agents.docs`.
- If none exists: gather product facts from the repo. Ask one question at a time for each fact the repo does not contain. Ask at least: purpose, users, scope, and **non-goals** (what must not be built). Do not invent any of these from the repo's current contents. Then write `docs/prd.md`. Put that path in `agents.docs`.
- A section the user did not answer is written as `TBD — not stated by the user`, not as a rule. Do not write non-goals the user did not state. An empty non-goals list is written as `None stated`.
- Agents treat `TBD` lines as no constraint and must not report a conflict with them. A conflict is reported only against a stated non-goal or scope line.

Config stores a one-line `product` plus doc paths, **not** the PRD body.

### 3. Questions (one at a time)

Do not write `harness.config.json` or generate live files until these are confirmed.

**Roles.** Only architect, implementer, consultant, reviewer. No other roles. No brainstorm-facilitator model question. For **each** host in `.seh/references/hosts.json` (table order), use **per-host confirm** from **Role model maps** (including **Question wording** and **Reply mapping**): prefill each role from that row’s `modelSuggest.<role>` when present; one question per host with the four-role table and optional overrides. Write `agents.roles.<role>.model` as a map keyed by host `id`. Each value must be a non-empty string. Do not translate one host’s model id into another’s.

**`agents.contentLanguage`.** Language of files and tracker text. Ask once. Suggest the conversation language.

**`agents.baseBranch`.** The git branch `.seh/scripts/` cut task branches from, open PRs against, merge into a task branch on **update**, and return to after the PR is opened. Ask once. Suggested default is `dev`. If the repo already names a default branch, state that inference so the user can object. **Detect git first.** Git counts as connected only when both hold: `git rev-parse --is-inside-work-tree` succeeds and `git remote get-url origin` succeeds. Not connected: do not ask; leave `agents.baseBranch` empty, say what is missing (no repo, or no `origin`) and that adding it and running `/{{prefix}}setit-se` again enables git. Never accept a branch name the user types while git is not detected. Connected: ask as above; the user may answer “no git” (or decline to name a branch), which leaves it empty. Empty is the only switch for git-disabled mode (git disabled: no worktrees, branches, commits, PRs; tasks run sequentially); the scripts do not guess a base. Do not write this value into generated agent markdown.

**Project rule (optional).** One question, after models, content language, and base branch. Say what it is: a standing instruction for the agents on this project, beyond the generated framework packs — for example “never edit the legacy billing module”, “PRs always target `develop`”, “tests only through pytest”. Store it on the roles (`rules`; reviewer `checklist` when it is a review constraint). **Skip is the default:** empty is fine. Do not ask for a list or a second rule. If the user already stated such a rule earlier in this conversation, record it and do not ask again.

**Packs.** After detection (below), state which packs you will generate. Honour `packsIgnored` if the user names packs to skip.

Start the live config from `.seh/references/harness.config.json`. Fill answers. Leave `agents.statuses` at the skeleton defaults unless the user confirmed other strings. Leave `jiraOffer` `null` until the tracker offer. Omit `agents.tracker`. Set `seh.generatedFrom` to the trimmed contents of `.seh/VERSION`. Do not put credentials in config.

### 4. Generate from `.seh/`

Then write `harness.config.json` and generate live files (see **Generation**).

### 5. `AGENTS.md` / `CLAUDE.md`

After writing config and generating files, **always** inspect project-root `AGENTS.md` and `CLAUDE.md`. Every combination is in scope: neither, only `AGENTS.md`, only `CLAUDE.md`, or both. Do not skip a file that exists.

The seh source is `.seh/references/AGENTS.md`.

Treat a symlink as the target’s body, read once. If `CLAUDE.md` already links to `AGENTS.md` (or the reverse), that is one existing document, not two. If a named path exists but the symlink is broken, treat that path as missing and use the other file if it exists.

Build the **proposed** `AGENTS.md` in this order; **do not write yet**. When a host row has `rulesIndex` `agents-md` and rule files were generated, append the seh-managed rules section from **Rule packs** to the proposed body:

| What exists at project root | Merge input (then always merge with the seh template) |
|-----------------------------|--------------------------------------------------------|
| Neither | seh template only |
| Only `AGENTS.md` | that file, then the seh template |
| Only `CLAUDE.md` | that file, then the seh template |
| Both (two regular files) | merge `AGENTS.md` with `CLAUDE.md` first (keep project-specific instructions, drop duplicated paragraphs), then merge that with the seh template |
| Both, already the same via symlink | the single target body, then the seh template |

Do not replace an existing project file with a raw copy of the template. Show the user the **full** proposed markdown and wait for acceptance. Required on first run in every row, including “neither”. If they reject it, take their edits (one question) and show the body again until they accept.

After acceptance, the **result is always** a regular project-root `AGENTS.md` with the accepted body — even when the project originally had only `CLAUDE.md`.

Then `CLAUDE.md` when the project **originally** had a `.claude/` directory **and/or** a `CLAUDE.md`. If neither was there, do not create `CLAUDE.md`.

| Originally | After the write |
|------------|-----------------|
| No `.claude/`, no `CLAUDE.md` | `AGENTS.md` only |
| No `.claude/`, `CLAUDE.md` existed | `AGENTS.md` plus `CLAUDE.md` |
| `.claude/` present, no `CLAUDE.md` | `AGENTS.md` plus `CLAUDE.md` |
| `.claude/` present, `CLAUDE.md` existed | `AGENTS.md` plus `CLAUDE.md` |

When `CLAUDE.md` is required: prefer a relative file symlink `CLAUDE.md` → `AGENTS.md`. If it is already that symlink, leave it. If it was a regular file, replace it with the symlink (content is already in `AGENTS.md`). Detect the host OS and create the link the way that OS expects (Unix: `ln -s AGENTS.md CLAUDE.md`; Windows: a file symlink such as `mklink CLAUDE.md AGENTS.md` — not a directory junction). **Having `CLAUDE.md` when it is required matters more than the link.** If the symlink cannot be created for any reason, write `CLAUDE.md` as an **independent regular file** with the same accepted body as `AGENTS.md`. Tell the user they are two files because the link failed. Do not stop setup. Do not omit `CLAUDE.md` when `.claude/` was present or when `CLAUDE.md` already existed.

### 6. Tracker offer

After writing config and generating files (and after the agents-file step), offer an external tracker **once**. See **Tracker**. Decline → set `jiraOffer` to `declined`. Do not commit.

---

## Later run

`harness.config.json` is present.

If `.seh/VERSION` is missing:

```text
BLOCKED: seh install has not been run here — run seh install (npx -p se-harness seh install or npx -p github:meehow-halas/se-harness seh install), then /{{prefix}}setit-se again
```

If any role `model` is still a string, or a map is missing a `hosts.json` `id`, finish **Role model maps** first. Do not regenerate live agents until every role has a complete map.

If `.seh/VERSION` (trimmed) does not equal `seh.generatedFrom`: regenerate live agents, work skills, and rule packs from `.seh/` (same copy rules as first run), set `seh.generatedFrom` to `.seh/VERSION`, and tell the user the installed package templates changed. That message must name the work-skill renames: `/seh-feature` and `/seh-shipit` are now `/{{prefix}}runit`; `/seh-setup` is `/{{prefix}}setit-se`, `/seh-planit` is `/{{prefix}}planit`, `/seh-doit` is `/{{prefix}}doit`, `/seh-checkit` is `/{{prefix}}checkit`, `/seh-brainstorm` is `/{{prefix}}grillit`; leftover live `seh-*` skill directories were removed from every `skillsDir`. Do not rewrite `AGENTS.md` or `CLAUDE.md`; mention they may still contain the old name. Then continue below.

**Missing generated files (repair).** VERSION and prefix may be equal while a host tree is still incomplete, for example after a package added a host row or `commandsDir` without a version change, or after someone deleted a file. Check every row in `.seh/references/hosts.json`:

- the four agents in its `agentsDir`, each in this host's format from **Live agents** (for example an OpenCode copy that still has `name:` or `tools:`, or lacks `mode: subagent`, counts as missing);
- `<skillsDir>/<prefix><name>/SKILL.md` for every work-skill template present in `.seh/skills/`, with `disable-model-invocation: true` where **Work skills** requires it for this host;
- on a `codex-toml` row, the four `<role>.toml` files instead of `.md`, and `agents/openai.yaml` for every work skill when `skillHide` is `openai-yaml`;
- when `commandsDir` is set, `<commandsDir>/<prefix><name>.md` for those same skills, matching what the current `.seh/references/host-command.md` renders (a command without the `Host:` line counts as missing).

If any of these is missing, regenerate live agents, work skills, and host commands for **every** row, with the same copy rules as first run. Tell the user in one line which paths were missing. Do not show the rename message and do not regenerate rule packs for this reason. Then continue below.

**Status migration (once, on a later run).** If `agents.statuses` has the key `code review` and no `implemented` key, the flow changed. Rename it to `implemented` (key and value) in config and tell the user. Do not edit spec files. List every spec under `docs/features/` (or the mapped tracker) whose `status:` is `code review`, and tell the user to set it to `implemented`, or to `in review` if a review is running. `in review` stays valid.

Then **one change at a time**. Show current and new value, wait for confirmation, then write. Do not overwrite keys the user did not confirm.

| Change | Effect |
|--------|--------|
| Role `model` cell `(role, host)` | Rewrite that live agent’s **frontmatter** `model:` only, in **that** host’s `agentsDir`. If the user names a role without a host, ask which host. Do not regenerate the body. Do not rewrite other hosts. |
| `packsIgnored` or detected frameworks | Regenerate rule packs. |
| `agents.baseBranch` | `harness.config.json` only. **Connect** (empty → branch): only when git is detected (repo + `origin`); otherwise refuse and say what is missing. **Disconnect** (branch → empty): always allowed, including when git is no longer detected; confirm that worktrees, commits and PRs stop and runs become sequential. If the value is set but git is no longer detected, say so and offer to disconnect. When the value is empty and git is detected, offer to connect only if the user names git or the base branch; do not nag on other runs. Existing task branches and worktrees are left alone either way. |
| Statuses, tracker maps, `fetchFields`, content language, product line | Config only. Do **not** regenerate agent bodies. |

- Do not touch `agents.brainstorm` (that is `/{{prefix}}grillit`).
- Do not create or rewrite the project PRD.
- Do not remake or re-merge `AGENTS.md`.
- Do not commit.

If `.claude/` is present and `CLAUDE.md` is still missing: create the symlink the same way as on first run; if the link fails, write `CLAUDE.md` as an independent file with the current `AGENTS.md` body. If `CLAUDE.md` already exists as a regular file on a later run, do not overwrite it and do not re-run the first-run merge.

If the user names another config key (model, base branch, …), do that key first, then the tracker offer only when there is still no tracker and the offer was not declined — unless they explicitly asked to add/change/remove the external tracker (Jira or Azure DevOps), in which case do the tracker path even after a decline.

---

## Tracker (Jira or Azure DevOps)

First-run offer and every later run. Exactly one external tracker per project: `agents.tracker.kind` is `jira` or `ado`, never both. Do not invent a `seh` CLI. Call `.seh/scripts/jira meta` or `.seh/scripts/ado meta` (REST; not MCP, not `az devops`/`az boards`, not raw `curl`) and write config. Switching does **not** migrate old tasks. Token never in chat or git.

**Offer / choice.** One question. List only modes in scope, in this order, recommended first:

1. **Azure DevOps (Recommended for Azure Boards teams)** — WIT REST via `.seh/scripts/ado`, PAT in `harness.credentials.local.json` (`adoPat`), task key = numeric work item id.
2. **Jira** — Jira Cloud REST via `.seh/scripts/jira`, `jiraToken`.
3. **Files** — no external tracker (default). Choosing files on the first run = decline.

Do not offer Jira and ADO together after one is chosen. If a tracker is already connected and the user asks for the other kind, treat it as **Remove** then **Add** (confirm; no migration).

Credentials live in the project-local ignored file `harness.credentials.local.json` (`seh install` already ignores that filename). Never paste a token or PAT in chat. Never write a real token into `harness.config.json`. Keys: Jira `{"jiraToken":"…"}`, ADO `{"adoPat":"…"}`. Only the active kind's key is required; on connect, create the file with the active kind's key set to `""` only when it is missing; if it exists, keep other keys of that kind and do not overwrite an existing token. When switching kind, drop the old kind's key from the file (and `agents.tracker`) as part of Remove.

**Read-only mode (one question, right after the user picks Jira or Azure DevOps, before any connection question).** Default: no (full write). Explain both answers in the question:

- **No** = full <Jira|Azure DevOps> support: seh creates items, writes spec, prompt, and log on them, and moves statuses. No repo files for tasks.
- **Yes** = <Jira|Azure DevOps> is only read (e.g. to point the Architect at an existing item). seh never changes it; spec, prompt, log, and status live in repo files.

Write `readOnly: false` or `readOnly: true`. Whatever the answer, continue with the connection keys and **Token step** of the chosen kind. There is no other storage question.

Read-only is enforced by seh, not by the token. Never tell the user to remove tracker permissions or use a different token.

**Token step (Add and token rotation on Change).** After the connection keys are in `agents.tracker` (Jira: `url`, `user`, `projectKey`; ADO: `organizationUrl`, `project`; write to `harness.config.json` as needed so `meta` can run):

1. If `harness.credentials.local.json` is missing at the project root, create it with the empty key for the active kind (`{"jiraToken":""}` or `{"adoPat":""}`) only. If it exists, do not overwrite an existing token — show the path and ask the user to set or update the key locally.
2. Tell the user to paste the token / PAT in that file (never in chat). One question: confirm when it is in the file.
3. Run `.seh/scripts/jira meta` or `.seh/scripts/ado meta`. On `OK`, briefly confirm the connection and continue. On `BLOCKED:`, show the full `BLOCKED:` line, explain what to fix (token/PAT, URL, user, project, or access), and loop: user fixes token, `organizationUrl`, or `project` (or Jira url/user/key) → confirm again → `meta` until `OK` or they stop.
4. Then fetch mapping data from the successful `meta` output (states/statuses, types, fields) and continue mapping below.

**Mapping after `meta` OK.**

- **Read-only (`readOnly: true`):** ask `blocker` only (a numbered list of statuses from `meta`, or `null` = no tracker-key dependencies), then `fetchFields`. Do **not** ask status keys `todo`…`done`, `fields`, or `issueTypes` / `workItemTypes`: those serve writes. Leave their skeleton values; seh ignores them.
- **Full write (`readOnly: false`):** the full mapping in the table below: status keys, `blocker`, spec/prompt/log `fields`, types, `fetchFields`.

| Intent | What happens |
|--------|----------------|
| **Add — Jira** (no tracker yet, user chooses Jira) | **Read-only mode** question. Then ask URL, user, project key (one question at a time). Write those keys, `kind: "jira"`, and `readOnly` into `agents.tracker`, then **Token step** (`jiraToken`). Read-only: `blocker` + `fetchFields` only and done. Full write: one question at a time, map **each** key `todo`, `inProgress`, `codeReview`, `inReview`, `done` to a Jira status from that project’s real list (numbered), or skip = `null`. Map `blocker` if they use dependencies. Map where spec and prompt live (two custom fields, description, or comments) and map log if used. Issue types for `feature` and `bug`. Write `agents.tracker` from `.seh/references/harness.tracker.json` plus answers (`kind`, `readOnly`, `statuses`, `issueTypes`, `fields`, `fetchFields` as needed, `url`, `user`, `projectKey`). Agents must not pick a Jira status that is not in this map. Do not compose `curl`. |
| **Add — Azure DevOps** (no tracker yet, user chooses ADO) | **Read-only mode** question. Then ask `organizationUrl` (e.g. `https://dev.azure.com/{org}`, no trailing slash), then `project` (name or GUID), one question at a time; no PAT in chat. Write those keys, `kind: "ado"`, and `readOnly` into `agents.tracker` (start from `.seh/references/harness.tracker.ado.json`), then **Token step** (`adoPat`, initially `""`). Read-only: `blocker` + `fetchFields` only and done. Full write: map statuses: each of `todo`, `inProgress`, `codeReview`, `inReview`, `done` to an exact state name from the `ado meta` output (`status.N` lines, numbered; the list is the union over all work item types, so warn that a state missing on a given type makes `ado transition` `BLOCKED:` for that type), or skip = `null`; map `blocker` if they use dependencies. Map `workItemTypes.feature` and `.bug` to exact type names from the `issueType.N` lines of `ado meta` (`meta` does not need them set first). Map `fields.spec`, `fields.prompt`, `fields.log` to a field `referenceName`, `description`, `comment`, or `history` (log optional). `fetchFields` as needed (field refs). Agents must not pick a state that is not in this map. Do not use `az devops`, `az boards`, MCP, or raw `curl`. |
| **Change** (tracker already there) | One question: change integration or remove it. Change = same mapping questions for the fields they named. One extra option: **toggle read-only**. read-only → full write: set `readOnly: false`, then ask exactly the maps still missing for full write (status keys `todo`…`done`, `issueTypes` / `workItemTypes`, `fields`). "Missing" = still at the skeleton value (status `null`, type or field `""`); skip any map that already holds values (earlier full write → read-only → full write); no migration of files or tickets. Full write → read-only: set `readOnly: true`, leave existing maps untouched, ask `blocker` only if it is missing. If they rotate the token / PAT, change `organizationUrl` / `project` / Jira connection keys, or you need fresh metadata, run **Token step** and `meta` once for the active kind; do not re-run `meta` for every small mapping edit. |
| **Remove** | Confirm, drop `agents.tracker` from config, delete or clear the active kind's key (`jiraToken` or `adoPat`) in `harness.credentials.local.json`. Project is files-only again. `jiraOffer` does not block a later **Add**. |

`null` on a tracker status means that step does not transition. There is no file fallback and no invented name.

After a tracker change, write the mapping into `harness.config.json`. Do not regenerate agent markdown for `fetchFields` or the task key pattern.

Decline on first run (files chosen): `jiraOffer: "declined"` — it means “declined an external tracker on first ask” (Jira or ADO). Do not ask again until a later run **Add** (explicit, or the later-run offer rule above).

---

## Generation

Sources are always `.seh/`. Live agent bodies must **not** interpolate `agents.baseBranch`, status strings, tracker maps, `fetchFields`, content language, or the product line. Those are read from `harness.config.json` at run time.

Loop **every** object in `.seh/references/hosts.json` `hosts`. Drive paths and formats from the row (`skillsDir`, `agentsDir`, `rulesDir`, `rulesExt`, `agentFormat`, `skillHide`, `rulesIndex`). Do not hardcode a single host directory. Do not skip a row.

### Live agents

Copy `.seh/agents/` files into **each** `agentsDir`. **Copies, not symlinks.**

| Source | Live file | Role key |
|--------|-----------|----------|
| `.seh/agents/architect.md` | `<agentsDir>/architect.md` | `architect` |
| `.seh/agents/implementer.md` | `<agentsDir>/implementer.md` | `implementer` |
| `.seh/agents/consultant.md` | `<agentsDir>/consultant.md` | `consultant` |
| `.seh/agents/reviewer.md` | `<agentsDir>/reviewer.md` | `reviewer` |

Set frontmatter `model:` from `agents.roles.<key>.model[<host.id>]`. If that entry is missing or empty, stop with `BLOCKED: role model missing for host <id> — run /{{prefix}}setit-se`. Do not copy another host’s model. Leave `name`, `description`, and `tools` as in the template, except on OpenCode (below). Claude Code and Cursor keep `tools:`.

When the host `id` is `cursor` and the role is `consultant`, also set `readonly: true`. Do not set `readonly` on architect, implementer, or reviewer.

When the host `id` is `opencode`, remove the `name:` and `tools:` lines from each of the four copies and set `mode: subagent`. OpenCode takes the agent name from the file name. It skips an agent file whose `tools:` is a comma list ("agent file skipped"), so the copy must not carry it. Keep `description` and `model`. When the host `id` is `opencode` and the role is `consultant`, also set:

```yaml
permissions:
  - action: edit
    resource: "*"
    effect: deny
```

Do not set those `permissions` on architect, implementer, or reviewer.

**`agentFormat` `codex-toml`** (today Codex). Do not copy the markdown. For each of the four roles run, from the project root:

```text
node .seh/references/codex-adapters.cjs agent .seh/agents/<role>.md [--model <value>] [--read-only]
```

and write its stdout to `<agentsDir>/<role>.toml` (`.codex/agents/`). Pass `--model` only when `agents.roles.<role>.model[<host.id>]` is a non-empty string; otherwise omit it and the file has no `model`. Pass `--read-only` for `consultant` (a read-only sentence is prepended to the instructions). A Codex subagent inherits the parent sandbox, so the file cannot enforce read-only: tell the user once that Consultant read-only is instruction text only. Do not set `model_reasoning_effort` or any other field. The helper prints `BLOCKED:` and exits non-zero on a template it cannot convert: relay that line and stop. A row with `agentFormat` `codex-toml` never gets the `.md` copy, Cursor `readonly`, or the OpenCode edits above. Remove a stale `<agentsDir>/<role>.md` that seh wrote earlier only if it is one of the four role names.

Do not add a fifth agent. Do not copy brainstorm templates from `.seh/brainstorm/` into any `agentsDir`.

On VERSION mismatch regeneration: replace those four live files in **every** `agentsDir` from `.seh/agents/` and re-apply `model:` from `agents.roles.<key>.model[<host.id>]` (and Cursor `readonly` on consultant, OpenCode without `name` / `tools` plus `mode: subagent` and consultant `permissions`) from **current** config.

On a confirmed role `model` cell change only: rewrite that one file’s `model:` line in **that** host’s `agentsDir`. On a `codex-toml` row, regenerate that one role’s `.toml` with the helper instead (set to `""` = file without `model`).

### Work skills

Install writes **only** `/{{prefix}}setit-se` live (already in every `skillsDir`). This skill generates the rest.

Read the prefix from `.seh/PREFIX` (first line, may be empty). Copy these directories from `.seh/skills/` to **each** `skillsDir`, if they exist in `.seh/skills/`. The live directory is `<prefix><name>`, and its `SKILL.md` frontmatter `name:` is rewritten to `<prefix><name>` (the slash command):

- `planit`
- `doit`
- `checkit`
- `runit`
- `shipit`
- `grillit` (when present)

Do **not** overwrite the install-owned `/{{prefix}}setit-se` skill from this copy step. If a listed template is missing, still copy the others; the copied stub (when present) stops with `BLOCKED:` until a later package fills the body.

Cleanup in **each** `skillsDir`: delete a leftover `seh-feature` directory and the pre-prefix names `seh-setup`, `seh-planit`, `seh-doit`, `seh-checkit`, `seh-shipit`, `seh-brainstorm`. If `seh.generatedPrefix` in `harness.config.json` is set and differs from `.seh/PREFIX`, also delete the live directories made with that old prefix (only `setit-se`, `planit`, `doit`, `checkit`, `runit`, `shipit`, `grillit` with that prefix). Never delete a directory whose name is not on these lists. Do not leave aliases. After generating, set `seh.generatedPrefix` to the `.seh/PREFIX` value (empty string allowed). A prefix change alone (VERSION equal, `seh.generatedPrefix` different) also triggers this regeneration.

When the host `id` is `cursor` or `opencode`, add frontmatter `disable-model-invocation: true` on each copied work-skill `SKILL.md` (not on `/{{prefix}}setit-se`). The package templates may omit that field.

**`invokePrefix`.** Templates in `.seh/` name what the user types as slash plus prefix plus name. On a row whose `invokePrefix` is set and is not `/` (today Codex: `$`), in every copied work-skill file and every generated agent file for that host, replace each such slash form (names: `setit-se`, `planit`, `doit`, `checkit`, `runit`, `shipit`, `grillit`) with `<invokePrefix><prefix><name>`. Do not touch paths such as `.seh/scripts/…`. Rows without `invokePrefix`, or with `/`, get the text as is. In your own messages to the user use the same prefix for this session’s host. The `BLOCKED:` strings printed by `.seh/scripts/` keep `/`: when you relay one on such a host, say it with that host’s prefix.

**`skillHide` `openai-yaml`** (today Codex, which has no frontmatter switch). For each copied work skill write `<skillsDir>/<prefix><name>/agents/openai.yaml` with the stdout of `node .seh/references/codex-adapters.cjs openai-yaml` (`policy.allow_implicit_invocation: false`; `$<prefix><name>` still works). Not for `<prefix>setit-se`. Rows without `skillHide` get nothing.

**Shared skills directory.** Codex reads `.agents/skills`, which other tools may also use. Write and delete only seh-owned names (the lists in the cleanup above). Never delete or rewrite an entry seh did not write, and never remove the directory itself. Removing a seh skill directory removes its `agents/openai.yaml` with it.

**Host commands.** On a row whose `commandsDir` is a non-empty string (today OpenCode: a skill there is not a slash command), also write `<commandsDir>/<prefix><name>.md` for each work skill you copied, from `.seh/references/host-command.md`:

- Replace `{{name}}` with the source name (`planit`, `doit`, …), `{{description}}` with the `description:` value of that copied `SKILL.md` (unchanged), and `{{host}}` with that row's `id`. The prefix is already rendered in `.seh/`.
- Write nothing else into the command. The skill holds the procedure.
- Rows with `commandsDir` `null` or missing get no command files.
- Do not write or overwrite `<prefix>setit-se.md`. Install owns it.
- Cleanup in **each** `commandsDir` follows the skill cleanup above. When `seh.generatedPrefix` differs from `.seh/PREFIX`, delete `<oldprefix><name>.md` for `planit`, `doit`, `checkit`, `runit`, `shipit`, `grillit`. Never delete another file.

### Rule packs

Detect frameworks from the repo. Generate from `.seh/packs/`. Monorepo: pack only on trees that use it (scope that pack’s `paths:` globs to those trees). Honour `packsIgnored` (skip those pack directory names).

| Pack id (`.seh/packs/<id>/`) | Detect when |
|------------------------------|-------------|
| `javascript` | JS sources or a JS package without TypeScript as the primary language |
| `typescript` | `tsconfig.json`, TypeScript in the manifest, or `.ts` / `.tsx` |
| `react-native` | `react-native` / Expo in the manifest or RN app config |
| `angular` | `angular.json` or `@angular/core` |
| `nextjs` | `next` in the manifest or `next.config.*` |
| `python` | `pyproject.toml`, `requirements.txt`, `Pipfile`, or `.py` |
| `django` | Django manifest / `manage.py` / Django settings |
| `fastapi` | `fastapi` in the Python manifest or imports |

A tree may match more than one pack (e.g. TypeScript + Next.js). State the set so the user can object.

Write live rules under **each** `rulesDir` as `seh-<packId>-<basename><rulesExt>`. Same markdown body. Frontmatter from `rulesExt`:

- `.md`: keep `paths:` (YAML list), rewritten for monorepo trees.
- `.mdc`: `description` (short, from the pack title), `globs` from the same path list (comma-separated if the host wants a string), `alwaysApply: false`. Cursor ignores plain `.md` in `.cursor/rules/`.

When the host `id` is `opencode`, after writing that host’s `seh-*` rule files, merge the glob `.opencode/rules/*.md` into **`.opencode/opencode.json`** (not project-root `opencode.json` / `opencode.jsonc`):

- If `.opencode/opencode.json` is missing, create `{ "instructions": [".opencode/rules/*.md"] }`.
- If it exists, parse JSON. Ensure `instructions` is an array and contains `.opencode/rules/*.md` exactly once. Do not remove other instructions or other keys.
- Invalid JSON in that file: stop with `BLOCKED: invalid JSON at .opencode/opencode.json — fix the file, then /{{prefix}}setit-se again`.
- Do not edit a project-root `opencode.json` or `opencode.jsonc`. OpenCode combines `instructions` from both configs.
- Uninstall does not remove this glob (setup-owned, like the rule files).

**`rulesIndex` `agents-md`** (today Codex reads only `AGENTS.md`, so a rules directory alone is never loaded). After writing that host’s `seh-*` rule files, keep one seh-managed section in project-root `AGENTS.md`. Build the new text with

```text
node .seh/references/codex-adapters.cjs rules-section AGENTS.md <rulesDir> <the seh-* rule files just written>
```

(stdout is the full new `AGENTS.md`; with no rule files it removes the section). Text outside the `<!-- seh:rules:start -->` … `<!-- seh:rules:end -->` markers is never changed; rerun with the same rules changes nothing. Pointers are advisory (Codex does not scope by `paths`). **Show the managed section to the user and wait for acceptance before writing**, the same way as the rest of `AGENTS.md`:

- First run: add it to the proposed `AGENTS.md` of step 5 (rule files are generated before that step), so the user accepts it with the rest.
- Later run: only when the helper’s output differs from the current file, show just the section and write it after acceptance. This is the one exception to “Do not remake or re-merge `AGENTS.md`”. An `AGENTS.md` that does not exist yet is created from the section alone only after the same acceptance. If the helper reports an unbalanced marker, stop with `BLOCKED: unbalanced seh:rules marker in AGENTS.md — fix the file, then /{{prefix}}setit-se again`.

Codex caps combined `AGENTS.md` size (32 KiB by default); mention it only if the file is near that.

On regenerate: in **each** `rulesDir`, delete existing `seh-*` files this skill wrote, then write the current filtered set. Do not delete rule files that are not `seh-` prefixed. Leave the OpenCode `instructions` glob in place. When a regenerate leaves a `rulesIndex` host with zero rule files, remove its managed section (same acceptance step).

### Codex notice

When the table has a row with `agentFormat` `codex-toml` or a `hooksMatcher`, say once, after generation: Codex loads project hooks only in a trusted project, and the user must review the seh `SessionStart` hook in `/hooks`; until then the update check does not run. Skills are invoked as `$<prefix><name>` (or `/skills`).

---

## Do not

- Commit.
- Write credentials, tokens, or secrets into chat, git, or `harness.config.json`.
- Generate live agents, work skills, or rule packs via `seh install` (install already did its job).
- Repeat first-run PRD / `AGENTS.md` work on a later run.
- Guess `main`, `master`, or the current checkout as `agents.baseBranch`.
- Interpolate runtime config into agent markdown bodies.
- Add CLI subcommands or a global install.
- Use a product name other than `seh`.
- Ask the user which hosts to write. Write every row in `hosts.json`.
- Copy one host’s role `model` onto another host’s live agent file.
- Write under `~/.codex/`, or into `.agents/skills` anything seh does not own.
- Branch on a host `id` for Codex behaviour: use the row fields.
