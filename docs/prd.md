# Product: seh

A layer for software engineering work in an AI coding assistant. Supported hosts in this version are **Claude Code**, **Cursor Agent**, **OpenCode**, and **Codex**. A later host is a row in `references/hosts.json` plus a format adapter, not a second product. It ships **skills**, **agents**, **rule packs**, and a **small CLI** so a project can specify, implement (with a quality loop), and review work without each agent inventing its own process.

The product and CLI binary are **`seh`**. The npm package is **`se-harness`**.

This PRD wins whenever old agent files or chat history disagree.

## Package source layout

Published product sources live in this repo at the package root. Do not invent a wrapping `templates/` directory.

| Directory | Role |
|-----------|------|
| `agents/` | The five product agents: Architect, Designer, Implementer, Consultant, Reviewer. |
| `packs/` | Framework rule packs (JS/TS, React Native, Angular, Next.js, Python, Django, FastAPI, C#, ASP.NET Core, EF Core) and the `ux-a11y` pack for UI files. |
| `skills/` | Skill templates, including `/<prefix>setit-se`. |
| `brainstorm/` | Round templates: member, persona output format, facilitator (collect only), report, app-context skeleton. Not product agents and not in `agents/`. |
| `references/` | Extra file templates (spec / prompt / log shapes, config skeleton, `BLOCKED` format, the consumer `AGENTS.md` template, `hosts.json`, and the like). `hosts.json` rows are data: besides the path fields they carry `modelSuggest` (per role, including `designer`, which equals the row's `implementer` value), and also `agentFormat` (agent file adapter, e.g. `codex-toml`), and optional `hooksMatcher` (session-start matcher string, e.g. Codex `startup\|resume`), `invokePrefix` (`$` for Codex, `/` for the others) and `skillHide` (how a work skill is hidden from auto-invocation: frontmatter, or `openai-yaml` for Codex) and `rulesIndex` (`agents-md`: rules are not loaded from `rulesDir`, so setup keeps a seh-managed pointer section in `AGENTS.md`). Code reads these fields; it does not branch on a host `id`. |
| `scripts/` | POSIX `sh` helpers (git/`gh` allowlist, session update check, fan-out planner `fanout-plan`). Copied into `.seh/scripts/`. Not the `seh` CLI. |
| `src/` | CLI (`install` / `uninstall` only). Not copied into `.seh/`. |

`docs/` is this product’s own documentation. It is not copied into a consuming project’s `.seh/`.

`seh install` copies `agents/`, `packs/`, `skills/`, `brainstorm/`, `references/`, and `scripts/` into the target project’s `.seh/` under the **same names**, writes `.seh/VERSION` (the package version), and writes the live `/<prefix>setit-se` skill from `skills/` into **every** `skillsDir` listed in `references/hosts.json`. Those directory names in this package **are** the payload: do not keep a second internal tree and remap on copy. When this repo is implemented, write product files in these directories so a consuming repo receives `.seh/agents/`, `.seh/packs/`, `.seh/skills/`, `.seh/brainstorm/`, `.seh/references/`, and `.seh/scripts/`.

## Binding user flow

This sequence is the product contract. Templates, CLI, and skills must implement it. There is no other supported way to adopt `seh`.

The user is in **their** project directory. The assistant is open on that project. Nothing is installed on the machine.

### 1. Bootstrap

Exactly one of:

```text
# npm
npx se-harness install

# GitHub (the seh repo; #ref is an optional tag, branch, or commit)
npx github:meehow-halas/se-harness install
npx github:meehow-halas/se-harness#<ref> install
npx https://github.com/meehow-halas/se-harness install
```

**Skill-name prefix.** `seh install --prefix P` (default `_`; allowed characters letters, digits, `_`, `-`; `--prefix ""` for none) sets a prefix for every skill name. Source names in `skills/` have no prefix (`setit-se`, `planit`, `designit`, `doit`, `checkit`, `runit`, `shipit`, `scopeit`, `grillit`); the live directory and the frontmatter `name:` (the slash command) are `<prefix><name>`, so the default commands are `/_setit-se`, `/_planit`, `/_designit`, `/_doit`, `/_checkit`, `/_runit`, `/_shipit`, `/_scopeit`, `/_grillit`. Install writes the prefix to `.seh/PREFIX` and replaces the token `{{prefix}}` with it in every text file it copies into `.seh/`. `seh uninstall` reads `.seh/PREFIX` and takes no `--prefix`. Installing again without `--prefix` keeps the prefix in `.seh/PREFIX` (default `_` only when that file is missing or holds a disallowed value). Installing again with another prefix removes the old install-owned setup skill (and its host command). `/<prefix>setit-se` generates the work skills as `<prefix><name>`, records `seh.generatedPrefix`, and removes live skills made with an earlier prefix (every work skill, `designit` included) or the pre-prefix `seh-*` names.

`meehow-halas/se-harness` is the GitHub repository that publishes the `se-harness` package (`seh` CLI). A git HTTPS URL is the same as `github:meehow-halas/se-harness`. npm and GitHub are first-class and equivalent.

**Required result:** `.seh/` and the project skill `/<prefix>setit-se` in every supported host `skillsDir` (today `.claude/skills/<prefix>setit-se`, `.cursor/skills/<prefix>setit-se`, `.opencode/skills/<prefix>setit-se`, and `.agents/skills/<prefix>setit-se` for Codex), plus a host command `<commandsDir>/<prefix>setit-se.md` for every row that has `commandsDir` (today OpenCode, `.opencode/commands/`, where a skill is not a slash command). Codex has no `commandsDir` (its only custom-prompt location is machine-wide, which is out); a user invokes a skill there as `$<prefix>setit-se` (or picks it in `/skills`). Docs and skill text use the row's `invokePrefix` (`$` for Codex, `/` elsewhere) in front of the skill name; `/<prefix>…` in this PRD reads as that. Setup is **not** done. `/<prefix>runit`, `/<prefix>shipit`, `/<prefix>planit`, `/<prefix>designit`, `/<prefix>doit`, `/<prefix>checkit`, `/<prefix>scopeit`, and `/<prefix>grillit` do not exist yet and must not be offered. `/<prefix>setit-se` is the skill that finishes first-time setup and later changes the same config.

### 2. Finish setup

The user runs `/<prefix>setit-se` in the assistant. That is the only way to finish first-time setup. The CLI does not configure the project.

The skill reads the repo and `.seh/`. It looks for a project PRD and only detects it: an existing PRD is used as is (never overwritten) and registered in `agents.docs`. It states the inferences it makes so the user can object. If there is no PRD it asks no product questions at this point; the last step of the first run runs the `/<prefix>scopeit` create procedure (read from `.seh/skills/scopeit/SKILL.md`), which always leaves `docs/prd.md`, also with only `TBD` sections. It asks one question at a time only for what the repo (and that PRD) do not decide: role models per host (`agents.roles.<role>.model` keyed by `hosts.json` `id`), content language, the base git branch (`agents.baseBranch`; suggested default `dev`; not asked when the project has no git repo, and the user may answer “no git” — see **Git disabled**), which git operations seh runs (`agents.git`; only with a base branch), whether seh writes `CHANGELOG.md` (`agents.reportChange`), an optional project rule (explained in that question so the user knows what it is for), then Jira yes/no (for a connected tracker, also which tracker writes seh runs). It always handles project-root `AGENTS.md` and `CLAUDE.md` in every combination (neither, only one, or both): merge what exists, then merge with the seh agents-file template, show the proposed `AGENTS.md`, and write only after the user accepts. It does not commit.

**Required result:** a project PRD (`docs/prd.md` when it had to be created by the closing `/<prefix>scopeit` step, otherwise the one already in the repo), `harness.config.json`, agents, remaining skills, rule packs, and a project-root `AGENTS.md` (accepted on first run) — including when the project originally had only `CLAUDE.md`. `CLAUDE.md` exists after this step when the project originally had a `.claude/` directory **and/or** a `CLAUDE.md` (symlink to `AGENTS.md` when the host can create one; otherwise an independent file with the same accepted body). Until this step has produced `harness.config.json`, work skills must stop and tell the user to run `/<prefix>setit-se`. If `harness.config.json` exists but `.seh/VERSION` does not match `seh.generatedFrom`, work skills must stop the same way and tell the user to run `/<prefix>setit-se` so generated files match the installed templates. If step 1 was skipped, `/<prefix>setit-se` stops and tells the user to run `seh install` here, then `/<prefix>setit-se` again.

A later `/<prefix>setit-se` does not repeat first-run setup. If a role `model` is still a string or the map is missing a host `id`, it finishes that map first. If `.seh/VERSION` does not match `seh.generatedFrom` in `harness.config.json`, it regenerates live agents, work skills, and rule packs from the current `.seh/` first (not the project PRD, not `AGENTS.md`), tells the user the package templates changed, then changes parameters (models, statuses, ignored packs, tracker, base branch, git operations, change record, …) one at a time.

### 3. Work

Only after step 2:

| Intent | Command |
|--------|---------|
| Full path | `/<prefix>runit` plus what to build |
| Many specced tasks, merged, in dependency order | `/<prefix>shipit` (keys, or all `todo`) |
| Spec only | `/<prefix>planit` |
| UX/UI design only, before the spec | `/<prefix>designit` |
| Implementation only | `/<prefix>doit` (one task or a list) |
| One review | `/<prefix>checkit` (one task or a list) |
| Change parameters or Jira | `/<prefix>setit-se` |
| Personae | `/<prefix>grillit` |

After an accepted review the Reviewer sets `done` and runs every enabled git operation: commit, push, PR (see **Git**; git disabled: change record and `done` only). That is the end of the feature. A switched-off operation is left to the user and named in the report. The user merges the GitHub PR; the merge does not change the task status. Exception: a run launched by `/<prefix>shipit` (fan-out child with `Auto-merge: yes`) ends with the Reviewer merging the PR via `merge-pr`.

### 4. Remove bootstrap (optional)

Same source as step 1:

```text
npx se-harness uninstall
npx github:meehow-halas/se-harness uninstall
```

Removes `.seh/` and the install-owned `/<prefix>setit-se` skill. Leaves `harness.config.json` and files `/<prefix>setit-se` generated.

## How it runs

`seh` is **never** installed globally (`npm install -g` is out). **Never** write skills, templates, or a CLI to `~/.claude/`, `~/.cursor/`, `~/.config/opencode/`, `~/.codex/`, or any other machine-wide location.

The product and CLI binary are **`seh`**. The npm package is **`se-harness`**. Run the CLI only in the target project. Pick one source in step 1 and reuse it in step 4.

These two commands are the entire `seh` CLI in v1. They are idempotent.

### What `seh install` writes

Into **this project only**:

| Path | Role |
|------|------|
| `.seh/` | Working copy of `agents/`, `packs/`, `skills/`, `brainstorm/`, `references/`, and `scripts/` from the package, plus `.seh/VERSION` (package version). |
| Project skill `/<prefix>setit-se` | First-time configuration and later parameter changes (binding flow steps 2 and 3). Written into **every** `skillsDir` in `references/hosts.json`. |
| Host command `/<prefix>setit-se` | Only for rows with `commandsDir` (today OpenCode). `<commandsDir>/<prefix>setit-se.md` from `references/host-command.md`: a thin wrapper that tells the assistant to load the `<prefix>setit-se` skill, names the host row (`Host: <id>`), and passes `$ARGUMENTS`. No procedure of its own. |
| Host session-start hook | One install-owned command that runs `.seh/scripts/check-update`. Merged into each host’s `hooksFile` from `references/hosts.json` (today `.claude/settings.json` `SessionStart`, `.cursor/hooks.json` `sessionStart`, the OpenCode plugin `.opencode/plugins/seh-check-update.js`, and Codex `.codex/hooks.json` `SessionStart` with matcher `startup\|resume`, same nested shape as Claude Code). Does not overwrite other hooks or other keys in that file. Codex loads project hooks only in a trusted project, and the user must review the hook in `/hooks` before it runs; `/<prefix>setit-se` tells the user this. |

That is the full install-owned set. After install, `/<prefix>setit-se` is invocable. Live agents, the other skills, rule packs, and `harness.config.json` do **not** exist yet. Install does not generate those live files. If this project already has `harness.config.json` (a later install, for example after a package update), install may print that the user should run `/<prefix>setit-se` to apply the new templates. It still does not generate them itself.

Install also ensures the project-root `.gitignore` contains `.seh/` and `harness.credentials.local.json` (creates the file if missing). This is not uninstall-owned: `seh uninstall` does not edit `.gitignore`.

`seh uninstall` removes that same set (`.seh/`, the install-owned `/<prefix>setit-se` skill in every `skillsDir`, its host command in every `commandsDir`, and the install-owned hook command from each `hooksFile`). It does not delete `harness.config.json`, files `/<prefix>setit-se` already generated, or a host hooks file that still has other keys. If the file has only empty hook lists left (and Cursor’s required `version` key), uninstall deletes that file.

On host session start, `.seh/scripts/check-update` compares `.seh/VERSION` to the highest semver git tag on `https://github.com/meehow-halas/se-harness.git`. That GitHub tag is the available version, whether bootstrap used npm or GitHub. It only injects context when the tag is strictly newer. It never runs `seh install`. Installing or updating a new version never happens without the user's explicit yes. Network, timeout, missing `.seh/VERSION`, or a local version that is already higher: silence (fail-open). Cache under `.seh/` (TTL 24h). A later `/<prefix>setit-se` after a manual install is still required when templates changed.

### What `/<prefix>setit-se` does

**First run** (no `harness.config.json`): binding flow step 2. Detects the project PRD and registers it in `agents.docs` (no product questions here). Detects a git repo; asks for `agents.baseBranch` (suggested default `dev`) only when there is one, otherwise leaves it empty (git disabled); with a base branch it asks which git operations seh runs (`agents.git`). Asks whether seh writes `CHANGELOG.md` (`agents.reportChange`). Asks the role models per host (five roles, including the Designer; written to `agents.roles.<role>.model`, so `agents.roles.designer.model`) and whether to enable the Designer (`agents.designer.enabled`, recommended `true` when a UI stack is detected). Writes config (including `seh.generatedFrom` = `.seh/VERSION`) and generates agents, the remaining skills, and rule packs (including `ux-a11y` when a UI stack is detected) from `.seh/` into **every** host tree in `.seh/references/hosts.json`. Live agent files are **copies** into each `agentsDir`, not symlinks to `.seh/agents/`, so the host `model:` frontmatter can be project-specific without editing the install-owned templates. Agent markdown does not interpolate `agents.baseBranch`, `agents.git`, `agents.reportChange`, statuses, tracker write actions, tracker maps, `fetchFields`, content language, or the product line — those are read from `harness.config.json` at run time, and git allowlist operations go through `.seh/scripts/`. Builds project-root `AGENTS.md` from any existing `AGENTS.md` / `CLAUDE.md` plus the seh template (always writes `AGENTS.md`, even if only `CLAUDE.md` was there), writes it only after the user accepts the proposed body, then writes `CLAUDE.md` when `.claude/` was present and/or `CLAUDE.md` already existed (see `/<prefix>setit-se` detail). Last step, only when no PRD existed: runs the `/<prefix>scopeit` create procedure, then adds `docs/prd.md` to `agents.docs` and sets the one-line `product` (config is already written; only those two keys change).

**Later run** (config already there): if `.seh/VERSION` ≠ `seh.generatedFrom`, regenerate live agents, work skills, and rule packs from the current `.seh/` first, set `seh.generatedFrom` to `.seh/VERSION`, and tell the user the installed templates changed (including that `/seh-feature` was renamed to `/<prefix>runit` and leftover live `seh-feature` was removed; do not rewrite `AGENTS.md`). Then change one parameter at a time (including Jira). Do not overwrite keys the user did not confirm. After a confirmed change: rewrite that live agent’s frontmatter in **that host’s** `agentsDir` when one role `model` cell changes; regenerate rule packs when `packsIgnored` (or detected frameworks) change. A config from before the Designer (no `agents.roles.designer`, no `agents.designer.enabled`) gets the Designer role map and the enable question first; the Designer stays off until the user answers. Do **not** regenerate agents because `agents.baseBranch`, `agents.git`, `agents.reportChange`, statuses, tracker write actions, tracker maps, `fetchFields`, content language, or the product line changed — those are runtime config.

Agents run the **project’s own** test/lint/typecheck scripts (from `package.json` or the equivalent).

## Goals

- One path: request → spec → implementation with quality feedback → review against the spec.
- Files as the default tracker; Jira or Azure DevOps Boards optional.
- Architect does not write a file-by-file recipe. Implementer plans phases. Consultant guards quality. Reviewer guards the spec.
- Coding standards as generated **rules**, not always-on essay markdown.

## Non-goals (v1)

- Any `seh` CLI beyond `install` and `uninstall`. No `seh agent`, `seh git`, `seh check`, or `seh` status/Jira command. Git allowlist helpers, the session update check and the fan-out planner are files under `.seh/scripts/`, not CLI subcommands.
- Auto-install or auto `/<prefix>setit-se` when a newer GitHub tag exists. The session hook only notifies.
- Status or log helpers for the **files** tracker as `.seh/scripts/` in v1. Agents write file-tracker status and log themselves. Jira I/O is `.seh/scripts/jira`; Azure DevOps I/O is `.seh/scripts/ado` (not `seh` CLI subcommands).
- A second skill for first-time setup or later config changes. `/<prefix>setit-se` does both.
- Global install (`npm install -g`, machine-wide skills, `~/.claude/`, `~/.cursor/`, `~/.config/opencode/`).
- Finishing setup by any path other than `/<prefix>setit-se` after `seh install`.
- Extra product agents. The set is Architect, Designer, Implementer, Consultant, Reviewer. The brainstorm facilitator is a collector runner, not a sixth role.
- Merging pull requests.
- Trackers other than files, Jira, and Azure DevOps Boards (`agents.tracker.kind`: `ado`).
- Architect writing line-level implementation instructions.

---

## Feature tracking

**One active tracker connection:** files-only when `agents.tracker` is absent, or exactly one connected external tracker (`agents.tracker.kind`: **`jira`** or **`ado`**; legacy configs without `kind` are Jira when `url` and `user` are present). Never Jira and Azure DevOps together. Reading a connected tracker is always on; what seh may write there is chosen per action (see **Tracker write actions**). Each artifact and the status of a task live in exactly one store, the tracker or repo files; agents do not mirror the same content onto two stores.

The first `/<prefix>setit-se` asks once whether to connect an external tracker (Jira or Azure DevOps). Decline is remembered (`jiraOffer: declined`) so it does not ask again. **Later `/<prefix>setit-se` owns the tracker:** connect, change, or remove, including after a decline.

Switching does **not** migrate. Connect an external tracker → new work follows the write actions; leftover files of unbound tasks stay as they are. Remove the tracker → new work is files only; existing issues/work items are not copied into files. Changing a write action in `/<prefix>setit-se` copies nothing by itself: after an action is turned ON, a bound task’s local content moves at the next seh step that touches it (**Move on binding**). Nothing is ever copied from the tracker to files.

The change record and code stay in git on both modes. `docs/brainstorm/` settled records stay files (not a task tracker).

### Files tracker (default)

One task = three files, same basename (`001-feature-example-name`):

| Path | Role |
|------|------|
| `docs/features/<basename>.feature.md` | Spec |
| `docs/prompt/<basename>.prompt.md` | Implementation prompt |
| `docs/feature-log/<basename>.log.md` | Append-only log |

Task key = basename. Branch name = basename, or `<basename>-N` when the old branch has a closed or merged PR. Status strings = `agents.statuses`.

### Tracker write actions

`agents.tracker.write` holds five booleans: `create`, `spec`, `prompt`, `log`, `status`. They apply the same way to Jira and Azure DevOps. An action that is ON writes to the tracker. An action that is OFF is never sent to the tracker: the tracker script refuses its verbs (`BLOCKED:` naming the action, no HTTP request, checked before credentials are read) and the artifact goes to the files-tracker location.

| Action | ON | Script verbs refused when OFF | When OFF |
|--------|----|-------------------------------|----------|
| `create` | seh creates the issue / work item and its links | `create`, `link` | No item and no links from seh; the task keeps a files basename and `tracker:` stays empty. The user may bind it by hand. |
| `spec` | Spec in the mapped field | `set spec` | `docs/features/<basename>.feature.md` |
| `prompt` | Prompt in the mapped field | `set prompt` | `docs/prompt/<basename>.prompt.md` |
| `log` | Log rows and comments on the item | `set log`, `comment` (`Q<n>`, Reviewer reports, link failures) | `docs/feature-log/<basename>.log.md` |
| `status` | Transitions to `agents.tracker.statuses` | `transition` | `status:` in the local spec frontmatter (`agents.statuses`). With `spec` ON that file is a frontmatter-only stub. |

`get` assembles each body (spec, prompt, log) from the tracker field when its action is ON, else from the repo file (empty when missing; no tracker-field fallback). The status comes from the tracker when `status` is ON, else from local frontmatter (empty when missing); `get <key>` of a key that no local spec holds (neither as basename nor in `tracker:`) always prints the tracker status. Scalars and `fetchFields` always come from the tracker. `get <key>` reads the repo files named by the key; `get <basename>` of a task whose local spec has `tracker:` reads the tracker parts from that key and the local parts from the basename files.

A tracker config with no `write` block predates 2.0: `get` and every write verb are `BLOCKED: tracker config predates 2.0 — run /<prefix>setit-se`; `meta` still works. Scripts read only `write`.

### Binding

A task is **bound** when `tracker:` in its local spec frontmatter holds a key, or its basename is the key. The write actions above place the artifacts of a bound task. An unbound task has no item: all its artifacts and its status are repo files, whatever the flags say.

- **Naming.** A task that exists on the tracker uses its key as basename and branch name. A new task with no existing item and `create` ON: the item is created first; basename and branch = key. `create` OFF: files basename (`001-feature-x`), `tracker:` empty.
- **Binding later.** A locally started task may be bound afterwards, by seh (`create` ON) or by hand (set `tracker:`). Its basename and branch never change.
- **Stub.** With `spec` ON, a bound task has a local spec file only when basename ≠ key or `status` is OFF. That file is frontmatter only: `id`, `title`, `status`, `type`, `depends`, `relates`, `ui`, `tracker`.
- **Move on binding.** At the first seh step that touches a bound task which still has local content (spec body, prompt file, log file) for an ON action — whether the task was just bound or the action was turned ON afterwards — that content is written to the tracker once (`set spec` / `set prompt` / `set log`), and with `status` ON the item is transitioned to the local status. Then, with `spec` ON, the local spec becomes the stub (removed when the stub rule needs no file); the moved prompt / log files are removed. Content of OFF actions stays local. A stub alone is not local content. With no local content to move (for example `status` is the only ON action) nothing is transitioned on its own: the tracker status is the one read (`get`, **`depends` gate**), and the next ordinary status step sets it.
- **Conflict.** Tracker and local both non-empty for the same artifact → `BLOCKED:` naming both; nothing is overwritten.
- **Failure.** A failed write leaves the local content in place.

**`depends` gate.** The status of a dependency is read from where status lives for that task: the tracker when `status` is ON and the task is bound (it must equal `agents.tracker.statuses.blocker`), else local frontmatter (it must be `agents.statuses.done`). A tracker key that no local spec holds (neither as basename nor in `tracker:`) is read with `get`, which takes its status from the tracker whatever the `status` flag says; it must equal `agents.tracker.statuses.blocker`.

### Jira tracker

Via Jira Cloud REST v3 through `.seh/scripts/jira` (not MCP, not a `seh` Jira CLI). Task key = issue key (`PROJ-123`), or a files basename with the issue key in `tracker:` (see **Binding**). Branch name = the basename.

Where spec, prompt, log, and status live follows **Tracker write actions**. For an ON action on a bound task, agents do not create or edit the matching file in `docs/features/`, `docs/prompt/`, or `docs/feature-log/` (except the stub).

Agents call that script; they do not compose `curl` or REST themselves.

The five seh steps are the same as on files. **Which Jira status each step uses is not guessed.** With `status` ON, `/<prefix>setit-se` writes `agents.tracker.statuses` from that project’s workflow (names taken from Jira, shown as a numbered list). Agents transition only to those exact strings.

| Key | When the agent moves the issue | Config |
|-----|-------------------------------|--------|
| `todo` | Architect has created spec + prompt | Jira status or `null` |
| `inProgress` | Implementer starts | Jira status or `null` |
| `codeReview` | Implementer finishes (`implemented`) | Jira status or `null` |
| `inReview` | Reviewer starts a review round (`in review`) | Jira status or `null` |
| `done` | Clean review accepted and every enabled git operation finished (feature finished) | Jira status or `null` |
| `blocker` (optional extra) | Status a **depends** issue must already have before this one may start | Jira status; required if `depends` is used |

`null` = this step does not call a Jira transition. With `status` ON there is no file fallback and no invented name. If the mapped status does not exist on that issue type’s workflow, stop and tell the user to fix the mapping in `/<prefix>setit-se`.

With `status` ON, `agents.statuses` is not written for a bound task (except the frozen `status:` of a stub, which is not read). With `status` OFF, and for unbound tasks, `agents.statuses` applies to spec frontmatter in repo files. After Remove, file-tracker strings from `agents.statuses` apply again.

Each row applies when its action is ON; otherwise the content goes where **Tracker write actions** says.

| When | Ticket |
|------|--------|
| Architect creates the task | Create issue (`feature` / `bug` type from mapping). Title. Spec and prompt where mapping says (two custom fields, description, or comments). Transition to mapped `todo` when not `null`. |
| Architect updates spec or prompt | Overwrite the mapped spec/prompt location. |
| Implementer starts | Transition to mapped `inProgress` when not `null`. |
| Consultant pass | Nowhere on the ticket (noise). |
| User decision `Q<n>` | Comment. |
| Implementer finishes | Transition to mapped `codeReview` when not `null`. |
| Reviewer starts a round | Transition to mapped `inReview` when not `null`. |
| Reviewer sends the task back (❌) | Transition to mapped `inProgress` when not `null`. |
| Reviewer report (✅/❌/⚠️) | Comment. |
| Acceptance (clean review) | Transition to mapped `done` when not `null`. |
| Other log rows (Architect summary, debt `C<id>: accepted`, …) | Comment, or the mapped log field if one exists. |

`depends` / `relates`: issue links (`create` ON) when the project allows them. If linking fails, record that fact in the log (comment, or the log file when `log` is OFF) and do not block the task.

Unmapped Jira fields are ignored. Credentials stay out of git and out of chat (`harness.credentials.local.json`, `jiraToken`). Project key and field mapping live in `harness.config.json`.

### Azure DevOps tracker

Via Azure DevOps WIT REST (`api-version=7.1` on Services; pinned in `.seh/scripts/ado`) — not MCP, not `az boards`, not a `seh ado` CLI. Task key = numeric work item id (string of digits), or a files basename with the id in `tracker:` (see **Binding**). Branch name and worktree directory name = the basename.

Where spec, prompt, log, and status live follows **Tracker write actions**. For an ON action on a bound task, agents do not create or edit the matching file in `docs/features/`, `docs/prompt/`, or `docs/feature-log/` (except the stub). With `status` ON, workflow moves use `agents.tracker.statuses` and `ado transition` (PATCH `System.State` to the mapped exact state name).

Agents call that script; they do not compose `curl` or REST themselves.

The five seh steps are the same as on files. **Which ADO state each step uses is not guessed.** With `status` ON, `/<prefix>setit-se` writes `agents.tracker.statuses` from that project’s process (names taken from Azure DevOps, shown as a numbered list). Agents transition only to those exact strings.

| Key | When the agent moves the work item | Config |
|-----|-----------------------------------|--------|
| `todo` | Architect has created spec + prompt | State string or `null` |
| `inProgress` | Implementer starts | State string or `null` |
| `codeReview` | Implementer finishes (`implemented`) | State string or `null` |
| `inReview` | Reviewer starts a review round (`in review`) | State string or `null` |
| `done` | Clean review accepted and every enabled git operation finished (feature finished) | State string or `null` |
| `blocker` (optional extra) | State a **depends** work item must already have before this one may start | State string; required if `depends` is used |

`null` = this step does not PATCH state. With `status` ON there is no file fallback and no invented name. If the mapped state does not exist on that work item type, stop and tell the user to fix the mapping in `/<prefix>setit-se`. Current state already matches → `UNCHANGED`.

With `status` ON, `agents.statuses` is not written for a bound task (except the frozen `status:` of a stub, which is not read). With `status` OFF, and for unbound tasks, `agents.statuses` applies to spec frontmatter in repo files. After Remove, file-tracker strings from `agents.statuses` apply again.

Each row applies when its action is ON; otherwise the content goes where **Tracker write actions** says.

| When | Work item |
|------|-----------|
| Architect creates the task | Create work item (`feature` / `bug` type from mapping). Title. Spec and prompt where mapping says (`System.Description`, custom `referenceName`, `comment`, or `history`). Set state to mapped `todo` when not `null`. |
| Architect updates spec or prompt | Overwrite the mapped spec/prompt location. |
| Implementer starts | PATCH state to mapped `inProgress` when not `null`. |
| Consultant pass | Nowhere on the work item (noise). |
| User decision `Q<n>` | Comment via `ado comment`. |
| Implementer finishes (`implemented`) | PATCH state to mapped `codeReview` when not `null`. |
| Reviewer starts a review round | PATCH state to mapped `inReview` when not `null`. |
| Reviewer report (✅/❌/⚠️) | Comment. |
| Fix round (❌ sends the task back) | PATCH state to mapped `inProgress` when not `null`. |
| Acceptance (clean review) | PATCH state to mapped `done` when not `null`. |
| Other log rows (Architect summary, debt `C<id>: accepted`, …) | Comment, or append when `fields.log` maps to a field. |

`depends` / `relates`: work item links (`System.LinkTypes.Dependency-*` / `Related`; `create` ON) when the project allows them. If linking fails, record that fact in the log (comment, or the log file when `log` is OFF) and do not block the task.

Unmapped ADO fields are ignored. Credentials stay out of git and out of chat (`harness.credentials.local.json`, `adoPat`; Basic with empty user and PAT as password; never in argv). Organization URL, project, and field mapping live in `harness.config.json`. Skeleton: `references/harness.tracker.ado.json`. Azure DevOps Server URL shape may be documented; Cloud paths ship first.

---

## Artifact contract

Same shape on all trackers; each artifact is in one store (see **Tracker write actions**). On files it is markdown. On Jira it is the mapped fields / description / comments. On Azure DevOps it is mapped fields / description / comments / history (HTML stored in ADO; scripts convert to plain text on `get` where needed).

### Spec (`*.feature.md`)

Frontmatter: `id`, `title`, `status`, `type` (`feature` \| `bug`), `depends`, `relates`, `ui` (`true` \| `false`; absent = `false`), `tracker` (issue key / work item id of a bound task; empty or absent when unbound or when the basename is the key). The Architect sets `ui: true` when the task changes something a user sees (screen, interaction, UI text, navigation).

Body:

1. **Abstract** — what, why, for whom (2–5 sentences).
2. **Requirements**
3. **Acceptance criteria**
4. **Architectural decisions** — choices and why, not a tutorial.
5. **UX/UI decisions** — only when `ui: true`, written by the Designer (see Designer). Layout, states (loading / empty / error), interaction, copy, accessibility, and existing components or design system to reuse. The Designer also appends its acceptance criteria to **Acceptance criteria**, each marked with the prefix `UX:`. When the spec is built from a design file (see Design), the Architect writes this section and the `UX:` criteria from that file instead.

Keep it short. If the request is several products, the Architect splits it and records `depends` / `relates`. Every name in `depends` must pass the **`depends` gate** before implementation starts. An open `depends` is not a stop for the Architect: it writes the spec (so dependent tasks can be specced ahead for `/<prefix>shipit`); Implementer and Reviewer gate on it, and `/<prefix>runit` stops at a dependency gate after its Architect stage, before `start-task`.

Paths may appear as constraints (“do not change X”), never as a step list.

### Design (`*.design.md`)

Written by `/<prefix>designit` (see Designer). Path: `docs/designs/<slug>.design.md`, always in the repo, whatever `agents.tracker` is (also with Jira or Azure DevOps connected). Template: `references/design.design.md`. No config key. The same directory holds the project's UX conventions file, `docs/designs/ux-conventions.md` (not a design; see Designer, third entry).

Frontmatter: `id`, `title`, `status` (`draft` \| `ready`).

Body, UX/UI only (no business requirements, no architecture decisions):

1. **Context** — for whom, which problem.
2. **User flows**
3. **Screens / layout**
4. **States** — loading / empty / error.
5. **Interactions**
6. **UI copy**
7. **Accessibility**
8. **Components / design system to use**
9. **Decisions** — `D<n>: …`, in this file, not in a log.
10. **Criteria** — each marked with the prefix `UX:`.
11. **Open questions**

One design file can feed several specs (the Architect splits); each spec logs the same path. Figma or images are only a text link. Nothing searches `docs/designs/` on its own.

### Prompt (`*.prompt.md`)

Goal, phase-grain order, new dependencies, existing code to reuse, **what not to change**. Reference files by path. The Implementer still writes their own plan.

### Log (`*.log.md`)

Table `date | agent | action | note`. User decisions: `Q<n>: …`. Designer decisions: `D<n>: …` (for a design file they live in that file, not in a log). A spec built from a design file has a row `design: <path>`. Consultant items: `C<phase>.<n>: …`. No second approvals file.

---

## Statuses

English keys. Stored strings come from `agents.statuses` (defaults below). Do not translate them from the conversation language.

```text
todo → in progress → implemented → in review → done
```

| Status | Meaning | Who may run |
|--------|---------|-------------|
| `todo` | Spec and prompt exist or are being written. Architect does not advance past this. | Architect; then Implementer |
| `in progress` | Implementation + Consultant loop. | Implementer (inline in the invoking session; Consultant launched by that session) |
| `implemented` | Implementation finished; the Reviewer may start. | Implementer at the end of its run; Reviewer gate |
| `in review` | A review round is running, or waiting for user acceptance. ❌ moves it back to `in progress`. | Reviewer |
| `done` | Clean review accepted and every enabled git operation finished (all enabled: commit, push, PR opened). The feature is finished; the PR merge does not change it. | Reviewer, at acceptance only |

Earlier names: `backlog` → `todo`; `reviewReady` is not a status (stay on `in progress` until the Implementer finishes); `reviewDone` → `in review`; `code review` → `implemented` (the Reviewer no longer sets it).

Agents update status **only** where status lives for the task. Files (files tracker, `status` OFF, or an unbound task): write the strings from `agents.statuses` (read from `harness.config.json` at run time) into the feature file; no transition runs. Jira with `status` ON: `.seh/scripts/jira transition` to `agents.tracker.statuses.<key>` from that same file. Azure DevOps with `status` ON: `.seh/scripts/ado transition` to the mapped state name. There is no `seh` CLI for status. File-tracker status is not a script in v1.

---

## Modes

From **intent**, not a required slash flag. A launch may name the mode so every agent in `/<prefix>runit` shares it. Default: `interactive`.

| Mode | Ask the user |
|------|----------------|
| `interactive` (was “default”) | One question at a time, when it is reached. Not a list at the end unless the user asked for a list. |
| `critical` (was “semi-standalone”) | One question only for a **critical** decision, then stop. Otherwise decide, record one sentence, continue. |
| `autonomous` (was “standalone”) | Ask nothing. Contradictions follow the existing spec, or the latest explicit sentence of the request. Preserve user data. Record each choice. Never leave a choice open for the user. |

The Designer uses the same three modes as the Architect (the launching skill passes the same mode).

A clear misspelling in a name the request gives (function, file, key, field) that nothing existing uses is not critical: in critical/autonomous the Architect uses the correct spelling and records `Q<n>: <original> → <corrected>`. Interactive asks it with the correction as the recommendation.

A decision is **critical** when the request contradicts itself or an existing spec and the two readings ship different behaviour; the work needs a new dependency or external service; it would delete or overwrite user data or be hard to undo in production; or a missing fact would ship two different behaviours.

A UX decision is **critical** when it contradicts the project's existing design system or an existing screen's pattern and the two readings ship different behaviour; it changes navigation or information architecture in a way that is hard to undo for users; or a missing fact would ship two different behaviours. Other UX choices the Designer decides, records as `D<n>`, and continues.

Questions use stable ids `Q<n>` and one recommended answer.

Consultant never talks to the user; the Implementer does, if the debt protocol requires it.

---

## Agents

Exactly five agents. No others.

| Agent | Model (default) | Job |
|-------|-----------------|-----|
| Architect | opus | Spec + prompt. May split tasks. May consult brainstorm members. Read-only on application code. No git writes. |
| Designer | same as Implementer on every host | Only for specs with `ui: true`: UX/UI decisions section and UX acceptance criteria in the spec; or, through `/<prefix>designit`, a UX design file. Read-only on application code. No git writes. Status unchanged. |
| Implementer | sonnet | Implements the task (feature or bug). Own phase plan. After each phase, runs Consultant. Tests with the code. |
| Consultant | haiku | Code **quality** on the phase diff. Does not edit product code. Does not judge spec compliance. |
| Reviewer | sonnet | Spec compliance (requirements + AC) only. Not style. Runs the enabled git operations (commit, push, PR, return to base), sets `done`. |

Brainstorm members are not agents and are not `@`-addressable.

### Architect

- Input: a sentence, or existing files / the active external tracker. Optionally `Design: <path>` (a design file the user named in `/<prefix>planit` or `/<prefix>runit`; the Architect never looks in `docs/designs/` on its own).
- Output: spec + prompt + first log row, each in one store: the active tracker, or repo files for an action that is OFF (see **Tracker write actions**). Names and binds the task (see **Binding**). Links items only with `create` ON. Status stays `todo`.
- With `Design: <path>`: the spec gets `ui: true`; the Architect copies the design's decisions into **UX/UI decisions** and its `UX:` criteria into **Acceptance criteria**. A conflict with the requirements is a `Q<n>` for the user. The log has a row `design: <path>`. A missing file is `BLOCKED`. A file with `status: draft`: interactive asks (recommendation: finish it in `/<prefix>designit`); critical ends with `BLOCKED: design <path> is draft — finish it in /<prefix>designit or rerun interactive`; autonomous records a `Q<n>` and continues. The Architect never edits the design file. When it overwrites such a spec, it takes the UX again from the path in the log; the Designer is not run.
- Does not create or switch branches. Does not call git scripts. Does not use worktrees.
- Interactive: confirm title, then spec+prompt, before write. Critical/autonomous: write once Questions is satisfied. Approval for an overwrite of an existing spec counts when the user says it in this session or the launch passes `User approval: <the user's own words>` verbatim; the same rule as the Reviewer acceptance.

### Designer

Conditional: runs only when the spec has `ui: true` **and** `agents.designer.enabled` is `true`. Tasks without UI never see it.

- Input: the Architect's spec (and prompt) for the task, the project's existing UI code and design system (read-only), and the mode.
- Output: the spec's **UX/UI decisions** section, UX acceptance criteria (`UX:`) appended to **Acceptance criteria**, one log row per decision `D<n>: …`, and, in the prompt, only a pointer to components or design-system parts to reuse. Each is written in one store by its write action, like the Architect. Status stays `todo`.
- Does not create or switch branches, call git scripts, or use worktrees. Works in the launch checkout. Read-only on application code.
- Does not change requirements or Architect decisions (a conflict is a `Q<n>` for the user), does not edit the prompt beyond the component pointers, and does not launch brainstorm personae.
- Modes: same as the Architect. Interactive: one question at a time with a recommendation, and the UX section is shown before write. Critical: asks only for a critical UX decision (see Modes), records the rest as `D<n>`. Autonomous: asks nothing, records every decision.
- The launching skill runs the Designer (the Architect is a subagent and cannot). A later Architect change to a spec that already has a UX section re-runs the Designer under the same rules as an overwrite of a spec: interactive proposes the change, autonomous overwrites. Exception: a spec built from a design file (see Architect).

**Second entry: `/<prefix>designit`.** Input `Design file: <path>` (the skill passes it) and the mode. The Designer designs UX/UI only, from a sentence or from an existing design file (iteration), and writes only that file (see Design). It has no task key, reads and writes no tracker, creates no spec, prompt or log, and uses no git. Decisions are `D<n>` in the file. Interactive shows the file before write and sets `status: ready` once the user accepts it; critical and autonomous set `ready` after the write. Same agent, same five-agent set; modes as above.

**Third entry: UX conventions.** `/<prefix>designit` with the intent "learn conventions" launches the Designer with `Conventions file: docs/designs/ux-conventions.md` (no task key, no tracker, no git). It scans the UI code, tokens, component library, `agents.docs` and the `ux-a11y` pack, and writes that one file (template `references/ux-conventions.md`): `status` `draft` \| `ready`, about 50 lines of one-line, observable rules with `path:line` evidence, and a section **Deviations from ux-a11y** (pack rule quoted verbatim, practice, reason, evidence). Deviations are written only after the user accepts them (interactive); in critical / autonomous they are proposals in the report. In the spec and design-file entries the Designer reads the file when it exists: it wins over the generic WCAG / HIG baseline in what it describes, a decision based on it is `D<n> … (ux-conventions)`, and `draft` is a hint, not a deviation. No file: no change. No config key. This mode does not offer `/<prefix>planit` / `/<prefix>runit`.

### Implementer

- Implements whatever the Architect specified, including tasks with `type: bug`. There is no separate bug agent.
- Git disabled (empty `agents.baseBranch`): skip `start-task`; work in the launch checkout; no branch or worktree.
- `worktree` operation disabled: `start-task` answers `UNCHANGED` with the launch checkout; work there, as with git disabled.
- Before work: run `.seh/scripts/start-task` with the task basename (see Git). That script reads `agents.baseBranch` from `harness.config.json`, creates the branch named as the basename from that base in a git worktree, and does not commit, push, or switch the caller’s checkout. A launch may name `Worktree: <abs>`; all file edits, project tests, and `.seh/scripts/` calls happen there. Do not guess `main`, `master`, or the current checkout. Do not compose that git yourself.
- Set status `in progress`.
- Plan 2–6 phases. A phase is a coherent slice (e.g. model + tests, then API), not one file.
- After **each** phase: launch Consultant (see below). Do not start the next phase until the Consultant protocol says `continue`.
- Do not edit `CHANGELOG.md`, even when project rules ask for a changelog line with every change; the Reviewer records the change after acceptance.
- Unclear spec: follow Questions; do not invent architecture beyond that.
- If the **project** test/lint command fails on code they did not touch: stop and tell the user. Do not label it unrelated and continue.
- When all phases have `continue`, set status `implemented`. The Reviewer moves it to `in review` when it starts.

### Consultant (quality loop)

Consultant exists so cheap, frequent quality feedback happens **during** implementation, while Reviewer stays spec-only. It is not optional in v1.

**Not a user skill.** The session that runs the Implementer launches it as a subagent. The Implementer itself runs inline in that session, not as a subagent, because subagents cannot launch subagents.

**May:** read the phase diff, the touched files, the generated rules, tests for those files, and `docs/designs/ux-conventions.md` (only its **Deviations from ux-a11y** section matters; see Pack `ux-a11y`). Return a structured report.

**Must not:** edit product code, run git writes, change the spec or prompt, talk to the user, re-open architectural decisions already in the spec, review files outside the phase (except tests of touched code).

#### Report (required shape)

```text
CONSULT: phase=<name> pass=<1|2> of 2
must-fix:
- C<phase>.<n>: <file> — <problem> — <why it violates a rule or breaks behaviour>
should-fix:
- C<phase>.<n>: <file> — <problem>
notes:
- …
VERDICT: rework | continue
```

- `must-fix`: correctness, tests broken **by this phase**, generated-rule violations that are objective (e.g. forbidden API, missing test for new behaviour). These can block the phase.
- `should-fix`: naming, duplication, structure. Never block. Implementer may apply or skip; skipped items get one log line.
- `notes`: observations. Never block.
- `VERDICT: rework` only when at least one `must-fix` is open. Otherwise `continue`.

Ids are stable for the phase (`C2.1` stays `C2.1` on pass 2).

#### Loop (this is what stops infinity)

```text
phase work → Consultant pass 1
  no must-fix → continue to next phase
  must-fix    → Implementer fixes only those ids
             → Consultant pass 2 (recheck)
                  all must-fix closed → continue
                  still open          → debt protocol, then continue
```

**Hard caps**

| Cap | Value | Effect |
|-----|-------|--------|
| Passes per phase | 2 (first look + one recheck) | No third pass unless the user, in interactive, explicitly grants **one** extra pass for that phase |
| Phases per task | 6 | More than 6: Implementer merges remaining work into the last phase |
| Consultant launches per task | 8 | Hit the cap → debt-log every open must-fix, stop calling Consultant, finish remaining work, go to Reviewer |
| New findings on pass 2 | only leftover must-fix ids **or** must-fix **introduced by the fix** | Pass 2 cannot add `should-fix` or a new theme |

**Anti-thrash**

- Same `must-fix` (same file + same problem) and **no** diff change since last pass → mark `C<id>: stale`, drop it, do not spend another pass.
- Empty phase diff → `continue` + note `empty phase`. Still counts as one launch (so splitting into empty phases burns the cap).
- Consultant must not say “I would have designed it differently” when the spec already decided it.
- Implementer must not “fix” by reverting the phase to dodge feedback; that is still the same phase.

**Debt protocol** (must-fix still open after pass 2, or after the task launch cap)

- Log `C<id>: accepted — <reason>`.
- `interactive`: one question, list the remaining must-fix. Options: grant one extra pass for this phase, or accept debt and continue. No lists of other topics.
- `critical`: if tests **this phase changed or added** still fail → stop (not taste; the phase is broken). Otherwise accept debt, record, continue.
- `autonomous`: same as critical.

Reviewer **does not** turn leftover `should-fix` into ❌. Reviewer **may** ❌ leftover `must-fix` when it actually misses an acceptance criterion. Quality leftovers that are not AC stay in the log.

### Reviewer

Checks the finished implementation against the spec. Not formatting, not Consultant’s `should-fix` list.

- Gate: status `implemented` (first round, or after a fix) or `in review` (later round with no fix between). Set `in review` before the review. ❌ → set `in progress`.
- ❌ → back to Implementer with only those items (Consultant runs again only on phases those fixes belong to, still under the same caps). ⚠️ do not start a round.
- Max **three** Reviewer rounds. The same ❌ with no code change ends the loop.
- An ❌ that contradicts the spec goes to the user; changing the spec is Architect work.

**Acceptance** — only with no open ❌:

- `interactive`: wait for explicit user acceptance. It counts when the user says it in this session, or when the launch passes it as `User acceptance: <the user's own words>` (the launching skill copies the words exactly). Until then: no changelog, no commit, no push, no PR, status stays `in review`.
- `critical` / `autonomous`: this Reviewer run is acceptance. Then the git steps. Merge only with the launch line `Auto-merge: yes` (see below).

Git disabled: after acceptance only final review in the log → status `done` → change record (`record-change`). No commit, push, PR or return. `worktree` disabled: the same.

After acceptance, in order: final review in the log → status `done` → `.seh/scripts/record-change` (writes the change record when `agents.reportChange` is not `false`; otherwise `UNCHANGED`, no stop) → `.seh/scripts/commit-task` (includes `docs/prompt/<task>.prompt.md` when it exists in the worktree; adds a changed `CHANGELOG.md` by itself when `agents.reportChange` is `true` or missing; listed paths, `CHANGELOG.md` included, are always committed) → `.seh/scripts/push-task` → `.seh/scripts/open-pr` (base is `agents.baseBranch` from config) → [only with launch line `Auto-merge: yes`: `.seh/scripts/merge-pr`; on a conflict `BLOCKED:` one attempt is `update-from-base`, resolve, project test/lint/typecheck, `commit-task`, `push-task`, `merge-pr`; at most 3 attempts; failing project checks after resolving, a conflict after the third attempt, or any other failure is `BLOCKED:` for the task] → `.seh/scripts/return-to-base` (removes the worktree only when clean; with `commit` disabled a dirty one stays and the script answers `UNCHANGED`). A disabled git operation (`agents.git`) is skipped: its script answers `UNCHANGED` + `git: <op> disabled`, the sequence continues, and the final report names what is left to the user (uncommitted worktree path and branch, local commit, or pushed branch without PR). Without `Auto-merge: yes`: do not merge. The Reviewer never composes `gh pr merge` itself. PR body notes unfinished blockers.

**Update from base** is the Reviewer's tool for a merge conflict with `Auto-merge: yes` (see above), not a skill function or variant. Run `.seh/scripts/update-from-base`. Resolve if possible, stop on conflicts. Without auto-merge seh ends at the open PR: a conflict in that PR is the user's to resolve, as the merge is. A user request to update a task branch from base alone is `BLOCKED: updating a branch from base is not a seh step — merge the base into <branch> yourself, or resolve the conflict in the PR`.

**Feature end:** accepted and every enabled git operation finished is the finished state (all enabled: the opened PR; with `Auto-merge: yes`, the merged PR). The Reviewer does not wait for the merge, does not ask for a confirmation, and runs no later round for it.

---

## Git

**Git disabled.** `agents.baseBranch` empty or `null` means the project does not use git for the harness. That is the only switch for turning git off as a whole; single operations are `agents.git` (below). Git is enabled only for a project with a repo and an `origin` remote. A missing key (or unreadable config) is not “disabled”: scripts stay `BLOCKED:` until setup has answered. `/<prefix>setit-se` leaves it empty when there is no repo, or when the user answers “no git”; changing it later is the same key. Effects: agents and skills skip every git step (no `start-task`, no `Worktree:`, no commit/push/PR/return); the launch checkout is the working tree; multi-key runs are sequential only and session fan-out is off. The scripts also refuse safely: with empty `agents.baseBranch` each git script prints `UNCHANGED` and `git: disabled`, exits 0, and touches nothing (`start-task` prints `worktree: <launch checkout>`; `fanout-plan` plans sequentially). A repo without remote or `gh` is not a separate mode: with `agents.baseBranch` set the enabled operations run and `push-task` / `open-pr` report their usual `BLOCKED:`. `check-update` is unaffected (reads GitHub tags). `agents.git` is ignored. Without git, “done” means accepted and written to the task’s stores.

**Git operations.** `agents.git` holds four booleans: `worktree`, `commit`, `push`, `pr`. With `agents.baseBranch` set and no `agents.git`, all four are `true`. They form a chain, `pr` ⇒ `push` ⇒ `commit` ⇒ `worktree`: an operation is enabled only when it and every operation before it are `true`. The script of a disabled operation prints `UNCHANGED` and `git: <op> disabled`, exits 0, and makes no git or `gh` write. Agents continue and do not do that step another way.

| Disabled | Script answer | What is left |
|----------|---------------|--------------|
| `worktree` | `start-task`: `git: worktree disabled`, `worktree: <launch checkout>` | Work in the launch checkout, sequential, no fan-out (as git disabled); no `return-to-base`. `pr-state` still works (read). |
| `commit` | `commit-task`: `git: commit disabled` | Accepted changes stay uncommitted in the worktree; `return-to-base` keeps a dirty worktree (`UNCHANGED`, `worktree:`, `branch:`); the Reviewer prints its path and branch. `record-change` still writes `CHANGELOG.md` when `agents.reportChange` is `true` or missing. |
| `push` | `push-task`: `git: push disabled` | The commit stays local. |
| `pr` | `open-pr`, `merge-pr`: `git: pr disabled` | The branch is pushed; no PR. |

“Done” means accepted and every enabled operation finished. `/<prefix>shipit` needs all four.

Allowlisted git/`gh` operations run through POSIX `sh` scripts in `.seh/scripts/` (package `scripts/`, copied by `seh install`). Agents call those scripts. They do not compose the matching git/`gh` themselves and do not guess `main`, `master`, or the current checkout. There is no `seh` git wrapper and no `seh agent` CLI. Scripts read `harness.config.json` (including `agents.baseBranch`). No rebase, reset, or force. No merge of the PR except `merge-pr` on a `/<prefix>shipit` run (`Auto-merge: yes`). Windows is out of v1: if the host cannot run `sh`, stop and tell the user.

The scripts are the **how**. Agent markdown is the **when**. A script name is stable across package versions so a later `seh install` can replace the script body without renaming the call.

**Contract.** Success prints `OK` or `UNCHANGED` and `key: value` lines. Refusal ends with a `BLOCKED:` line (see Stops). The agent copies that line into its report, stops that path, and does not work around it with raw git, `gh`, or `curl`.

The base git branch is `agents.baseBranch` (set on first `/<prefix>setit-se`, changeable later). Scripts cut task branches from it, open PRs against it, and merge it into a task branch on an auto-merge conflict. Changing that key in config does not require regenerating agents.

With git and the `worktree` operation enabled, Implementer and Reviewer always use a **git worktree** for the task. The path is `$(git rev-parse --git-common-dir)/seh-worktrees/<task>` (for `~/projects/my-app` that is `~/projects/my-app/.git/seh-worktrees/<task>`). `start-task` does not switch the caller’s checkout. Architect and Consultant do not create worktrees and do not call these scripts.

| Script | Who | Reads from config | Does |
|--------|-----|-------------------|------|
| `start-task` | Implementer at start; Reviewer if the branch is missing | `agents.baseBranch`, `agents.git` | Create or reuse a worktree on `<task>` from that base (or attach an existing local/remote branch). Do not switch the caller. Print `worktree: <abs>`. Copy this task’s file-tracker files from the launch working tree into the worktree when they exist. Then, for those three paths only: delete them on launch if they are untracked; `git restore` them on launch if they are tracked and dirty; leave them if they are tracked and clean. Do not touch other dirty files. If `.seh/` or `harness.config.json` is missing in the worktree but present in the launch tree, symlink them. No commit, no push, no uncommit. |
| `commit-task` | Reviewer, after Acceptance, or after resolving an auto-merge conflict | `agents.git`, `agents.reportChange` | `git add` of the listed paths and `git commit` on the task branch (run from the worktree). |
| `push-task` | Reviewer | `agents.git` | Push **only** the task branch. |
| `open-pr` | Reviewer, after Acceptance | `agents.baseBranch`, `agents.git` | `gh pr create --base <base> --head <task>`. |
| `update-from-base` | Reviewer, only on an auto-merge conflict | `agents.baseBranch` | Merge that base into the task branch. Stop on conflicts. |
| `return-to-base` | Reviewer, after the last enabled git operation | `agents.baseBranch`, `agents.git` | From a seh worktree: drop launch-only symlinks (`.seh`, `harness.config.json`) then `git worktree remove` when clean (does not switch the primary checkout). Dirty with `commit` disabled: `UNCHANGED`, `worktree:`, `branch:`, nothing removed. From the primary checkout: `git checkout` that base (legacy). |
| `merge-pr` | Reviewer, after `open-pr`, only with launch line `Auto-merge: yes` | `agents.baseBranch`, `agents.git` | `gh pr merge <number> --squash` for the open PR of the task branch into that base. No `--auto`, `--admin`, `--delete-branch`, rebase, or force. Conflict → `BLOCKED:` naming `update-from-base`. Already merged → `UNCHANGED`, `state: merged`. |
| `pr-state` | `/<prefix>shipit` (parent) | `agents.baseBranch` | Read-only. Prints `state: merged\|open\|none` for the PR of `<task>` or `<task>-N` (N ≥ 2) into that base (open beats merged; closed-only is `none`), `url:`, and for `merged` also `merged_at:` and `merge_commit:`. |
| Merge the PR | Human (GitHub), or `merge-pr` on a `/<prefix>shipit` run | — | Otherwise not a script. |

Architect and Consultant: no git writes. They do not call these scripts.

These scripts do not cover LLM procedure (phases, Consultant, review checklist, Questions). They do not cover file-tracker status or log writes. Jira Cloud REST v3 goes through `.seh/scripts/jira`; Azure DevOps WIT REST goes through `.seh/scripts/ado` (same `OK` / `UNCHANGED` / `BLOCKED:` contract). Agents do not compose `curl`. Jira auth is Basic `user:jiraToken` from `harness.credentials.local.json`. ADO auth is PAT as `adoPat` (Basic with empty user). Tokens never in argv, stdout, chat, or git. Jira Server/DC is out of v1.

A refused write verb (action OFF, see **Tracker write actions**) is decided before credentials are read. `meta` needs no `write` block.

| Script | Who | Reads | Does |
|--------|-----|-------|------|
| `jira meta` | `/<prefix>setit-se` Add/Change | `agents.tracker` url, user, projectKey + credentials | List that project’s statuses, issue types, and custom fields (numbered `key: value` lines) for mapping. Fields come from the project’s create metadata per issue type (fields on that project’s create screens), never the site-wide field list; needs *Create issues* in the project. |
| `jira get <key>` | Architect, Implementer, Reviewer | tracker maps, `fetchFields`, `write` | GET the issue. Print scalars then `BEGIN spec` / `prompt` / `log`. `status:` and each body come from the tracker when that action (`status`, `spec`, `prompt`, `log`) is ON, else from local frontmatter / `docs/features/`, `docs/prompt/`, `docs/feature-log/` (empty if missing; no field fallback). A key that no local spec holds: `status:` always from the tracker. `<basename>` with `tracker:` in the local spec: tracker parts from that key, local parts from the basename files. No `write` block: `BLOCKED:` run `/<prefix>setit-se`. |
| `jira create --type feature` or `bug --title <text>` | Architect | `issueTypes`, projectKey, `write.create` | POST issue. Print `key:`. `create` OFF: `BLOCKED:` with no HTTP request. |
| `jira set <key> spec\|prompt\|log [--file <path>]` | Architect (spec/prompt/log); Implementer/Reviewer (log) | `fields`, `write.spec` / `prompt` / `log` | Action of the named part OFF: `BLOCKED:` with no HTTP request — write the repo file. Else PUT the mapped field or description; POST comment when the map is `comment`. Body from `--file` or stdin. Log mapped to a field is appended. |
| `jira comment <key> [--file <path>]` | Architect, Implementer, Reviewer | `write.log` | POST a comment. Body from `--file` or stdin. `log` OFF: `BLOCKED:` with no HTTP request. |
| `jira transition <key> <todo\|inProgress\|codeReview\|inReview\|done>` | the role that owns that step | `statuses`, `write.status` | `status` OFF: `BLOCKED:` with no HTTP request, checked first. `null` → `UNCHANGED` and no HTTP. Else transition only to that exact workflow name. Missing on this issue type → `BLOCKED:` fix mapping in `/<prefix>setit-se`. Already there → `UNCHANGED`. |
| `jira link <key> depends\|relates <other>` | Architect | `write.create` | Create the issue link. If Jira refuses, `BLOCKED:` with that fact (the agent records it in the log and does not stop the task). `create` OFF: `BLOCKED:` with no HTTP request. |

| Script | Who | Reads | Does |
|--------|-----|-------|------|
| `ado meta` | `/<prefix>setit-se` Add/Change | `agents.tracker` organizationUrl, project + credentials | List states (per configured work item types), types, and fields (numbered `key: value` lines) for mapping. Fields come from the project’s work item types, never the organization-wide field list. |
| `ado get <id>` | Architect, Implementer, Reviewer | tracker maps, `fetchFields`, `write` | GET the work item. Print scalars then `BEGIN spec` / `prompt` / `log`. `status:` and each body come from the tracker when that action (`status`, `spec`, `prompt`, `log`) is ON, else from local frontmatter / `docs/features/`, `docs/prompt/`, `docs/feature-log/` (empty if missing; no field fallback). A key that no local spec holds: `status:` always from the tracker. `<basename>` with `tracker:` in the local spec: tracker parts from that key, local parts from the basename files. No `write` block: `BLOCKED:` run `/<prefix>setit-se`. |
| `ado create --type feature\|bug --title <text>` | Architect | `workItemTypes`, `project`, `write.create` | POST work item. Print `id:`. `create` OFF: `BLOCKED:` with no HTTP request. |
| `ado set <id> spec\|prompt\|log [--file <path>]` | Architect (spec/prompt/log); Implementer/Reviewer (log) | `fields`, `write.spec` / `prompt` / `log` | Action of the named part OFF: `BLOCKED:` with no HTTP request — write the repo file. Else PATCH the mapped field or description; POST comment when the map is `comment`. Body from `--file` or stdin. Log mapped to a field is appended. |
| `ado comment <id> [--file <path>]` | Architect, Implementer, Reviewer | `write.log` | POST a comment. Body from `--file` or stdin. `log` OFF: `BLOCKED:` with no HTTP request. |
| `ado transition <id> <todo\|inProgress\|codeReview\|inReview\|done>` | the role that owns that step | `statuses`, `write.status` | `status` OFF: `BLOCKED:` with no HTTP request, checked first. `null` → `UNCHANGED` and no HTTP. Else PATCH `System.State` to that exact name. Missing on this work item type → `BLOCKED:` fix mapping in `/<prefix>setit-se`. Already there → `UNCHANGED`. |
| `ado link <id> depends\|relates <other>` | Architect | `write.create` | Create the work item link. If Azure DevOps refuses, `BLOCKED:` with that fact (the agent records it in the log and does not stop the task). `create` OFF: `BLOCKED:` with no HTTP request. |

---

## Runtime config and generated files

`harness.config.json` is the source of truth for project parameters. Generated agent markdown must not contain a literal `agents.baseBranch`, `agents.git` or tracker `write` value, status string, external tracker map, `fetchFields` list, content language, or product line. Those files say to **read** `harness.config.json` (and, for git and the active tracker script, to **call** `.seh/scripts/`).

`/<prefix>setit-se` still generates live files from `.seh/`:

| Live file | What setup writes |
|-----------|-------------------|
| Host agent files | Copy of `.seh/agents/` plus `model:` from `agents.roles.<role>.model[<host.id>]` into **each** `agentsDir` in `.seh/references/hosts.json`. Not a symlink. Do not copy another host’s model. Cursor `consultant` copies also get `readonly: true`. OpenCode copies drop `name` and `tools` (OpenCode V2 names agents by file and skips a file with a string `tools:`) and get `mode: subagent`; OpenCode `consultant` copies also get `permissions` deny `edit`. Codex copies are TOML (`.codex/agents/<name>.toml`: `name`, `description`, `developer_instructions` from the agent body; `model` only when a model is set, absent = the session model is inherited; no `model_reasoning_effort`). A Codex subagent inherits the parent sandbox, so the agent file cannot enforce read-only: Consultant (and Architect) read-only is instruction text only, and the PRD does not promise more. |
| Work skills (`/<prefix>planit`, `/<prefix>designit`, `/<prefix>doit`, `/<prefix>checkit`, `/<prefix>runit`, `/<prefix>shipit`, `/<prefix>scopeit`, `/<prefix>grillit`) | From `.seh/skills/` into every `skillsDir`. Do not overwrite install-owned `/<prefix>setit-se`. Cursor and OpenCode copies also get `disable-model-invocation: true` (OpenCode: not advertised to the model, still loadable by id, so the host command still works). Codex has no such frontmatter: where the row has `skillHide: "openai-yaml"`, each work skill gets `<skill>/agents/openai.yaml` with `policy.allow_implicit_invocation: false`. For every row with `commandsDir`, also write `<commandsDir>/<prefix><name>.md` from `.seh/references/host-command.md` (same wrapper as the install-owned setup command). On generate, delete leftover `seh-feature` from each `skillsDir` if it exists, and remove host commands made with an earlier prefix. |
| Designer config | `agents.roles.designer.model` (map by host `id`, same as other roles; the Designer agent file is generated like the others) and `agents.designer.enabled` (boolean) in `harness.config.json`. The `ux-a11y` pack is generated only when a UI stack is detected. |
| Rule packs | From `.seh/packs/`, filtered by detection and `packsIgnored`, into every `rulesDir` using that host’s `rulesExt` (`.md` + `paths:` vs `.mdc` + `description` / `globs` / `alwaysApply: false`). For OpenCode, also merge the glob `.opencode/rules/*.md` into `.opencode/opencode.json` `instructions` (create the file if missing; do not edit project-root `opencode.json`). Codex reads only `AGENTS.md` for instructions, so its packs go to `.codex/rules/*.md` (with `paths:`; scope is soft, instruction only) and `/<prefix>setit-se` maintains one seh-managed section in project-root `AGENTS.md` that points at that directory; content outside that section is never touched. |
| `seh.generatedFrom` in `harness.config.json` | Equal to `.seh/VERSION` after a generation that used that tree. |

`.seh/scripts/` are install-owned. A later `seh install` replaces them immediately. Live agents, work skills, and rules stay until `/<prefix>setit-se` regenerates them.

---

## Skills

`/<prefix>setit-se` lands **in this project** via `seh install`, in every `skillsDir` from `references/hosts.json`. The other skills are generated **into the same project** (every `skillsDir`) by the first `/<prefix>setit-se` from `.seh/`. None of them are installed on the machine.

Single-stage skills do not chain. Only `/<prefix>runit` runs the full path.

Work skills (`/<prefix>planit`, `/<prefix>designit`, `/<prefix>doit`, `/<prefix>checkit`, `/<prefix>runit`, `/<prefix>shipit`, `/<prefix>scopeit`, `/<prefix>grillit`) stop before doing work when `harness.config.json` is missing **or** `.seh/VERSION` does not match `seh.generatedFrom`. The message is to run `/<prefix>setit-se` (and `seh install` first if `.seh/` or `.seh/VERSION` is missing).

| Skill | Does |
|-------|------|
| `/<prefix>setit-se` | Project-local, written by `seh install`. **First run** (no `harness.config.json`): finish setup. Infers what it can from the repo; one question at a time otherwise. Detects the project PRD (no product questions); when none exists, the last step creates `docs/prd.md` through the `/<prefix>scopeit` procedure. Detects a git repo; asks for `agents.baseBranch` (suggested default `dev`) only when there is one, otherwise leaves it empty (git disabled); asks the git operations (`agents.git`) and whether to write `CHANGELOG.md` (`agents.reportChange`). Writes config (including `seh.generatedFrom` = `.seh/VERSION`), generates agents/skills/rules from `.seh/` without baking runtime config into agent bodies. Merges existing `AGENTS.md` and/or `CLAUDE.md` with the seh template, shows the proposed body, writes `AGENTS.md` only after acceptance (even if the project had only `CLAUDE.md`). Writes `CLAUDE.md` when `.claude/` was present and/or `CLAUDE.md` already existed (symlink, or independent file if the link cannot be created). Offers Jira once. Does not commit. **Later run** (config already there): if `.seh/VERSION` ≠ `seh.generatedFrom`, regenerate live agents, work skills, and rules first. Then change one parameter at a time, including the base branch, git operations, change record, and add/change/remove the tracker with its write actions. Does not create or rewrite the project PRD (`/<prefix>scopeit` does) or remake `AGENTS.md`. Rewrites that live agent’s `model:` in **that host’s** `agentsDir` when one role `model` cell changes; regenerates rules when packs change. Ensures `CLAUDE.md` if `.claude/` is present and the file is still missing (symlink first, independent file if the link fails). |
| `/<prefix>planit` | Architect once; then the Designer when the spec has `ui: true` and `agents.designer.enabled` is `true`. Offer next step; do not start it. Optional input: a design file (path or slug the user names; see Design), passed to the Architect as `Design: <path>`. With a design file the Designer stage is skipped (the UX section already exists). A design file goes with one key: several keys plus a design file is `BLOCKED` (also in `/<prefix>runit`). |
| `/<prefix>designit` | Designer once, UX/UI only, before the spec. Input: a sentence, or an existing `docs/designs/<slug>.design.md` (iteration). Output: that design file (see Design). One call = one design file; no fan-out, no brainstorm, no `ux-a11y`. Does not read or write the tracker, create a spec, prompt or log, or use git. Mode from intent. Needs `agents.designer.enabled` = `true`; otherwise `BLOCKED: the Designer is disabled — enable it in /<prefix>setit-se`. Ends by offering `/<prefix>planit … <path>` (written with the host's `invokePrefix`); does not start it. Intent "learn conventions": the Designer writes `docs/designs/ux-conventions.md` instead (reads the `ux-a11y` pack to spot deviations) and nothing is offered after it (see Designer, third entry). |
| `/<prefix>doit` | Implementer, including the Consultant loop. Feature or bug: same agent. One task or a list. Parent runs `start-task` and applies the Implementer procedure inline per task with `Worktree:`. Several tasks in one session run sequentially, in dependency order from `fanout-plan` (never the order given); parallel only via session fan-out (git and `worktree` enabled only) (`references/session-fanout.md`). |
| `/<prefix>checkit` | One Reviewer round per named task (review against the spec). Same worktree / parallel rules as `/<prefix>doit`. |
| `/<prefix>runit` | Architect → (Designer) → Implementer (Consultant inside) → Reviewer → fix rounds. Optional design file as for `/<prefix>planit` (Designer stage skipped). One task per session. Starts at the first missing stage. Stops if already `done`; with no local spec, git enabled, and the spec kept in repo files (files tracker or `spec` OFF) it checks `pr-state` first, so an open or merged PR is reported instead of re-running Architect. Several keys: session fan-out (below); a key without a spec is not blocked, its child starts at Architect. Implementer and Reviewer still use a worktree. Does not merge the PR (unless it is a `/<prefix>shipit` child). |
| `/<prefix>shipit` | Many specced tasks (named keys; without keys, only with the files tracker or `status` OFF: every `todo` task with spec and prompt). One session per task running `/<prefix>runit <KEY>` with `Auto-merge: yes`; a task with `depends` starts after its dependency is merged into `agents.baseBranch`. Needs git with all four operations. Never specs (missing spec: `/<prefix>planit`). Parent plans, starts sessions, writes one run report to `docs/run-reports/`; never merges or does child work. Detail: `### /<prefix>shipit` below. |
| `/<prefix>scopeit` | Creates or updates the project PRD (see `/<prefix>scopeit` below). |
| `/<prefix>grillit` | Project-local. Members CRUD, app context, run a consult: personae → facilitator (collect only) → Architect (PART A). |

There is no user-facing Consultant skill.

### `/<prefix>setit-se` (detail)

**Entry.** If `seh install` has not been run in this project (`.seh/` is missing, or `/<prefix>setit-se` is absent from **every** `skillsDir` in `.seh/references/hosts.json`), stop and tell the user to run `seh install` here from npm (`npx se-harness install`) or from GitHub (`npx github:meehow-halas/se-harness install`), then `/<prefix>setit-se` again. Present in **any** listed `skillsDir` is enough.

If `harness.config.json` is missing: first-run path below. If it is present: later-run path below. Do not overwrite keys the user did not confirm. Do not regenerate generated files as a silent first-run repeat. A later-run template mismatch (`.seh/VERSION` ≠ `seh.generatedFrom`) is not a first-run repeat: regenerate live agents, work skills, and rules, then continue the later-run path.

**First run** (file missing):

- Read the repo first; state inferred choices so the user can object.
- **Project PRD.** Look for an existing product requirements document (typical `docs/prd.md`, or a path the repo already treats as the PRD). If one exists, use it and do not rewrite it. If none exists, ask nothing yet: the last step of the first run (**Project PRD (create)**) reads `.seh/skills/scopeit/SKILL.md`, runs its create procedure, then puts `docs/prd.md` in `agents.docs` and sets `product`. Do not put the PRD body into `harness.config.json`. One-line product + paths to docs are enough in config.
- Detect frameworks; generate rule packs from `.seh/` (JS/TS, React Native, Angular, Next.js, Python, Django, FastAPI, C#, ASP.NET Core, EF Core). Monorepo: pack only on trees that use it. Ignore list: `packsIgnored`.
- Detect a UI stack (`react-native`, `angular`, or `nextjs` matched; React, Vue, or Svelte in the manifest; Django templates, or Razor / Blazor in an ASP.NET Core tree): then generate the `ux-a11y` pack and recommend `true` for the Designer switch below; otherwise no pack and recommend `false`. State the result so the user can object.
- Generate live agents and work skills from `.seh/` as copies into every host tree (see Runtime config and generated files). Write `seh.generatedFrom` from `.seh/VERSION`. If `.seh/VERSION` is missing, stop and tell the user to run `seh install` here, then `/<prefix>setit-se` again.
- Roles: architect, designer, implementer, consultant, reviewer. For each host in `.seh/references/hosts.json`, one question per host: prefill all five roles from that row’s `modelSuggest`, show the table, ask whether to change any (optional overrides in one reply). The question must be framed as **change**, not “keep these models” — **no** / skip = accept the table, **yes** = overrides. `agents.roles.<role>.model` is a map keyed by that host’s `id`. Do not translate a Claude alias into a Cursor id. No other roles. No brainstorm-facilitator model question.
- `agents.designer.enabled` (boolean): turns the Designer stage on. First run: one question, recommended `true` when a UI stack was detected, else `false`. A config without the key means `false`.
- `agents.contentLanguage`: language of files and tracker text; ask once, suggest the conversation language.
- `agents.baseBranch`: the git branch `.seh/scripts/` cut task branches from, open PRs against, merge into a task branch on an auto-merge conflict, and return to after the PR is opened. Ask once. Suggested default is `dev` (for example `dev` vs `main`). If the repo already names a default branch, state that inference so the user can object; do not silently take `main`, `master`, or the current checkout. Git counts as connected only when the project is a git repo **and** has a remote named `origin`; `/<prefix>setit-se` neither asks for nor accepts a branch otherwise (it says what is missing). On the first run the user may decline to name a branch, and on a later run may disconnect (set it empty) at any time, even when git is no longer detected; connecting later needs the repo and `origin`. Without this key (empty), git is disabled (see **Git**); the scripts do not guess a base. Do not write this value into generated agent markdown.
- **Git operations** (`agents.git`). Only when git is connected and `agents.baseBranch` is set; asked right after the base branch. One question: a table of `worktree`, `commit`, `push`, `pr` with the chain explained, answered in one reply (for example “all”, or “worktree, commit”). A reply that breaks the chain: state the corrected set and confirm it in the same turn.
- **Change record** (`agents.reportChange`). Always asked: one yes/no, whether seh writes `CHANGELOG.md`. Proposal `yes` when project-root `CHANGELOG.md` exists, else `no`; say why. The user answers.
- **Project rule (optional).** One question, after models, content language, base branch, git operations, and change record. Say what it is: a standing instruction for the agents on this project, beyond the generated framework packs — for example “never edit the legacy billing module”, “PRs always target `develop`”, “tests only through pytest”. It is stored on the roles (`rules`; reviewer `checklist` when it is a review constraint). Skip is the default: empty is fine, and the skill must not ask for a list or a second rule. If the user already stated such a rule earlier in this conversation, record it and do not ask again.
- **Project agents file (`AGENTS.md` / `CLAUDE.md`).** After writing config and generating files, first run **always** inspects project-root `AGENTS.md` and `CLAUDE.md`. Every combination is in scope: neither, only `AGENTS.md`, only `CLAUDE.md`, or both. Do not skip a file that exists. The seh source is the template `.seh/references/AGENTS.md` (package `references/AGENTS.md`).

  Treat a symlink as the target’s body, read once. If `CLAUDE.md` already links to `AGENTS.md` (or the reverse), that is one existing document, not two. If a named path exists but the symlink is broken, treat that path as missing and use the other file if it exists.

  Build the **proposed** `AGENTS.md` in this order; do not write yet:

  | What exists at project root | Merge input (then always merge with the seh template) |
  |-----------------------------|--------------------------------------------------------|
  | Neither | seh template only |
  | Only `AGENTS.md` | that file, then the seh template |
  | Only `CLAUDE.md` | that file, then the seh template |
  | Both (two regular files) | merge `AGENTS.md` with `CLAUDE.md` first (keep project-specific instructions, drop duplicated paragraphs), then merge that with the seh template |
  | Both, already the same via symlink | the single target body, then the seh template |

  Do not replace an existing project file with a raw copy of the template. Show the user the full proposed markdown and wait for acceptance. This confirmation is required on first run in every row above, including “neither”. If they reject it, take their edits (one question) and show the body again until they accept.

  After acceptance, the **result is always** a regular project-root `AGENTS.md` with the accepted body. That is true even when the project originally had only `CLAUDE.md` — do not leave `CLAUDE.md` as the only agents file.

  Then `CLAUDE.md` when the project **originally** had a `.claude/` directory **and/or** a `CLAUDE.md`. If neither was there, do not create `CLAUDE.md`.

  | Originally | After the write |
  |------------|-----------------|
  | No `.claude/`, no `CLAUDE.md` | `AGENTS.md` only |
  | No `.claude/`, `CLAUDE.md` existed | `AGENTS.md` plus `CLAUDE.md` |
  | `.claude/` present, no `CLAUDE.md` | `AGENTS.md` plus `CLAUDE.md` |
  | `.claude/` present, `CLAUDE.md` existed | `AGENTS.md` plus `CLAUDE.md` |

  When `CLAUDE.md` is required: prefer a relative file symlink `CLAUDE.md` → `AGENTS.md`. If it is already that symlink, leave it. If it was a regular file, replace it with the symlink (content is already in `AGENTS.md`). Detect the host OS and create the link the way that OS expects (Unix: `ln -s AGENTS.md CLAUDE.md`; Windows: a file symlink such as `mklink CLAUDE.md AGENTS.md` — not a directory junction). **Having `CLAUDE.md` when it is required matters more than the link.** If the symlink cannot be created for any reason (OS, permissions, filesystem, tooling), write `CLAUDE.md` as an **independent regular file** with the same accepted body as `AGENTS.md`. Tell the user they are two files because the link failed. Do not stop setup. Do not omit `CLAUDE.md` when `.claude/` was present or when `CLAUDE.md` already existed.
- After writing config and generating files, offer Jira once. Decline is stored; connect/change/remove later is the same skill (later run).

**Later run** (config already there):

If `.seh/VERSION` is missing, stop and tell the user to run `seh install` here, then `/<prefix>setit-se` again. If a role `model` is still a string, the map is missing a `hosts.json` `id`, or `agents.roles.designer` is missing (config from before the Designer), finish that map first (a missing `designer` role is filled like a missing host: prefill from `modelSuggest.designer`, show the table, one confirm-or-change question; and ask once whether to enable the Designer, writing `agents.designer.enabled`, suggested `true` when a UI stack is detected) (prefill, then per host show the five-role table and one confirm-or-change question framed as **change** — not “keep these models”; **no** / skip = accept, **yes** = overrides; do not stamp one host’s model onto another). Then if `.seh/VERSION` does not equal `seh.generatedFrom`, regenerate live agents, work skills, and rule packs from `.seh/` into every host tree (same copy rules as first run: agent files are copies with `model:` from `agents.roles.<role>.model[<host.id>]`; bodies still do not interpolate runtime keys; leftover `seh-feature` is deleted from each `skillsDir`), set `seh.generatedFrom` to `.seh/VERSION`, and tell the user the installed package templates changed, including that `/seh-feature` was renamed to `/<prefix>runit`. Do not rewrite `AGENTS.md`; mention it may still contain the old name. If VERSION matches but a live agent (or one not in its host's frontmatter shape), work skill, or host command (`commandsDir`) is missing from any host tree, regenerate agents, work skills, and host commands for every host the same way (repair), say which paths were missing, and skip the rename message. Then one change at a time. Show current and new value, wait for confirmation, then write. The base branch (`agents.baseBranch`) is one of those parameters; writing it updates `harness.config.json` only. A role `model` change is one cell `(role, host)`: rewrite that live agent’s frontmatter in **that** `agentsDir` only. A `packsIgnored` (or framework) change regenerates rule packs. Do not touch `agents.brainstorm` (that is `/<prefix>grillit`). Do not create or rewrite the project PRD. Do not remake or re-merge `AGENTS.md`. Do not commit. If `.claude/` is present and `CLAUDE.md` is still missing, create the symlink the same way as on first run; if the link fails, write `CLAUDE.md` as an independent file with the current `AGENTS.md` body. If `CLAUDE.md` already exists as a regular file on a later run, do not overwrite it and do not re-run the first-run merge.

**Status migration** (later run, once): if `agents.statuses` has the key `code review` and no `implemented` key, the status flow changed (`code review` is now `implemented`, set by the Implementer). Rename that key and value to `implemented` in config and tell the user. Do not edit spec files. List every spec whose `status:` is `code review` and tell the user to set it to `implemented`, or to `in review` when a review is running. `in review` stays valid.

**Missing keys** (later run, once each): `agents.reportChange` missing → ask the change-record question above (until answered it counts as `true`). `agents.baseBranch` set and `agents.git` missing → ask the git operations question (until answered all four are `true`). Both stay changeable parameters on every later run.

**Tracker write migration** (later run, once): a tracker config with `readOnly` and no `write` predates 2.0. `readOnly: true` → all five actions `false`; `readOnly: false` → all `true`. A config without `readOnly` and without `write` migrates as `readOnly: false` (all `true`). Show the resulting table, write `agents.tracker.write`, delete `readOnly`. Actions turned on here that still lack a mapping ask for it as in **Change**.

**Tracker (Jira or Azure DevOps)** — first-run offer and every later run. Do not offer Jira and ADO in one project; the user picks one external tracker kind per connect.

| Intent | What happens |
|--------|----------------|
| **Add — Jira** (no tracker yet, user asks or accepts the offer and chooses Jira) | The connection first: URL, user, project key (one question at a time). Write those keys and `kind`: `jira` into `agents.tracker`. Create `harness.credentials.local.json` with an empty `jiraToken` when missing; otherwise point at the existing file. User puts the token in that file (never in chat). Confirm when done, then run `.seh/scripts/jira meta` and retry after fixes until `OK` or they stop. Then **one** question with the five write actions (see **Tracker write actions**): none preselected, reading shown as always on, answered in one reply; write `agents.tracker.write`. Then mappings for enabled actions only, grouped: `status` ON → all five status keys `todo`…`done` in one numbered-list question; `spec` / `prompt` / `log` ON → their field mapping in one question; `create` ON → issue types for `feature` and `bug` in one question; always `blocker` (`null` allowed) and `fetchFields` in one question. Agents must not pick a Jira status that is not in this map. |
| **Add — Azure DevOps** (no tracker yet, user chooses ADO) | Same order as Jira: `organizationUrl`, `project` (one question at a time; no PAT in chat). Write those keys and `kind`: `ado` into `agents.tracker`. Create or use `harness.credentials.local.json` with an empty `adoPat` when missing. User puts the PAT locally. Confirm when done, then run `.seh/scripts/ado meta` and retry until `OK` or they stop. Then the same write-actions question and grouped mappings, using ADO states and `workItemTypes` / `fields` (`referenceName`, `description`, `comment`, or `history`). Skeleton: `references/harness.tracker.ado.json`. |
| **Change** (tracker already there) | One question: change integration or remove it. Change = same mapping questions for the fields they named, or toggle write actions in one reply; a newly enabled action asks only for its maps that are still at skeleton values. Disabling an action leaves its maps in config unused. The toggle itself copies nothing; after an action is turned ON, a bound task’s local content moves at the next step that touches it (see **Binding**). Disabling copies nothing back to repo files. Token rotation or fresh metadata: same credentials confirm loop and `jira meta` or `ado meta` once, not on every small mapping edit. |
| **Remove** | Confirm, drop tracker from config, delete or clear the relevant credential key in the local credentials file. Project is files-only again (the write actions go with `agents.tracker`). `jiraOffer` does not block a later **Add**. |

Do not invent a `seh` CLI for Jira or ADO. The skill calls `.seh/scripts/jira meta` or `.seh/scripts/ado meta` and writes config. After a tracker change, write the mapping into `harness.config.json`. Do not regenerate agent markdown for `fetchFields` or the task key pattern: agents read those keys at run time.

If the user names another config key (model, base branch, …), do that key first, then the tracker offer only when there is still no tracker and the offer was not declined — unless they explicitly asked to add/change/remove the external tracker, in which case do the tracker path even after a decline.

### `/<prefix>runit` pipeline

One task. A list of keys is a stop: spec with `/<prefix>planit`, then `/<prefix>doit` with the list.

1. No spec or prompt → Architect (launch checkout; no git, no worktree). With a design file the user named, the Architect gets `Design: <path>` (see Architect). A design file named for a task that already has a spec is `BLOCKED` (rebuild the spec with `/<prefix>planit <KEY> <path>` first), unless the spec log already has `design: <that path>`; it is never ignored silently.
1b. Spec has `ui: true`, `agents.designer.enabled` is `true`, and the spec has no **UX/UI decisions** section → Designer (launch checkout; no git, no worktree), before step 2. Interactive: stop on its questions like the Architect's. A spec built from a design file already has that section, so the step is skipped.
2. Spec+prompt (and the UX section when step 1b applies), no implementation → Implementer in the task worktree, Consultant inside each phase.
3. Implementation exists → Reviewer in that worktree.
4. Open ❌ → Implementer with those items only, then Reviewer again (max 3).
5. Interactive: stop on agent questions. Critical/autonomous: clean review = PR URL (or, with a git operation disabled, what is left to the user); do not merge unless launched as a fan-out child with `Auto-merge: yes`. Autonomous: the final report lists decisions and asks nothing.

Do not pause between stages when there is no question and no stop. Report once at the end or at the first stop.

### `/<prefix>doit` and `/<prefix>checkit` (one or many)

The user may name one basename/issue key or several. For each task the parent: resolves the spec, enforces `depends` (unmet `depends` stops **that** task; siblings continue), runs `start-task` from the launch checkout, and launches the role with `Worktree: <abs>` from the script output. For both skills, a task with `ui: true`, the Designer enabled, and no **UX/UI decisions** section in its spec stops with `BLOCKED: <KEY> needs the Designer stage — run /<prefix>planit <KEY>` (that task only; siblings continue). N>1: in parallel when the runtime allows; otherwise sequential, still one worktree per task. Git disabled: always sequential, no `start-task`, no `Worktree:`. `worktree` disabled: always sequential, in the launch checkout. A `Q<n>` or interactive acceptance on one task does not stop siblings; the parent asks the user and resumes that child. Interactive acceptance is per task. Overlapping product files across parallel tasks are not a stop.

### `/<prefix>scopeit`

Creates or updates the project PRD. It is a work skill: the guard is the same as in the others (`.seh/`, `harness.config.json`, `.seh/VERSION` = `seh.generatedFrom`). The PRD path is the PRD entry of `agents.docs`. The file exists → **update**. The entry exists but the file does not → `BLOCKED: PRD from agents.docs not found (<path>) — run /<prefix>setit-se`; with no entry outside the `/<prefix>setit-se` call, the same `BLOCKED`. It never writes `harness.config.json`, never commits, and creates no file other than the PRD. Shape: `.seh/references/prd-template.md` (core: Purpose, Users, Scope, Non-goals; deepening: Success metrics, Constraints, Key flows, Glossary, Open questions). Content is written in `agents.contentLanguage`.

**Create** (first run of `/<prefix>setit-se` with no PRD; `/<prefix>setit-se` reads the skill from `.seh/skills/scopeit/SKILL.md` and runs it in its own session). One question per message: purpose, users, scope, each with a proposal from the repo labelled as such (Enter / ok accepts, otherwise a correction; no sensible inference → no proposal); only accepted or typed text becomes a fact. Non-goals are asked directly and never proposed; no answer → `None stated`. `skip` / `enough` at any point → stop the interview and write what exists (no deepening and no `/<prefix>planit` question after it; one line that `/<prefix>scopeit` fills it in); unanswered sections are `TBD — not stated by the user`, and the `TBD` / `None stated` markers stay in English; the title name comes from the README heading, the manifest, or the directory name. The file is always written, also with only `TBD`. Then one question: deepen now (one question per section, skip leaves `TBD`, write after each answer) or later (one line that `/<prefix>scopeit` fills it in). Only when the file did not exist: one question whether to start `/<prefix>planit` for the first spec (yes → `/<prefix>planit`; no → one line that it can be run later).

**Update.** The user says what changed (or fills a `TBD`). The skill shows the section before and after, one change per message, and writes only after acceptance; it never rewrites the whole file or untouched sections. A PRD without the template headings keeps its structure. A changed purpose ends with one line that `product` in config may be stale and is changed in `/<prefix>setit-se`.

**`TBD` rule.** A `TBD — not stated by the user` section is no constraint: agents do not report a conflict with it. A conflict is reported only against a stated non-goal or scope line. The Architect adds one line to its reply (not to the spec) when a decision in the spec depended on a `TBD` section of Purpose, Users, Scope or Non-goals, naming the section and `/<prefix>scopeit`; it does not ask or block. The Designer has no such line.

### `/<prefix>shipit`

Runs many **specced** tasks to merged, in dependency order. Opt-in is the invocation; there is no config key. Needs git (`agents.baseBranch` set), else `BLOCKED: /<prefix>shipit needs git — set agents.baseBranch with /<prefix>setit-se`. Needs all four git operations, else `BLOCKED: /<prefix>shipit needs worktree, commit, push and pr enabled — change them in /<prefix>setit-se`.

- **Keys.** `/<prefix>shipit K1 K2 …`, or no keys = every task with spec and prompt and status `todo`, found in local spec frontmatter: the files tracker, or Jira/ADO with `status` OFF. Jira/ADO with `status` ON and no keys: `BLOCKED: /<prefix>shipit needs keys with a Jira/ADO tracker — name the keys` (the tracker scripts have no search verb).
- **Mode** from intent as for `/<prefix>runit` (default `interactive`; `autonomous` when the user asks, in any language, for work without questions), passed to every child. The merge happens after acceptance in any mode.
- **Resolve.** `pr-state` first: PR merged → skipped, no spec check (the spec may exist only on the base branch). No spec or prompt: `BLOCKED: run /<prefix>planit <KEY> first`. Status `in progress` / `implemented` / `in review` with no live session (desktop): interrupted, planned again; the new child resumes at the first missing stage. `done` and PR open: `BLOCKED: <KEY> is done but its PR is not merged — merge it, then rerun /<prefix>shipit` (dependents wait). `depends` outside the invocation is satisfied when `pr-state` is `merged` (otherwise by the **`depends` gate**).
- **Go-ahead.** Before starting, the parent shows keys, `depends` edges, the first wave and the rest, and asks once (merge into base is irreversible).
- **Children.** One session per `ready` key (`fanout-plan --skill shipit`, default `--max 4`), prompt exactly: `/<prefix>runit <KEY>`, `Mode: <mode>`, `Conversation language: <lang>`, `Fan-out child: yes`, `Auto-merge: yes`. The Reviewer merges through `merge-pr` after the PR is opened. Children never spawn children. A specced task with `ui: true`, the Designer enabled, and no UX section is not blocked by the parent: its `/<prefix>runit` child starts at the Designer stage (the first missing stage).
- **Waves.** A key counts as finished for dependents only when `pr-state <KEY>` is `merged`. A child waiting on the user (open `Q<n>`, interactive acceptance) still counts as running; its dependents keep waiting. A child that ended without a merged PR (final `BLOCKED:`) is dropped from `--keys` on the next planner call (the planner is stateless), so its dependents are `blocked`; the key is reported with its `BLOCKED:`.
- **Manual hosts** (`sessionSpawn: manual`): one command block per `ready` key, then stop; a rerun recomputes from `pr-state` and task status (`in progress` / `implemented` / `in review` count as running) and prints the next wave.
- **Run report.** When the fan-out ends (nothing ready, nothing running or waiting on the user, including after blocks; on `manual` hosts the final rerun), the parent writes `docs/run-reports/<YYYY-MM-DD-HHMM>-shipit.md` in the launch checkout in `agents.contentLanguage`, regardless of tracker, never to Jira/ADO, not committed. Sections: header, summary counts, per-task table, done, agent runs (counts from the task log, no copied rows), not done and why, decisions taken by agents, open warnings, dependency graph and actual order, what is left, next actions. Unknown values (for example `manual` host session times) are `n/a`, never estimated. The chat end report is a short table (key, session link, state) plus the report path.
- The parent never merges and never does a child's work. `/<prefix>runit` itself stays one task with no merge.

### Session fan-out (multi-key runs)

When the host’s `sessionSpawn` in `references/hosts.json` is `start_session` (Claude Code desktop app), with git and the `worktree` operation enabled, a multi-key run of `/<prefix>planit`, `/<prefix>doit`, `/<prefix>checkit` or `/<prefix>runit`, and every `/<prefix>shipit` run, may start one **dedicated session per key** instead of running them in the parent. Procedure: `references/session-fanout.md`. Planner: `.seh/scripts/fanout-plan` (stateless: ready / waiting / blocked / queued; default `--max 4`). Each child runs the skill for one key (`/<prefix>doit MT-01`), keeps its own `Q<n>` / `BLOCKED:` dialogue with the user, and does not spawn children. Hosts with `manual` print one command per key (git enabled), carrying the user's mode words (for example `samodzielnie`). Git or `worktree` disabled: `sequential` on every host, keys run one after another in the parent session in dependency order from `fanout-plan`, never in the order given. Single key: unchanged. For `/<prefix>planit` and `/<prefix>runit` a key without a spec is not `BLOCKED`: its child starts at Architect (`doit`, `checkit` and `shipit` keep the missing-spec `BLOCKED`); With git or `worktree` disabled, several `/<prefix>runit` keys run one after another in this session in dependency order (`fanout-plan`, `mode: sequential`; a sibling `depends` found by Architect sends the key back to `waiting`), never in the order given. With git and `worktree` enabled, `/<prefix>runit` does no dependency ordering: a `depends` on a sibling key (already in the spec: key not started; found by that Architect: the child stops after the Architect stage) is `BLOCKED` and the user reruns the key after the dependency is merged. Full automation with dependencies is `/<prefix>shipit` with specs written beforehand. `/<prefix>shipit` additionally allows `Auto-merge: yes` in its child prompt (no other skill does) and decides "finished" for dependents by `pr-state`, not by session end.

---

## Brainstorm

Optional extra viewpoints while specifying. Members are markdown personae, not `@`-targets and not seh roles.

The five product agents stay Architect, Designer, Implementer, Consultant, Reviewer. Brainstorm still has a **facilitator**, but it is not a sixth product role (no model in `agents.roles`, no `/<prefix>setit-se` question for it). It is an isolated runner: collect opinions, do not judge them, hand the pack to the Architect.

That split is the point:

```text
material (spec or question)
    → each persona, alone, without Architect context
    → facilitator collates, without scoring or picking a winner
    → Architect receives PART A and decides
```

Personae must not see the Architect’s notes, recommendations, `Q<n>` leanings, or “we will probably do X”. They see only: their member file, the output format, app context, and the **material**. The facilitator must not see Architect context either, and must not re-read the spec to “correct” a persona. It only reads the persona replies (and the report template). The Architect must not prompt the personae itself — that would leak its thinking into the round.

### Who does what

| Piece | What it is |
|-------|------------|
| `/<prefix>grillit` | Skill. CRUD members, app context, start a consult. Orchestrates the round; does not role-play. |
| Member files | `<brainstormDir>/members/<id>.md` for **every** `brainstormDir` in `.seh/references/hosts.json`, from config (`id`, `description`, `identity`, `cares`, `dislikes`). |
| App context | `<brainstormDir>/app-context.md` in every `brainstormDir`. Built by the skill from the repo (product line, `agents.docs`, README). Gaps: one question at a time, then user confirms the file. |
| Persona turn | Isolated one-shot: one member, structured opinion (`[BLOCKER]` / `[IMPORTANT]` / `[NICE]`). Read-only. No git, no spec edits. Personae do not see each other. |
| Facilitator | Isolated one-shot that **only collects**. Fills PART A (shared points, conflicts, blockers, lone voices, review quality). Does not decide who is right, does not drop a lone blocker, does not average. Used when two or more members were asked; one member → that reply is PART A. |
| Architect | Receives PART A. Decides on every blocker, conflict and gap. Does not run persona or facilitator turns. A persona opinion is not user approval. |

`/<prefix>setit-se` does not edit members. Implementer, Consultant and Reviewer never run a round.

### Two entries

**Direct consult** (`/<prefix>grillit` + a question or a spec). Needs a ready app context and at least one member. Threshold does not apply. If the user names members, ask those; otherwise ask every member. The skill runs personae → facilitator → then launches the Architect with **PART A only** (plus the material). The skill shows the Architect’s decisions; the user resolves leftover conflicts. Do not hide a blocker the Architect rejected.

**During specification** (`/<prefix>planit` or Architect inside `/<prefix>runit`). If the Architect needs a round, it **stops and asks the skill** (or the launching skill runs the round first). It does not interview personae in-process. Consult on its own when there are at least two members **and** the work passes `agents.brainstorm.consult`:

- `any` — every user-visible change
- `significant` (default if unset) — hard to reverse, or changes how the product is used
- `broad` — new module, onboarding, pricing, navigation rebuild

`/<prefix>runit` does not start a round by itself.

### Round

1. Ready app context (or stop and finish it via the skill).
2. Persona turns in parallel when the runtime allows. Launch prompt = member + format + app context + material. Nothing from the Architect session.
3. Facilitator → PART A (or the single persona reply).
4. Architect gets PART A and decides. Agreement among personae is not required and is not proof.
5. Interactive: write `docs/brainstorm/<slug>-<YYYY-MM-DD>.md` only after the user confirms the round. Critical/autonomous: Architect consumes PART A and does **not** write that file.
6. One round unless the user asks for another, and then only for what changed.

Do not paste persona transcripts back into the chat or into the Architect launch. If every persona says almost the same thing, that is a weak set of personae, not confirmation. The facilitator must flag that under review quality.

### First member

Host resolution: a `Host: <id>` line from a host command wins; otherwise the row whose `skillsDir` holds the loaded skill (OpenCode also loads `.claude/skills`, so the command line is the reliable signal there). Persona and facilitator launches pass `agents.brainstorm.model[<host.id>]` as the launch’s model. On create, ask once for the consult threshold, then for each host in `.seh/references/hosts.json` one question: show `modelSuggest.brainstorm` as the default for persona and facilitator turns, ask whether to change (one reply with a new id if yes). `agents.brainstorm.model` is a map keyed by host `id`. Members have no per-persona model. A legacy string is migrated the same way as role models (prefill, then confirm per host). After create/edit/remove, regenerate that member file; do not hand-edit generated member markdown.

---

## Coding standards

`/<prefix>setit-se` generates rule files from packs in `.seh/` into every host `rulesDir`. Agents follow rules that load on Read/Write/Edit (or the host’s equivalent glob-scoped rules).

Quality during implementation is **Consultant + the project’s own test command**. Reviewer does not replace Consultant.

**Pack `ux-a11y`.** Generated by `/<prefix>setit-se` only when a UI stack is detected (otherwise absent; `packsIgnored` applies). It holds only measurable rules, scoped by globs to UI files: WCAG 2.2 AA basics (form labels, image `alt`, visible focus, keyboard operability, contrast through design tokens, not raw colours), loading / empty / error states, minimum touch targets, and UI text through the project's i18n. No taste rules. Consultant treats a violation in the phase diff as **must-fix**, like any other rule violation, except a rule listed under **Deviations from ux-a11y** in `docs/designs/ux-conventions.md` with `status: ready` (user-approved; not a finding at all). Other rules and `draft` files change nothing. The Designer sets the UX goal in the spec; the pack checks the code.

---

## CLI (v1)

| Command | Purpose |
|---------|---------|
| `seh install` | This project: `.seh/` (including `scripts/` and `.seh/VERSION`) plus the `/<prefix>setit-se` skill in every `skillsDir` from `references/hosts.json`. From npm (`npx se-harness install`) or GitHub (`npx github:meehow-halas/se-harness install`). Does not generate live agents, work skills, or rule packs. |
| `seh uninstall` | Reverse of install in this project. Same source as install. |

Everything else is a skill, a `.seh/scripts/` helper, or a normal project command (including the project’s own test/lint). Git/`gh` on the allowlist is invoked by those scripts, not by a `seh` subcommand.

---

## Stops

Not questions and not Consultant `must-fix`. Report in one line:

`BLOCKED: <what stopped> — <what the user or another skill must do>`

Examples: `seh install` missing, `/<prefix>setit-se` not run yet, `.seh/VERSION` does not match `seh.generatedFrom`, user approval missing, open blocker task, dirty **task worktree** when `return-to-base` must remove it, PR failed, project tests failing on untouched code, a `.seh/scripts/` helper refused. A dirty **primary** checkout does not block `start-task`; after the file-tracker copy, `start-task` removes only this task’s uncommitted tracker copies from the launch tree (it does not uncommit files the user already committed).

---

## Decisions

1. **The product and CLI binary are `seh`.** The npm package and GitHub repo are `se-harness`.
2. **No extra wrappers.** There is no agent-wrapper CLI. Isolation for Implementer and Reviewer is git worktrees via `.seh/scripts/start-task`, not a `seh` subcommand. Ship only what this PRD names.
3. **The binding user flow is the only adoption path:** `seh install` (npm or GitHub) → `/<prefix>setit-se` → work skills. Reverse of install is `seh uninstall` with the same source. No extra CLI for setup or config, no global install, no skip of `/<prefix>setit-se`.
4. **CLI is only install/uninstall, always in the current project.** Install writes `.seh/` (including `scripts/` and `.seh/VERSION`), `/<prefix>setit-se` into every supported host `skillsDir`, and the session-start hook command into every host `hooksFile`. It does not generate live agents, work skills, or rule packs. Generation of those is `/<prefix>setit-se`. Verify is the project’s script. Git/`gh` on the allowlist and the session update check are invoked by `.seh/scripts/`.
5. **Consultant is in the default pipeline** — haiku, per phase, structured verdict, 2-pass cap, debt protocol. That is the finite loop (see the table under Consultant).
6. **Reviewer stays spec-only** — split of duties: Consultant = how the code is written; Reviewer = whether it matches the spec.
7. **Mode names** — `interactive` / `critical` / `autonomous` (same meaning as default / semi-standalone / standalone).
8. **Five statuses** — drop `backlog` / `reviewReady` / `reviewDone` as duplicate labels.
9. **Git allowlist via `.seh/scripts/`, not a `seh` wrapper CLI** (when git is enabled; empty `agents.baseBranch` disables it, `agents.git` switches single operations) — Implementer calls `start-task` only. Reviewer calls `commit-task` / `push-task` / `open-pr` / `update-from-base` / `return-to-base`. Scripts read `agents.baseBranch` from `harness.config.json`. Agents do not compose those git/`gh` commands. Merge of the PR is human unless the run was launched by `/<prefix>shipit` (`Auto-merge: yes` on a fan-out child); then the Reviewer merges through `merge-pr`. `start-task` always uses a worktree and does not switch the caller.
10. **Only five product agents** — Architect, Designer, Implementer, Consultant, Reviewer. Brainstorm facilitator is an isolated collector, not a sixth role in `agents.roles`.
11. **`/<prefix>setit-se` is the only skill install writes** (into every `skillsDir`). It is first-time setup when `harness.config.json` is missing, and later parameter changes when the file already exists. Other skills are generated by `/<prefix>setit-se` into every `skillsDir`. Work skills must not run before `harness.config.json` exists, and must not run when `.seh/VERSION` does not match `seh.generatedFrom`.
12. **First `/<prefix>setit-se` leaves the project with a PRD.** It uses an existing one and does not rewrite it. If none exists, its last step runs the `/<prefix>scopeit` create procedure, which always writes `docs/prd.md` (sections the user did not state are `TBD`). Config stores a one-line product plus doc paths, not the PRD body. Later `/<prefix>setit-se` does not rewrite that file; `/<prefix>scopeit` does.
13. **Result is always `AGENTS.md`.** First `/<prefix>setit-se` always handles neither, only `AGENTS.md`, only `CLAUDE.md`, or both. It merges whatever exists with the seh template (`.seh/references/AGENTS.md`), shows the proposed body, and does not write until the user accepts. The written file is always `AGENTS.md`, even if the project had only `CLAUDE.md`. `CLAUDE.md` exists afterwards when `.claude/` was present and/or `CLAUDE.md` already existed (symlink preferred; independent file with the same body if the link fails). Later `/<prefix>setit-se` does not remake `AGENTS.md`.
14. **One tracker.** Files, Jira, or Azure DevOps — exactly one external tracker when connected (`agents.tracker.kind`: `jira` or `ado`). `/<prefix>setit-se` can add, change, or remove the external tracker; a switch does not migrate old tasks. Reading it is always on; writes are chosen per action (decision 27). Jira Cloud REST v3 goes through `.seh/scripts/jira`; Azure DevOps WIT REST through `.seh/scripts/ado` (not MCP, not `seh` tracker CLIs). Agents do not compose `curl`. File-tracker status and log remain agent writes.
15. **Package source layout** — product files live in `agents/`, `packs/`, `skills/`, `brainstorm/`, `references/`, `scripts/`, and `src/` (CLI). Install copies the first six into `.seh/` under the same names. Do not remap. Facilitator templates stay in `brainstorm/`, not `agents/`. Git helpers stay in `scripts/`, not in the `seh` binary.
16. **Base branch is configured, never guessed; empty disables git.** First `/<prefix>setit-se` asks for `agents.baseBranch` (suggested default `dev`). Later `/<prefix>setit-se` can change it. `.seh/scripts/` use only that value to cut, return, update-from-base, and target PRs. Agent markdown does not interpolate it.
17. **Runtime config, not baked agent bodies.** Generated agents read `harness.config.json` for `agents.baseBranch`, `agents.git`, `agents.reportChange`, statuses, tracker write actions and maps, `fetchFields`, content language, and product line. They call `.seh/scripts/` for the git allowlist and for the active external tracker (`jira` or `ado`). Changing those config keys does not require regenerating agents. Role `model` is written into live agent frontmatter because the host loads it from the file. Live agents are copies into **every** `agentsDir` in `.seh/references/hosts.json`, not symlinks to `.seh/agents/`. `agents.roles.<role>.model` is a map keyed by host `id`; each live copy gets `model:` from that host’s entry only. `agents.brainstorm.model` uses the same map shape.
18. **Template version is stamped.** `seh install` writes `.seh/VERSION`. `/<prefix>setit-se` writes `seh.generatedFrom` in `harness.config.json`. A later `/<prefix>setit-se` regenerates live agents, work skills, and rules when those two differ. Install never generates live files. Work skills stop on that mismatch the same way they stop when config is missing.
19. **Always write every supported host.** `references/hosts.json` is the host table. Install and `/<prefix>setit-se` write all rows; they do not ask which hosts to use. Adding a host is a new row plus a path/frontmatter adapter (rules extension, agent format, `modelSuggest`, hook shape, and `commandsDir` when the host's slash commands are not skills). Each row may carry `modelSuggest` (per role and `brainstorm`) as interview defaults; seh does not translate one host’s model id into another’s. Do not maintain a second template tree per host.
20. **Worktree always when git and the `worktree` operation are enabled (none otherwise, then sequential only); parallel on `/<prefix>doit` and `/<prefix>checkit`.** Implementer and Reviewer work in `$(git rev-parse --git-common-dir)/seh-worktrees/<task>` even for one task. Architect and Designer stay on the launch checkout. No extra agent and no extra skill for lists: `/<prefix>doit` and `/<prefix>checkit` accept a list; `/<prefix>runit` stays one sequential task with no merge. The one extra skill is `/<prefix>shipit` (many `runit` sessions with merge ordering). Parallel children when the runtime allows.
21. **Session update check is GitHub tags, notify only.** Available version is the highest semver tag on `meehow-halas/se-harness`, not npm. Host session-start hooks run `.seh/scripts/check-update`. Fail-open. No `seh check` CLI and no silent install. Install or update of a new version only with the user's explicit yes, never without it. Do not treat default-branch `package.json` or untagged commits as a new version.
22. **Codex is the fourth host: a row plus adapters.** (a) Skills go to `.agents/skills` (`.codex/skills` is not a documented scan path). Uninstall removes only seh-owned entries there, since other tools read that directory. (b) Skills are invoked as `$<prefix><name>` or via `/skills`; no `commandsDir`, nothing under `~/.codex/`. (c) Agents use `agentFormat: "codex-toml"` into `.codex/agents`. (d) The update check is a `.codex/hooks.json` `SessionStart` hook (matcher `startup|resume`), active only in a trusted project after review in `/hooks`. (e) `modelSuggest`: architect `gpt-6-sol`; implementer, reviewer and brainstorm `gpt-6.1-sol`; consultant `gpt-6-luna` (tier match to Claude Code opus / sonnet / haiku). Availability per account is unverified; the user may change a suggestion or choose "no change", which omits `model` so the session model is inherited. Reasoning effort is not configured. (f) Rule packs go to `.codex/rules/*.md` plus a seh-managed section in `AGENTS.md`; path scoping is soft.
23. **Designer is conditional and splits UX duty three ways.** The Architect marks `ui: true` in the spec; the launching skill runs the Designer only for `ui: true` with `agents.designer.enabled: true` (tasks without UI keep the old flow). Designer = UX goal in the spec (decisions + `UX:` criteria, log `D<n>`); Consultant = measurable `ux-a11y` rules in the code (must-fix); Reviewer = spec compliance, including `UX:` criteria, unchanged. Default model equals the Implementer's on every host (`modelSuggest.designer`). A config without the Designer keys behaves as disabled; `/<prefix>setit-se` offers to fill them.
24. **`/<prefix>designit` = UX design before the spec; the file lives in the repo and the Architect carries it over.** The Designer (same agent, no sixth role) writes `docs/designs/<slug>.design.md` and touches no tracker. The user names that file in `/<prefix>planit` / `/<prefix>runit`; the Architect writes the spec with the UX section and `UX:` criteria from it and logs `design: <path>`, so the Designer stage is skipped. One writer per file; `status: draft` signals work in progress. Re-running the Architect on such a spec takes the UX again from the same file.
25. **UX conventions are learned on demand, in one repo file.** `/<prefix>designit` ("learn conventions") makes the Designer write `docs/designs/ux-conventions.md` (about 50 lines, evidence per rule); the Designer reads it on every run and it beats the generic baseline in what it describes. Approved deviations from `ux-a11y` live in the same file and only those are skipped by the Consultant (`status: ready`); without them the Implementer would build to the spec and the Consultant would block it. Deviations are never written without a human. No new skill, config key, or CLI change.
26. **The user decides what seh writes on their behalf.** `/<prefix>setit-se` asks whether seh writes `CHANGELOG.md` (proposal from the file’s presence, no silent default on setup), which git operations it runs (one answer; chain `pr` ⇒ `push` ⇒ `commit` ⇒ `worktree`), and which tracker writes it runs (one answer, none preselected). A disabled git operation is left to the user and reported; a disabled tracker action falls back to the files-tracker location of that artifact. `/<prefix>shipit` needs all four git operations.
27. **Tracker writes are per action.** `agents.tracker.write` (`create`, `spec`, `prompt`, `log`, `status`) replaces the former single read-only switch (2.0.0). Migration happens once, in a later `/<prefix>setit-se`; scripts read only `write`. `create` is its own action and includes links; with it OFF binding is by hand.
28. **A task’s name is fixed.** A tracker-origin task (and a new one with `create` ON) uses the key as basename; a locally started task keeps its files basename and gets `tracker:` when bound. Basename and branch never change. Local content of a bound task for ON actions moves to the tracker once, after binding or after an action is turned ON; content on both sides is `BLOCKED`.

## Deferred

These are **out of v1 on purpose**. The list is a scope boundary, not a backlog: do not treat it as leftover work or open tickets from it until a later version is explicitly in scope.

- Auto-install when a newer GitHub tag exists.
- User-facing Consultant skill (it would skip the Implementer).
- Changing `agents.contentLanguage` mid-task.
- Status or log helpers for the files tracker in `.seh/scripts/`.
- Jira Server/Data Center (Cloud REST v3 only).
- Local git without remote/`gh` as its own mode (connecting git still needs `origin`; `agents.git` switches operations off but adds no such mode).
- Running `.seh/scripts/` on Windows (`sh` hosts only in v1).
- Symlinking live agents to `.seh/agents/` instead of copying them.
