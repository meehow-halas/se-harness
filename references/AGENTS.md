# Agents

This project uses **seh**. Read `harness.config.json` at run time for the one-line product, doc paths, base git branch, file-tracker status strings, content language, tracker maps, `fetchFields`, and role models. Do not bake those values into agent files. Do not guess `main`, `master`, or the current checkout as the base branch.

The product and CLI binary are `seh`. The npm package is `se-harness`. Run the CLI only in this project. Never `npm install -g`. Never write skills, templates, or a CLI to `~/.claude/`, `~/.cursor/`, `~/.config/opencode/`, or any other machine-wide path.

Supported hosts are the rows in `.seh/references/hosts.json`. Live skills, agents, rules, and brainstorm files are copies under **every** listed `skillsDir` / `agentsDir` / `rulesDir` / `brainstormDir`. In this session use the copy this host loaded. Bodies match across copies. Role `model` is a map keyed by host `id` in `harness.config.json`; this host’s live agent file gets that host’s string only.

## Binding flow

The only supported adoption path:

1. **Bootstrap** — `npx -p se-harness seh install` (npm or GitHub). Result: `.seh/` plus the install-owned `/{{prefix}}setit-se` skill in every `skillsDir`, and `.seh/` and `harness.credentials.local.json` entries in the project-root `.gitignore`. Setup is not done. Do not offer work skills yet.
2. **Finish setup** — `/{{prefix}}setit-se` only. The CLI does not configure the project.
3. **Work** — `/{{prefix}}shipit`, `/{{prefix}}planit`, `/{{prefix}}doit`, `/{{prefix}}checkit`, `/{{prefix}}grillit`, or later `/{{prefix}}setit-se`.
4. **Remove bootstrap (optional)** — `seh uninstall` with the **same source** as install. Removes `.seh/`, the install-owned `/{{prefix}}setit-se` skill from every `skillsDir`, and the install-owned session-start hook command. Leaves `harness.config.json` and files `/{{prefix}}setit-se` generated.

CLI in v1: `seh install` and `seh uninstall` only.

If this session’s context says a newer seh GitHub tag exists than `.seh/VERSION`, tell the user on the first reply and give both install commands (`npx -p se-harness seh install` and `npx -p github:meehow-halas/se-harness seh install`) plus `/{{prefix}}setit-se`. Do not query npm or GitHub yourself. Do not install unless they ask.

Work skills stop before doing work when `harness.config.json` is missing **or** `.seh/VERSION` does not match `seh.generatedFrom`. Tell the user to run `/{{prefix}}setit-se` (and `seh install` first if `.seh/` or `.seh/VERSION` is missing).

## Roles

Exactly four product agents. Live copies live under every `agentsDir` in `.seh/references/hosts.json` (not symlinks to `.seh/agents/`). Brainstorm members are not agents and are not `@`-addressable. The brainstorm facilitator is a collector runner, not a fifth role.

| Role | Job |
|------|-----|
| Architect | Spec + prompt + first log row on the active tracker. Status stays at the configured `todo` string. Read-only on application code. No git writes. |
| Implementer | Implements the spec (`feature` or `bug`). Own phase plan. Runs inline in the session that invoked `/{{prefix}}doit` or `/{{prefix}}shipit`, not as a subagent. After each phase, that session launches Consultant. Calls `.seh/scripts/start-task` before work (git worktree; does not switch the user’s checkout). |
| Consultant | Code quality on the phase diff. Does not edit product code. Does not talk to the user. Does not judge spec compliance. Not a user-facing skill. |
| Reviewer | Spec compliance (requirements + acceptance criteria) only. After acceptance: changelog, then git allowlist scripts. Does not merge the PR. |

Models and optional role `rules` (reviewer may have `checklist`) come from `agents.roles` in `harness.config.json`. Each role’s `model` is keyed by host `id`. Brainstorm turns use `agents.brainstorm.model` for this host the same way.

## Skills

| Skill | Does |
|-------|------|
| `/{{prefix}}setit-se` | First-time setup when config is missing; later, one parameter at a time (including tracker). |
| `/{{prefix}}planit` | Architect once. Offer the next step; do not start it. |
| `/{{prefix}}doit` | Implementer, including the Consultant loop. One task or a list (parallel when the runtime allows). |
| `/{{prefix}}checkit` | One Reviewer round per named task: review or update from base. An accepted review ends with commit, PR and `done`. |
| `/{{prefix}}shipit` | Architect → Implementer (Consultant inside) → Reviewer → fix rounds. One task only. |
| `/{{prefix}}grillit` | Members, app context, and a consult round. |

## Tracker

One tracker connection: files-only when `agents.tracker` is absent, or Jira / Azure DevOps (`agents.tracker.kind`: `jira` or `ado`) when it is present. Do not mirror the same artifact text in two places.

