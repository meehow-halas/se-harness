# Product: seh

A layer for software engineering work in an AI coding assistant. Supported hosts in this version are **Claude Code**, **Cursor Agent**, and **OpenCode**. A later host is a row in `references/hosts.json` plus a format adapter, not a second product. It ships **skills**, **agents**, **rule packs**, and a **small CLI** so a project can specify, implement (with a quality loop), and review work without each agent inventing its own process.

The product and CLI binary are **`seh`**. The npm package is **`dev-harness-layer`**.

This PRD wins whenever old agent files or chat history disagree.

## Package source layout

Published product sources live in this repo at the package root. Do not invent a wrapping `templates/` directory.

| Directory | Role |
|-----------|------|
| `agents/` | The four product agents: Architect, Implementer, Consultant, Reviewer. |
| `packs/` | Framework rule packs (JS/TS, React Native, Angular, Next.js, Python, Django, FastAPI). |
| `skills/` | Skill templates, including `/seh-setup`. |
| `brainstorm/` | Round templates: member, persona output format, facilitator (collect only), report, app-context skeleton. Not product agents and not in `agents/`. |
| `references/` | Extra file templates (spec / prompt / log shapes, config skeleton, `BLOCKED` format, the consumer `AGENTS.md` template, `hosts.json`, and the like). |
| `scripts/` | POSIX `sh` helpers (git/`gh` allowlist, session update check, fan-out planner `fanout-plan`). Copied into `.seh/scripts/`. Not the `seh` CLI. |
| `src/` | CLI (`install` / `uninstall` only). Not copied into `.seh/`. |

`docs/` is this product’s own documentation. It is not copied into a consuming project’s `.seh/`.

`seh install` copies `agents/`, `packs/`, `skills/`, `brainstorm/`, `references/`, and `scripts/` into the target project’s `.seh/` under the **same names**, writes `.seh/VERSION` (the package version), and writes the live `/seh-setup` skill from `skills/` into **every** `skillsDir` listed in `references/hosts.json`. Those directory names in this package **are** the payload: do not keep a second internal tree and remap on copy. When this repo is implemented, write product files in these directories so a consuming repo receives `.seh/agents/`, `.seh/packs/`, `.seh/skills/`, `.seh/brainstorm/`, `.seh/references/`, and `.seh/scripts/`.

## Binding user flow

This sequence is the product contract. Templates, CLI, and skills must implement it. There is no other supported way to adopt `seh`.

The user is in **their** project directory. The assistant is open on that project. Nothing is installed on the machine.

### 1. Bootstrap

Exactly one of:

```text
# npm
npx -p dev-harness-layer seh install

# GitHub (the seh repo; #ref is an optional tag, branch, or commit)
npx -p github:nbmh/dev-harness-layer seh install
npx -p github:nbmh/dev-harness-layer#<ref> seh install
npx -p https://github.com/nbmh/dev-harness-layer seh install
```

`nbmh/dev-harness-layer` is the GitHub repository that publishes the `dev-harness-layer` package (`seh` CLI). A git HTTPS URL is the same as `github:nbmh/dev-harness-layer`. npm and GitHub are first-class and equivalent.

**Required result:** `.seh/` and the project skill `/seh-setup` in every supported host `skillsDir` (today `.claude/skills/seh-setup`, `.cursor/skills/seh-setup`, and `.opencode/skills/seh-setup`). Setup is **not** done. `/seh-shipit`, `/seh-planit`, `/seh-doit`, `/seh-checkit`, and `/seh-brainstorm` do not exist yet and must not be offered. `/seh-setup` is the skill that finishes first-time setup and later changes the same config.

### 2. Finish setup

The user runs `/seh-setup` in the assistant. That is the only way to finish first-time setup. The CLI does not configure the project.

The skill reads the repo and `.seh/`. It looks for a project PRD. It gathers what the repo already shows and states those inferences so the user can object. If there is no PRD, it asks one question at a time for the missing product facts, then writes `docs/prd.md`. It does not overwrite an existing PRD. After that it asks one question at a time only for what the repo (and that PRD) do not decide: role models per host (`agents.roles.<role>.model` keyed by `hosts.json` `id`), content language, the base git branch (`agents.baseBranch`; suggested default `dev`), an optional project rule (explained in that question so the user knows what it is for), then Jira yes/no. It always handles project-root `AGENTS.md` and `CLAUDE.md` in every combination (neither, only one, or both): merge what exists, then merge with the seh agents-file template, show the proposed `AGENTS.md`, and write only after the user accepts. It does not commit.

**Required result:** a project PRD (`docs/prd.md` when it had to be created, otherwise the one already in the repo), `harness.config.json`, agents, remaining skills, rule packs, and a project-root `AGENTS.md` (accepted on first run) — including when the project originally had only `CLAUDE.md`. `CLAUDE.md` exists after this step when the project originally had a `.claude/` directory **and/or** a `CLAUDE.md` (symlink to `AGENTS.md` when the host can create one; otherwise an independent file with the same accepted body). Until this step has produced `harness.config.json`, work skills must stop and tell the user to run `/seh-setup`. If `harness.config.json` exists but `.seh/VERSION` does not match `seh.generatedFrom`, work skills must stop the same way and tell the user to run `/seh-setup` so generated files match the installed templates. If step 1 was skipped, `/seh-setup` stops and tells the user to run `seh install` here, then `/seh-setup` again.

A later `/seh-setup` does not repeat first-run setup. If a role `model` is still a string or the map is missing a host `id`, it finishes that map first. If `.seh/VERSION` does not match `seh.generatedFrom` in `harness.config.json`, it regenerates live agents, work skills, and rule packs from the current `.seh/` first (not the project PRD, not `AGENTS.md`), tells the user the package templates changed, then changes parameters (models, statuses, ignored packs, tracker, base branch, …) one at a time.

### 3. Work

Only after step 2:

| Intent | Command |
|--------|---------|
| Full path | `/seh-shipit` plus what to build |
| Spec only | `/seh-planit` |
| Implementation only | `/seh-doit` (one task or a list) |
| One review or update from base | `/seh-checkit` (one task or a list; one variant) |
| Change parameters or Jira | `/seh-setup` |
| Personae | `/seh-brainstorm` |

After an accepted review the Reviewer commits, opens the PR and sets `done`. That is the end of the feature. The user merges the GitHub PR; the merge does not change the task status.

### 4. Remove bootstrap (optional)

Same source as step 1:

```text
npx -p dev-harness-layer seh uninstall
npx -p github:nbmh/dev-harness-layer seh uninstall
```

Removes `.seh/` and the install-owned `/seh-setup` skill. Leaves `harness.config.json` and files `/seh-setup` generated.

## How it runs

`seh` is **never** installed globally (`npm install -g` is out). **Never** write skills, templates, or a CLI to `~/.claude/`, `~/.cursor/`, `~/.config/opencode/`, or any other machine-wide location.

