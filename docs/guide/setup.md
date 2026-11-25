# Install and setup

[← README](../../README.md) · Contracts in full: [`docs/prd.md`](../prd.md)

## Install

From the project directory, pick one source and reuse it later for uninstall:

```bash
npx se-harness install
```

```bash
npx github:meehow-halas/se-harness install
```

```bash
npx github:meehow-halas/se-harness#<ref> install
```

```bash
npx https://github.com/meehow-halas/se-harness install
```

npm and GitHub are equivalent. `#<ref>` is an optional tag, branch, or commit.

**Result:** `.seh/` and the project skill `/_setit-se` in every host `skillsDir` (today `.claude/skills/_setit-se`, `.cursor/skills/_setit-se`, `.opencode/skills/_setit-se`, and `.agents/skills/_setit-se` for Codex), plus the OpenCode command `.opencode/commands/_setit-se.md`. Setup is **not** done. Work skills (`/_planit`, `/_designit`, `/_doit`, `/_checkit`, `/_runit`, `/_shipit`, `/_scopeit`, `/_grillit`) do not exist yet.

## Skill names and `--prefix`

Skills are installed with a name prefix. `seh install --prefix P` sets it; the default is `_`, so the skills are `/_setit-se`, `/_planit`, `/_designit`, `/_doit`, `/_checkit`, `/_runit`, `/_shipit`, `/_scopeit` and `/_grillit`. `--prefix my-` gives `/my-doit`, `--prefix ""` gives `/doit`. Allowed characters: letters, digits, `_`, `-`. These docs show the default `_` names.

```text
npx se-harness install --prefix my-
```

Install stores the prefix in `.seh/PREFIX`, so `seh uninstall` needs no flag, and a later `seh install` without `--prefix` keeps it. Installing again with another prefix removes the old `/_setit-se` skill; the next `/_setit-se` run regenerates the work skills under the new prefix and removes the old ones.

## /_setit-se

The only way to configure this project. The CLI does not write config. Questions are **one at a time**. The skill does not commit.

If `harness.config.json` is missing, that is a **first run**. If the file is already there, that is a **later run** — the same skill, not a second skill.

```text
"change the architect model" · "change the architect model on Cursor" · "connect Jira" · "connect Azure DevOps" · "change the base branch"
```

### First run

