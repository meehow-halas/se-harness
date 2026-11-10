# Product: dhs

A layer for software engineering work in an AI coding assistant. Supported hosts in this version are **Claude Code**, **Cursor Agent**, and **OpenCode**. A later host is a row in `references/hosts.json` plus a format adapter, not a second product. It ships **skills**, **agents**, **rule packs**, and a **small CLI** so a project can specify, implement (with a quality loop), and review work without each agent inventing its own process.

The product and CLI binary are **`dhs`**. The npm package is **`dev-harness-layer`**.

This PRD wins whenever old agent files or chat history disagree.

## Package source layout

Published product sources live in this repo at the package root. Do not invent a wrapping `templates/` directory.

| Directory | Role |
|-----------|------|
| `agents/` | The four product agents: Architect, Implementer, Consultant, Reviewer. |
| `packs/` | Framework rule packs (JS/TS, React Native, Angular, Next.js, Python, Django, FastAPI). |
| `skills/` | Skill templates, including `/dhs-setup`. |
| `brainstorm/` | Round templates: member, persona output format, facilitator (collect only), report, app-context skeleton. Not product agents and not in `agents/`. |
| `references/` | Extra file templates (spec / prompt / log shapes, config skeleton, `BLOCKED` format, the consumer `AGENTS.md` template, `hosts.json`, and the like). |
| `scripts/` | POSIX `sh` helpers (git/`gh` allowlist and session update check). Copied into `.dhs/scripts/`. Not the `dhs` CLI. |
| `src/` | CLI (`install` / `uninstall` only). Not copied into `.dhs/`. |

`docs/` is this product’s own documentation. It is not copied into a consuming project’s `.dhs/`.

`dhs install` copies `agents/`, `packs/`, `skills/`, `brainstorm/`, `references/`, and `scripts/` into the target project’s `.dhs/` under the **same names**, writes `.dhs/VERSION` (the package version), and writes the live `/dhs-setup` skill from `skills/` into **every** `skillsDir` listed in `references/hosts.json`. Those directory names in this package **are** the payload: do not keep a second internal tree and remap on copy. When this repo is implemented, write product files in these directories so a consuming repo receives `.dhs/agents/`, `.dhs/packs/`, `.dhs/skills/`, `.dhs/brainstorm/`, `.dhs/references/`, and `.dhs/scripts/`.

## Binding user flow

This sequence is the product contract. Templates, CLI, and skills must implement it. There is no other supported way to adopt `dhs`.

The user is in **their** project directory. The assistant is open on that project. Nothing is installed on the machine.

### 1. Bootstrap

Exactly one of:

```text
# npm
npx -p dev-harness-layer dhs install

# GitHub (the dhs repo; #ref is an optional tag, branch, or commit)
npx -p github:nbmh/dev-harness-layer dhs install
npx -p github:nbmh/dev-harness-layer#<ref> dhs install
npx -p https://github.com/nbmh/dev-harness-layer dhs install
```

`nbmh/dev-harness-layer` is the GitHub repository that publishes the `dev-harness-layer` package (`dhs` CLI). A git HTTPS URL is the same as `github:nbmh/dev-harness-layer`. npm and GitHub are first-class and equivalent.

**Required result:** `.dhs/` and the project skill `/dhs-setup` in every supported host `skillsDir` (today `.claude/skills/dhs-setup`, `.cursor/skills/dhs-setup`, and `.opencode/skills/dhs-setup`). Setup is **not** done. `/dhs-shipit`, `/dhs-planit`, `/dhs-doit`, `/dhs-checkit`, and `/dhs-brainstorm` do not exist yet and must not be offered. `/dhs-setup` is the skill that finishes first-time setup and later changes the same config.

### 2. Finish setup

The user runs `/dhs-setup` in the assistant. That is the only way to finish first-time setup. The CLI does not configure the project.

The skill reads the repo and `.dhs/`. It looks for a project PRD. It gathers what the repo already shows and states those inferences so the user can object. If there is no PRD, it asks one question at a time for the missing product facts, then writes `docs/prd.md`. It does not overwrite an existing PRD. After that it asks one question at a time only for what the repo (and that PRD) do not decide: role models per host (`agents.roles.<role>.model` keyed by `hosts.json` `id`), content language, the base git branch (`agents.baseBranch`; suggested default `dev`), an optional project rule (explained in that question so the user knows what it is for), then Jira yes/no. It always handles project-root `AGENTS.md` and `CLAUDE.md` in every combination (neither, only one, or both): merge what exists, then merge with the dhs agents-file template, show the proposed `AGENTS.md`, and write only after the user accepts. It does not commit.

**Required result:** a project PRD (`docs/prd.md` when it had to be created, otherwise the one already in the repo), `harness.config.json`, agents, remaining skills, rule packs, and a project-root `AGENTS.md` (accepted on first run) — including when the project originally had only `CLAUDE.md`. `CLAUDE.md` exists after this step when the project originally had a `.claude/` directory **and/or** a `CLAUDE.md` (symlink to `AGENTS.md` when the host can create one; otherwise an independent file with the same accepted body). Until this step has produced `harness.config.json`, work skills must stop and tell the user to run `/dhs-setup`. If `harness.config.json` exists but `.dhs/VERSION` does not match `dhs.generatedFrom`, work skills must stop the same way and tell the user to run `/dhs-setup` so generated files match the installed templates. If step 1 was skipped, `/dhs-setup` stops and tells the user to run `dhs install` here, then `/dhs-setup` again.

A later `/dhs-setup` does not repeat first-run setup. If a role `model` is still a string or the map is missing a host `id`, it finishes that map first. If `.dhs/VERSION` does not match `dhs.generatedFrom` in `harness.config.json`, it regenerates live agents, work skills, and rule packs from the current `.dhs/` first (not the project PRD, not `AGENTS.md`), tells the user the package templates changed, then changes parameters (models, statuses, ignored packs, tracker, base branch, …) one at a time.

### 3. Work

Only after step 2:

| Intent | Command |
|--------|---------|
| Full path | `/dhs-shipit` plus what to build |
| Spec only | `/dhs-planit` |
| Implementation only | `/dhs-doit` (one task or a list) |
| One review / update from base / close after merge | `/dhs-checkit` (one task or a list; one variant) |
| Change parameters or Jira | `/dhs-setup` |
| Personae | `/dhs-brainstorm` |

The user merges the GitHub PR. Close is `/dhs-checkit` after they confirm the merge.

### 4. Remove bootstrap (optional)

Same source as step 1:

```text
npx -p dev-harness-layer dhs uninstall
npx -p github:nbmh/dev-harness-layer dhs uninstall
```