The product and CLI binary are **`seh`**. The npm package is **`dev-harness-layer`**. Run the CLI only in the target project. Pick one source in step 1 and reuse it in step 4.

These two commands are the entire `seh` CLI in v1. They are idempotent.

### What `seh install` writes

Into **this project only**:

| Path | Role |
|------|------|
| `.seh/` | Working copy of `agents/`, `packs/`, `skills/`, `brainstorm/`, `references/`, and `scripts/` from the package, plus `.seh/VERSION` (package version). |
| Project skill `/seh-setup` | First-time configuration and later parameter changes (binding flow steps 2 and 3). Written into **every** `skillsDir` in `references/hosts.json`. |
| Host session-start hook | One install-owned command that runs `.seh/scripts/check-update`. Merged into each host’s `hooksFile` from `references/hosts.json` (today `.claude/settings.json` `SessionStart`, `.cursor/hooks.json` `sessionStart`, and the OpenCode plugin `.opencode/plugins/seh-check-update.js`). Does not overwrite other hooks or other keys in that file. |

That is the full install-owned set. After install, `/seh-setup` is invocable. Live agents, the other skills, rule packs, and `harness.config.json` do **not** exist yet. Install does not generate those live files. If this project already has `harness.config.json` (a later install, for example after a package update), install may print that the user should run `/seh-setup` to apply the new templates. It still does not generate them itself.

Install also ensures the project-root `.gitignore` contains `.seh/` and `harness.credentials.local.json` (creates the file if missing). This is not uninstall-owned: `seh uninstall` does not edit `.gitignore`.

`seh uninstall` removes that same set (`.seh/`, the install-owned `/seh-setup` skill in every `skillsDir`, and the install-owned hook command from each `hooksFile`). It does not delete `harness.config.json`, files `/seh-setup` already generated, or a host hooks file that still has other keys. If the file has only empty hook lists left (and Cursor’s required `version` key), uninstall deletes that file.

On host session start, `.seh/scripts/check-update` compares `.seh/VERSION` to the highest semver git tag on `https://github.com/nbmh/dev-harness-layer.git`. That GitHub tag is the available version, whether bootstrap used npm or GitHub. It only injects context when the tag is strictly newer. It never runs `seh install`. Network, timeout, missing `.seh/VERSION`, or a local version that is already higher: silence (fail-open). Cache under `.seh/` (TTL 24h). A later `/seh-setup` after a manual install is still required when templates changed.

### What `/seh-setup` does

**First run** (no `harness.config.json`): binding flow step 2. Ensures the project has a PRD (creates `docs/prd.md` when none exists). Asks for `agents.baseBranch` (suggested default `dev`). Writes config (including `seh.generatedFrom` = `.seh/VERSION`) and generates agents, the remaining skills, and rule packs from `.seh/` into **every** host tree in `.seh/references/hosts.json`. Live agent files are **copies** into each `agentsDir`, not symlinks to `.seh/agents/`, so the host `model:` frontmatter can be project-specific without editing the install-owned templates. Agent markdown does not interpolate `agents.baseBranch`, statuses, tracker maps, `fetchFields`, content language, or the product line — those are read from `harness.config.json` at run time, and git allowlist operations go through `.seh/scripts/`. Builds project-root `AGENTS.md` from any existing `AGENTS.md` / `CLAUDE.md` plus the seh template (always writes `AGENTS.md`, even if only `CLAUDE.md` was there), writes it only after the user accepts the proposed body, then writes `CLAUDE.md` when `.claude/` was present and/or `CLAUDE.md` already existed (see `/seh-setup` detail).

**Later run** (config already there): if `.seh/VERSION` ≠ `seh.generatedFrom`, regenerate live agents, work skills, and rule packs from the current `.seh/` first, set `seh.generatedFrom` to `.seh/VERSION`, and tell the user the installed templates changed (including that `/seh-feature` was renamed to `/seh-shipit` and leftover live `seh-feature` was removed; do not rewrite `AGENTS.md`). Then change one parameter at a time (including Jira). Do not overwrite keys the user did not confirm. After a confirmed change: rewrite that live agent’s frontmatter in **that host’s** `agentsDir` when one role `model` cell changes; regenerate rule packs when `packsIgnored` (or detected frameworks) change. Do **not** regenerate agents because `agents.baseBranch`, statuses, tracker maps, `fetchFields`, content language, or the product line changed — those are runtime config.

Agents run the **project’s own** test/lint/typecheck scripts (from `package.json` or the equivalent).

## Goals

- One path: request → spec → implementation with quality feedback → review against the spec.
- Files as the default tracker; Jira optional.
- Architect does not write a file-by-file recipe. Implementer plans phases. Consultant guards quality. Reviewer guards the spec.
- Coding standards as generated **rules**, not always-on essay markdown.

## Non-goals (v1)

- Any `seh` CLI beyond `install` and `uninstall`. No `seh agent`, `seh git`, `seh check`, or `seh` status/Jira command. Git allowlist helpers, the session update check and the fan-out planner are files under `.seh/scripts/`, not CLI subcommands.
- Auto-install or auto `/seh-setup` when a newer GitHub tag exists. The session hook only notifies.
- Status or log helpers for the **files** tracker as `.seh/scripts/` in v1. Agents write file-tracker status and log themselves. Jira I/O is `.seh/scripts/jira` (not a `seh` CLI subcommand).
- A second skill for first-time setup or later config changes. `/seh-setup` does both.
- Global install (`npm install -g`, machine-wide skills, `~/.claude/`, `~/.cursor/`, `~/.config/opencode/`).
- Finishing setup by any path other than `/seh-setup` after `seh install`.
- Extra product agents. The set is Architect, Implementer, Consultant, Reviewer. The brainstorm facilitator is a collector runner, not a fifth role.
- Merging pull requests.
- Trackers other than files and Jira.
- Architect writing line-level implementation instructions.

---

## Feature tracking

**One active tracker connection:** files-only when `agents.tracker` is absent, or a connected external tracker (Jira in v1). Agents do not mirror the same content onto two stores. When `agents.tracker.artifactsOnTrackerOnly` is `false`, spec, prompt, and log live in repo files named by issue key; Jira holds the issue, workflow, and metadata reads — not ticket bodies for those three artifacts.

The first `/seh-setup` asks once whether to connect Jira. Decline is remembered (`jiraOffer: declined`) so it does not ask again. **Later `/seh-setup` owns the tracker:** connect, change, or remove, including after a decline.

Switching does **not** migrate. Connect Jira → new work is tickets only; leftover `docs/features` (etc.) are ignored. Remove Jira → new work is files only; existing tickets are not copied into files.

`CHANGELOG.md` and code stay in git on both modes. `docs/brainstorm/` settled records stay files (not a task tracker).

