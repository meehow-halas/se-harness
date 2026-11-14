# SE harness

A layer for software engineering work in an AI coding assistant. Supported hosts in this version are **Claude Code**, **Cursor Agent**, **OpenCode**, and **Codex**. It ships **skills**, **agents**, **rule packs**, and a **small CLI** so a project can specify, implement (with a quality loop), and review work without each agent inventing its own process.

One path: request → spec → implementation with quality feedback → review against the spec.

The product and CLI binary are **`seh`**. The npm package is **`se-harness`**. Contracts in full: [`docs/prd.md`](docs/prd.md).

## Requirements

- Node.js 18 or later
- Run commands in **this project’s directory**, with the assistant open on that project
- Do **not** `npm install -g`
- Do **not** install skills, templates, or a CLI into `~/.claude/`, `~/.cursor/`, `~/.config/opencode/`, `~/.codex/`, or any other machine-wide path
- Git helpers need `sh` (Windows is out of v1)

## Hosts

A **host** is the coding assistant (harness) you run seh in. This version: **Claude Code**, **Cursor Agent**, **OpenCode**, and **Codex**. A later host is a row in `hosts.json` plus a format adapter, not a second product.

`seh install` and `/_setit-se` always write **every** row in `.seh/references/hosts.json`. They do not ask which hosts to use. Live skills, agents, rules, and brainstorm files are **copies** (not symlinks to `.seh/agents/`) under `.claude/`, `.cursor/`, `.opencode/`, `.agents/`, and `.codex/` (rules as `.md` vs `.mdc`). In a session, use the copy that host loaded. Skill bodies match; live agent `model:` is that host’s string only.

OpenCode differences:

- A skill is not a slash command there, so every skill also gets a thin command file `.opencode/commands/_<name>.md` that loads the skill.
- Rules go to `.opencode/rules/*.md`; that glob is merged into `.opencode/opencode.json` `instructions` (project-root `opencode.json` is not touched).
- Live agents drop `name` and `tools` and get `mode: subagent`; the consultant also gets `permissions` that deny `edit`.
- The session-start update check is a plugin, `.opencode/plugins/seh-check-update.js`.

Codex differences:

- Skills live in `.agents/skills` (shared with other tools; uninstall removes only seh-owned entries). A skill is invoked as `$_setit-se` (or picked in `/skills`), not `/_setit-se`. Codex has no project command directory, so there is no command file and nothing is written under `~/.codex/`.
- Live agents are TOML, `.codex/agents/<name>.toml`. `model` is written only when one is set; otherwise the session model is inherited. A Codex subagent inherits the parent sandbox, so Consultant read-only is an instruction, not enforced.
- Work skills get `agents/openai.yaml` with `allow_implicit_invocation: false`, so the model does not start them on its own.
- Rules go to `.codex/rules/*.md`; `$_setit-se` keeps one seh-managed section in `AGENTS.md` that points at them. Path scoping is soft (instruction only).
- The session-start update check is a `.codex/hooks.json` `SessionStart` hook. Codex loads it only in a **trusted project**.
- **Approve the hook:** after `seh install`, opening the project in Codex shows a notification that hooks need review. Open `/hooks` and accept the seh `SessionStart` hook, otherwise the update check never runs.
- Sessions per key are not started automatically; one command is printed per key.

One session per key (multi-key `/_planit`, `/_doit`, `/_checkit`, `/_shipit`) starts automatically only in the Claude Code desktop app. Cursor and OpenCode print one command per key.

### Models per host

`agents.roles.<role>.model` is a map keyed by host `id`, not one string per role:

```text
"architect": { "model": { "claude-code": "opus", "cursor": "cursor-grok-4.6-medium", "opencode": "anthropic/claude-opus-5-5" } }
```

First-run suggestions come from that host row’s `modelSuggest`. seh does not translate a Claude alias into a Cursor id.

