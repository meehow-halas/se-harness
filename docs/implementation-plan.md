# Implementation plan

Build order for `seh` v1. **Not a second spec.** Behaviour is defined in [prd.md](prd.md). When this plan, old agent files, or chat history disagree with the PRD, the PRD wins.

An agent implementing a phase must read **this file and that phase file**. Do not implement other phases in the same pass unless the user names them. The Phase index **Status** column is the record of which slices have landed; later phases read it as a dependency check, not chat history.

## How to use these files

To commission a phase, attach or mention that phase’s `.prompt.md` file.

When that phase’s “Done when” checklist and the shared done rules are true, the implementing agent sets that row’s **Status** to `done` in the Phase index below. Do not mark it `done` if any item is still false. Do not start a phase whose **Depends on** rows are still `todo`.

| Slice | Plan | Prompt |
|-------|------|--------|
| This file | Invariants, layout, binding flow, shared rules, phase index | — |
| Phase 1 | [01-package-and-cli.md](implementation-plan/01-package-and-cli.md) | [01-package-and-cli.prompt.md](implementation-plan/01-package-and-cli.prompt.md) |
| Phase 2 | [02-git-scripts.md](implementation-plan/02-git-scripts.md) | [02-git-scripts.prompt.md](implementation-plan/02-git-scripts.prompt.md) |
| Phase 3 | [03-references.md](implementation-plan/03-references.md) | [03-references.prompt.md](implementation-plan/03-references.prompt.md) |
| Phase 4 | [04-agents.md](implementation-plan/04-agents.md) | [04-agents.prompt.md](implementation-plan/04-agents.prompt.md) |
| Phase 5 | [05-seh-setup.md](implementation-plan/05-seh-setup.md) | [05-seh-setup.prompt.md](implementation-plan/05-seh-setup.prompt.md) |
| Phase 6 | [06-work-skills.md](implementation-plan/06-work-skills.md) | [06-work-skills.prompt.md](implementation-plan/06-work-skills.prompt.md) |
| Phase 7 | [07-brainstorm.md](implementation-plan/07-brainstorm.md) | [07-brainstorm.prompt.md](implementation-plan/07-brainstorm.prompt.md) |
| Phase 8 | [08-multi-host.md](implementation-plan/08-multi-host.md) | — |
| Phase 9 | [09-per-host-models.md](implementation-plan/09-per-host-models.md) | — |
| Phase 10 | [10-parallel-worktrees.md](implementation-plan/10-parallel-worktrees.md) | [10-parallel-worktrees.prompt.md](implementation-plan/10-parallel-worktrees.prompt.md) |
| Phase 11 | [11-session-update-check.md](implementation-plan/11-session-update-check.md) | — |
| Phase 12 | [12-jira-rest-scripts.md](implementation-plan/12-jira-rest-scripts.md) | [12-jira-rest-scripts.prompt.md](implementation-plan/12-jira-rest-scripts.prompt.md) |
| Phase 13 | [13-opencode-host.md](implementation-plan/13-opencode-host.md) | — |
| Phase 14 | [14-artifacts-on-tracker-only.md](implementation-plan/14-artifacts-on-tracker-only.md) | — |

Cite PRD sections instead of copying long procedure. Phase 5 and 6 are the longest because `/seh-setup` and the work-skill pipeline are large; they still point at the PRD rather than restating it.

## Product invariants

- The product and CLI binary are **`seh`**. The npm package is **`dev-harness-layer`**.
- CLI in v1: `seh install` and `seh uninstall` only. No `seh agent`, `seh git`, `seh check`, status, or Jira subcommand. Never `npm install -g`.
- Never write skills, templates, or a CLI to `~/.claude/`, `~/.cursor/`, `~/.config/opencode/`, or any other machine-wide path. Run only in the target project.
- Setup is `/seh-setup`.
- Exactly four product agents: Architect, Implementer, Consultant, Reviewer. The brainstorm facilitator is a collector runner, not a fifth role and not in `agents/`.
- Git allowlist helpers, Jira Cloud REST (`jira`), and the session update check are POSIX `sh` files under package `scripts/` (installed as `.seh/scripts/`), not CLI subcommands. Agents call those scripts; they do not compose the matching `git`/`gh`/`curl` themselves. Implementer and Reviewer use a git worktree per task (`start-task`); Architect does not. Host session-start hooks run `.seh/scripts/check-update` (GitHub tags, notify only, fail-open).
- File-tracker status and log writes are agent work against `harness.config.json`. Jira I/O is `.seh/scripts/jira`.
- One tracker connection (files **or** Jira). When Jira is connected, `agents.tracker.artifactsOnTrackerOnly` chooses issue vs repo file storage for spec/prompt/log (default issue). No mirroring.
- Live agents are **copies** into every `agentsDir` in `references/hosts.json`, not symlinks to `.seh/agents/`. Bodies do **not** interpolate `agents.baseBranch`, status strings, tracker maps, `fetchFields`, content language, or the product line. Those are read from `harness.config.json` at run time. Role and brainstorm `model` values are maps keyed by host `id`; each live agent copy gets that host’s string only.
- `seh install` writes `.seh/VERSION`. `/seh-setup` writes `seh.generatedFrom` in `harness.config.json`. Work skills stop when config is missing or those two values differ.
- Tests: `npm test` runs `node:test` for `src/` and `scripts/`. Do not add a second runner.
- Do not commit unless the user asks.

