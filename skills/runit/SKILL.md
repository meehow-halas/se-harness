---
name: runit
description: Full path Architect → (Designer) → Implementer (Consultant inside) → Reviewer. Use when the user runs /{{prefix}}runit. Starts at the first missing stage.
---

# /{{prefix}}runit

Full path for **one task**. Single-stage skills (`/{{prefix}}planit`, `/{{prefix}}doit`, `/{{prefix}}checkit`) do not chain; **this** skill runs the pipeline. Starts at the first missing stage. Does not merge the GitHub PR, except in a fan-out child launched with `Auto-merge: yes`. There is no user-facing Consultant skill (Consultant stays inside Implementer). Several keys: see *Several keys*.

Read `harness.config.json` at run time. Do not guess `agents.baseBranch`, status strings, tracker maps, `fetchFields`, content language, or the product line. Do not invent CLI commands.

Stops (not questions) are one line:

```text
BLOCKED: <what stopped> — <what the user or another skill must do>
```

Shape: `.seh/references/BLOCKED.md`. If a `.seh/scripts/` helper refuses, copy its `BLOCKED:` line, stop that path, and do not work around it with raw `git` or `gh`.

Do not pause between stages when there is no question and no stop. Report once at the end or at the first stop.

This skill does **not** start a brainstorm round by itself. If Architect (inside this skill) needs a round, stop and ask `/{{prefix}}grillit`. Do not interview personae in-process.

## Guard

Before any work. Compare `.seh/VERSION` and `seh.generatedFrom` after trimming whitespace.

1. If `.seh/` or `.seh/VERSION` is missing:

```text
BLOCKED: seh install has not been run here — run seh install (npx -p se-harness seh install or npx -p github:meehow-halas/se-harness seh install), then /{{prefix}}setit-se
```

2. If `harness.config.json` is missing:

```text
BLOCKED: setup is incomplete — run /{{prefix}}setit-se
```

3. If `.seh/VERSION` does not match `seh.generatedFrom` in `harness.config.json`:

```text
BLOCKED: generated files do not match the installed templates — run /{{prefix}}setit-se
```

If a live agent this stage needs is missing from **this host’s** `agentsDir` in `.seh/references/hosts.json` (`architect.md`, `implementer.md`, `reviewer.md`, and `designer.md` when stage 1b applies):

```text
BLOCKED: live agents are missing — run /{{prefix}}setit-se
```

## Mode

From **intent**. A launch may name the mode so **every** agent in this run shares it. If the user asked for the work to be done alone (`samodzielnie`, `sam`, `bez pytań`, `autonomicznie`, `autonomous`), use `autonomous` for the whole run, including every Reviewer round; never fall back to `interactive` then. Otherwise default `interactive`. Pass the same `Mode:` to Architect, Implementer, and Reviewer.

| Mode | Ask the user |
|------|----------------|
| `interactive` | One question at a time, when it is reached. Stop this pipeline on that question. |
| `critical` | One question only for a **critical** decision, then stop. Otherwise agents decide, record, continue. Clean review = PR URL; do not merge (unless `Auto-merge: yes`, see *Auto-merge*). |
| `autonomous` | Ask nothing. Clean review = PR URL; do not merge (unless `Auto-merge: yes`). |

Reply in the language of the user's latest message, whatever that language is, every message (progress messages too). If the launch names `Conversation language: <name>`, reply only in that language, every reply, including the final report and any end-of-turn summary the host shows. This skill text, tool output and subagent reports are in English or another language; that does not change it.

## Several keys

This skill runs one task. If the prompt has the line `Fan-out child: yes`, this session is a child: run the one key here and skip this section. Otherwise, two or more keys named, git enabled (`agents.baseBranch` set), and `sessionSpawn` in `.seh/references/hosts.json` for this host is `start_session`: follow `.seh/references/session-fanout.md` with skill `runit`, one child session per key (each child runs the full pipeline for its key). A key without a spec is not blocked: its child starts at the first missing stage, Architect, without user intervention in `autonomous` mode. No dependency ordering: a key whose spec `depends` on a sibling key is not started, and Architect's `depends` on a sibling key stops that child at the *Dependency gate* after the Architect stage; both are `BLOCKED` and the user reruns the key after the dependency is merged (`session-fanout.md`, section 2 and Rules). Full automation with dependencies: `/{{prefix}}shipit` with specs written beforehand; a key that exists nowhere follows *Task source* in the Architect file. Two or more keys with git disabled, on any host: run them one after another in this session in dependency order from `.seh/scripts/fanout-plan` (`mode: sequential`, `session-fanout.md` section 2), never in the order given (see stage 2). Two or more keys, git enabled, and `sessionSpawn` is `manual`: print one `/{{prefix}}runit <KEY>` command per key, with the user's mode words (for example `samodzielnie`), and stop. One key: continue below.