| Host | Architect | Implementer | Consultant | Reviewer |
|------|-----------|-------------|------------|----------|
| Claude Code | `opus` | `sonnet` | `haiku` | `sonnet` |
| Cursor | `cursor-grok-4.6-medium` | `cursor-grok-4.6-medium` | `composer-2.5` | `cursor-grok-4.6-medium` |
| OpenCode | `anthropic/claude-opus-5-5` | `anthropic/claude-sonnet-5-5` | `anthropic/claude-haiku-5-5` | `anthropic/claude-sonnet-5-5` |
| Codex | `gpt-6-sol` | `gpt-6.1-sol` | `gpt-6-luna` | `gpt-6.1-sol` |

Codex model ids are unverified per account. Choose "no change" to omit `model` and inherit the session model.

A later `/_setit-se` model change is one cell `(role, host)` and rewrites `model:` only in that host’s `agentsDir`. If `model` is still a string, or a host `id` is missing, setup finishes the map first (prefill a legacy string on every host, then confirm per host) before it stamps live files.

Brainstorm uses the same map shape on `agents.brainstorm.model`. `/_grillit` asks one model per host on the first member (not `/_setit-se`): that string is for every persona turn **and** the facilitator. No per-persona model.

## 1. Install

From the project directory, pick one source and reuse it later for uninstall:

```text
npx -p se-harness seh install
npx -p github:meehow-halas/se-harness seh install
npx -p github:meehow-halas/se-harness#<ref> seh install
npx -p https://github.com/meehow-halas/se-harness seh install
```

npm and GitHub are equivalent. `#<ref>` is an optional tag, branch, or commit.

### Skill names and `--prefix`

Skills are installed with a name prefix. `seh install --prefix P` sets it; the default is `_`, so the commands are `/_setit-se`, `/_planit`, `/_doit`, `/_checkit`, `/_shipit` and `/_grillit`. `--prefix my-` gives `/my-doit`, `--prefix ""` gives `/doit`. Allowed characters: letters, digits, `_`, `-`. This README shows the default `_` names.

```text
npx -p se-harness seh install --prefix my-
```

Install stores the prefix in `.seh/PREFIX`, so `seh uninstall` needs no flag, and a later `seh install` without `--prefix` keeps it. Installing again with another prefix removes the old `/_setit-se` skill; the next `/_setit-se` run regenerates the work skills under the new prefix and removes the old ones.

| Skill | Was (1.x) |
|---|---|
| `/_setit-se` | `/seh-setup` |
| `/_grillit` | `/seh-brainstorm` |
| `/_planit` | `/seh-planit` |
| `/_doit` | `/seh-doit` |
| `/_checkit` | `/seh-checkit` |
| `/_shipit` | `/seh-shipit` |

**Result:** `.seh/` and the project skill `/_setit-se` in every host `skillsDir` (today `.claude/skills/_setit-se`, `.cursor/skills/_setit-se`, `.opencode/skills/_setit-se`, and `.agents/skills/_setit-se` for Codex), plus the OpenCode command `.opencode/commands/_setit-se.md`. Setup is **not** done. Work skills (`/_shipit`, `/_planit`, `/_doit`, `/_checkit`, `/_grillit`) do not exist yet.

## 2. Setup

In the assistant, run **`/_setit-se`**. That is the only way to finish first-time setup. The CLI does not configure the project.

First run asks one question at a time (role models **per host**, content language, base git branch, optional project rule, Jira or Azure DevOps). It does not commit.

**Required result:** a project PRD, `harness.config.json`, live agents, remaining skills, and rule packs in **every** host tree, plus a project-root `AGENTS.md`.

Until `harness.config.json` exists, and whenever `.seh/VERSION` does not match `seh.generatedFrom`, work skills stop and tell you to run `/_setit-se`.