### Files tracker (default)

One task = three files, same basename (`001-feature-example-name`):

| Path | Role |
|------|------|
| `docs/features/<basename>.feature.md` | Spec |
| `docs/prompt/<basename>.prompt.md` | Implementation prompt |
| `docs/feature-log/<basename>.log.md` | Append-only log |

Task key = basename. Branch name = basename, or `<basename>-N` when the old branch has a closed or merged PR. Status strings = `agents.statuses`.

### Jira tracker

Via Jira Cloud REST v3 through `.seh/scripts/jira` (not MCP, not a `seh` Jira CLI). Task key = issue key (`PROJ-123`). Branch name = that key.

When `agents.tracker.artifactsOnTrackerOnly` is `true` (default, including when the key is missing), spec, prompt, and log live **only** on the ticket. Agents do not create or edit `docs/features/`, `docs/prompt/`, or `docs/feature-log/` for task artifacts.

When `artifactsOnTrackerOnly` is `false`, spec, prompt, and log live in `docs/features/<key>.feature.md`, `docs/prompt/<key>.prompt.md`, and `docs/feature-log/<key>.log.md`. Spec frontmatter `status` uses `agents.statuses`; workflow moves still use `agents.tracker.statuses` and `jira transition`. `.seh/scripts/jira get` reads artifact bodies from those files; `jira set` on spec/prompt/log is `BLOCKED`. Agents may edit those paths for the active task only.

Agents call that script; they do not compose `curl` or REST themselves.

The five seh steps are the same as on files. **Which Jira status each step uses is not guessed.** `/seh-setup` writes `agents.tracker.statuses` from that project’s workflow (names taken from Jira, shown as a numbered list). Agents transition only to those exact strings.

| Key | When the agent moves the issue | Config |
|-----|-------------------------------|--------|
| `todo` | Architect has created spec + prompt | Jira status or `null` |
| `inProgress` | Implementer starts | Jira status or `null` |
| `codeReview` | Implementer finishes (`implemented`) | Jira status or `null` |
| `inReview` | Reviewer starts a review round (`in review`) | Jira status or `null` |
| `done` | Clean review accepted: commit, push and PR opened (feature finished) | Jira status or `null` |
| `blocker` (optional extra) | Status a **depends** issue must already have before this one may start | Jira status; required if `depends` is used |

`null` = this step does not call a Jira transition. There is no file fallback and no invented name. If the mapped status does not exist on that issue type’s workflow, stop and tell the user to fix the mapping in `/seh-setup`.

While Jira is connected and `artifactsOnTrackerOnly` is `true`, `agents.statuses` is not written into artifacts. When `artifactsOnTrackerOnly` is `false`, `agents.statuses` applies to spec frontmatter in repo files. After Remove, file-tracker strings from `agents.statuses` apply again.

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
| Acceptance (clean review, PR opened) | Transition to mapped `done` when not `null`. |
| Other log rows (Architect summary, debt `C<id>: accepted`, …) | Comment, or the mapped log field if one exists. |

`depends` / `relates`: issue links when the project allows them. If linking fails, comment that fact; do not write a feature file and do not block the task.

Unmapped Jira fields are ignored. Credentials stay out of git and out of chat (`harness.credentials.local.json`). Project key and field mapping live in `harness.config.json`.

---

## Artifact contract

Same shape on both trackers. On files it is markdown. On Jira it is the mapped fields / description / comments.

### Spec (`*.feature.md`)

Frontmatter: `id`, `title`, `status`, `type` (`feature` \| `bug`), `depends`, `relates`.

Body:

1. **Abstract** — what, why, for whom (2–5 sentences).
2. **Requirements**
3. **Acceptance criteria**
4. **Architectural decisions** — choices and why, not a tutorial.

Keep it short. If the request is several products, the Architect splits it and records `depends` / `relates`. A basename in `depends` must be `done` before implementation starts.

Paths may appear as constraints (“do not change X”), never as a step list.

### Prompt (`*.prompt.md`)

Goal, phase-grain order, new dependencies, existing code to reuse, **what not to change**. Reference files by path. The Implementer still writes their own plan.

### Log (`*.log.md`)

Table `date | agent | action | note`. User decisions: `Q<n>: …`. Consultant items: `C<phase>.<n>: …`. No second approvals file.

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
| `done` | Clean review accepted: commit + push + PR opened. The feature is finished; the PR merge does not change it. | Reviewer, at acceptance only |

Earlier names: `backlog` → `todo`; `reviewReady` is not a status (stay on `in progress` until the Implementer finishes); `reviewDone` → `in review`; `code review` → `implemented` (the Reviewer no longer sets it).

Agents update status **only** on the active tracker. Files: write the strings from `agents.statuses` (read from `harness.config.json` at run time) into the feature file. Jira: `.seh/scripts/jira transition` to `agents.tracker.statuses.<key>` from that same file. There is no `seh` CLI for status. File-tracker status is not a script in v1.

---

## Modes

From **intent**, not a required slash flag. A launch may name the mode so every agent in `/seh-shipit` shares it. Default: `interactive`.

| Mode | Ask the user |
|------|----------------|
| `interactive` (was “default”) | One question at a time, when it is reached. Not a list at the end unless the user asked for a list. |
| `critical` (was “semi-standalone”) | One question only for a **critical** decision, then stop. Otherwise decide, record one sentence, continue. |
| `autonomous` (was “standalone”) | Ask nothing. Contradictions follow the existing spec, or the latest explicit sentence of the request. Preserve user data. Record each choice. |

A decision is **critical** when the request contradicts itself or an existing spec and the two readings ship different behaviour; the work needs a new dependency or external service; it would delete or overwrite user data or be hard to undo in production; or a missing fact would ship two different behaviours.

Questions use stable ids `Q<n>` and one recommended answer.

Consultant never talks to the user; the Implementer does, if the debt protocol requires it.

---

## Agents

Exactly four agents. No others.

| Agent | Model (default) | Job |
|-------|-----------------|-----|
| Architect | opus | Spec + prompt. May split tasks. May consult brainstorm members. Read-only on application code. No git writes. |
| Implementer | sonnet | Implements the task (feature or bug). Own phase plan. After each phase, runs Consultant. Tests with the code. |
| Consultant | haiku | Code **quality** on the phase diff. Does not edit product code. Does not judge spec compliance. |
| Reviewer | sonnet | Spec compliance (requirements + AC) only. Not style. Commits, pushes, opens PR, returns to base, sets `done`. |

Brainstorm members are not agents and are not `@`-addressable.

### Architect

- Input: a sentence, or existing files / Jira.
- Output: spec + prompt + first log row **on the active tracker only**. Status stays `todo`.
- Does not create or switch branches. Does not call git scripts. Does not use worktrees.
- Interactive: confirm title, then spec+prompt, before write. Critical/autonomous: write once Questions is satisfied. Approval for an overwrite of an existing spec counts when the user says it in this session or the launch passes `User approval: <the user's own words>` verbatim; the same rule as the Reviewer acceptance.