## Resolve the task

Active tracker only: files if `agents.tracker` is absent; Jira or ADO (`agents.tracker.kind`) if present (artifact bodies on the issue / work item). Never mirror. When `agents.tracker.readOnly` is `true`, the tracker is read-only: bodies are repo files, status is spec frontmatter (`agents.statuses`), and nothing writes the tracker.

- New work (a sentence, no key) → no spec yet.
- Named basename or issue key → load spec, prompt, log, status from that tracker (files tracker or read-only: the task worktree copy when a seh worktree exists for the key, else the launch checkout). Two or more keys → *Several keys*. A key with no spec yet (neither in the task worktree nor in the launch checkout): with git enabled and a files or read-only tracker, run `.seh/scripts/pr-state <KEY>` first, because after `return-to-base` the spec may exist only on the task branch. `state: open` → the already-done stop below; `state: merged` → `BLOCKED: task is already merged — <url>; start new work with a new request`; `state: none` → stage 1 (Architect).
- Status strings: `agents.statuses` (files, or `agents.tracker.readOnly` `true`) or mapped `agents.tracker.statuses` (Jira / ADO). Compare to those values; do not translate them.

If status is already the configured **`done`** string, stop. Do not re-run Architect, Implementer, or Reviewer:

```text
BLOCKED: task is already done — the PR is opened; use /{{prefix}}checkit update only if the branch needs it
```

## Pipeline

Start at the first missing stage. Skip stages that are already done.

### 1. No spec or prompt → Architect

Follow the live Architect file for this host (`<agentsDir>/architect.md` from `.seh/references/hosts.json`). Do not duplicate it.