First run, later changes, and what you can set: [`/_setit-se`](#_setit-se).

## 3. Work

Say what you want in ordinary language. The assistant matches **intent** to a skill; slash names (`/_shipit`, and so on) label the skill in the host, they are not a command line to assemble.

| Intent | Skill |
|--------|---------|
| Full path | `/_shipit` |
| Spec only | `/_planit` |
| Implementation only | `/_doit` (one task or a list) |
| One review or update from base | `/_checkit` (one task or a list; one variant) |
| Change parameters or tracker (Jira / Azure DevOps) | `/_setit-se` |
| Personae | `/_grillit` |

After you accept a clean review, the Reviewer commits, opens the PR and sets `done`. That ends the feature. You merge the PR on GitHub; nothing else is needed from seh.

## 4. Uninstall (optional)

Same source as install:

```text
npx -p se-harness seh uninstall
npx -p github:meehow-halas/se-harness seh uninstall
```

Removes `.seh/` and the install-owned `/_setit-se` skill from every `skillsDir`. Leaves `harness.config.json` and files `/_setit-se` already generated (live agents, work skills, rules).

## After a package update

Run install again from the same source, then `/_setit-se`, so generated files match the installed templates (`.seh/VERSION` vs `seh.generatedFrom`). That regeneration copies `/_shipit` and deletes leftover live `seh-feature` and the old `seh-*` skills. It does not rewrite project `AGENTS.md`.

```text
npx -p se-harness@latest seh install
```

Then run `/_setit-se` in the project.

- **Pin the version you want.** `npx` may reuse a cached copy of an unpinned package. Use `se-harness@latest` or `se-harness@<version>` for npm, and `github:meehow-halas/se-harness#<tag>` for GitHub. Check the printed `seh install: OK <version>` line.
- **No need to repeat `--prefix`.** A reinstall without the flag keeps the prefix from `.seh/PREFIX`. Pass `--prefix` only to change it.
- `.seh/` (including `.seh/scripts/`) is replaced right away. Live agents, work skills, and rules change only when `/_setit-se` regenerates them.

### Force a reinstall when the version did not change

`seh install` always overwrites `.seh/` and the `/_setit-se` skill. It does not compare versions. `/_setit-se` regenerates live files only when `.seh/VERSION` differs from `seh.generatedFrom` (or the prefix changed). To regenerate everything anyway, for example after a hand edit to a live agent or when installing from a branch whose version was not bumped:

1. Run `seh install` as above.
2. In `harness.config.json`, set `seh.generatedFrom` to `""`.
3. Run `/_setit-se`. It sees the mismatch and regenerates live agents, work skills, and rule packs in every host tree. Your config values, including role models, are kept.

## Skills

Consultant is **not** a slash skill. The Implementer launches it. Single-stage skills do not chain; only `/_shipit` runs the full path, and it is **one task**.

If Architect needs a persona round, work skills **stop and ask** `/_grillit`. `/_shipit` does not run that round itself.

| Skill | When | What happens | Example |
|-------|------|----------------|---------|
| `/_setit-se` | First config; later models, packs, base branch, tracker | One question at a time; generate live files; does not commit. See [`/_setit-se`](#_setit-se). | "change the architect model" · "change the architect model on Cursor" · "connect Jira" · "connect Azure DevOps" |
| `/_planit` | Spec only | Architect once; offer next step; **do not start it** | "write a spec for login" · "tighten the spec for 001-login" · "spec PROJ-12" |
| `/_doit` | Spec and prompt already exist | One task or a list. Parent runs `start-task` and launches Implementer per task with `Worktree:`; parallel when the runtime allows. Ends with status `implemented` | "implement 001-login" · "implement 001-login and 002-logout" · "implement PROJ-12" |
| `/_checkit` | One Reviewer round per named task | Variants: review (default), update from base. One variant for the whole invocation; same worktree / parallel rules as `/_doit` | "review this" · "review 001-login and 002-logout" · "update this branch from base" |
| `/_shipit` | Full path, **one task** | Starts at the first missing stage; does not merge. A list of keys is a stop — spec with `/_planit`, then `/_doit`. Implementer and Reviewer still use a worktree | "add password reset from spec through PR" |
| `/_grillit` | Personae | CRUD members, app context, consult round; does not role-play. See [Brainstorm](#brainstorm). | "consult this spec with the personae" · "build the app context" |

```mermaid
flowchart LR
  planit["/_planit"] --> architect[Architect]
  doit["/_doit"] --> implementer[Implementer]
  implementer --> consultant[Consultant]
  checkit["/_checkit"] --> reviewer[Reviewer]
  shipit["/_shipit"] --> architect
  shipit --> implementer
  shipit --> reviewer
  reviewer --> prDone["PR opened, status done"]
  prDone --> humanMerge[You merge on GitHub]
```

## /_setit-se

The only way to configure this project. The CLI does not write config. Questions are **one at a time**. The skill does not commit.

If `harness.config.json` is missing, that is a **first run**. If the file is already there, that is a **later run** — the same skill, not a second command.

```text
"change the architect model" · "change the architect model on Cursor" · "connect Jira" · "connect Azure DevOps" · "change the base branch"
```

### First run

1. Reads the repo and states inferred choices so you can object.
2. **Project PRD.** Uses an existing one and does not rewrite it. If none exists, gathers from the repo, asks only for facts the repo does not contain, then writes `docs/prd.md`. Config stores a one-line product plus `agents.docs`, not the PRD body.
3. **Questions** (before it writes config): for each host, then for each of the four roles, one model (suggest that host’s `modelSuggest`; see [Models per host](#models-per-host)); `agents.contentLanguage`; `agents.baseBranch` (suggest `dev` — it does not silently take `main`, `master`, or the current checkout); one optional **project rule** (a standing instruction beyond generated packs; skip is the default); which packs to generate (`packsIgnored` if you name packs to skip).
4. Writes `harness.config.json` (`seh.generatedFrom` = `.seh/VERSION`) and generates live agents, work skills, and rule packs from `.seh/` into **every** host tree. Each live agent’s `model:` is `agents.roles.<role>.model[<host.id>]` only.
5. Merges project-root `AGENTS.md` and/or `CLAUDE.md` with the seh template, shows the full proposed markdown, and waits for acceptance. The result is always `AGENTS.md`. It writes `CLAUDE.md` only when `.claude/` was present and/or `CLAUDE.md` already existed (prefer a symlink to `AGENTS.md`; if the link fails, an independent file with the same body).
6. Offers an external tracker (Jira or Azure DevOps) **once**. A decline is stored; add, change, or remove later is this same skill.

### Later run

Config already exists. Say what to change in ordinary language.

If a role `model` is still a string, or the map is missing a host `id`, it finishes that map first (prefill a legacy string on every host, then confirm per host). If `.seh/VERSION` does not match `seh.generatedFrom`, it first regenerates live agents, work skills, and rule packs into every host tree, sets `seh.generatedFrom` to `.seh/VERSION`, and tells you the installed package templates changed (including the renames from the table in [Skill names and `--prefix`](#skill-names-and---prefix)) — then continues. That is the same mechanism as [After a package update](#after-a-package-update).

Then **one change at a time**: show current and new value, wait for confirmation, then write. It does not overwrite keys you did not confirm. A role `model` change is one cell `(role, host)` and rewrites `model:` in **that** host’s `agentsDir` only.

It does **not** touch `agents.brainstorm` (that is `/_grillit`), rewrite the project PRD, remake or re-merge `AGENTS.md`, or commit. If `.claude/` is present and `CLAUDE.md` is still missing, it creates the symlink the same way as on first run.

### What you can set or change

| Setting | First run | Later run | Side effect |
|---------|-----------|-----------|-------------|
| Role models | ask per host | yes — one cell `(role, host)` | rewrite `model:` in that host’s `agentsDir` |
| `agents.contentLanguage` | ask | yes | config only |
| `agents.baseBranch` | ask | yes | config only |
| Optional project rule | one; skip is default | if you ask — stored on the roles (`rules`; reviewer `checklist` when it is a review constraint) | stored on roles |
| Packs / `packsIgnored` | detect; honour ignore | yes | regenerate rule packs |
| Status strings | skeleton unless you confirm other strings | yes | config only |
| Product line / `agents.docs` | from the PRD step | yes | config only |
| Jira / Azure DevOps tracker | offer once: add or decline | add / change mapping / remove | config + local credentials file; no agent-body regen |
| Project PRD | create only if missing | no rewrite | — |
| `AGENTS.md` | merge + accept | no remake | later: only create missing `CLAUDE.md` if `.claude/` exists |
| Brainstorm members / model / consult | no | no | `/_grillit` |

**Jira / Azure DevOps.** First run offers a tracker once. Later: add, change the mapping, or remove. Details: [Jira tracker](#jira-tracker), [Azure DevOps tracker](#azure-devops-tracker).

## Agents

Exactly four product agents. Brainstorm members are not agents and are not `@`-addressable. Interview defaults depend on the host (see [Models per host](#models-per-host)); config stores a map, not one string per role.

| Agent | Job | Must not |
|-------|-----|----------|
| **Architect** | Spec + prompt + first log row on the **active tracker** (repo files when Jira or ADO is read-only). Status stays `todo`. Read-only on application code. No worktrees. | Write app code; git; a file-by-file recipe |
| **Implementer** | Implements the spec (`feature` or `bug`). Own 2–6 phase plan. After each phase, launches Consultant. Calls `.seh/scripts/start-task` (worktree; does not switch your checkout). Works under `Worktree:`. | Edit `CHANGELOG.md`; open the PR; invent architecture past Questions |
| **Consultant** | Code **quality** on the **phase diff**. Structured `CONSULT` report. Not a user skill. | Edit product code; talk to the user; judge spec compliance |
| **Reviewer** | Spec compliance (requirements + acceptance criteria) only. After acceptance: changelog, commit, push, PR from the worktree. `return-to-base` **removes** that worktree; it does not switch your primary checkout. | Merge the PR; treat Consultant `should-fix` as ❌ |

### Architect

Writes the spec, the implementation prompt, and the first log row. Status stays `todo`; the Implementer moves it later. With Jira or ADO in read-only mode, these go to repo files and the tracker is not written. Read-only on application code; no git writes; no worktrees.

If a persona round is needed, Architect **stops and asks** `/_grillit`. It does not interview personae itself. When that skill returns **PART A**, Architect decides on every blocker, conflict, and gap, then continues the spec. Details: [Brainstorm](#brainstorm).

### Implementer and Consultant

Consultant is **not** a slash skill. The Implementer launches it after **each** phase so cheap quality feedback happens during implementation, and Reviewer can stay spec-only.

The Implementer plans 2–6 coherent phases (a slice of behaviour, not one file), runs `.seh/scripts/start-task` (git worktree; your primary checkout stays put), sets status `in progress`, and does the work under `Worktree:`. When all phases are done it sets `implemented`, which lets the Reviewer start. After a phase:

```text
phase work → Consultant pass 1
  no must-fix → next phase
  must-fix    → Implementer fixes only those ids → Consultant pass 2
                  closed → next phase
                  still open → debt protocol, then continue
```

```mermaid
flowchart LR
  phase[Phase work] --> consult[Consultant]
  consult --> report[CONSULT report]
  report --> implementer[Implementer]
  implementer --> nextPhase[Next phase or debt]
```

Consultant reads the **phase diff**, touched files, generated rules, and tests for those files. It returns a structured report: `must-fix` can block the phase; `should-fix` never blocks (Implementer may apply or skip; skipped items get one log line); `notes` never block.

Consultant never talks to the user. In interactive mode, if `must-fix` is still open after pass 2, the **Implementer** asks whether to grant one extra pass or accept debt. Caps, stale findings, and the full report shape: [`docs/prd.md`](docs/prd.md) (Agents / Consultant).

### Reviewer

A different axis from Consultant: **does this match the spec** (requirements + acceptance criteria), not how the code is written. Leftover Consultant `should-fix` is not ❌. Leftover `must-fix` may be ❌ only when it actually misses an acceptance criterion.

The Reviewer starts from `implemented` (or from `in review` on a later round without a fix in between) and sets `in review`. ❌ sets `in progress` and sends those items back to the Implementer, who sets `implemented` again. After acceptance: changelog, `done`, commit, push, PR from the worktree; `return-to-base` removes that worktree. You merge on GitHub. Max three Reviewer rounds.

## Brainstorm

Optional extra viewpoints while specifying. Members are markdown **personae**, not seh roles and not `@`-targets. The skill orchestrates; it does not role-play.

There is still a **facilitator**, but it is not a fifth product agent: no model in `agents.roles`, no `/_setit-se` question. It is an isolated collector. Implementer, Consultant, and Reviewer never run a round. `/_setit-se` does not edit members.

```mermaid
flowchart LR
  skill["/_grillit"] --> personas[Persona turns]
  personas --> facilitator[Facilitator]
  facilitator --> partA[PART A]
  partA --> architect[Architect decides]
```

### Personae and how you manage them

CRUD is **only** `/_grillit`. Config lives in `agents.brainstorm.members`: `id`, `description`, `identity`, `cares`, `dislikes`. Live files are `<brainstormDir>/members/<id>.md` for **every** `brainstormDir` in `.seh/references/hosts.json`, generated from the template. After create, edit, or remove, regenerate that file from config. Do not hand-edit generated member markdown.

On the **first** member in a project, the skill also asks (once):

- Consult threshold: `any` (every user-visible change) / `significant` (default — hard to reverse, or changes how the product is used) / `broad` (new module, onboarding, pricing, navigation rebuild). Written as `agents.brainstorm.consult`.
- One model **per host** for every persona turn **and** the facilitator (suggest that host’s `modelSuggest.brainstorm`). No per-persona model. Written as `agents.brainstorm.model` (a map keyed by host `id`). A legacy string is migrated the same way as role models.

**App context** is `<brainstormDir>/app-context.md` in every `brainstormDir`, built from the repo (product line, `agents.docs`, README). Gaps: one question at a time; write only after you confirm the file. A consult without a ready app context stops.

### How a round collects opinions

Isolation is the point. Personae must not see Architect notes, `Q<n>` leanings, each other, or a “corrected” spec.

```text
material (spec or question)
    → each persona, alone, without Architect context
    → facilitator collates, without scoring or picking a winner
    → Architect receives PART A and decides
```

1. Ready app context (or stop and finish it).
2. **Persona turns.** Isolated one-shot per member, in parallel when the runtime allows. Each sees: their member file, the output format, app context, and the material. Read only. No git. No spec edits.
3. Each persona answers in a fixed shape: needs and barriers marked `[BLOCKER]` / `[IMPORTANT]` / `[NICE]`, facts vs assumptions, a short use scene, confidence. They do not propose a technical implementation.
4. **Facilitator** (two or more members): isolated one-shot that **only collects** PART A — shared points, conflicts, blockers, lone voices, review quality. It does not decide who is right, drop a lone blocker, or average. One member → that reply **is** PART A; skip the facilitator.
5. **Architect** with **PART A only** plus the material. Do not pass persona transcripts.

Do not paste transcripts back into the chat or into the Architect launch. If every persona says almost the same thing, that is a weak set — the facilitator flags it under review quality. One round unless you ask for another, and then only for what changed.

### Two ways in

**Direct consult** (`/_grillit` plus a question or a spec). Needs a ready app context and at least one member. The consult threshold does **not** apply. If you name members, those are asked; otherwise every member. The skill runs personae → facilitator → Architect, then **shows the Architect’s decisions** (not the raw persona replies). You resolve leftover conflicts. A blocker the Architect rejected is still shown.

**During specification** (`/_planit`, or Architect inside `/_shipit`). If Architect needs a round, work skills **stop and ask** `/_grillit`. They do not interview personae in-process. `/_shipit` does not start a round by itself.

A round **on its own** (nobody named a question) runs only when there are at least **two** members **and** the work passes `agents.brainstorm.consult` (`any` / `significant` / `broad` as above).

### How Architect uses PART A

Architect decides on every blocker, conflict, and gap. Agreement among personae is not required and is not proof. A persona opinion is not user approval.

**Interactive:** after you confirm the round, the skill writes `docs/brainstorm/<slug>-<YYYY-MM-DD>.md`. That settled record is Accepted / Left for the user only — no persona replies, no PART A. **Critical / autonomous:** Architect consumes PART A and does **not** write that file.

Settled records stay files under `docs/brainstorm/`. They are not the task tracker.

## Modes

Two axes. Do not mix them.

### Interaction

From **intent**, not a required slash flag. Default: `interactive`. Architect, Implementer, and Reviewer take `Mode:` on launch. `/_planit`, `/_doit`, and `/_checkit` pass that mode to the role they launch. You may name the mode in the request so every agent in a `/_shipit` run shares it; you do not assemble it like a CLI flag. Consultant does not take `Mode:`.

| Mode | Ask the user |
|------|----------------|
| `interactive` | One `Q<n>` at a time, when it is reached. Architect confirms title, then spec+prompt, before write. Reviewer waits for explicit acceptance before changelog, commit, or PR. |
| `critical` | One question only for a **critical** decision, then stop. Otherwise decide, record one sentence, continue. Clean review = PR URL; do not merge. |
| `autonomous` | Ask nothing. Contradictions follow the existing spec, or the latest explicit sentence of the request. Preserve user data. Record each choice. Same acceptance as `critical`. |

A decision is **critical** when the request contradicts itself or an existing spec and the two readings ship different behaviour; the work needs a new dependency or external service; it would delete or overwrite user data or be hard to undo in production; or a missing fact would ship two different behaviours.

```text
"add export to CSV" → interactive (default)
"add export to CSV and don't ask me" → autonomous
"tighten the login spec; only stop me for critical decisions" → critical
```

Consultant never talks to the user; the Implementer does, if the debt protocol requires it.

### Reviewer variants

These are **not** a substitute for interaction modes. Reviewer still receives `Mode:` from `/_checkit` (same default). That skill also picks **one** variant for the whole invocation: `review` (default) | `update`. Both apply together (for example `autonomous` + `update`).

## Trackers and statuses

### One active tracker

**Exactly one tracker:** files, Jira, **or** Azure DevOps, never two at once. Agents write spec, prompt, log, and status to the active tracker only. They do not mirror. The one exception is read-only mode (below): the tracker is only read, and spec, prompt, log, and status are written to repo files.

Which tracker is active is in `harness.config.json`. If `agents.tracker` is present, its `kind` (`jira` or `ado`) is the active tracker; a config without `kind` is Jira. If it is absent, the files tracker is active.

Jira and Azure DevOps run in one of two modes, chosen in `/_setit-se` right after you pick the tracker (`agents.tracker.readOnly`):

- **Full write** (default, `readOnly: false`): seh creates items, writes spec, prompt, and log on them, and moves statuses. No repo files for tasks.
- **Read-only** (`readOnly: true`): seh only reads the tracker, e.g. so you can point the Architect at an existing item. It never creates, edits, comments, transitions, or links. Spec, prompt, log, and status live in repo files, as with the files tracker, named by the item key when the task exists on the tracker.

Switching does **not** migrate. Connect Jira or Azure DevOps → new work is tickets / work items only; leftover `docs/features` (etc.) are ignored. Remove the tracker → new work is files only; existing tickets are not copied into files.

`CHANGELOG.md` and code stay in git on both modes. Settled brainstorm records stay under `docs/brainstorm/` (not a task tracker).

Name a task to a skill with the **active** tracker’s key: a file basename (`001-login`) or a Jira issue key (`PROJ-12`), or an Azure DevOps work item id (`1234`). See [Skills](#skills) for examples.

Same artifact shape on both trackers (markdown files, or mapped Jira / Azure DevOps fields / description / comments):

- **Spec** — abstract, requirements, acceptance criteria, architectural decisions (choices and why, not a tutorial)
- **Prompt** — phase-grain order, what not to change; the Implementer still writes their own plan
- **Log** — `Q<n>` decisions, `C<id>` Consultant items

### Files tracker (default)

One task = three files, same basename (example `001-feature-example-name`):

| Path | Role |
|------|------|
| `docs/features/<basename>.feature.md` | Spec |
| `docs/prompt/<basename>.prompt.md` | Implementation prompt |
| `docs/feature-log/<basename>.log.md` | Append-only log |

Task key = basename. Branch name = basename.

Status lives in the spec file frontmatter. The strings come from `agents.statuses` in config. Do not translate them from the conversation language. Change those strings with `/_setit-se` (config only).

When Implementer or Reviewer starts a worktree, `start-task` copies this task’s three files from the launch working tree into the worktree when they exist there.

### Jira tracker

Connect, change, or remove only through `/_setit-se` (`"connect Jira"` / the first-run offer). There is no `seh` CLI for Jira. Agents and setup call `.seh/scripts/jira` (Jira Cloud REST). They do not use MCP and do not compose `curl`.

Credentials: you put the token in a project-local ignored file `harness.credentials.local.json`:

```json
{ "jiraToken": "…" }
```

`seh install` already ignores that filename. Never paste the token in chat. Never write it into git or `harness.config.json`. Project key and field mapping live in config under `agents.tracker`.

**Add** (no tracker yet, or you accept the first-run offer). First: read-only mode, yes or no (see [One active tracker](#one-active-tracker)). Then, either way, one question at a time: URL, user, project key. Put the token in `harness.credentials.local.json`. Setup writes those keys, then `.seh/scripts/jira meta` lists that project’s statuses, issue types, and fields. Read-only: map only `blocker` (if you use `depends`) and `fetchFields`; status moves are writes, so nothing else is mapped. Full write: map each seh step `todo`, `inProgress`, `codeReview`, `inReview`, `done` to a status from that list, or skip = `null`. Map `blocker` if you use `depends`. Map where spec and prompt live (two custom fields, description, or comments) and issue types for `feature` and `bug`. Agents transition only to those exact strings; they do not invent Jira status names.

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

### Azure DevOps tracker

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

### Statuses

The five seh steps are the same on every tracker. On files, the labels are the strings in `agents.statuses`. On Jira and Azure DevOps, each step uses the mapped `agents.tracker.statuses` name (or is skipped when that key is `null`).

```text
todo → in progress → implemented → in review → done
```

| Status | Meaning | Who may run |
|--------|---------|-------------|
| `todo` | Spec and prompt exist or are being written. Architect does not advance past this. | Architect; then Implementer |
| `in progress` | Implementation + Consultant loop. | Implementer (+ Consultant, launched by them) |
| `implemented` | Implementation finished; the Reviewer may start. | Implementer (end of its run) |
| `in review` | A review round is running or waiting for your acceptance. ❌ moves it back to `in progress`. | Reviewer |
| `done` | Clean review accepted: commit + push + PR opened. The feature is finished. | Reviewer, at acceptance |

You merge the PR on GitHub. The merge does not change the status; `done` is already set.

## Rule packs

`/_setit-se` generates short, path-scoped coding rules from detected frameworks. They are not always-on essay markdown. Ignore packs with `packsIgnored`. First setup may also record **one** optional project rule (a standing instruction beyond packs).

| Pack | Typical detection |
|------|-------------------|
| `javascript` | JS without TypeScript as primary |
| `typescript` | `tsconfig` / TypeScript sources |
| `react-native` | React Native / Expo |
| `angular` | Angular |
| `nextjs` | Next.js |
| `python` | Python project files |
| `django` | Django |
| `fastapi` | FastAPI |

## Git and language

Base branch is `agents.baseBranch` (first setup; suggested default `dev`). Scripts do not guess `main`, `master`, or the current checkout.

Implementer and Reviewer always work in a git worktree: `$(git rev-parse --git-common-dir)/seh-worktrees/<task>` (for `~/projects/my-app` that is `~/projects/my-app/.git/seh-worktrees/001-login`). `start-task` does not switch the caller’s checkout. `return-to-base` from a seh worktree removes it.

Allowlisted git/`gh` goes through `.seh/scripts/` only: `start-task`, `commit-task`, `push-task`, `open-pr`, `update-from-base`, `return-to-base`. Jira Cloud REST goes through `.seh/scripts/jira`; Azure DevOps REST through `.seh/scripts/ado`. No rebase, reset, or force. seh does not merge the PR.

Replies follow the conversation language. Spec, prompt, log, changelog, and PR text follow `agents.contentLanguage` from config. Status strings stay as configured; do not translate them from the conversation.

## CLI

v1 CLI is only `seh install [--prefix P]` and `seh uninstall`. Everything else is a skill. Install and uninstall loop every host in the **package** `hosts.json` (uninstall still works after `.seh/` is gone).

No extra product agents. No Linear or GitHub Issues as a tracker (files, Jira, Azure DevOps only). No merging pull requests.