Removes `.dhs/` and the install-owned `/dhs-setup` skill. Leaves `harness.config.json` and files `/dhs-setup` generated.

## How it runs

`dhs` is **never** installed globally (`npm install -g` is out). **Never** write skills, templates, or a CLI to `~/.claude/`, `~/.cursor/`, `~/.config/opencode/`, or any other machine-wide location.

The product and CLI binary are **`dhs`**. The npm package is **`dev-harness-layer`**. Run the CLI only in the target project. Pick one source in step 1 and reuse it in step 4.

These two commands are the entire `dhs` CLI in v1. They are idempotent.

### What `dhs install` writes

Into **this project only**:

| Path | Role |
|------|------|
| `.dhs/` | Working copy of `agents/`, `packs/`, `skills/`, `brainstorm/`, `references/`, and `scripts/` from the package, plus `.dhs/VERSION` (package version). |
| Project skill `/dhs-setup` | First-time configuration and later parameter changes (binding flow steps 2 and 3). Written into **every** `skillsDir` in `references/hosts.json`. |
| Host session-start hook | One install-owned command that runs `.dhs/scripts/check-update`. Merged into each host’s `hooksFile` from `references/hosts.json` (today `.claude/settings.json` `SessionStart`, `.cursor/hooks.json` `sessionStart`, and the OpenCode plugin `.opencode/plugins/dhs-check-update.js`). Does not overwrite other hooks or other keys in that file. |

That is the full install-owned set. After install, `/dhs-setup` is invocable. Live agents, the other skills, rule packs, and `harness.config.json` do **not** exist yet. Install does not generate those live files. If this project already has `harness.config.json` (a later install, for example after a package update), install may print that the user should run `/dhs-setup` to apply the new templates. It still does not generate them itself.

Install also ensures the project-root `.gitignore` contains `.dhs/` and `harness.credentials.local.json` (creates the file if missing). This is not uninstall-owned: `dhs uninstall` does not edit `.gitignore`.

`dhs uninstall` removes that same set (`.dhs/`, the install-owned `/dhs-setup` skill in every `skillsDir`, and the install-owned hook command from each `hooksFile`). It does not delete `harness.config.json`, files `/dhs-setup` already generated, or a host hooks file that still has other keys. If the file has only empty hook lists left (and Cursor’s required `version` key), uninstall deletes that file.

On host session start, `.dhs/scripts/check-update` compares `.dhs/VERSION` to the highest semver git tag on `https://github.com/nbmh/dev-harness-layer.git`. That GitHub tag is the available version, whether bootstrap used npm or GitHub. It only injects context when the tag is strictly newer. It never runs `dhs install`. Network, timeout, missing `.dhs/VERSION`, or a local version that is already higher: silence (fail-open). Cache under `.dhs/` (TTL 24h). A later `/dhs-setup` after a manual install is still required when templates changed.

### What `/dhs-setup` does

**First run** (no `harness.config.json`): binding flow step 2. Ensures the project has a PRD (creates `docs/prd.md` when none exists). Asks for `agents.baseBranch` (suggested default `dev`). Writes config (including `dhs.generatedFrom` = `.dhs/VERSION`) and generates agents, the remaining skills, and rule packs from `.dhs/` into **every** host tree in `.dhs/references/hosts.json`. Live agent files are **copies** into each `agentsDir`, not symlinks to `.dhs/agents/`, so the host `model:` frontmatter can be project-specific without editing the install-owned templates. Agent markdown does not interpolate `agents.baseBranch`, statuses, tracker maps, `fetchFields`, content language, or the product line — those are read from `harness.config.json` at run time, and git allowlist operations go through `.dhs/scripts/`. Builds project-root `AGENTS.md` from any existing `AGENTS.md` / `CLAUDE.md` plus the dhs template (always writes `AGENTS.md`, even if only `CLAUDE.md` was there), writes it only after the user accepts the proposed body, then writes `CLAUDE.md` when `.claude/` was present and/or `CLAUDE.md` already existed (see `/dhs-setup` detail).

**Later run** (config already there): if `.dhs/VERSION` ≠ `dhs.generatedFrom`, regenerate live agents, work skills, and rule packs from the current `.dhs/` first, set `dhs.generatedFrom` to `.dhs/VERSION`, and tell the user the installed templates changed (including that `/dhs-feature` was renamed to `/dhs-shipit` and leftover live `dhs-feature` was removed; do not rewrite `AGENTS.md`). Then change one parameter at a time (including Jira). Do not overwrite keys the user did not confirm. After a confirmed change: rewrite that live agent’s frontmatter in **that host’s** `agentsDir` when one role `model` cell changes; regenerate rule packs when `packsIgnored` (or detected frameworks) change. Do **not** regenerate agents because `agents.baseBranch`, statuses, tracker maps, `fetchFields`, content language, or the product line changed — those are runtime config.

Agents run the **project’s own** test/lint/typecheck scripts (from `package.json` or the equivalent).

## Goals

- One path: request → spec → implementation with quality feedback → review against the spec.
- Files as the default tracker; Jira optional.
- Architect does not write a file-by-file recipe. Implementer plans phases. Consultant guards quality. Reviewer guards the spec.
- Coding standards as generated **rules**, not always-on essay markdown.

## Non-goals (v1)

- Any `dhs` CLI beyond `install` and `uninstall`. No `dhs agent`, `dhs git`, `dhs check`, or `dhs` status/Jira command. Git allowlist helpers and the session update check are files under `.dhs/scripts/`, not CLI subcommands.
- Auto-install or auto `/dhs-setup` when a newer GitHub tag exists. The session hook only notifies.
- Status or log helpers for the **files** tracker as `.dhs/scripts/` in v1. Agents write file-tracker status and log themselves. Jira I/O is `.dhs/scripts/jira` (not a `dhs` CLI subcommand).
- A second skill for first-time setup or later config changes. `/dhs-setup` does both.
- Global install (`npm install -g`, machine-wide skills, `~/.claude/`, `~/.cursor/`, `~/.config/opencode/`).
- Finishing setup by any path other than `/dhs-setup` after `dhs install`.
- Extra product agents. The set is Architect, Implementer, Consultant, Reviewer. The brainstorm facilitator is a collector runner, not a fifth role.
- Merging pull requests.
- Trackers other than files and Jira.
- Architect writing line-level implementation instructions.

---

## Feature tracking

**One active tracker connection:** files-only when `agents.tracker` is absent, or a connected external tracker (Jira in v1). Agents do not mirror the same content onto two stores. When `agents.tracker.artifactsOnTrackerOnly` is `false`, spec, prompt, and log live in repo files named by issue key; Jira holds the issue, workflow, and metadata reads — not ticket bodies for those three artifacts.