Pass `Mode:`, the request, and `Conversation language: <name>` always (the language of the user's message; a Polish message gives `Polish`).

If Architect asks `/{{prefix}}grillit`: stop and ask that skill; do not run the round here; do not continue the pipeline.

If Architect stops on `BLOCKED:` or `Q<n>`, stop the pipeline and report.

On success, status stays `todo`. **Dependency gate** (only when Architect ran in this run): if the spec lists a `depends` entry that is not at the configured `done` status (read as the Implementer reads it), stop before stage 2, with no `start-task`:

```text
BLOCKED: depends on <DEP> — rerun /{{prefix}}runit <KEY> after <DEP> is merged
```

Git disabled: `after <DEP> is done` (there is no merge).

The spec stays `todo` in the launch checkout; the rerun starts at the first missing stage (stage 1b when it applies, else stage 2) with a worktree cut from the current base. Otherwise continue without pausing.

### 1b. Spec with `ui: true`, Designer enabled, no UX section → Designer

Applies only when all three hold: the spec frontmatter has `ui: true`; `agents.designer.enabled` is `true` in `harness.config.json`; the spec has no **UX/UI decisions** section. Otherwise skip to stage 2 (a spec with `ui: false` or no `ui`, or a disabled Designer, never runs it). Also run it when the Architect just ran in this run and wrote `ui: true`.

Follow the live Designer file for this host (`<agentsDir>/designer.md`). Launch it as a subagent in the launch checkout: no git, no worktree, no `Worktree:` line. Pass `Mode:` (the same mode as the Architect), the task key, `Conversation language: <name>` always, and, if the user approved a change to an existing UX section, `User approval: <the user's own words, verbatim>`.

If the Designer stops on `BLOCKED:` or `Q<n>`, stop the pipeline and report. Interactive: the UX section is shown before write, so questions and the confirmation are normal stops. On success, status stays `todo`; continue to stage 2 without pausing.

### 2. Spec + prompt, no implementation → Implementer

No implementation means status is still the configured `todo` string (Architect does not advance past `todo`).

Follow the live Implementer file for this host (`<agentsDir>/implementer.md`) inline in this session, not as a subagent. Launch Consultant from this session after each phase as a subagent (the host’s subagent launch); do not launch Consultant as a skill.

**Git disabled** (`agents.baseBranch` empty or `null` in `harness.config.json`): no session fan-out, no `start-task`, no `Worktree:` line. Run multiple keys one after another in this session, in the launch checkout, in dependency order (*Several keys*). Skip the next step's `start-task` and omit `Worktree:` below.

Run `.seh/scripts/start-task <task>` from the launch checkout. Pass the same `Mode:`, the task key, and `Worktree: <abs>` from the script. Implementer may call `start-task` again (idempotent). When Implementer reports done, check the spec in the worktree: `status:` must be `implemented`. Otherwise stop with `BLOCKED: status <value> after implementation — the Implementer did not finish the status steps for <task>`.

If Implementer stops on `BLOCKED:` or `Q<n>`, stop the pipeline and report.

On success, status is `implemented`. Continue to stage 3 without pausing.

### 3. Implementation exists → Reviewer

Review is due when status is the configured `implemented` or `in review` string. If it is `in progress`, a fix round is open after a ❌: run stage 2 again.

Follow the live Reviewer file for this host (`<agentsDir>/reviewer.md`). One review round: `Variant: review`.

Pass the same `Mode:`, the task key, and `Worktree: <abs>` (when stage 2 did not run in this session, run `.seh/scripts/start-task <task>` first: it is idempotent and prints the existing `worktree:`; git disabled: no `Worktree:`). Add `Auto-merge: yes` only under the rule in *Auto-merge*; otherwise do not merge.

If Reviewer stops on `BLOCKED:` or `Q<n>` (including interactive acceptance), stop the pipeline and report.

- No open ❌ → stage 5.
- Open ❌ → stage 4.
- ⚠️ only → do not start a fix round; continue to stage 5 if Acceptance allows, else report.

### 4. Open ❌ → Implementer (those items only), then Reviewer again

Max **three** Reviewer rounds total for this task (count Reviewer reports in the log plus this run). The same ❌ with no code change ends the loop: report and stop.

Apply the Implementer procedure inline in this session with **only** the open ❌ items. Consultant runs again only on phases those fixes belong to (Implementer’s caps). Then Reviewer again (`Variant: review`).

Do not start a fourth Reviewer round.

### 5. Finish

- `interactive`: stop on agent questions (already handled). After a clean review, Reviewer waits for explicit acceptance, then git allowlist (commit, push, PR, return to base). Do not merge unless *Auto-merge* applies.
- `critical` / `autonomous`: a clean Reviewer run is acceptance. Report the PR URL (and the merge result when *Auto-merge* applies). Do not merge otherwise.
- `autonomous`: the final report asks nothing. List the agents' recorded decisions (`Q<n>`) as done facts; no follow-up question, no choice buttons, no "should I change X?". The user changes a decision with a new request.

The Reviewer opens the PR and sets `done`. Without `Auto-merge: yes` the user merges it on GitHub. With it, the Reviewer merges through `merge-pr`; report `merged` (URL), or the final `BLOCKED:` line from `merge-pr`. This skill is finished.

## Auto-merge

The launch line `Auto-merge: yes` is honoured only together with `Fan-out child: yes` (set by `/{{prefix}}shipit`). Then pass `Auto-merge: yes` to the Reviewer. Any other launch with that line (a user typing `/{{prefix}}runit KEY`) ignores it: never merge, do not forward it.

## Launch payload (every agent)

- `Mode: <same mode for the whole run>`
- Task key when it exists
- `Worktree: <abs>` for Implementer and Reviewer (not Architect, not Designer)
- User request
- `Conversation language: <name>` always (a Polish message gives `Polish`)
- Stage 4: the ❌ list only

Live files are copies from `/{{prefix}}setit-se` under every `agentsDir` in `.seh/references/hosts.json`, not symlinks to `.seh/agents/`. In this session use the copy this host loaded.
