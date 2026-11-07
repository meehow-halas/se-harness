# Product: dev-harness

A harness layer for software engineering work in an AI coding assistant (Claude Code first; Cursor later if the same skill/agent shape applies). It ships **skills**, **agents**, **rule packs**, and a **small CLI** so a project can specify, implement (with a quality loop), and review work without each agent inventing its own process.

`docs/samples/` is an **authoring kit for this repo**: patterns to copy and rewrite into the published templates. It is not the product. It must not stay as a second spec. Anything in samples that this PRD does not name is out of scope and gets dropped when templates are written.

This PRD wins whenever samples, old agent files, or chat history disagree.

## How it runs

Install from the npm registry or a GitHub repo. Package name: `dev-harness`. Binary: `dhs`.

```text
npm install -g dev-harness
dhs install          # machine: global skills /dhs-init and /dhs-config
dhs uninstall        # reverse of install; idempotent
```

These two commands are the entire `dhs` CLI in v1. They are idempotent. They do not configure a project.

Project setup is the **`/dhs-init` skill**: it writes `harness.config.json` and generates agents, skills, and rule packs from templates inside the npm package.

**Already initialized:** if `/dhs-init` finds harness in this project (`harness.config.json` exists), it does **not** run setup again. It launches `/dhs-config` in the same conversation and follows that skill. First-time setup and later changes stay one user-facing command (`/dhs-init`) plus an explicit `/dhs-config` when the user wants config only.

Agents run the **project’s own** test/lint/typecheck scripts (from `package.json` or the equivalent).

## Goals

- One path: request → spec → implementation with quality feedback → review against the spec.
- Files as the default tracker; Jira optional.
- Architect does not write a file-by-file recipe. Implementer plans phases. Consultant guards quality. Reviewer guards the spec.
- Coding standards as generated **rules**, not always-on essay markdown.

## Non-goals (v1)

- Any `dhs` CLI beyond `install` and `uninstall`.
- Extra product agents. The set is Architect, Implementer, Consultant, Reviewer. The brainstorm facilitator is a collector runner, not a fifth role.
- Worktrees as a harness feature.
- Merging pull requests.
- Trackers other than files and Jira.
- Architect writing line-level implementation instructions.

---

## Feature tracking

**Exactly one tracker.** Files **or** Jira, never both. Agents write spec, prompt, log and status to the active tracker only. They do not mirror.

`/dhs-init` asks once whether to connect Jira. Decline is remembered (`jiraOffer: declined`) so init does not ask again. **`/dhs-config` owns the tracker for the rest of the project’s life:** connect, change, or remove, including after a decline.

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

Via Jira MCP. Task key = issue key (`PROJ-123`). Branch name = that key. Spec, prompt, log and status live **only** on the ticket. Agents do not create or edit `docs/features/`, `docs/prompt/` or `docs/feature-log/` while this tracker is active.

The five harness steps are the same as on files. **Which Jira status each step uses is not guessed.** `/dhs-config` writes `agents.tracker.statuses` from that project’s workflow (names taken from Jira, shown as a numbered list). Agents transition only to those exact strings.

| Harness key | When the agent moves the issue | Config |
|-------------|-------------------------------|--------|
| `todo` | Architect has created spec + prompt | Jira status or `null` |
| `inProgress` | Implementer starts | Jira status or `null` |
| `codeReview` | Reviewer starts the first round | Jira status or `null` |
| `inReview` | User accepted a clean review (commit/PR) | Jira status or `null` |
| `done` | PR merged and close confirmed | Jira status or `null` |
| `blocker` (optional extra) | Status a **depends** issue must already have before this one may start | Jira status; required if `depends` is used |

`null` = this step does not call a Jira transition. There is no file fallback and no invented name. If the mapped status does not exist on that issue type’s workflow, stop and tell the user to fix the mapping in `/dhs-config`.

While Jira is the tracker, `agents.statuses` is not written. After Remove, file-tracker strings from `agents.statuses` apply again.

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