Which mode is active is in `harness.config.json`. If `agents.tracker` is present, the tracker (`kind` `jira`: issue key; `kind` `ado`: numeric work item id) holds the key, workflow, and reads via `.seh/scripts/jira` (Jira Cloud REST) or `.seh/scripts/ado` (Azure DevOps WIT REST) by `kind` — **`.seh/scripts/ado` (Recommended)** for ADO over raw REST / `curl` / `az boards`; not MCP. When `agents.tracker.artifactsOnTrackerOnly` is `true` (default), spec, prompt, and log live on the issue. When it is `false`, those three live only in `docs/features/`, `docs/prompt/`, and `docs/feature-log/` named by issue key; `jira set` / `ado set` on spec/prompt/log is `BLOCKED`. Do not invent Jira or ADO status names. Credentials are in a local ignored file, never in git and never in chat.

If `agents.tracker` is absent, the files tracker is active. Same basename for all three files (example: `001-feature-example-name`):

| Path | Role |
|------|------|
| `docs/features/<basename>.feature.md` | Spec |
| `docs/prompt/<basename>.prompt.md` | Implementation prompt |
| `docs/feature-log/<basename>.log.md` | Append-only log |

Task key = basename. Branch name = basename, or `<basename>-N` when the old branch has a closed or merged PR. Status strings = `agents.statuses` (read from config; do not translate them from the conversation language). Artifact shapes: `.seh/references/` (`spec.feature.md`, `prompt.prompt.md`, `log.log.md`).

`CHANGELOG.md` and code stay in git on both modes. Settled brainstorm records stay under `docs/brainstorm/` (not a task tracker).

Several keys in one work-skill call: on hosts whose `sessionSpawn` is `start_session`, one session per key (`.seh/references/session-fanout.md`, planner `.seh/scripts/fanout-plan`). On `manual` hosts, one command per key is printed. One key runs in the current session.

## Git

Allowlisted git/`gh` and Jira / Azure DevOps operations run through `.seh/scripts/`. Agents call those scripts. They do not compose the matching `git`/`gh`, `curl`, or `az boards` themselves. Git scripts read `agents.baseBranch` from `harness.config.json`. Optional `agents.commitTrailer` (one line, for example `Co-Authored-By: Name <mail>`) is appended to every commit `commit-task` makes; absent means no trailer. Jira and ADO scripts read `agents.tracker` and `harness.credentials.local.json`. No rebase, reset, or force. No merge of the PR (human on GitHub). Implementer and Reviewer always use a git worktree at `$(git rev-parse --git-common-dir)/seh-worktrees/<task>`. A launch may name `Worktree: <abs>`. Architect does not use worktrees.

| Script | Who |
|--------|-----|
| `start-task` | Implementer at start; Reviewer if the branch is missing. Creates or reuses the worktree; does not switch the caller. Copies this task’s file-tracker files into the worktree, then removes uncommitted copies of those paths from the launch tree |
| `commit-task` | Reviewer, after acceptance, or after resolving an update merge (from the worktree) |
| `push-task` | Reviewer |
| `open-pr` | Reviewer, after acceptance |
| `update-from-base` | Reviewer, only when the user asks to update |
| `return-to-base` | Reviewer, after PR opened (removes the seh worktree) |
| `jira` | `/{{prefix}}setit-se` (`meta`); Architect (`create`, `set`, `comment`, `get`, `transition todo`, `link`); Implementer (`get`, `transition inProgress`, `transition codeReview` at the end, `comment` / `set log`); Reviewer (`get`, `transition inReview` / `inProgress` / `done`, `comment`) |
| `ado` | Same who-calls-what as `jira`, when `agents.tracker.kind` is `ado`: `/{{prefix}}setit-se` (`meta`); Architect (`create`, `set`, `comment`, `get`, `transition todo`, `link`); Implementer (`get`, `transition inProgress` / `codeReview`, `comment` / `set log`); Reviewer (`get`, `transition inReview` / `inProgress` / `done`, `comment`) |

**Git disabled:** when `agents.baseBranch` in `harness.config.json` is empty or `null`, agents skip every git script and step (no worktree, branch, commit, push, PR, `update`), work in the launch checkout, and run multi-key calls sequentially. `done` then means accepted, with changelog and status written to files. The scripts also answer `UNCHANGED` + `git: disabled`.

Architect and Consultant: no git writes; they do not call the git scripts. Consultant does not call `jira` or `ado`.

## Tests

Write tests that would fail if the promised behaviour broke, not tests that restate the code.

- Assert what a caller can observe: exit status, output contract, files, git refs, and command argv. Do not assert that the source matches the implementation you just wrote.
- Vary every input the contract claims to read. If the code must use a configured value, the fixture must not be the value someone would hardcode.
- Name the invariant, then break it in your head. If a plausible bug (hardcoded default, extra side effect, wrong target) would still pass, the test is incomplete.
- Exercise the real command. Stub only an external boundary. A scan of the implementation is not a behaviour test.

## Stops

Not questions and not Consultant `must-fix`. One line:

```text
BLOCKED: <what stopped> — <what the user or another skill must do>
```

If a `.seh/scripts/` helper refuses, copy that `BLOCKED:` line into the report, stop that path, and do not work around it with raw `git`, `gh`, or `curl`. Shape: `.seh/references/BLOCKED.md`.