### Implementer

- Implements whatever the Architect specified, including tasks with `type: bug`. There is no separate bug agent.
- Before work: run `.seh/scripts/start-task` with the task basename (see Git). That script reads `agents.baseBranch` from `harness.config.json`, creates the branch named as the basename from that base in a git worktree, and does not commit, push, or switch the caller’s checkout. A launch may name `Worktree: <abs>`; all file edits, project tests, and `.seh/scripts/` calls happen there. Do not guess `main`, `master`, or the current checkout. Do not compose that git yourself.
- Set status `in progress`.
- Plan 2–6 phases. A phase is a coherent slice (e.g. model + tests, then API), not one file.
- After **each** phase: launch Consultant (see below). Do not start the next phase until the Consultant protocol says `continue`.
- Do not edit `CHANGELOG.md`.
- Unclear spec: follow Questions; do not invent architecture beyond that.
- If the **project** test/lint command fails on code they did not touch: stop and tell the user. Do not label it unrelated and continue.
- When all phases have `continue`, set status `implemented`. The Reviewer moves it to `in review` when it starts.

### Consultant (quality loop)

Consultant exists so cheap, frequent quality feedback happens **during** implementation, while Reviewer stays spec-only. It is not optional in v1.

**Not a user skill.** The session that runs the Implementer launches it (Agent tool). The Implementer itself runs inline in that session, not as a subagent, because subagents cannot launch subagents.

**May:** read the phase diff, the touched files, the generated rules, and tests for those files. Return a structured report.

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
- `critical` / `autonomous`: this Reviewer run is acceptance. Then the git steps. Do not merge.

After acceptance, in order: final review in the log → status `done` → `CHANGELOG.md` entry → `.seh/scripts/commit-task` (includes `docs/prompt/<task>.prompt.md` when it exists in the worktree) → `.seh/scripts/push-task` → `.seh/scripts/open-pr` (base is `agents.baseBranch` from config) → `.seh/scripts/return-to-base`. Do not merge. PR body notes unfinished blockers.

**Update from base:** only when the user asks (e.g. `/seh-checkit … update`). Run `.seh/scripts/update-from-base`. Resolve if possible, stop on conflicts.

**Feature end:** the PR opened after acceptance is the finished state. The Reviewer does not wait for the merge, does not ask for a confirmation, and runs no later round for it.

---

## Git

Allowlisted git/`gh` operations run through POSIX `sh` scripts in `.seh/scripts/` (package `scripts/`, copied by `seh install`). Agents call those scripts. They do not compose the matching git/`gh` themselves and do not guess `main`, `master`, or the current checkout. There is no `seh` git wrapper and no `seh agent` CLI. Scripts read `harness.config.json` (including `agents.baseBranch`). No rebase, reset, or force. No merge of the PR. Windows is out of v1: if the host cannot run `sh`, stop and tell the user.

The scripts are the **how**. Agent markdown is the **when**. A script name is stable across package versions so a later `seh install` can replace the script body without renaming the call.

**Contract.** Success prints `OK` or `UNCHANGED` and `key: value` lines. Refusal ends with a `BLOCKED:` line (see Stops). The agent copies that line into its report, stops that path, and does not work around it with raw git, `gh`, or `curl`.

The base git branch is `agents.baseBranch` (set on first `/seh-setup`, changeable later). Scripts cut task branches from it, open PRs against it, and merge it into a task branch on **update**. Changing that key in config does not require regenerating agents.

Implementer and Reviewer always use a **git worktree** for the task. The path is `$(git rev-parse --git-common-dir)/seh-worktrees/<task>` (for `~/projects/my-app` that is `~/projects/my-app/.git/seh-worktrees/<task>`). `start-task` does not switch the caller’s checkout. Architect and Consultant do not create worktrees and do not call these scripts.

| Script | Who | Reads from config | Does |
|--------|-----|-------------------|------|
| `start-task` | Implementer at start; Reviewer if the branch is missing | `agents.baseBranch` | Create or reuse a worktree on `<task>` from that base (or attach an existing local/remote branch). Do not switch the caller. Print `worktree: <abs>`. Copy this task’s file-tracker files from the launch working tree into the worktree when they exist. Then, for those three paths only: delete them on launch if they are untracked; `git restore` them on launch if they are tracked and dirty; leave them if they are tracked and clean. Do not touch other dirty files. If `.seh/` or `harness.config.json` is missing in the worktree but present in the launch tree, symlink them. No commit, no push, no uncommit. |
| `commit-task` | Reviewer, after Acceptance, or after resolving an **update** merge | — | `git add` of the listed paths and `git commit` on the task branch (run from the worktree). |
| `push-task` | Reviewer | — | Push **only** the task branch. |
| `open-pr` | Reviewer, after Acceptance | `agents.baseBranch` | `gh pr create --base <base> --head <task>`. |
| `update-from-base` | Reviewer, only on **update** | `agents.baseBranch` | Merge that base into the task branch. Stop on conflicts. |
| `return-to-base` | Reviewer, after PR opened | `agents.baseBranch` | From a seh worktree: drop launch-only symlinks (`.seh`, `harness.config.json`) then `git worktree remove` when clean (does not switch the primary checkout). From the primary checkout: `git checkout` that base (legacy). |
| Merge the PR | Human (GitHub) | — | Not a script. |

Architect and Consultant: no git writes. They do not call these scripts.

These scripts do not cover LLM procedure (phases, Consultant, review checklist, Questions). They do not cover file-tracker status or log writes. Jira Cloud REST goes through `.seh/scripts/jira` (same `OK` / `UNCHANGED` / `BLOCKED:` contract). Agents do not compose `curl`. Auth is Basic `user:jiraToken` from `harness.credentials.local.json` (token never in argv, stdout, chat, or git). Jira Server/DC is out of v1.