Unmapped Jira fields are ignored. Credentials stay out of git and out of chat (local ignored file). Project key and field mapping live in `harness.config.json`.

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

Agents update status **only** on the active tracker. Files: write `agents.statuses` into the feature file. Jira: transition to `agents.tracker.statuses.<key>`. There is no harness CLI for status.

---

## Modes

From **intent**, not a required slash flag. A launch may name the mode so every agent in `/dhs-feature` shares it. Default: `interactive`.

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
- Does not create or switch branches.
- Interactive: confirm title, then spec+prompt, before write. Critical/autonomous: write once Questions is satisfied.

### Implementer

- Implements whatever the Architect specified, including tasks with `type: bug`. There is no separate bug agent.
- Before work: create and check out a branch named as the basename, from the configured base branch. No commit, no push.
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

After acceptance, in order: final review in the log → status `in review` → `CHANGELOG.md` entry → commit → push task branch → open GitHub PR to the base branch → check out the base branch. Do not merge. PR body notes unfinished blockers.

**Update from base:** only when the user asks (e.g. `/dhs-checkit … update`). Merge the base branch into the task branch, resolve if possible, stop on conflicts.

**Close:** only when the user says the PR is merged. Verify the merge, set `done`, check out the base branch if this checkout is still on the task branch.

---

## Git

No harness git wrapper. Agents use git/`gh` **only** on the allowlist. No rebase, reset, or force. No merge of the PR.

| Operation | Who |
|-----------|-----|
| `git checkout -b <basename>` from base, `git checkout <basename>` | Implementer at start; Reviewer if the branch is missing |
| `git add` / `commit` / `push` of the task branch, `gh pr create` | Reviewer, after Acceptance |
| Merge the PR | Human (GitHub) |
| Merge base into task branch | Reviewer, only on **update** |
| `git checkout` base | Reviewer, after PR opened or after **close** |

Architect and Consultant: no git writes.

---

## Skills

`/dhs-init` and `/dhs-config` are **global** (`dhs install`). The other skills are generated **into the project** by the first `/dhs-init`.

Single-stage skills do not chain. Only `/dhs-feature` runs the full path.

| Skill | Does |
|-------|------|
| `/dhs-init` | Global. **First run** (no `harness.config.json`): project setup. Infers what it can from the repo; one question at a time otherwise. Writes config, generates agents/skills/rules from package templates. Offers Jira once. Does not commit. **Later run** (config already there): do not re-init; launch `/dhs-config`. |
| `/dhs-config` | Global. Change config (models, statuses, ignored packs, …). **Tracker:** add, change, or remove Jira at any time. Regenerates generated files as needed. Continuation of `/dhs-init` when the project is already initialized. |
| `/dhs-planit` | Architect once. Offer next step; do not start it. |
| `/dhs-doit` | Implementer, including the Consultant loop. Feature or bug: same agent. |
| `/dhs-checkit` | One Reviewer round. Variants: review, update, close. |
| `/dhs-feature` | Architect → Implementer (Consultant inside) → Reviewer → fix rounds. Starts at the first missing stage. Stops if already `in review` or `done`. |
| `/dhs-brainstorm` | Project-local. Members CRUD, app context, run a consult: personae → facilitator (collect only) → Architect (PART A). |

There is no user-facing Consultant skill.

### `/dhs-init` (detail)

**Entry.** If `harness.config.json` is present, stop the init flow and run `/dhs-config` (same conversation, no second slash command required from the user). Do not overwrite keys. Do not regenerate as a silent re-init.

**First run** (file missing):

- Read the repo first; state inferred choices so the user can object.
- Detect frameworks; generate rule packs from the harness templates (JS/TS, React Native, Angular, Next.js, Python, Django, FastAPI). Monorepo: pack only on trees that use it. Ignore list: `packsIgnored`.
- Roles: architect, implementer, consultant, reviewer. Models: suggest opus / sonnet / haiku / sonnet. No other roles.
- `agents.contentLanguage`: language of files and tracker text; ask once, suggest the conversation language.
- Do not put this PRD into config. One-line product + paths to existing docs.
- After writing config and generating files, offer Jira once. Decline is stored; connect/change/remove later is `/dhs-config` (see below).