## Package layout

Published sources live at the package root. Do not invent a wrapping `templates/` directory. Do not keep a second internal tree and remap on copy.

| Directory | Role | Copied into `.seh/`? |
|-----------|------|----------------------|
| `agents/` | Architect, Implementer, Consultant, Reviewer | yes |
| `packs/` | Framework rule packs | yes |
| `skills/` | Skill templates, including `/seh-setup` | yes |
| `brainstorm/` | Round templates (not product agents) | yes |
| `references/` | Config skeleton, artifact shapes, consumer `AGENTS.md`, `BLOCKED` format, `hosts.json` | yes |
| `scripts/` | POSIX git/`gh` helpers and session update check | yes |
| `src/` | CLI only | no |

`docs/` is this product’s own documentation and is not copied into a consuming project’s `.seh/`.

## Binding user flow

The only supported adoption path:

1. **Bootstrap** — `npx -p dev-harness-layer seh install` (npm or GitHub). Result: `.seh/` plus the install-owned `/seh-setup` skill in every `skillsDir` from `references/hosts.json`, plus a merged session-start hook in each host `hooksFile`. Setup is not done. Work skills must not exist yet and must not be offered.
2. **Finish setup** — `/seh-setup` only. CLI does not configure the project.
3. **Work** — `/seh-shipit`, `/seh-planit`, `/seh-doit`, `/seh-checkit`, `/seh-brainstorm`, or later `/seh-setup`.
4. **Remove bootstrap (optional)** — `seh uninstall` with the **same source** as install. Removes `.seh/`, the install-owned `/seh-setup` skill, and the install-owned hook command. Leaves `harness.config.json` and files `/seh-setup` generated.

## Shared stops

Not questions and not Consultant `must-fix`. One line:

```text
BLOCKED: <what stopped> — <what the user or another skill must do>
```

Examples in the PRD (Stops): install missing, setup not run, VERSION mismatch, approval missing, open blocker task, dirty task worktree on `return-to-base`, `/seh-shipit` given a list, PR failed, project tests failing on untouched code, a `.seh/scripts/` helper refused.

Do not use a `BLOCKED: rule=<id>` shape. Published product uses the PRD line above.

A git/`gh` script that refuses ends with a `BLOCKED:` line. The agent copies it into its report, stops that path, and does not work around it with raw `git` or `gh`.

## Modes, statuses, tracker (runtime)

Implementing agents do not bake these into markdown as literals. Templates say to **read** `harness.config.json`.

- Modes (from intent; default `interactive`): `interactive`, `critical`, `autonomous`. Definitions: PRD Modes.
- File-tracker status keys: `todo` → `in progress` → `implemented` → `in review` → `done`. Stored strings come from `agents.statuses`.
- Jira: `agents.tracker.statuses` mapped in `/seh-setup`. `null` means that step does not transition.

## Repo state before phase 1

Present: [prd.md](prd.md), [packs/](../packs/), stub [package.json](../package.json) (no `bin`, no `src/`).

Missing: `src/`, `agents/`, `skills/`, `brainstorm/`, `references/`, `scripts/`.

## Phase index

Status is `todo` or `done`. Update only the row just completed, and only after the shared done rules hold.

| Phase | Slice | Depends on | Status |
|-------|--------|------------|--------|
| 1 | Package + CLI install/uninstall | — | done |
| 2 | POSIX git/`gh` scripts | 1 (copy target `scripts/` exists) | done |
| 3 | References and config templates | 1 | done |
| 4 | Four product agents | 3 (runtime-config rule) | done |
| 5 | `/seh-setup` | 1–4 (`packs/` already at root) | done |
| 6 | Work skills | 5 | done |
| 7 | Brainstorm | 5–6 | done |
| 8 | Multi-host (Claude Code + Cursor) | 1–7 (`hosts.json`) | done |
| 9 | Per-host role and brainstorm models | 8 | done |
| 10 | Parallel worktrees (`start-task` + multi-task `/seh-doit` / `/seh-checkit`) | 2, 4, 6 | done |
| 11 | Session update check (GitHub tags, host hooks) | 1, 8 | done |
| 12 | Jira Cloud REST scripts (no MCP) | 2, 3, 4, 5 | done |
| 13 | OpenCode host | 8, 9, 11 | done |
| 14 | `artifactsOnTrackerOnly` | 12, 5 | done |

Phase 1 may leave payload directories thin. Later phases fill them. Install must still copy whatever exists under the six payload names and write `.seh/VERSION`.

## Shared done rules

A phase is done when its phase file checklist is true **and**:

- No new CLI subcommands, global install, or machine-wide paths.
- PRD non-goals and Deferred items were not implemented “while here”.

Then set that phase’s **Status** to `done` in the Phase index. That write is part of finishing the phase, not a later-phase cleanup.

## Out of this v1 plan (PRD Deferred)

Full Codex adapter (TOML agents, `.codex/` / `.agents/skills`); trackers beyond Jira; auto-merge; auto-install when a newer GitHub tag exists; a user-facing Consultant skill; changing `agents.contentLanguage` mid-task; file-tracker status/log helpers in `.seh/scripts/`; Jira Server/DC; Windows `sh` hosts; symlinking live agents to `.seh/agents/`.

This list is a **scope boundary**, not a backlog. Do not open tickets from it. Do not implement these items in a v1 phase. A later version may pick items up only after an explicit new scope.