| Script | Who | Reads | Does |
|--------|-----|-------|------|
| `jira meta` | `/seh-setup` Add/Change | `agents.tracker` url, user, projectKey + credentials | List that project’s statuses, issue types, and custom fields (numbered `key: value` lines) for mapping. |
| `jira get <key>` | Architect, Implementer, Reviewer | tracker maps, `fetchFields`, `artifactsOnTrackerOnly` | GET the issue. Print scalars then `BEGIN spec` / `prompt` / `log`. When `artifactsOnTrackerOnly` is `true` (default), bodies from mapped issue fields. When `false`, bodies from `docs/features/`, `docs/prompt/`, `docs/feature-log/` for that key (empty if missing; no issue-field fallback). |
| `jira create --type feature` or `bug --title <text>` | Architect | `issueTypes`, projectKey | POST issue. Print `key:`. |
| `jira set <key> spec\|prompt\|log [--file <path>]` | Architect (spec/prompt/log); Implementer/Reviewer (log) | `fields`, `artifactsOnTrackerOnly` | When `artifactsOnTrackerOnly` is `false`, `BLOCKED:` — edit repo files. Else PUT the mapped field or description; POST comment when the map is `comment`. Body from `--file` or stdin. Log mapped to a field is appended. |
| `jira comment <key> [--file <path>]` | Architect, Implementer, Reviewer | — | POST a comment. Body from `--file` or stdin. |
| `jira transition <key> <todo\|inProgress\|codeReview\|inReview\|done>` | the role that owns that step | `statuses` | `null` → `UNCHANGED` and no HTTP. Else transition only to that exact workflow name. Missing on this issue type → `BLOCKED:` fix mapping in `/seh-setup`. Already there → `UNCHANGED`. |
| `jira link <key> depends\|relates <other>` | Architect | — | Create the issue link. If Jira refuses, `BLOCKED:` with that fact (the agent comments it; does not write feature files and does not stop the task). |

---

## Runtime config and generated files

`harness.config.json` is the source of truth for project parameters. Generated agent markdown must not contain a literal `agents.baseBranch`, status string, Jira map, `fetchFields` list, content language, or product line. Those files say to **read** `harness.config.json` (and, for git and Jira, to **call** `.seh/scripts/`).

`/seh-setup` still generates live files from `.seh/`:

| Live file | What setup writes |
|-----------|-------------------|
| Host agent files | Copy of `.seh/agents/` plus `model:` from `agents.roles.<role>.model[<host.id>]` into **each** `agentsDir` in `.seh/references/hosts.json`. Not a symlink. Do not copy another host’s model. Cursor `consultant` copies also get `readonly: true`. OpenCode copies get `mode: subagent`; OpenCode `consultant` copies also get `permissions` deny `edit`. |
| Work skills (`/seh-planit`, `/seh-doit`, `/seh-checkit`, `/seh-shipit`, `/seh-brainstorm`) | From `.seh/skills/` into every `skillsDir`. Do not overwrite install-owned `/seh-setup`. Cursor copies also get `disable-model-invocation: true`. On generate, delete leftover `seh-feature` from each `skillsDir` if it exists. |
| Rule packs | From `.seh/packs/`, filtered by detection and `packsIgnored`, into every `rulesDir` using that host’s `rulesExt` (`.md` + `paths:` vs `.mdc` + `description` / `globs` / `alwaysApply: false`). For OpenCode, also merge the glob `.opencode/rules/*.md` into `.opencode/opencode.json` `instructions` (create the file if missing; do not edit project-root `opencode.json`). |
| `seh.generatedFrom` in `harness.config.json` | Equal to `.seh/VERSION` after a generation that used that tree. |

`.seh/scripts/` are install-owned. A later `seh install` replaces them immediately. Live agents, work skills, and rules stay until `/seh-setup` regenerates them.

---

## Skills

`/seh-setup` lands **in this project** via `seh install`, in every `skillsDir` from `references/hosts.json`. The other skills are generated **into the same project** (every `skillsDir`) by the first `/seh-setup` from `.seh/`. None of them are installed on the machine.

Single-stage skills do not chain. Only `/seh-shipit` runs the full path.

Work skills (`/seh-planit`, `/seh-doit`, `/seh-checkit`, `/seh-shipit`, `/seh-brainstorm`) stop before doing work when `harness.config.json` is missing **or** `.seh/VERSION` does not match `seh.generatedFrom`. The message is to run `/seh-setup` (and `seh install` first if `.seh/` or `.seh/VERSION` is missing).

| Skill | Does |
|-------|------|
| `/seh-setup` | Project-local, written by `seh install`. **First run** (no `harness.config.json`): finish setup. Infers what it can from the repo; one question at a time otherwise. Ensures a project PRD exists (`docs/prd.md` if it had to create one). Asks for `agents.baseBranch` (suggested default `dev`). Writes config (including `seh.generatedFrom` = `.seh/VERSION`), generates agents/skills/rules from `.seh/` without baking runtime config into agent bodies. Merges existing `AGENTS.md` and/or `CLAUDE.md` with the seh template, shows the proposed body, writes `AGENTS.md` only after acceptance (even if the project had only `CLAUDE.md`). Writes `CLAUDE.md` when `.claude/` was present and/or `CLAUDE.md` already existed (symlink, or independent file if the link cannot be created). Offers Jira once. Does not commit. **Later run** (config already there): if `.seh/VERSION` ≠ `seh.generatedFrom`, regenerate live agents, work skills, and rules first. Then change one parameter at a time, including the base branch and add/change/remove Jira. Does not rewrite the project PRD or remake `AGENTS.md`. Rewrites that live agent’s `model:` in **that host’s** `agentsDir` when one role `model` cell changes; regenerates rules when packs change. Ensures `CLAUDE.md` if `.claude/` is present and the file is still missing (symlink first, independent file if the link fails). |
| `/seh-planit` | Architect once. Offer next step; do not start it. |
| `/seh-doit` | Implementer, including the Consultant loop. Feature or bug: same agent. One task or a list. Parent runs `start-task` and applies the Implementer procedure inline per task with `Worktree:`. Several tasks in one session run sequentially; parallel only via session fan-out (`references/session-fanout.md`). |
| `/seh-checkit` | One Reviewer round per named task. Variants: review, update (one variant for the whole invocation). Same worktree / parallel rules as `/seh-doit`. |
| `/seh-shipit` | Architect → Implementer (Consultant inside) → Reviewer → fix rounds. **One task only.** Starts at the first missing stage. Stops if already `done`. Implementer and Reviewer still use a worktree. |
| `/seh-brainstorm` | Project-local. Members CRUD, app context, run a consult: personae → facilitator (collect only) → Architect (PART A). |

There is no user-facing Consultant skill.

### `/seh-setup` (detail)

**Entry.** If `seh install` has not been run in this project (`.seh/` is missing, or `/seh-setup` is absent from **every** `skillsDir` in `.seh/references/hosts.json`), stop and tell the user to run `seh install` here from npm (`npx -p dev-harness-layer seh install`) or from GitHub (`npx -p github:nbmh/dev-harness-layer seh install`), then `/seh-setup` again. Present in **any** listed `skillsDir` is enough.

If `harness.config.json` is missing: first-run path below. If it is present: later-run path below. Do not overwrite keys the user did not confirm. Do not regenerate generated files as a silent first-run repeat. A later-run template mismatch (`.seh/VERSION` ≠ `seh.generatedFrom`) is not a first-run repeat: regenerate live agents, work skills, and rules, then continue the later-run path.

**First run** (file missing):

