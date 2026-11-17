# Prompt — stage 01: align fan-out texts for `runit` with missing specs

You work in the repo `se-harness` (package `se-harness`, binary `seh`): skills, agents, rule packs and a small CLI for coding assistants. Repo root: `/Users/michal.halas@stxnext.pl/projects/se-harness`. Read `CLAUDE.md` and the relevant parts of `docs/prd.md` first (PRD wins). Product dirs: `agents/`, `packs/`, `skills/`, `brainstorm/`, `references/`, `scripts/`, `src/`. Skill text uses the token `{{prefix}}`; keep it.

Constraints: do not commit; do not touch `.env`; do not write to `~/.claude/` or machine-wide paths; no `npm install -g`; do not edit root `README.md`; do not implement PRD Deferred items; shipped-dir changes need a CHANGELOG entry and version handling (below). Run the narrowest test first, quote real output, never weaken a test.

Definition of done: every acceptance criterion below is true, `npm test` is green, and `docs/runit-fanout-missing-spec/README.md` stage 01 status is set by the verifier flow (`done` only when all PASS).

Background of the task: the command `/_runit MT-01 MT-02 MT-03 samodzielnie` (keys without a spec) was analysed. Texts contradict each other (see Findings). The user chose the decisions below; implement them as text edits only.

---

# Stage 01 — Align fan-out texts for `runit` with missing specs

Depends on: none (first stage). Stage `NN` starts only when stage `NN-1` is `done`.

## Goal

`/<prefix>runit K1 K2 K3` (fan-out, git enabled, `sessionSpawn: start_session`) must behave as `runit` is documented for one key: each child starts at the first missing stage, so keys with no spec get an Architect run inside the child. Remove the contradictions that say otherwise.

## Findings that drive the scope

1. `references/session-fanout.md` §1 ("Keys whose spec is missing are `BLOCKED`") and Rules ("A missing spec or prompt is `BLOCKED`… `planit` first") apply to every skill, including `runit`. `runit` has no exception. `shipit` has the rule explicitly and keeps it.
2. `skills/runit/SKILL.md` starts with a "A list of keys: `BLOCKED: /<prefix>runit is one task…`" block while its "Several keys" section fans out. PRD `Examples` (stops list, ~line 727) still lists "`/<prefix>runit` given a list of tasks" as a stop; PRD fan-out paragraph (~line 639) says multi-key `runit` may fan out. Contradiction to resolve in favour of fan-out (PRD wins, then fix the other texts to match it).
3. Placement table in `session-fanout.md` already says `runit`: Architect in launch checkout.

## Decisions taken

1. Missing spec in a `runit` fan-out is not `BLOCKED`. Each child runs from Architect. Why: the user's "samodzielnie" means Architect runs without user intervention. `shipit` keeps its BLOCKED rule (it never runs Architect).
2. `depends` between sibling keys discovered by an Architect in a child: the child stops after the Architect stage with `BLOCKED: depends on <KEY> — rerun /<prefix>runit <this key> after <KEY> is done` (spec stays `todo`; existing Architect stop "open blocker on `depends`"). The parent lists it in the report table; no waiting, no side channel, no waves. Why: no new mechanism; rerun reuses the spec already written.
3. A key that has no spec and does not exist anywhere: files tracker → new task under that key as basename; Jira/ADO full write → if the issue / work item exists, Architect treats it as an existing task; if it does not exist, `BLOCKED` (Architect never invents a tracker key); read-only tracker → as files tracker with the key as `id`. Autonomous Architect decides content from the launch request and the tracker item; the launch carries no other text, so spec content comes from the item title/description when present.
4. One stage. Version: patch, appended to the `1.3.1` CHANGELOG entry (no git tag exists; `1.3.1` dated 2026-11-17 is treated as unreleased) — verify with `git tag` and `git log` at execution; otherwise bump to `1.3.2`.

## Scope in

- `references/session-fanout.md`: §1 and Rules — missing-spec `BLOCKED` applies to every skill except `runit`; for `runit` the child runs Architect. Add the sibling-`depends` behaviour (decision 2) to §5/§6 or Rules.
- `skills/runit/SKILL.md`: remove/adjust the stale "A list of keys: BLOCKED" opening so it does not contradict *Several keys*; state in *Several keys* that a key without spec is not blocked, each child starts at Architect, and the decisions 2–3 behaviour.
- `agents/architect.md`: in "Existing task / New task" make decision 3 explicit for a key given by the launch with no spec (files, readOnly, Jira/ADO).
- `docs/prd.md`: fix the stops example (~line 727) so it no longer lists `runit` given a list; add one sentence to the fan-out paragraph (~line 639) and the `runit` table row (~line 536) about missing specs; PRD Deferred untouched.
- `CHANGELOG.md` + `package.json` version per decision 4.

## Scope out

- No new script, no new config key, no new wave logic, no change to `fanout-plan`, `shipit`, or `planit`.
- Parent still never starts `planit`. Do not edit root `README.md`.

## Files likely touched

`references/session-fanout.md`, `skills/runit/SKILL.md`, `agents/architect.md`, `docs/prd.md`, `CHANGELOG.md`, `package.json` (and `package-lock.json` if it carries the version).

## Acceptance criteria

1. `session-fanout.md` states that for `runit` a missing spec does not block the key and the child runs Architect; for `planit`/`doit`/`checkit`/`shipit` the missing-spec rule is unchanged.
2. `skills/runit/SKILL.md` has no sentence that blocks a multi-key launch in a fan-out-capable setup and none that contradicts *Several keys*; the single-key and git-disabled/manual paths are unchanged in meaning.
3. Sibling-`depends` stop text (decision 2) and new-key rule (decision 3) appear exactly once in the normative place (runit/session-fanout/architect), no conflicting copy elsewhere.
4. `docs/prd.md` no longer lists `runit` given a list as a stop, and agrees with `session-fanout.md` and `runit`.
5. `grep -rn "{{prefix}}" ` tokens in edited files are intact; `npm test` passes; version in `package.json` equals the top `CHANGELOG.md` entry; CHANGELOG has a `Changed` line.
6. `seh install` still does not copy `*.test.js`; no change in `src/`.

## Tests to write/run

- Narrowest first: `node --test scripts/fanout-plan.test.js` (unchanged behaviour must stay green).
- Then `npm test`. No new behaviour test: texts only. If an existing test asserts text of an edited file, update it to the new contract, never weaken it.

## Versioning/CHANGELOG

Patch (wording, no new behaviour or config key). Shipped dirs touched (`references/`, `skills/`, `agents/`) → entry required.
