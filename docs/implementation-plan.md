# Implementation plan

Build order for `dhs` v1. **Not a second spec.** Behaviour is defined in [prd.md](prd.md). When this plan, `samples/`, old agent files, or chat history disagree with the PRD, the PRD wins.

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
| Phase 5 | [05-dhs-setup.md](implementation-plan/05-dhs-setup.md) | [05-dhs-setup.prompt.md](implementation-plan/05-dhs-setup.prompt.md) |
| Phase 6 | [06-work-skills.md](implementation-plan/06-work-skills.md) | [06-work-skills.prompt.md](implementation-plan/06-work-skills.prompt.md) |
| Phase 7 | [07-brainstorm-and-teardown.md](implementation-plan/07-brainstorm-and-teardown.md) | [07-brainstorm-and-teardown.prompt.md](implementation-plan/07-brainstorm-and-teardown.prompt.md) |

Cite PRD sections instead of copying long procedure. Phase 5 and 6 are the longest because `/dhs-setup` and the work-skill pipeline are large; they still point at the PRD rather than restating it.

## Product invariants

- The product name, npm package, and CLI binary are all **`dhs`**. There is no `dev-harness` name in published files, comments, or frontmatter.
- CLI in v1: `dhs install` and `dhs uninstall` only. No `dhs agent`, `dhs git`, status, or Jira subcommand. Never `npm install -g`.
- Never write skills, templates, or a CLI to `~/.claude/` or any other machine-wide path. Run only in the target project.
- There is no `/dhs-init` or `/dhs-config`. Setup is `/dhs-setup`.
- Exactly four product agents: Architect, Implementer, Consultant, Reviewer. The brainstorm facilitator is a collector runner, not a fifth role and not in `agents/`.
- Git allowlist helpers are POSIX `sh` files under package `scripts/` (installed as `.dhs/scripts/`), not CLI subcommands. Agents call those scripts; they do not compose the matching `git`/`gh` themselves.
- Status, log, and Jira writes are agent work against `harness.config.json`. They are not scripts in v1.
- One tracker: files **or** Jira, never both. No mirroring.
- Live agents are **copies** (typically into `.claude/agents/`), not symlinks to `.dhs/agents/`. Bodies do **not** interpolate `agents.baseBranch`, status strings, tracker maps, `fetchFields`, content language, or the product line. Those are read from `harness.config.json` at run time.
- `dhs install` writes `.dhs/VERSION`. `/dhs-setup` writes `dhs.generatedFrom` in `harness.config.json`. Work skills stop when config is missing or those two values differ.
- Do not invent a test suite. `npm test` stays a stub unless a later task asks for tests.
- Do not commit unless the user asks.
- **Do not create, edit, move, or delete anything under `samples/`** except in phase 7, which **deletes** `samples/` (and any leftover `docs/samples/`) after published sources exist. Until then: read samples, rewrite elsewhere.

## Package layout

Published sources live at the package root. Do not invent a wrapping `templates/` directory. Do not keep a second internal tree and remap on copy.

| Directory | Role | Copied into `.dhs/`? |
|-----------|------|----------------------|
| `agents/` | Architect, Implementer, Consultant, Reviewer | yes |
| `packs/` | Framework rule packs | yes |
| `skills/` | Skill templates, including `/dhs-setup` | yes |
| `brainstorm/` | Round templates (not product agents) | yes |
| `references/` | Config skeleton, artifact shapes, consumer `AGENTS.md`, `BLOCKED` format | yes |
| `scripts/` | POSIX git/`gh` helpers | yes |
| `src/` | CLI only | no |

`docs/` is this product’s own documentation and is not copied into a consuming project’s `.dhs/`.

## Binding user flow

The only supported adoption path:

1. **Bootstrap** — `npx dhs install` (npm or GitHub). Result: `.dhs/` plus the install-owned `/dhs-setup` skill. Setup is not done. Work skills must not exist yet and must not be offered.
2. **Finish setup** — `/dhs-setup` only. CLI does not configure the project.
3. **Work** — `/dhs-feature`, `/dhs-planit`, `/dhs-doit`, `/dhs-checkit`, `/dhs-brainstorm`, or later `/dhs-setup`.
4. **Remove bootstrap (optional)** — `dhs uninstall` with the **same source** as install. Removes `.dhs/` and the install-owned `/dhs-setup` skill. Leaves `harness.config.json` and files `/dhs-setup` generated.

## Shared stops

Not questions and not Consultant `must-fix`. One line:

```text
BLOCKED: <what stopped> — <what the user or another skill must do>
```

Examples in the PRD (Stops): install missing, setup not run, VERSION mismatch, approval missing, open blocker task, merge not confirmed, dirty checkout, PR failed, project tests failing on untouched code, a `.dhs/scripts/` helper refused.

Sample agents used a `BLOCKED: rule=<id> …` shape. That is leftover. Published product uses the PRD line above.

A git/`gh` script that refuses ends with a `BLOCKED:` line. The agent copies it into its report, stops that path, and does not work around it with raw `git` or `gh`.

## Modes, statuses, tracker (runtime)

Implementing agents do not bake these into markdown as literals. Templates say to **read** `harness.config.json`.

- Modes (from intent; default `interactive`): `interactive`, `critical`, `autonomous`. Definitions: PRD Modes.
- File-tracker status keys: `todo` → `in progress` → `code review` → `in review` → `done`. Stored strings come from `agents.statuses`.
- Jira: `agents.tracker.statuses` mapped in `/dhs-setup`. `null` means that step does not transition.

## Repo state before phase 1

Present: [prd.md](prd.md), [packs/](../packs/) (usable but still tagged `dev-harness` in comments), [samples/](../samples/) (read-only reference), stub [package.json](../package.json) (no `bin`, no `src/`).

Missing: `src/`, `agents/`, `skills/`, `brainstorm/`, `references/`, `scripts/`.

## Phase index

Status is `todo` or `done`. Update only the row just completed, and only after the shared done rules hold.

| Phase | Slice | Depends on | Status |
|-------|--------|------------|--------|
| 1 | Package + CLI install/uninstall | — | done |
| 2 | POSIX git/`gh` scripts | 1 (copy target `scripts/` exists) | done |
| 3 | References and config templates | 1 | done |
| 4 | Four product agents | 3 (runtime-config rule) | done |
| 5 | `/dhs-setup` | 1–4 (`packs/` already at root) | done |
| 6 | Work skills | 5 | done |
| 7 | Brainstorm, pack leftover cleanup, delete `samples/` | 5–6 | done |

Phase 1 may leave payload directories thin. Later phases fill them. Install must still copy whatever exists under the six payload names and write `.dhs/VERSION`.

## Shared done rules

A phase is done when its phase file checklist is true **and**:

- No `dev-harness` name in files that phase added or was allowed to edit.
- No new CLI subcommands, global install, or machine-wide paths.
- `samples/` untouched unless this is phase 7 deleting it.
- PRD non-goals and Deferred items were not implemented “while here”.

Then set that phase’s **Status** to `done` in the Phase index. That write is part of finishing the phase, not a later-phase cleanup.

## Out of this v1 plan (PRD Deferred)

Cursor-specific generators if they diverge from Claude Code; trackers beyond Jira; auto-merge; a user-facing Consultant skill; changing `agents.contentLanguage` mid-task; status/log/Jira helpers in `.dhs/scripts/`; Windows `sh` hosts; symlinking live agents to `.dhs/agents/`.

This list is a **scope boundary**, not a backlog. Do not open tickets from it. Do not implement these items in a v1 phase. A later version may pick items up only after an explicit new scope.