- Read the repo first; state inferred choices so the user can object.
- **Project PRD.** Look for an existing product requirements document (typical `docs/prd.md`, or a path the repo already treats as the PRD). If one exists, use it and do not rewrite it. If none exists, gather product facts from the repo (README, architecture, existing docs, what the code does). Ask one question at a time only for facts the repo does not contain. Then write `docs/prd.md` from those inferences and answers. Put that path in `agents.docs`. Do not put the PRD body into `harness.config.json`. One-line product + paths to docs are enough in config.
- Detect frameworks; generate rule packs from `.seh/` (JS/TS, React Native, Angular, Next.js, Python, Django, FastAPI). Monorepo: pack only on trees that use it. Ignore list: `packsIgnored`.
- Generate live agents and work skills from `.seh/` as copies into every host tree (see Runtime config and generated files). Write `seh.generatedFrom` from `.seh/VERSION`. If `.seh/VERSION` is missing, stop and tell the user to run `seh install` here, then `/seh-setup` again.
- Roles: architect, implementer, consultant, reviewer. For each host in `.seh/references/hosts.json`, one question per host: prefill all four roles from that row’s `modelSuggest`, show the table, ask whether to change any (optional overrides in one reply). The question must be framed as **change**, not “keep these models” — **no** / skip = accept the table, **yes** = overrides. `agents.roles.<role>.model` is a map keyed by that host’s `id`. Do not translate a Claude alias into a Cursor id. No other roles. No brainstorm-facilitator model question.
- `agents.contentLanguage`: language of files and tracker text; ask once, suggest the conversation language.
- `agents.baseBranch`: the git branch `.seh/scripts/` cut task branches from, open PRs against, merge into a task branch on **update**, and return to after the PR is opened. Ask once. Suggested default is `dev` (for example `dev` vs `main`). If the repo already names a default branch, state that inference so the user can object; do not silently take `main`, `master`, or the current checkout. Without this key, the scripts have no base and must not guess one. Do not write this value into generated agent markdown.
- **Project rule (optional).** One question, after models, content language, and base branch. Say what it is: a standing instruction for the agents on this project, beyond the generated framework packs — for example “never edit the legacy billing module”, “PRs always target `develop`”, “tests only through pytest”. It is stored on the roles (`rules`; reviewer `checklist` when it is a review constraint). Skip is the default: empty is fine, and the skill must not ask for a list or a second rule. If the user already stated such a rule earlier in this conversation, record it and do not ask again.
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

If `.seh/VERSION` is missing, stop and tell the user to run `seh install` here, then `/seh-setup` again. If a role `model` is still a string, or the map is missing a `hosts.json` `id`, finish that map first (prefill, then per host show the four-role table and one confirm-or-change question framed as **change** — not “keep these models”; **no** / skip = accept, **yes** = overrides; do not stamp one host’s model onto another). Then if `.seh/VERSION` does not equal `seh.generatedFrom`, regenerate live agents, work skills, and rule packs from `.seh/` into every host tree (same copy rules as first run: agent files are copies with `model:` from `agents.roles.<role>.model[<host.id>]`; bodies still do not interpolate runtime keys; leftover `seh-feature` is deleted from each `skillsDir`), set `seh.generatedFrom` to `.seh/VERSION`, and tell the user the installed package templates changed, including that `/seh-feature` was renamed to `/seh-shipit`. Do not rewrite `AGENTS.md`; mention it may still contain the old name. Then one change at a time. Show current and new value, wait for confirmation, then write. The base branch (`agents.baseBranch`) is one of those parameters; writing it updates `harness.config.json` only. A role `model` change is one cell `(role, host)`: rewrite that live agent’s frontmatter in **that** `agentsDir` only. A `packsIgnored` (or framework) change regenerates rule packs. Do not touch `agents.brainstorm` (that is `/seh-brainstorm`). Do not create or rewrite the project PRD. Do not remake or re-merge `AGENTS.md`. Do not commit. If `.claude/` is present and `CLAUDE.md` is still missing, create the symlink the same way as on first run; if the link fails, write `CLAUDE.md` as an independent file with the current `AGENTS.md` body. If `CLAUDE.md` already exists as a regular file on a later run, do not overwrite it and do not re-run the first-run merge.

**Status migration** (later run, once): if `agents.statuses` has the key `code review` and no `implemented` key, the status flow changed (`code review` is now `implemented`, set by the Implementer). Rename that key and value to `implemented` in config and tell the user. Do not edit spec files. List every spec whose `status:` is `code review` and tell the user to set it to `implemented`, or to `in review` when a review is running. `in review` stays valid.

**Tracker (Jira)** — first-run offer and every later run:

| Intent | What happens |
|--------|----------------|
| **Add** (no tracker yet, user asks or accepts the offer) | Ask URL, user, project key (one question at a time). Write those three keys into `agents.tracker`. Create `harness.credentials.local.json` with an empty `jiraToken` when missing; otherwise point at the existing file. User puts the token in that file (never in chat). Confirm when done, then run `.seh/scripts/jira meta` and retry after fixes until `OK` or they stop. One question for `artifactsOnTrackerOnly` (default no/skip = `true`). Then map statuses (and `blocker` if needed). If `artifactsOnTrackerOnly` is `true`, map spec/prompt/log fields; if `false`, skip field mapping. Issue types for `feature` and `bug`. Write `agents.tracker` into config. Agents must not pick a Jira status that is not in this map. |
| **Change** (tracker already there) | One question: change integration or remove it. Change = same mapping questions for the fields they named. Token rotation or fresh metadata: same credentials confirm loop and `jira meta` once, not on every small mapping edit. |
| **Remove** | Confirm, drop tracker from config, delete or clear the local credentials file. Project is files-only again. `jiraOffer` does not block a later **Add**. |

Do not invent a `seh` CLI for Jira. The skill calls `.seh/scripts/jira meta` and writes config. After a tracker change, write the mapping into `harness.config.json`. Do not regenerate agent markdown for `fetchFields` or the task key pattern: agents read those keys at run time.

If the user names another config key (model, base branch, …), do that key first, then the tracker offer only when there is still no tracker and the offer was not declined — unless they explicitly asked to add/change/remove Jira, in which case do the tracker path even after a decline.

### `/seh-shipit` pipeline

One task. A list of keys is a stop: spec with `/seh-planit`, then `/seh-doit` with the list.

1. No spec or prompt → Architect (launch checkout; no git, no worktree).
2. Spec+prompt, no implementation → Implementer in the task worktree, Consultant inside each phase.
3. Implementation exists → Reviewer in that worktree.
4. Open ❌ → Implementer with those items only, then Reviewer again (max 3).
5. Interactive: stop on agent questions. Critical/autonomous: clean review = PR URL; do not merge.

Do not pause between stages when there is no question and no stop. Report once at the end or at the first stop.

### `/seh-doit` and `/seh-checkit` (one or many)