The first `/dhs-setup` asks once whether to connect Jira. Decline is remembered (`jiraOffer: declined`) so it does not ask again. **Later `/dhs-setup` owns the tracker:** connect, change, or remove, including after a decline.

Switching does **not** migrate. Connect Jira → new work is tickets only; leftover `docs/features` (etc.) are ignored. Remove Jira → new work is files only; existing tickets are not copied into files.

`CHANGELOG.md` and code stay in git on both modes. `docs/brainstorm/` settled records stay files (not a task tracker).

### Files tracker (default)

One task = three files, same basename (`001-feature-example-name`):

| Path | Role |
|------|------|
| `docs/features/<basename>.feature.md` | Spec |
| `docs/prompt/<basename>.prompt.md` | Implementation prompt |
| `docs/feature-log/<basename>.log.md` | Append-only log |

Task key = basename. Branch name = basename. Status strings = `agents.statuses`.

### Jira tracker

Via Jira Cloud REST v3 through `.dhs/scripts/jira` (not MCP, not a `dhs` Jira CLI). Task key = issue key (`PROJ-123`). Branch name = that key.

When `agents.tracker.artifactsOnTrackerOnly` is `true` (default, including when the key is missing), spec, prompt, and log live **only** on the ticket. Agents do not create or edit `docs/features/`, `docs/prompt/`, or `docs/feature-log/` for task artifacts.

When `artifactsOnTrackerOnly` is `false`, spec, prompt, and log live in `docs/features/<key>.feature.md`, `docs/prompt/<key>.prompt.md`, and `docs/feature-log/<key>.log.md`. Spec frontmatter `status` uses `agents.statuses`; workflow moves still use `agents.tracker.statuses` and `jira transition`. `.dhs/scripts/jira get` reads artifact bodies from those files; `jira set` on spec/prompt/log is `BLOCKED`. Agents may edit those paths for the active task only.

Agents call that script; they do not compose `curl` or REST themselves.

The five dhs steps are the same as on files. **Which Jira status each step uses is not guessed.** `/dhs-setup` writes `agents.tracker.statuses` from that project’s workflow (names taken from Jira, shown as a numbered list). Agents transition only to those exact strings.

| Key | When the agent moves the issue | Config |
|-----|-------------------------------|--------|
| `todo` | Architect has created spec + prompt | Jira status or `null` |
| `inProgress` | Implementer starts | Jira status or `null` |
| `codeReview` | Reviewer starts the first round | Jira status or `null` |
| `inReview` | User accepted a clean review (commit/PR) | Jira status or `null` |
| `done` | PR merged and close confirmed | Jira status or `null` |
| `blocker` (optional extra) | Status a **depends** issue must already have before this one may start | Jira status; required if `depends` is used |

`null` = this step does not call a Jira transition. There is no file fallback and no invented name. If the mapped status does not exist on that issue type’s workflow, stop and tell the user to fix the mapping in `/dhs-setup`.

While Jira is connected and `artifactsOnTrackerOnly` is `true`, `agents.statuses` is not written into artifacts. When `artifactsOnTrackerOnly` is `false`, `agents.statuses` applies to spec frontmatter in repo files. After Remove, file-tracker strings from `agents.statuses` apply again.