### `/dhs-config` (detail)

One change at a time. Show current and new value, wait for confirmation, then write. Do not touch `agents.brainstorm` (that is `/dhs-brainstorm`). Do not commit.

**Tracker (Jira)** — always available here, not only at init:

| Intent | What happens |
|--------|----------------|
| **Add** (no tracker yet, user asks or accepts the offer) | Ask URL, user, project key (one question at a time). Token: user puts it in the local ignored credentials file; never paste it in chat. Fetch that project’s statuses, issue types and custom fields. Then, one question at a time, map **each** harness key `todo`, `inProgress`, `codeReview`, `inReview`, `done` to a Jira status from that list (or skip = `null`). Map `blocker` if they use dependencies. Map where spec and prompt live (two custom fields, description, or comments). Issue types for `feature` and `bug`. Write `agents.tracker.statuses` (and the rest) into config. Agents must not pick a Jira status that is not in this map. |
| **Change** (tracker already there) | One question: change integration or remove it. Change = same mapping questions for the fields they named; keep the token unless they rotate it in the credentials file. |
| **Remove** | Confirm, drop tracker from config, delete or clear the local credentials file. Project is files-only again. `jiraOffer` does not block a later **Add**. |

Do not invent a harness CLI for Jira. The skill uses Jira MCP and writes config. After a tracker change, regenerate whatever agents need (`fetchFields`, task key pattern) so the next Architect/Implementer/Reviewer run uses the new source of truth.

If the user names another config key (model, base branch, …), do that key first, then the tracker offer only when there is still no tracker and the offer was not declined — unless they explicitly asked to add/change/remove Jira, in which case do the tracker path even after a decline.

### `/dhs-feature` pipeline

1. No spec or prompt → Architect.
2. Spec+prompt, no implementation → Implementer, Consultant inside each phase.
3. Implementation exists → Reviewer.
4. Open ❌ → Implementer with those items only, then Reviewer again (max 3).
5. Interactive: stop on agent questions. Critical/autonomous: clean review = PR URL; do not merge.

Do not pause between stages when there is no question and no stop. Report once at the end or at the first stop.

---

## Brainstorm

Optional extra viewpoints while specifying. Members are markdown personae, not `@`-targets and not harness roles.

The four product agents stay Architect, Implementer, Consultant, Reviewer. Brainstorm still has a **facilitator**, but it is not a fifth product role (no model in `agents.roles`, no `/dhs-init` question for it). It is an isolated runner: collect opinions, do not judge them, hand the pack to the Architect.

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
| Member files | `.claude/brainstorm/members/<id>.md` from config (`id`, `description`, `identity`, `cares`, `dislikes`). |
| App context | `.claude/brainstorm/app-context.md`. Built by the skill from the repo (product line, `agents.docs`, README). Gaps: one question at a time, then user confirms the file. |
| Persona turn | Isolated one-shot: one member, structured opinion (`[BLOCKER]` / `[IMPORTANT]` / `[NICE]`). Read-only. No git, no spec edits. Personae do not see each other. |
| Facilitator | Isolated one-shot that **only collects**. Fills PART A (shared points, conflicts, blockers, lone voices, review quality). Does not decide who is right, does not drop a lone blocker, does not average. Used when two or more members were asked; one member → that reply is PART A. |
| Architect | Receives PART A. Decides on every blocker, conflict and gap. Does not run persona or facilitator turns. A persona opinion is not user approval. |

`/dhs-config` does not edit members. Implementer, Consultant and Reviewer never run a round.

### Two entries