The user may name one basename/issue key or several. For each task the parent: resolves the spec, enforces `depends` (unmet `depends` stops **that** task; siblings continue), runs `start-task` from the launch checkout, and launches the role with `Worktree: <abs>` from the script output. N>1: in parallel when the runtime allows; otherwise sequential, still one worktree per task. A `Q<n>` or interactive acceptance on one task does not stop siblings; the parent asks the user and resumes that child. `/seh-checkit` applies one variant (`review` / `update` / `close`) to the whole invocation. Interactive acceptance is per task. Overlapping product files across parallel tasks are not a stop.

### Session fan-out (multi-key runs)

When the host’s `sessionSpawn` in `references/hosts.json` is `start_session` (Claude Code desktop app), a multi-key run of `/seh-planit`, `/seh-doit`, `/seh-checkit` or `/seh-shipit` may start one **dedicated session per key** instead of running them in the parent. Procedure: `references/session-fanout.md`. Planner: `.seh/scripts/fanout-plan` (stateless: ready / waiting / blocked / queued; default `--max 4`). Each child runs the skill for one key (`/seh-doit MT-01`), keeps its own `Q<n>` / `BLOCKED:` dialogue with the user, and does not spawn children. Hosts with `manual` print one command per key. Single key: unchanged.

---

## Brainstorm

Optional extra viewpoints while specifying. Members are markdown personae, not `@`-targets and not seh roles.

The four product agents stay Architect, Implementer, Consultant, Reviewer. Brainstorm still has a **facilitator**, but it is not a fifth product role (no model in `agents.roles`, no `/seh-setup` question for it). It is an isolated runner: collect opinions, do not judge them, hand the pack to the Architect.

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
| `/seh-brainstorm` | Skill. CRUD members, app context, start a consult. Orchestrates the round; does not role-play. |
| Member files | `<brainstormDir>/members/<id>.md` for **every** `brainstormDir` in `.seh/references/hosts.json`, from config (`id`, `description`, `identity`, `cares`, `dislikes`). |
| App context | `<brainstormDir>/app-context.md` in every `brainstormDir`. Built by the skill from the repo (product line, `agents.docs`, README). Gaps: one question at a time, then user confirms the file. |
| Persona turn | Isolated one-shot: one member, structured opinion (`[BLOCKER]` / `[IMPORTANT]` / `[NICE]`). Read-only. No git, no spec edits. Personae do not see each other. |
| Facilitator | Isolated one-shot that **only collects**. Fills PART A (shared points, conflicts, blockers, lone voices, review quality). Does not decide who is right, does not drop a lone blocker, does not average. Used when two or more members were asked; one member → that reply is PART A. |
| Architect | Receives PART A. Decides on every blocker, conflict and gap. Does not run persona or facilitator turns. A persona opinion is not user approval. |

`/seh-setup` does not edit members. Implementer, Consultant and Reviewer never run a round.

### Two entries

**Direct consult** (`/seh-brainstorm` + a question or a spec). Needs a ready app context and at least one member. Threshold does not apply. If the user names members, ask those; otherwise ask every member. The skill runs personae → facilitator → then launches the Architect with **PART A only** (plus the material). The skill shows the Architect’s decisions; the user resolves leftover conflicts. Do not hide a blocker the Architect rejected.

**During specification** (`/seh-planit` or Architect inside `/seh-shipit`). If the Architect needs a round, it **stops and asks the skill** (or the launching skill runs the round first). It does not interview personae in-process. Consult on its own when there are at least two members **and** the work passes `agents.brainstorm.consult`:

- `any` — every user-visible change
- `significant` (default if unset) — hard to reverse, or changes how the product is used
- `broad` — new module, onboarding, pricing, navigation rebuild

`/seh-shipit` does not start a round by itself.

### Round

1. Ready app context (or stop and finish it via the skill).
2. Persona turns in parallel when the runtime allows. Launch prompt = member + format + app context + material. Nothing from the Architect session.
3. Facilitator → PART A (or the single persona reply).
4. Architect gets PART A and decides. Agreement among personae is not required and is not proof.
5. Interactive: write `docs/brainstorm/<slug>-<YYYY-MM-DD>.md` only after the user confirms the round. Critical/autonomous: Architect consumes PART A and does **not** write that file.
6. One round unless the user asks for another, and then only for what changed.

Do not paste persona transcripts back into the chat or into the Architect launch. If every persona says almost the same thing, that is a weak set of personae, not confirmation. The facilitator must flag that under review quality.

### First member

On create, ask once for the consult threshold, then for each host in `.seh/references/hosts.json` one question: show `modelSuggest.brainstorm` as the default for persona and facilitator turns, ask whether to change (one reply with a new id if yes). `agents.brainstorm.model` is a map keyed by host `id`. Members have no per-persona model. A legacy string is migrated the same way as role models (prefill, then confirm per host). After create/edit/remove, regenerate that member file; do not hand-edit generated member markdown.

---

## Coding standards

`/seh-setup` generates rule files from packs in `.seh/` into every host `rulesDir`. Agents follow rules that load on Read/Write/Edit (or the host’s equivalent glob-scoped rules).

Quality during implementation is **Consultant + the project’s own test command**. Reviewer does not replace Consultant.

---

## CLI (v1)

| Command | Purpose |
|---------|---------|
| `seh install` | This project: `.seh/` (including `scripts/` and `.seh/VERSION`) plus the `/seh-setup` skill in every `skillsDir` from `references/hosts.json`. From npm (`npx -p dev-harness-layer seh install`) or GitHub (`npx -p github:nbmh/dev-harness-layer seh install`). Does not generate live agents, work skills, or rule packs. |
| `seh uninstall` | Reverse of install in this project. Same source as install. |

Everything else is a skill, a `.seh/scripts/` helper, or a normal project command (including the project’s own test/lint). Git/`gh` on the allowlist is invoked by those scripts, not by a `seh` subcommand.

---

## Stops

Not questions and not Consultant `must-fix`. Report in one line:

`BLOCKED: <what stopped> — <what the user or another skill must do>`

Examples: `seh install` missing, `/seh-setup` not run yet, `.seh/VERSION` does not match `seh.generatedFrom`, user approval missing, open blocker task, dirty **task worktree** when `return-to-base` must remove it, `/seh-shipit` given a list of tasks, PR failed, project tests failing on untouched code, a `.seh/scripts/` helper refused. A dirty **primary** checkout does not block `start-task`; after the file-tracker copy, `start-task` removes only this task’s uncommitted tracker copies from the launch tree (it does not uncommit files the user already committed).

---

## Decisions

