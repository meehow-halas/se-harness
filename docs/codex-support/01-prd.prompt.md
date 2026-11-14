# Prompt — codex-support stage 01: PRD

Implement stage `01` of `docs/codex-support` only. Stage 01 has no dependencies.

## Repo context

- Repo: `se-harness`. Product sources: `agents/`, `packs/`, `skills/`, `brainstorm/`, `references/`, `scripts/`, `src/`. CLI in v1: `seh install` and `seh uninstall` only.
- `docs/prd.md` wins over any plan file. Codex leaves PRD Deferred in this stage.
- Plan decisions (settled; do not reopen unless the user overrides):
  1. `skillsDir: ".agents/skills"`.
  2. Invocation by `$`, no `commandsDir`, no machine-wide writes.
  3. Agents via `agentFormat: "codex-toml"`.
  4. Update check via `.codex/hooks.json` `SessionStart`.
  5. `modelSuggest`: architect `gpt-6-sol`; implementer, reviewer, brainstorm `gpt-6.1-sol`; consultant `gpt-6-luna`. Availability per account unverified.
  6. Rule packs to `.codex/rules/*.md` plus a seh-managed section in `AGENTS.md`. Scope by `paths` is soft.
- Codex doc findings C1–C9 (summary): skills in `.agents/skills`; `$<skill>` invocation; agents in `.codex/agents/*.toml`; subagents inherit sandbox (read-only is instruction text only); hooks in `.codex/hooks.json` `SessionStart`, matcher `startup|resume`, reviewed in `/hooks`; rules in `AGENTS.md` only; `openai.yaml` for implicit-invocation control; `.agents/skills` shared with other tools.

## Stage spec

### Goal

Update the PRD and implementation plan first so Codex is in product scope.

### Scope in

- Edit `docs/prd.md` first: Codex leaves Deferred; record plan decisions 1–6 in the PRD Decisions section, in the PRD's existing style.
- Edit the "Out of this v1 plan" line in `docs/implementation-plan/README.md`.
- Leave phase files 8, 9, 13, 16 untouched.

### Scope out

- Code, tests, version, README changes.

### Decisions taken

- Plan decisions 1–6 are recorded in the PRD. Settled.

### Files likely touched

- `docs/prd.md`, `docs/implementation-plan/README.md`

### Acceptance criteria

- PRD lists Codex as a supported host in scope; Codex no longer in Deferred.
- Decisions 1–6 recorded in the PRD Decisions section.
- `docs/implementation-plan/README.md` "Out of this v1 plan" line updated; phase files 8, 9, 13, 16 unchanged.

### Tests

- None in this stage.

### Depends on

- None.

## Constraints

- Do not commit unless the user asks.
- Do not write to `~/.codex/` or machine-wide paths.
- Ask the user only for a choice the plan does not settle: one question at a time, recommended option first, labelled **(Recommended)**.

## Definition of done

- Acceptance criteria PASS with evidence (file:line).
- Report: changed files, deviations, anything unconfirmed in the Codex docs.