1. Reads the repo and states inferred choices so you can object.
2. **Project PRD.** Detects only. Uses an existing one and does not rewrite it. If none exists, it asks nothing here: the last step (7) creates it through `/_scopeit`. Config stores a one-line product plus `agents.docs`, not the PRD body.
3. **Questions** (before it writes config): for each host, then for each of the five roles, one model (suggest that host’s `modelSuggest`; see [Models per host](hosts.md#models-per-host)); `agents.contentLanguage`; `agents.baseBranch` (suggest `dev` — it does not silently take `main`, `master`, or the current checkout); with a base branch, [which git operations](#git-operations) SE Harness runs; whether it [writes `CHANGELOG.md`](#change-record); one optional **project rule** (a standing instruction beyond generated packs; skip is the default); which packs to generate (`packsIgnored` if you name packs to skip).
4. Writes `harness.config.json` (`seh.generatedFrom` = `.seh/VERSION`) and generates live agents, work skills, and rule packs from `.seh/` into **every** host tree. Each live agent’s `model:` is `agents.roles.<role>.model[<host.id>]` only.
5. Merges project-root `AGENTS.md` and/or `CLAUDE.md` with the SE Harness template, shows the full proposed markdown, and waits for acceptance. The result is always `AGENTS.md`. It writes `CLAUDE.md` only when `.claude/` was present and/or `CLAUDE.md` already existed (prefer a symlink to `AGENTS.md`; if the link fails, an independent file with the same body).
6. Offers an external tracker (Jira or Azure DevOps) **once**. If you connect one, it asks [which writes](trackers.md#write-actions) SE Harness does there. A decline is stored; add, change, or remove later is this same skill.
7. **Project PRD (create)**, only when there was no PRD. Runs the `/_scopeit` create procedure (read from `.seh/skills/scopeit/SKILL.md`): purpose, users, scope and non-goals, one question at a time, each with a proposal from the repo you accept or correct (non-goals are never proposed). `skip` writes what exists; the rest is `TBD — not stated by the user`. `docs/prd.md` is always written. Then it adds `docs/prd.md` to `agents.docs` and sets the one-line `product`.

### Later run

Config already exists. Say what to change in ordinary language.

If a role `model` is still a string, or the map is missing a host `id`, it finishes that map first (prefill a legacy string on every host, then confirm per host). If `.seh/VERSION` does not match `seh.generatedFrom`, it first regenerates live agents, work skills, and rule packs into every host tree, sets `seh.generatedFrom` to `.seh/VERSION`, and tells you the installed package templates changed — then continues. That is the same mechanism as [After a package update](#after-a-package-update).

A later run also asks, once each, a question your config has no answer for: `agents.reportChange`, and `agents.git` when a base branch is set. A tracker config from before 2.0 is [migrated](trackers.md#upgrading-from-1x) once.

Then **one change at a time**: show current and new value, wait for confirmation, then write. It does not overwrite keys you did not confirm. A role `model` change is one cell `(role, host)` and rewrites `model:` in **that** host’s `agentsDir` only.

It does **not** touch `agents.brainstorm` (that is `/_grillit`), create or rewrite the project PRD (that is `/_scopeit`), remake or re-merge `AGENTS.md`, or commit. If `.claude/` is present and `CLAUDE.md` is still missing, it creates the symlink the same way as on first run.

### What you can set or change

| Setting | First run | Later run | Side effect |
|---------|-----------|-----------|-------------|
| Role models | ask per host | yes — one cell `(role, host)` | rewrite `model:` in that host’s `agentsDir` |
| `agents.designer.enabled` | ask once (recommend yes when a UI stack is detected) | yes | config only; off = no Designer stage and `/_designit` stops `BLOCKED` |
| `agents.contentLanguage` | ask | yes | config only |
| `agents.baseBranch` | ask (empty = git disabled) | yes | config only |
| [Git operations](#git-operations) (`agents.git`) | ask when a base branch is set | yes; asked once when missing | config only |
| [Change record](#change-record) (`agents.reportChange`) | ask | yes; asked once when missing | config only |
| Optional project rule | one; skip is default | if you ask — stored on the roles (`rules`; reviewer `checklist` when it is a review constraint) | stored on roles |
| Packs / `packsIgnored` | detect; honour ignore | yes | regenerate rule packs |
| Status strings | skeleton unless you confirm other strings | yes | config only |
| Product line / `agents.docs` | from the PRD step | yes | config only |
| Jira / Azure DevOps tracker | offer once: add or decline | add / change mapping or [write actions](trackers.md#write-actions) / remove | config + local credentials file; no agent-body regen |
| Project PRD | create only if missing | no rewrite | — |
| `AGENTS.md` | merge + accept | no remake | later: only create missing `CLAUDE.md` if `.claude/` exists |
| Brainstorm members / model / consult | no | no | `/_grillit` |

**Jira / Azure DevOps.** First run offers a tracker once. Later: add, change the mapping or the write actions, or remove. Details: [Jira tracker](trackers.md#jira-tracker), [Azure DevOps tracker](trackers.md#azure-devops-tracker).

## After a package update

Run install again from the same source, then ask for setup (`/_setit-se`), so generated files match the installed templates (`.seh/VERSION` vs `seh.generatedFrom`). That regeneration copies the work skills and deletes leftover live `seh-feature` and the old `seh-*` skills. It does not rewrite project `AGENTS.md`.

```text
npx se-harness@latest install
```

Then ask the assistant, in the project, to set it up (`/_setit-se`). This one skill has to be named explicitly, because the other skills do not exist until setup has run.

- **Pin the version you want.** `npx` may reuse a cached copy of an unpinned package. Use `se-harness@latest` or `se-harness@<version>` for npm, and `github:meehow-halas/se-harness#<tag>` for GitHub. Check the printed `seh install: OK <version>` line.
- **No need to repeat `--prefix`.** A reinstall without the flag keeps the prefix from `.seh/PREFIX`. Pass `--prefix` only to change it.
- `.seh/` (including `.seh/scripts/`) is replaced right away. Live agents, work skills, and rules change only when `/_setit-se` regenerates them.

### Force a reinstall when the version did not change

`seh install` always overwrites `.seh/` and the `/_setit-se` skill. It does not compare versions. `/_setit-se` regenerates live files only when `.seh/VERSION` differs from `seh.generatedFrom` (or the prefix changed). To regenerate everything anyway, for example after a hand edit to a live agent or when installing from a branch whose version was not bumped:

1. Run `seh install` as above.
2. In `harness.config.json`, set `seh.generatedFrom` to `""`.
3. Ask for setup again (`/_setit-se`). It sees the mismatch and regenerates live agents, work skills, and rule packs in every host tree. Your config values, including role models, are kept.

## Uninstall

Same source as install:

```text
npx se-harness uninstall
npx github:meehow-halas/se-harness uninstall
```

Removes `.seh/` and the install-owned `/_setit-se` skill from every `skillsDir`. Leaves `harness.config.json` and files `/_setit-se` already generated (live agents, work skills, rules).

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
| `csharp` | `.csproj` / `.sln` / `.slnx`, `global.json`, `Directory.Build.props`, or `.cs` sources |
| `aspnetcore` | ASP.NET Core (Web / Razor / Blazor SDK, `Microsoft.AspNetCore.*` reference) |
| `efcore` | `Microsoft.EntityFrameworkCore*` package reference |
| `ux-a11y` | UI stack (React Native, Angular, Next.js; React, Vue or Svelte; Django templates; Razor or Blazor). Accessibility, UI states, touch and i18n; scoped to UI files. A rule listed under **Deviations from ux-a11y** in a `ready` `docs/designs/ux-conventions.md` is not a Consultant finding |

## Git and language

Base branch is `agents.baseBranch` (first setup; suggested default `dev`). Scripts do not guess `main`, `master`, or the current checkout.

With git enabled, Implementer and Reviewer always work in a git worktree: `$(git rev-parse --git-common-dir)/seh-worktrees/<task>` (for `~/projects/my-app` that is `~/projects/my-app/.git/seh-worktrees/001-login`). `start-task` does not switch the caller’s checkout. `return-to-base` from an SE Harness worktree removes it. Lifecycle, when a worktree stays, and manual cleanup: [Git worktrees](worktrees.md).

Allowlisted git/`gh` goes through `.seh/scripts/` only: `start-task`, `commit-task`, `push-task`, `open-pr`, `update-from-base`, `return-to-base`, plus `pr-state` (read-only) and `merge-pr` (used only by `/_shipit` sessions). Jira Cloud REST goes through `.seh/scripts/jira`; Azure DevOps REST through `.seh/scripts/ado`. No rebase, reset, or force. SE Harness merges a PR only in `/_shipit`.

**Git disabled.** Set `agents.baseBranch` to an empty value (in `/_setit-se`) for a project without git. Agents then skip branch, worktree, commit, push, PR, and merge steps and work in your checkout. Statuses run the same way, and the Reviewer sets `done` after acceptance. Several keys run one after another in the current session, in dependency order. `/_shipit` needs git and stops. To switch off only some git steps, use [git operations](#git-operations).

## What SE Harness may do

Three setup questions decide what SE Harness does on your behalf: [the change record](#change-record), [git operations](#git-operations), and, with Jira or Azure DevOps, [tracker write actions](trackers.md#write-actions). Off means **not automatically**: you can still [ask for it](#on-your-request).

### Change record

`agents.reportChange`: whether SE Harness writes a line to the project-root `CHANGELOG.md` after acceptance. Yes / no. Setup proposes yes when that file exists, otherwise no, and waits for your answer. A config without the key behaves as yes until a later `/_setit-se` asks.

### Git operations

`agents.git`: asked in one question, only when git is connected and `agents.baseBranch` is set. Nothing is preselected. Reply for example `all`, `none`, or `worktree, commit`.

Each operation needs every one above it in the table. If your reply breaks that chain, setup shows the corrected set and asks you to confirm. A config with a base branch and no `agents.git` has all four on until a later `/_setit-se` asks.

| Operation | On: SE Harness | Off |
|-----------|----------------|-----|
| `worktree` | creates the task branch and [worktree](worktrees.md) | Work happens in your checkout. Several keys run one after another in the current session, with no session per task. |
| `commit` | commits accepted changes | Changes stay uncommitted. A worktree with such changes is kept, and the Reviewer prints its path and branch. The change record is still written when it is on. |
| `push` | pushes the task branch | The commit stays local. |
| `pr` | opens the pull request, and merges it in `/_shipit` | The branch is pushed; there is no PR. |

The Reviewer runs the operations that are on and tells you what is left to you. SE Harness does not do a skipped step some other way. `done` means accepted and every operation that is on has finished. `/_shipit` needs all four, otherwise: `BLOCKED: /_shipit needs worktree, commit, push and pr enabled — change them in /_setit-se`.

### On your request

When you explicitly ask for something that is off, SE Harness does it, for that one call. Say it in the session, or in the request that starts a run:

```text
implement MT-01, and create a worktree for it
write a spec for password reset and also copy the spec to PROJ-12
```

- Your words are passed on verbatim (`--user-request "<your words>"` on the script). SE Harness never adds this for its own steps, in any mode. Your config does not change.
- **Git:** works for creating the worktree, commit, push and opening the PR. It runs the operation you asked for even when an earlier one is off. With `worktree` off, a commit you ask for while on the base branch creates the task branch in your checkout, switches to it and commits there. It does not work with git disabled, does not let anything merge outside `/_shipit`, and does not satisfy the `/_shipit` requirement.
- **Tracker:** the write is a one-off copy. Repo files stay the source for that action, nothing is synced, and the local status does not change. If the target field already has content, you are asked before it is overwritten. If the needed mapping is missing, SE Harness lists the values, asks, saves the mapping with your consent and runs the write; the action stays off. A requested read takes every part from the tracker.
- An item created on your request is [bound](trackers.md#binding) to the task.

## Language

Replies follow the conversation language. Spec, prompt, log, changelog, and PR text follow `agents.contentLanguage` from config. Status strings stay as configured; do not translate them from the conversation.