1. **The product and CLI binary are `seh`.** The npm package and GitHub repo are `dev-harness-layer`.
2. **No extra wrappers.** There is no agent-wrapper CLI. Isolation for Implementer and Reviewer is git worktrees via `.seh/scripts/start-task`, not a `seh` subcommand. Ship only what this PRD names.
3. **The binding user flow is the only adoption path:** `seh install` (npm or GitHub) → `/seh-setup` → work skills. Reverse of install is `seh uninstall` with the same source. No extra CLI for setup or config, no global install, no skip of `/seh-setup`.
4. **CLI is only install/uninstall, always in the current project.** Install writes `.seh/` (including `scripts/` and `.seh/VERSION`), `/seh-setup` into every supported host `skillsDir`, and the session-start hook command into every host `hooksFile`. It does not generate live agents, work skills, or rule packs. Generation of those is `/seh-setup`. Verify is the project’s script. Git/`gh` on the allowlist and the session update check are invoked by `.seh/scripts/`.
5. **Consultant is in the default pipeline** — haiku, per phase, structured verdict, 2-pass cap, debt protocol. That is the finite loop (see the table under Consultant).
6. **Reviewer stays spec-only** — split of duties: Consultant = how the code is written; Reviewer = whether it matches the spec.
7. **Mode names** — `interactive` / `critical` / `autonomous` (same meaning as default / semi-standalone / standalone).
8. **Five statuses** — drop `backlog` / `reviewReady` / `reviewDone` as duplicate labels.
9. **Git allowlist via `.seh/scripts/`, not a `seh` wrapper CLI** — Implementer calls `start-task` only. Reviewer calls `commit-task` / `push-task` / `open-pr` / `update-from-base` / `return-to-base`. Scripts read `agents.baseBranch` from `harness.config.json`. Agents do not compose those git/`gh` commands. Merge of the PR is always human. `start-task` always uses a worktree and does not switch the caller.
10. **Only four product agents** — Architect, Implementer, Consultant, Reviewer. Brainstorm facilitator is an isolated collector, not a fifth role in `agents.roles`.
11. **`/seh-setup` is the only skill install writes** (into every `skillsDir`). It is first-time setup when `harness.config.json` is missing, and later parameter changes when the file already exists. Other skills are generated by `/seh-setup` into every `skillsDir`. Work skills must not run before `harness.config.json` exists, and must not run when `.seh/VERSION` does not match `seh.generatedFrom`.
12. **First `/seh-setup` leaves the project with a PRD.** It uses an existing one and does not rewrite it. If none exists, it gathers from the repo, asks for gaps, and writes `docs/prd.md`. Config stores a one-line product plus doc paths, not the PRD body. Later `/seh-setup` does not rewrite that file.
13. **Result is always `AGENTS.md`.** First `/seh-setup` always handles neither, only `AGENTS.md`, only `CLAUDE.md`, or both. It merges whatever exists with the seh template (`.seh/references/AGENTS.md`), shows the proposed body, and does not write until the user accepts. The written file is always `AGENTS.md`, even if the project had only `CLAUDE.md`. `CLAUDE.md` exists afterwards when `.claude/` was present and/or `CLAUDE.md` already existed (symlink preferred; independent file with the same body if the link fails). Later `/seh-setup` does not remake `AGENTS.md`.
14. **One tracker.** Files or Jira, never both. `/seh-setup` can add, change, or remove Jira; a switch does not migrate old tasks. Jira Cloud REST v3 goes through `.seh/scripts/jira` (not MCP, not a `seh` Jira CLI). Agents do not compose `curl`. File-tracker status and log remain agent writes.
15. **Package source layout** — product files live in `agents/`, `packs/`, `skills/`, `brainstorm/`, `references/`, `scripts/`, and `src/` (CLI). Install copies the first six into `.seh/` under the same names. Do not remap. Facilitator templates stay in `brainstorm/`, not `agents/`. Git helpers stay in `scripts/`, not in the `seh` binary.
16. **Base branch is configured, never guessed.** First `/seh-setup` asks for `agents.baseBranch` (suggested default `dev`). Later `/seh-setup` can change it. `.seh/scripts/` use only that value to cut, return, update-from-base, and target PRs. Agent markdown does not interpolate it.
17. **Runtime config, not baked agent bodies.** Generated agents read `harness.config.json` for `agents.baseBranch`, statuses, tracker maps, `fetchFields`, content language, and product line. They call `.seh/scripts/` for the git allowlist and for Jira. Changing those config keys does not require regenerating agents. Role `model` is written into live agent frontmatter because the host loads it from the file. Live agents are copies into **every** `agentsDir` in `.seh/references/hosts.json`, not symlinks to `.seh/agents/`. `agents.roles.<role>.model` is a map keyed by host `id`; each live copy gets `model:` from that host’s entry only. `agents.brainstorm.model` uses the same map shape.
18. **Template version is stamped.** `seh install` writes `.seh/VERSION`. `/seh-setup` writes `seh.generatedFrom` in `harness.config.json`. A later `/seh-setup` regenerates live agents, work skills, and rules when those two differ. Install never generates live files. Work skills stop on that mismatch the same way they stop when config is missing.
19. **Always write every supported host.** `references/hosts.json` is the host table. Install and `/seh-setup` write all rows; they do not ask which hosts to use. Adding a host is a new row plus a path/frontmatter adapter (rules extension, agent format, `modelSuggest`, hook shape). Each row may carry `modelSuggest` (per role and `brainstorm`) as interview defaults; seh does not translate one host’s model id into another’s. Do not maintain a second template tree per host.
20. **Worktree always; parallel on `/seh-doit` and `/seh-checkit`.** Implementer and Reviewer work in `$(git rev-parse --git-common-dir)/seh-worktrees/<task>` even for one task. Architect stays on the launch checkout. No fifth agent and no extra skill: `/seh-doit` and `/seh-checkit` accept a list; `/seh-shipit` stays one sequential task. Parallel children when the runtime allows.
21. **Session update check is GitHub tags, notify only.** Available version is the highest semver tag on `nbmh/dev-harness-layer`, not npm. Host session-start hooks run `.seh/scripts/check-update`. Fail-open. No `seh check` CLI and no silent install. Do not treat default-branch `package.json` or untagged commits as a new version.

## Deferred

These are **out of v1 on purpose**. The list is a scope boundary, not a backlog: do not treat it as leftover work or open tickets from it until a later version is explicitly in scope.

- Full Codex adapter (TOML agents under `.codex/agents`, skills under `.codex/skills` or `.agents/skills`).
- Trackers beyond Jira.
- Auto-merge.
- Auto-install when a newer GitHub tag exists.
- User-facing Consultant skill (it would skip the Implementer).
- Changing `agents.contentLanguage` mid-task.
- Status or log helpers for the files tracker in `.seh/scripts/`.
- Jira Server/Data Center (Cloud REST v3 only).
- Running `.seh/scripts/` on Windows (`sh` hosts only in v1).
- Symlinking live agents to `.seh/agents/` instead of copying them.