**Direct consult** (`/dhs-brainstorm` + a question or a spec). Needs a ready app context and at least one member. Threshold does not apply. If the user names members, ask those; otherwise ask every member. The skill runs personae → facilitator → then launches the Architect with **PART A only** (plus the material). The skill shows the Architect’s decisions; the user resolves leftover conflicts. Do not hide a blocker the Architect rejected.

**During specification** (`/dhs-planit` or Architect inside `/dhs-feature`). If the Architect needs a round, it **stops and asks the skill** (or the launching skill runs the round first). It does not interview personae in-process. Consult on its own when there are at least two members **and** the work passes `agents.brainstorm.consult`:

- `any` — every user-visible change
- `significant` (default if unset) — hard to reverse, or changes how the product is used
- `broad` — new module, onboarding, pricing, navigation rebuild

`/dhs-feature` does not start a round by itself.

### Round

1. Ready app context (or stop and finish it via the skill).
2. Persona turns in parallel when the runtime allows. Launch prompt = member + format + app context + material. Nothing from the Architect session.
3. Facilitator → PART A (or the single persona reply).
4. Architect gets PART A and decides. Agreement among personae is not required and is not proof.
5. Interactive: write `docs/brainstorm/<slug>-<YYYY-MM-DD>.md` only after the user confirms the round. Critical/autonomous: Architect consumes PART A and does **not** write that file.
6. One round unless the user asks for another, and then only for what changed.

Do not paste persona transcripts back into the chat or into the Architect launch. If every persona says almost the same thing, that is a weak set of personae, not confirmation. The facilitator must flag that under review quality.

### First member

On create, ask once for the consult threshold and the model used for persona and facilitator turns (suggest `sonnet`). Members have no per-persona model. After create/edit/remove, regenerate that member file; do not hand-edit generated member markdown.

---

## Coding standards

`/dhs-init` generates rule files from packs. Agents follow rules that load on Read/Write/Edit.

Quality during implementation is **Consultant + the project’s own test command**. Reviewer does not replace Consultant.

---

## CLI (v1)

| Command | Purpose |
|---------|---------|
| `dhs install` | Machine: global skills |
| `dhs uninstall` | Reverse install |

Everything else is a skill or a normal project/git/`gh` command.

---

## Stops

Not questions and not Consultant `must-fix`. Report in one line:

`BLOCKED: <what stopped> — <what the user or another skill must do>`

Examples: user approval missing, open blocker task, merge not confirmed, dirty checkout when Reviewer must switch branch, PR failed, project tests failing on untouched code.

---

## Decisions

1. **Samples are disposable patterns** — rewrite into templates; do not keep sample-only commands or agents as product.
2. **CLI is only install/uninstall.** Generation is `/dhs-init`. Verify is the project’s script. Git is git/`gh` on the allowlist.
3. **Consultant is in the default pipeline** — haiku, per phase, structured verdict, 2-pass cap, debt protocol. That is the finite loop (see the table under Consultant).
4. **Reviewer stays spec-only** — split of duties: Consultant = how the code is written; Reviewer = whether it matches the spec.
5. **Mode names** — `interactive` / `critical` / `autonomous` (same meaning as default / semi-standalone / standalone).
6. **Five statuses** — drop `backlog` / `reviewReady` / `reviewDone` as duplicate labels.
7. **Git allowlist, not a wrapper CLI** — Implementer: branch create/switch only. Reviewer: commit/push/PR/return. Merge is always human.
8. **Only four product agents** — Architect, Implementer, Consultant, Reviewer. Brainstorm facilitator is an isolated collector, not a fifth role in `agents.roles`.
9. **Init and config are global.** Other skills are per project. A second `/dhs-init` is `/dhs-config`. `/dhs-config` is a skill, not an agent.
10. **One tracker.** Files or Jira, never both. `/dhs-config` can add, change, or remove Jira; a switch does not migrate old tasks.

## Deferred

- Cursor-specific generators if they diverge from Claude Code.
- Trackers beyond Jira.
- Auto-merge.
- User-facing Consultant skill (it would skip the Implementer).
- Changing `agents.contentLanguage` mid-task.