| When | Ticket |
|------|--------|
| Architect creates the task | Create issue (`feature` / `bug` type from mapping). Title. Spec and prompt where mapping says (two custom fields, description, or comments). Transition to mapped `todo` when not `null`. |
| Architect updates spec or prompt | Overwrite the mapped spec/prompt location. |
| Implementer starts | Transition to mapped `inProgress` when not `null`. |
| Consultant pass | Nowhere on the ticket (noise). |
| User decision `Q<n>` | Comment. |
| Reviewer starts (first round) | Transition to mapped `codeReview` when not `null`. |
| Reviewer report (✅/❌/⚠️) | Comment. |
| Acceptance (clean review) | Transition to mapped `inReview` when not `null`. |
| Close after merge | Transition to mapped `done` when not `null`. |
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
todo → in progress → code review → in review → done
```

| Status | Meaning | Who may run |
|--------|---------|-------------|
| `todo` | Spec and prompt exist or are being written. Architect does not advance past this. | Architect; then Implementer |
| `in progress` | Implementation + Consultant loop. | Implementer (+ Consultant, launched by them) |
| `code review` | Implementation finished; Reviewer working or open ❌. | Reviewer; fix round → Implementer |
| `in review` | Clean review accepted: commit + push + PR. Waiting for merge. | Reviewer: update-from-base or close |
| `done` | PR merged to the base branch and confirmed. | None |

Earlier names: `backlog` → `todo`; `reviewReady` is not a status (stay on `in progress` until the Reviewer starts); `reviewDone` → `in review`.

Agents update status **only** on the active tracker. Files: write the strings from `agents.statuses` (read from `harness.config.json` at run time) into the feature file. Jira: `.dhs/scripts/jira transition` to `agents.tracker.statuses.<key>` from that same file. There is no `dhs` CLI for status. File-tracker status is not a script in v1.

---

## Modes

From **intent**, not a required slash flag. A launch may name the mode so every agent in `/dhs-shipit` shares it. Default: `interactive`.

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
| Reviewer | sonnet | Spec compliance (requirements + AC) only. Not style. Commits, pushes, opens PR, returns to base, closes after merge. |

Brainstorm members are not agents and are not `@`-addressable.

### Architect

- Input: a sentence, or existing files / Jira.
- Output: spec + prompt + first log row **on the active tracker only**. Status stays `todo`.
- Does not create or switch branches. Does not call git scripts. Does not use worktrees.
- Interactive: confirm title, then spec+prompt, before write. Critical/autonomous: write once Questions is satisfied.

### Implementer

- Implements whatever the Architect specified, including tasks with `type: bug`. There is no separate bug agent.
- Before work: run `.dhs/scripts/start-task` with the task basename (see Git). That script reads `agents.baseBranch` from `harness.config.json`, creates the branch named as the basename from that base in a git worktree, and does not commit, push, or switch the caller’s checkout. A launch may name `Worktree: <abs>`; all file edits, project tests, and `.dhs/scripts/` calls happen there. Do not guess `main`, `master`, or the current checkout. Do not compose that git yourself.
- Set status `in progress`.
- Plan 2–6 phases. A phase is a coherent slice (e.g. model + tests, then API), not one file.
- After **each** phase: launch Consultant (see below). Do not start the next phase until the Consultant protocol says `continue`.
- Do not edit `CHANGELOG.md`.
- Unclear spec: follow Questions; do not invent architecture beyond that.
- If the **project** test/lint command fails on code they did not touch: stop and tell the user. Do not label it unrelated and continue.
- When all phases have `continue`, leave status `in progress`. The Reviewer moves it to `code review`.

### Consultant (quality loop)

Consultant exists so cheap, frequent quality feedback happens **during** implementation, while Reviewer stays spec-only. It is not optional in v1.

**Not a user skill.** The Implementer launches it.

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

- First review while `in progress` → set `code review`.
- ❌ → back to Implementer with only those items (Consultant runs again only on phases those fixes belong to, still under the same caps). ⚠️ do not start a round.
- Max **three** Reviewer rounds. The same ❌ with no code change ends the loop.
- An ❌ that contradicts the spec goes to the user; changing the spec is Architect work.

**Acceptance** — only with no open ❌:

- `interactive`: wait for explicit user acceptance. Until then: no changelog, no commit, no push, no PR, status stays `code review`.
- `critical` / `autonomous`: this Reviewer run is acceptance. Then the git steps. Do not merge.

After acceptance, in order: final review in the log → status `in review` → `CHANGELOG.md` entry → `.dhs/scripts/commit-task` → `.dhs/scripts/push-task` → `.dhs/scripts/open-pr` (base is `agents.baseBranch` from config) → `.dhs/scripts/return-to-base`. Do not merge. PR body notes unfinished blockers.

**Update from base:** only when the user asks (e.g. `/dhs-checkit … update`). Run `.dhs/scripts/update-from-base`. Resolve if possible, stop on conflicts.

**Close:** only when the user says the PR is merged. Verify the merge, set `done`, run `.dhs/scripts/return-to-base` from the task worktree (it removes that worktree; it does not switch the user’s primary checkout).

---

## Git

Allowlisted git/`gh` operations run through POSIX `sh` scripts in `.dhs/scripts/` (package `scripts/`, copied by `dhs install`). Agents call those scripts. They do not compose the matching git/`gh` themselves and do not guess `main`, `master`, or the current checkout. There is no `dhs` git wrapper and no `dhs agent` CLI. Scripts read `harness.config.json` (including `agents.baseBranch`). No rebase, reset, or force. No merge of the PR. Windows is out of v1: if the host cannot run `sh`, stop and tell the user.

The scripts are the **how**. Agent markdown is the **when**. A script name is stable across package versions so a later `dhs install` can replace the script body without renaming the call.

**Contract.** Success prints `OK` or `UNCHANGED` and `key: value` lines. Refusal ends with a `BLOCKED:` line (see Stops). The agent copies that line into its report, stops that path, and does not work around it with raw git, `gh`, or `curl`.

The base git branch is `agents.baseBranch` (set on first `/dhs-setup`, changeable later). Scripts cut task branches from it, open PRs against it, and merge it into a task branch on **update**. Changing that key in config does not require regenerating agents.

Implementer and Reviewer always use a **git worktree** for the task. The path is `$(git rev-parse --git-common-dir)/dhs-worktrees/<task>` (for `~/projects/my-app` that is `~/projects/my-app/.git/dhs-worktrees/<task>`). `start-task` does not switch the caller’s checkout. Architect and Consultant do not create worktrees and do not call these scripts.

| Script | Who | Reads from config | Does |
|--------|-----|-------------------|------|
| `start-task` | Implementer at start; Reviewer if the branch is missing | `agents.baseBranch` | Create or reuse a worktree on `<task>` from that base (or attach an existing local/remote branch). Do not switch the caller. Print `worktree: <abs>`. Copy this task’s file-tracker files from the launch working tree into the worktree when they exist. Then, for those three paths only: delete them on launch if they are untracked; `git restore` them on launch if they are tracked and dirty; leave them if they are tracked and clean. Do not touch other dirty files. If `.dhs/` or `harness.config.json` is missing in the worktree but present in the launch tree, symlink them. No commit, no push, no uncommit. |
| `commit-task` | Reviewer, after Acceptance, or after resolving an **update** merge | — | `git add` of the listed paths and `git commit` on the task branch (run from the worktree). |
| `push-task` | Reviewer | — | Push **only** the task branch. |
| `open-pr` | Reviewer, after Acceptance | `agents.baseBranch` | `gh pr create --base <base> --head <task>`. |
| `update-from-base` | Reviewer, only on **update** | `agents.baseBranch` | Merge that base into the task branch. Stop on conflicts. |
| `return-to-base` | Reviewer, after PR opened or after **close** | `agents.baseBranch` | From a dhs worktree: drop launch-only symlinks (`.dhs`, `harness.config.json`) then `git worktree remove` when clean (does not switch the primary checkout). From the primary checkout: `git checkout` that base (legacy). |
| Merge the PR | Human (GitHub) | — | Not a script. |

Architect and Consultant: no git writes. They do not call these scripts.

These scripts do not cover LLM procedure (phases, Consultant, review checklist, Questions). They do not cover file-tracker status or log writes. Jira Cloud REST goes through `.dhs/scripts/jira` (same `OK` / `UNCHANGED` / `BLOCKED:` contract). Agents do not compose `curl`. Auth is Basic `user:jiraToken` from `harness.credentials.local.json` (token never in argv, stdout, chat, or git). Jira Server/DC is out of v1.

| Script | Who | Reads | Does |
|--------|-----|-------|------|
| `jira meta` | `/dhs-setup` Add/Change | `agents.tracker` url, user, projectKey + credentials | List that project’s statuses, issue types, and custom fields (numbered `key: value` lines) for mapping. |
| `jira get <key>` | Architect, Implementer, Reviewer | tracker maps, `fetchFields`, `artifactsOnTrackerOnly` | GET the issue. Print scalars then `BEGIN spec` / `prompt` / `log`. When `artifactsOnTrackerOnly` is `true` (default), bodies from mapped issue fields. When `false`, bodies from `docs/features/`, `docs/prompt/`, `docs/feature-log/` for that key (empty if missing; no issue-field fallback). |
| `jira create --type feature` or `bug --title <text>` | Architect | `issueTypes`, projectKey | POST issue. Print `key:`. |
| `jira set <key> spec\|prompt\|log [--file <path>]` | Architect (spec/prompt/log); Implementer/Reviewer (log) | `fields`, `artifactsOnTrackerOnly` | When `artifactsOnTrackerOnly` is `false`, `BLOCKED:` — edit repo files. Else PUT the mapped field or description; POST comment when the map is `comment`. Body from `--file` or stdin. Log mapped to a field is appended. |
| `jira comment <key> [--file <path>]` | Architect, Implementer, Reviewer | — | POST a comment. Body from `--file` or stdin. |
| `jira transition <key> <todo\|inProgress\|codeReview\|inReview\|done>` | the role that owns that step | `statuses` | `null` → `UNCHANGED` and no HTTP. Else transition only to that exact workflow name. Missing on this issue type → `BLOCKED:` fix mapping in `/dhs-setup`. Already there → `UNCHANGED`. |
| `jira link <key> depends\|relates <other>` | Architect | — | Create the issue link. If Jira refuses, `BLOCKED:` with that fact (the agent comments it; does not write feature files and does not stop the task). |

---

## Runtime config and generated files

`harness.config.json` is the source of truth for project parameters. Generated agent markdown must not contain a literal `agents.baseBranch`, status string, Jira map, `fetchFields` list, content language, or product line. Those files say to **read** `harness.config.json` (and, for git and Jira, to **call** `.dhs/scripts/`).

`/dhs-setup` still generates live files from `.dhs/`:

| Live file | What setup writes |
|-----------|-------------------|
| Host agent files | Copy of `.dhs/agents/` plus `model:` from `agents.roles.<role>.model[<host.id>]` into **each** `agentsDir` in `.dhs/references/hosts.json`. Not a symlink. Do not copy another host’s model. Cursor `consultant` copies also get `readonly: true`. OpenCode copies get `mode: subagent`; OpenCode `consultant` copies also get `permissions` deny `edit`. |
| Work skills (`/dhs-planit`, `/dhs-doit`, `/dhs-checkit`, `/dhs-shipit`, `/dhs-brainstorm`) | From `.dhs/skills/` into every `skillsDir`. Do not overwrite install-owned `/dhs-setup`. Cursor copies also get `disable-model-invocation: true`. On generate, delete leftover `dhs-feature` from each `skillsDir` if it exists. |
| Rule packs | From `.dhs/packs/`, filtered by detection and `packsIgnored`, into every `rulesDir` using that host’s `rulesExt` (`.md` + `paths:` vs `.mdc` + `description` / `globs` / `alwaysApply: false`). For OpenCode, also merge the glob `.opencode/rules/*.md` into `.opencode/opencode.json` `instructions` (create the file if missing; do not edit project-root `opencode.json`). |
| `dhs.generatedFrom` in `harness.config.json` | Equal to `.dhs/VERSION` after a generation that used that tree. |

`.dhs/scripts/` are install-owned. A later `dhs install` replaces them immediately. Live agents, work skills, and rules stay until `/dhs-setup` regenerates them.

---

## Skills

`/dhs-setup` lands **in this project** via `dhs install`, in every `skillsDir` from `references/hosts.json`. The other skills are generated **into the same project** (every `skillsDir`) by the first `/dhs-setup` from `.dhs/`. None of them are installed on the machine.

Single-stage skills do not chain. Only `/dhs-shipit` runs the full path.

Work skills (`/dhs-planit`, `/dhs-doit`, `/dhs-checkit`, `/dhs-shipit`, `/dhs-brainstorm`) stop before doing work when `harness.config.json` is missing **or** `.dhs/VERSION` does not match `dhs.generatedFrom`. The message is to run `/dhs-setup` (and `dhs install` first if `.dhs/` or `.dhs/VERSION` is missing).

| Skill | Does |
|-------|------|
| `/dhs-setup` | Project-local, written by `dhs install`. **First run** (no `harness.config.json`): finish setup. Infers what it can from the repo; one question at a time otherwise. Ensures a project PRD exists (`docs/prd.md` if it had to create one). Asks for `agents.baseBranch` (suggested default `dev`). Writes config (including `dhs.generatedFrom` = `.dhs/VERSION`), generates agents/skills/rules from `.dhs/` without baking runtime config into agent bodies. Merges existing `AGENTS.md` and/or `CLAUDE.md` with the dhs template, shows the proposed body, writes `AGENTS.md` only after acceptance (even if the project had only `CLAUDE.md`). Writes `CLAUDE.md` when `.claude/` was present and/or `CLAUDE.md` already existed (symlink, or independent file if the link cannot be created). Offers Jira once. Does not commit. **Later run** (config already there): if `.dhs/VERSION` ≠ `dhs.generatedFrom`, regenerate live agents, work skills, and rules first. Then change one parameter at a time, including the base branch and add/change/remove Jira. Does not rewrite the project PRD or remake `AGENTS.md`. Rewrites that live agent’s `model:` in **that host’s** `agentsDir` when one role `model` cell changes; regenerates rules when packs change. Ensures `CLAUDE.md` if `.claude/` is present and the file is still missing (symlink first, independent file if the link fails). |
| `/dhs-planit` | Architect once. Offer next step; do not start it. |
| `/dhs-doit` | Implementer, including the Consultant loop. Feature or bug: same agent. One task or a list. Parent runs `start-task` and launches Implementer per task with `Worktree:`; parallel when the runtime allows. |
| `/dhs-checkit` | One Reviewer round per named task. Variants: review, update, close (one variant for the whole invocation). Same worktree / parallel rules as `/dhs-doit`. |
| `/dhs-shipit` | Architect → Implementer (Consultant inside) → Reviewer → fix rounds. **One task only.** Starts at the first missing stage. Stops if already `in review` or `done`. Implementer and Reviewer still use a worktree. |
| `/dhs-brainstorm` | Project-local. Members CRUD, app context, run a consult: personae → facilitator (collect only) → Architect (PART A). |

There is no user-facing Consultant skill.

### `/dhs-setup` (detail)

**Entry.** If `dhs install` has not been run in this project (`.dhs/` is missing, or `/dhs-setup` is absent from **every** `skillsDir` in `.dhs/references/hosts.json`), stop and tell the user to run `dhs install` here from npm (`npx -p dev-harness-layer dhs install`) or from GitHub (`npx -p github:nbmh/dev-harness-layer dhs install`), then `/dhs-setup` again. Present in **any** listed `skillsDir` is enough.

If `harness.config.json` is missing: first-run path below. If it is present: later-run path below. Do not overwrite keys the user did not confirm. Do not regenerate generated files as a silent first-run repeat. A later-run template mismatch (`.dhs/VERSION` ≠ `dhs.generatedFrom`) is not a first-run repeat: regenerate live agents, work skills, and rules, then continue the later-run path.

**First run** (file missing):

- Read the repo first; state inferred choices so the user can object.
- **Project PRD.** Look for an existing product requirements document (typical `docs/prd.md`, or a path the repo already treats as the PRD). If one exists, use it and do not rewrite it. If none exists, gather product facts from the repo (README, architecture, existing docs, what the code does). Ask one question at a time only for facts the repo does not contain. Then write `docs/prd.md` from those inferences and answers. Put that path in `agents.docs`. Do not put the PRD body into `harness.config.json`. One-line product + paths to docs are enough in config.
- Detect frameworks; generate rule packs from `.dhs/` (JS/TS, React Native, Angular, Next.js, Python, Django, FastAPI). Monorepo: pack only on trees that use it. Ignore list: `packsIgnored`.
- Generate live agents and work skills from `.dhs/` as copies into every host tree (see Runtime config and generated files). Write `dhs.generatedFrom` from `.dhs/VERSION`. If `.dhs/VERSION` is missing, stop and tell the user to run `dhs install` here, then `/dhs-setup` again.
- Roles: architect, implementer, consultant, reviewer. For each host in `.dhs/references/hosts.json`, one question per host: prefill all four roles from that row’s `modelSuggest`, show the table, ask whether to change any (optional overrides in one reply). `agents.roles.<role>.model` is a map keyed by that host’s `id`. Do not translate a Claude alias into a Cursor id. No other roles. No brainstorm-facilitator model question.
- `agents.contentLanguage`: language of files and tracker text; ask once, suggest the conversation language.
- `agents.baseBranch`: the git branch `.dhs/scripts/` cut task branches from, open PRs against, merge into a task branch on **update**, and return to after PR or **close**. Ask once. Suggested default is `dev` (for example `dev` vs `main`). If the repo already names a default branch, state that inference so the user can object; do not silently take `main`, `master`, or the current checkout. Without this key, the scripts have no base and must not guess one. Do not write this value into generated agent markdown.
- **Project rule (optional).** One question, after models, content language, and base branch. Say what it is: a standing instruction for the agents on this project, beyond the generated framework packs — for example “never edit the legacy billing module”, “PRs always target `develop`”, “tests only through pytest”. It is stored on the roles (`rules`; reviewer `checklist` when it is a review constraint). Skip is the default: empty is fine, and the skill must not ask for a list or a second rule. If the user already stated such a rule earlier in this conversation, record it and do not ask again.
- **Project agents file (`AGENTS.md` / `CLAUDE.md`).** After writing config and generating files, first run **always** inspects project-root `AGENTS.md` and `CLAUDE.md`. Every combination is in scope: neither, only `AGENTS.md`, only `CLAUDE.md`, or both. Do not skip a file that exists. The dhs source is the template `.dhs/references/AGENTS.md` (package `references/AGENTS.md`).

  Treat a symlink as the target’s body, read once. If `CLAUDE.md` already links to `AGENTS.md` (or the reverse), that is one existing document, not two. If a named path exists but the symlink is broken, treat that path as missing and use the other file if it exists.

  Build the **proposed** `AGENTS.md` in this order; do not write yet:

  | What exists at project root | Merge input (then always merge with the dhs template) |
  |-----------------------------|--------------------------------------------------------|
  | Neither | dhs template only |
  | Only `AGENTS.md` | that file, then the dhs template |
  | Only `CLAUDE.md` | that file, then the dhs template |
  | Both (two regular files) | merge `AGENTS.md` with `CLAUDE.md` first (keep project-specific instructions, drop duplicated paragraphs), then merge that with the dhs template |
  | Both, already the same via symlink | the single target body, then the dhs template |

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

If `.dhs/VERSION` is missing, stop and tell the user to run `dhs install` here, then `/dhs-setup` again. If a role `model` is still a string, or the map is missing a `hosts.json` `id`, finish that map first (prefill, then per host show the four-role table and one confirm-or-change question; do not stamp one host’s model onto another). Then if `.dhs/VERSION` does not equal `dhs.generatedFrom`, regenerate live agents, work skills, and rule packs from `.dhs/` into every host tree (same copy rules as first run: agent files are copies with `model:` from `agents.roles.<role>.model[<host.id>]`; bodies still do not interpolate runtime keys; leftover `dhs-feature` is deleted from each `skillsDir`), set `dhs.generatedFrom` to `.dhs/VERSION`, and tell the user the installed package templates changed, including that `/dhs-feature` was renamed to `/dhs-shipit`. Do not rewrite `AGENTS.md`; mention it may still contain the old name. Then one change at a time. Show current and new value, wait for confirmation, then write. The base branch (`agents.baseBranch`) is one of those parameters; writing it updates `harness.config.json` only. A role `model` change is one cell `(role, host)`: rewrite that live agent’s frontmatter in **that** `agentsDir` only. A `packsIgnored` (or framework) change regenerates rule packs. Do not touch `agents.brainstorm` (that is `/dhs-brainstorm`). Do not create or rewrite the project PRD. Do not remake or re-merge `AGENTS.md`. Do not commit. If `.claude/` is present and `CLAUDE.md` is still missing, create the symlink the same way as on first run; if the link fails, write `CLAUDE.md` as an independent file with the current `AGENTS.md` body. If `CLAUDE.md` already exists as a regular file on a later run, do not overwrite it and do not re-run the first-run merge.

**Tracker (Jira)** — first-run offer and every later run:

| Intent | What happens |
|--------|----------------|
| **Add** (no tracker yet, user asks or accepts the offer) | Ask URL, user, project key (one question at a time). Write those three keys into `agents.tracker`. Create `harness.credentials.local.json` with an empty `jiraToken` when missing; otherwise point at the existing file. User puts the token in that file (never in chat). Confirm when done, then run `.dhs/scripts/jira meta` and retry after fixes until `OK` or they stop. One question for `artifactsOnTrackerOnly` (default no/skip = `true`). Then map statuses (and `blocker` if needed). If `artifactsOnTrackerOnly` is `true`, map spec/prompt/log fields; if `false`, skip field mapping. Issue types for `feature` and `bug`. Write `agents.tracker` into config. Agents must not pick a Jira status that is not in this map. |
| **Change** (tracker already there) | One question: change integration or remove it. Change = same mapping questions for the fields they named. Token rotation or fresh metadata: same credentials confirm loop and `jira meta` once, not on every small mapping edit. |
| **Remove** | Confirm, drop tracker from config, delete or clear the local credentials file. Project is files-only again. `jiraOffer` does not block a later **Add**. |

Do not invent a `dhs` CLI for Jira. The skill calls `.dhs/scripts/jira meta` and writes config. After a tracker change, write the mapping into `harness.config.json`. Do not regenerate agent markdown for `fetchFields` or the task key pattern: agents read those keys at run time.

If the user names another config key (model, base branch, …), do that key first, then the tracker offer only when there is still no tracker and the offer was not declined — unless they explicitly asked to add/change/remove Jira, in which case do the tracker path even after a decline.

### `/dhs-shipit` pipeline

One task. A list of keys is a stop: spec with `/dhs-planit`, then `/dhs-doit` with the list.

1. No spec or prompt → Architect (launch checkout; no git, no worktree).
2. Spec+prompt, no implementation → Implementer in the task worktree, Consultant inside each phase.
3. Implementation exists → Reviewer in that worktree.
4. Open ❌ → Implementer with those items only, then Reviewer again (max 3).
5. Interactive: stop on agent questions. Critical/autonomous: clean review = PR URL; do not merge.

Do not pause between stages when there is no question and no stop. Report once at the end or at the first stop.

### `/dhs-doit` and `/dhs-checkit` (one or many)

The user may name one basename/issue key or several. For each task the parent: resolves the spec, enforces `depends` (unmet `depends` stops **that** task; siblings continue), runs `start-task` from the launch checkout, and launches the role with `Worktree: <abs>` from the script output. N>1: in parallel when the runtime allows; otherwise sequential, still one worktree per task. A `Q<n>` or interactive acceptance on one task does not stop siblings; the parent asks the user and resumes that child. `/dhs-checkit` applies one variant (`review` / `update` / `close`) to the whole invocation. Interactive acceptance is per task. Overlapping product files across parallel tasks are not a stop.

---

## Brainstorm

Optional extra viewpoints while specifying. Members are markdown personae, not `@`-targets and not dhs roles.

The four product agents stay Architect, Implementer, Consultant, Reviewer. Brainstorm still has a **facilitator**, but it is not a fifth product role (no model in `agents.roles`, no `/dhs-setup` question for it). It is an isolated runner: collect opinions, do not judge them, hand the pack to the Architect.

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
| `/dhs-brainstorm` | Skill. CRUD members, app context, start a consult. Orchestrates the round; does not role-play. |
| Member files | `<brainstormDir>/members/<id>.md` for **every** `brainstormDir` in `.dhs/references/hosts.json`, from config (`id`, `description`, `identity`, `cares`, `dislikes`). |
| App context | `<brainstormDir>/app-context.md` in every `brainstormDir`. Built by the skill from the repo (product line, `agents.docs`, README). Gaps: one question at a time, then user confirms the file. |
| Persona turn | Isolated one-shot: one member, structured opinion (`[BLOCKER]` / `[IMPORTANT]` / `[NICE]`). Read-only. No git, no spec edits. Personae do not see each other. |
| Facilitator | Isolated one-shot that **only collects**. Fills PART A (shared points, conflicts, blockers, lone voices, review quality). Does not decide who is right, does not drop a lone blocker, does not average. Used when two or more members were asked; one member → that reply is PART A. |
| Architect | Receives PART A. Decides on every blocker, conflict and gap. Does not run persona or facilitator turns. A persona opinion is not user approval. |

`/dhs-setup` does not edit members. Implementer, Consultant and Reviewer never run a round.

### Two entries

**Direct consult** (`/dhs-brainstorm` + a question or a spec). Needs a ready app context and at least one member. Threshold does not apply. If the user names members, ask those; otherwise ask every member. The skill runs personae → facilitator → then launches the Architect with **PART A only** (plus the material). The skill shows the Architect’s decisions; the user resolves leftover conflicts. Do not hide a blocker the Architect rejected.

**During specification** (`/dhs-planit` or Architect inside `/dhs-shipit`). If the Architect needs a round, it **stops and asks the skill** (or the launching skill runs the round first). It does not interview personae in-process. Consult on its own when there are at least two members **and** the work passes `agents.brainstorm.consult`:

- `any` — every user-visible change
- `significant` (default if unset) — hard to reverse, or changes how the product is used
- `broad` — new module, onboarding, pricing, navigation rebuild

`/dhs-shipit` does not start a round by itself.

### Round

1. Ready app context (or stop and finish it via the skill).
2. Persona turns in parallel when the runtime allows. Launch prompt = member + format + app context + material. Nothing from the Architect session.
3. Facilitator → PART A (or the single persona reply).
4. Architect gets PART A and decides. Agreement among personae is not required and is not proof.
5. Interactive: write `docs/brainstorm/<slug>-<YYYY-MM-DD>.md` only after the user confirms the round. Critical/autonomous: Architect consumes PART A and does **not** write that file.
6. One round unless the user asks for another, and then only for what changed.

Do not paste persona transcripts back into the chat or into the Architect launch. If every persona says almost the same thing, that is a weak set of personae, not confirmation. The facilitator must flag that under review quality.

### First member

On create, ask once for the consult threshold, then for each host in `.dhs/references/hosts.json` one question: show `modelSuggest.brainstorm` as the default for persona and facilitator turns, ask whether to change (one reply with a new id if yes). `agents.brainstorm.model` is a map keyed by host `id`. Members have no per-persona model. A legacy string is migrated the same way as role models (prefill, then confirm per host). After create/edit/remove, regenerate that member file; do not hand-edit generated member markdown.

---

## Coding standards

`/dhs-setup` generates rule files from packs in `.dhs/` into every host `rulesDir`. Agents follow rules that load on Read/Write/Edit (or the host’s equivalent glob-scoped rules).

Quality during implementation is **Consultant + the project’s own test command**. Reviewer does not replace Consultant.

---

## CLI (v1)

| Command | Purpose |
|---------|---------|
| `dhs install` | This project: `.dhs/` (including `scripts/` and `.dhs/VERSION`) plus the `/dhs-setup` skill in every `skillsDir` from `references/hosts.json`. From npm (`npx -p dev-harness-layer dhs install`) or GitHub (`npx -p github:nbmh/dev-harness-layer dhs install`). Does not generate live agents, work skills, or rule packs. |
| `dhs uninstall` | Reverse of install in this project. Same source as install. |

Everything else is a skill, a `.dhs/scripts/` helper, or a normal project command (including the project’s own test/lint). Git/`gh` on the allowlist is invoked by those scripts, not by a `dhs` subcommand.

---

## Stops

Not questions and not Consultant `must-fix`. Report in one line:

`BLOCKED: <what stopped> — <what the user or another skill must do>`

Examples: `dhs install` missing, `/dhs-setup` not run yet, `.dhs/VERSION` does not match `dhs.generatedFrom`, user approval missing, open blocker task, merge not confirmed, dirty **task worktree** when `return-to-base` must remove it, `/dhs-shipit` given a list of tasks, PR failed, project tests failing on untouched code, a `.dhs/scripts/` helper refused. A dirty **primary** checkout does not block `start-task`; after the file-tracker copy, `start-task` removes only this task’s uncommitted tracker copies from the launch tree (it does not uncommit files the user already committed).

---

## Decisions

1. **The product and CLI binary are `dhs`.** The npm package and GitHub repo are `dev-harness-layer`.
2. **No extra wrappers.** There is no agent-wrapper CLI. Isolation for Implementer and Reviewer is git worktrees via `.dhs/scripts/start-task`, not a `dhs` subcommand. Ship only what this PRD names.
3. **The binding user flow is the only adoption path:** `dhs install` (npm or GitHub) → `/dhs-setup` → work skills. Reverse of install is `dhs uninstall` with the same source. No extra CLI for setup or config, no global install, no skip of `/dhs-setup`.
4. **CLI is only install/uninstall, always in the current project.** Install writes `.dhs/` (including `scripts/` and `.dhs/VERSION`), `/dhs-setup` into every supported host `skillsDir`, and the session-start hook command into every host `hooksFile`. It does not generate live agents, work skills, or rule packs. Generation of those is `/dhs-setup`. Verify is the project’s script. Git/`gh` on the allowlist and the session update check are invoked by `.dhs/scripts/`.
5. **Consultant is in the default pipeline** — haiku, per phase, structured verdict, 2-pass cap, debt protocol. That is the finite loop (see the table under Consultant).
6. **Reviewer stays spec-only** — split of duties: Consultant = how the code is written; Reviewer = whether it matches the spec.
7. **Mode names** — `interactive` / `critical` / `autonomous` (same meaning as default / semi-standalone / standalone).
8. **Five statuses** — drop `backlog` / `reviewReady` / `reviewDone` as duplicate labels.
9. **Git allowlist via `.dhs/scripts/`, not a `dhs` wrapper CLI** — Implementer calls `start-task` only. Reviewer calls `commit-task` / `push-task` / `open-pr` / `update-from-base` / `return-to-base`. Scripts read `agents.baseBranch` from `harness.config.json`. Agents do not compose those git/`gh` commands. Merge of the PR is always human. `start-task` always uses a worktree and does not switch the caller.
10. **Only four product agents** — Architect, Implementer, Consultant, Reviewer. Brainstorm facilitator is an isolated collector, not a fifth role in `agents.roles`.
11. **`/dhs-setup` is the only skill install writes** (into every `skillsDir`). It is first-time setup when `harness.config.json` is missing, and later parameter changes when the file already exists. Other skills are generated by `/dhs-setup` into every `skillsDir`. Work skills must not run before `harness.config.json` exists, and must not run when `.dhs/VERSION` does not match `dhs.generatedFrom`.
12. **First `/dhs-setup` leaves the project with a PRD.** It uses an existing one and does not rewrite it. If none exists, it gathers from the repo, asks for gaps, and writes `docs/prd.md`. Config stores a one-line product plus doc paths, not the PRD body. Later `/dhs-setup` does not rewrite that file.
13. **Result is always `AGENTS.md`.** First `/dhs-setup` always handles neither, only `AGENTS.md`, only `CLAUDE.md`, or both. It merges whatever exists with the dhs template (`.dhs/references/AGENTS.md`), shows the proposed body, and does not write until the user accepts. The written file is always `AGENTS.md`, even if the project had only `CLAUDE.md`. `CLAUDE.md` exists afterwards when `.claude/` was present and/or `CLAUDE.md` already existed (symlink preferred; independent file with the same body if the link fails). Later `/dhs-setup` does not remake `AGENTS.md`.
14. **One tracker.** Files or Jira, never both. `/dhs-setup` can add, change, or remove Jira; a switch does not migrate old tasks. Jira Cloud REST v3 goes through `.dhs/scripts/jira` (not MCP, not a `dhs` Jira CLI). Agents do not compose `curl`. File-tracker status and log remain agent writes.
15. **Package source layout** — product files live in `agents/`, `packs/`, `skills/`, `brainstorm/`, `references/`, `scripts/`, and `src/` (CLI). Install copies the first six into `.dhs/` under the same names. Do not remap. Facilitator templates stay in `brainstorm/`, not `agents/`. Git helpers stay in `scripts/`, not in the `dhs` binary.
16. **Base branch is configured, never guessed.** First `/dhs-setup` asks for `agents.baseBranch` (suggested default `dev`). Later `/dhs-setup` can change it. `.dhs/scripts/` use only that value to cut, return, update-from-base, and target PRs. Agent markdown does not interpolate it.
17. **Runtime config, not baked agent bodies.** Generated agents read `harness.config.json` for `agents.baseBranch`, statuses, tracker maps, `fetchFields`, content language, and product line. They call `.dhs/scripts/` for the git allowlist and for Jira. Changing those config keys does not require regenerating agents. Role `model` is written into live agent frontmatter because the host loads it from the file. Live agents are copies into **every** `agentsDir` in `.dhs/references/hosts.json`, not symlinks to `.dhs/agents/`. `agents.roles.<role>.model` is a map keyed by host `id`; each live copy gets `model:` from that host’s entry only. `agents.brainstorm.model` uses the same map shape.
18. **Template version is stamped.** `dhs install` writes `.dhs/VERSION`. `/dhs-setup` writes `dhs.generatedFrom` in `harness.config.json`. A later `/dhs-setup` regenerates live agents, work skills, and rules when those two differ. Install never generates live files. Work skills stop on that mismatch the same way they stop when config is missing.
19. **Always write every supported host.** `references/hosts.json` is the host table. Install and `/dhs-setup` write all rows; they do not ask which hosts to use. Adding a host is a new row plus a path/frontmatter adapter (rules extension, agent format, `modelSuggest`, hook shape). Each row may carry `modelSuggest` (per role and `brainstorm`) as interview defaults; dhs does not translate one host’s model id into another’s. Do not maintain a second template tree per host.
20. **Worktree always; parallel on `/dhs-doit` and `/dhs-checkit`.** Implementer and Reviewer work in `$(git rev-parse --git-common-dir)/dhs-worktrees/<task>` even for one task. Architect stays on the launch checkout. No fifth agent and no extra skill: `/dhs-doit` and `/dhs-checkit` accept a list; `/dhs-shipit` stays one sequential task. Parallel children when the runtime allows.
21. **Session update check is GitHub tags, notify only.** Available version is the highest semver tag on `nbmh/dev-harness-layer`, not npm. Host session-start hooks run `.dhs/scripts/check-update`. Fail-open. No `dhs check` CLI and no silent install. Do not treat default-branch `package.json` or untagged commits as a new version.

## Deferred

These are **out of v1 on purpose**. The list is a scope boundary, not a backlog: do not treat it as leftover work or open tickets from it until a later version is explicitly in scope.

- Full Codex adapter (TOML agents under `.codex/agents`, skills under `.codex/skills` or `.agents/skills`).
- Trackers beyond Jira.
- Auto-merge.
- Auto-install when a newer GitHub tag exists.
- User-facing Consultant skill (it would skip the Implementer).
- Changing `agents.contentLanguage` mid-task.
- Status or log helpers for the files tracker in `.dhs/scripts/`.
- Jira Server/Data Center (Cloud REST v3 only).
- Running `.dhs/scripts/` on Windows (`sh` hosts only in v1).
- Symlinking live agents to `.dhs/agents/` instead of copying them.
