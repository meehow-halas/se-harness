# Brief: stage 01

Work in /Users/michal.halas@stxnext.pl/projects/se-harness (read CLAUDE.md first; project rules win). Do not commit, push, touch .env, add dependencies, or edit files outside the scope. Done = every acceptance criterion checked with evidence, reported with real command output. Context: docs/language-and-intent/README.md (goal, decisions, assumptions).

## Spec (verbatim)

# 01 README + guide: English, intent wording
Executor: agent

## Goal
`README.md` and `docs/guide/*.md` contain only English and describe skills as reacting to what the user wants, not to typed commands.

## Scope
In: `README.md`, `docs/guide/{brainstorm,examples,hosts,setup,trackers,workflow}.md`.
Out: `skills/`, `references/` (stage 02), `docs/prd.md`, archived plans, version bump (no shipped dir touched).

## Decisions
- Q1, Q2 (see README).

## Detailed plan
1. Polish words: replace `samodzielnie` (hosts.md:26, workflow.md:18-19, examples.md:18,147,150,165,191+) with English mode words/phrases ("autonomous", "don't ask me"). Re-grep for any other non-English text (diacritics and common Polish words).
2. Command framing: rewrite "Run `/_x ...`" / "Rerun the command" so the user states the goal ("ask seh to fix those items", "ask again to update the file"). Known spots: README.md:34, examples.md:3,57,73,113,302, setup.md:96,108, hosts.md:24-26, workflow.md:18 ("run MT-01 ..." examples are fine if phrased as requests). Examples shown as code blocks like `/_runit MT-01 samodzielnie` become natural requests (e.g. "run MT-01 without asking me"), optionally naming the skill that handles them.
3. Keep slash names only as labels (what skill answers), per README:38. Keep OpenCode/Codex notes (`$_x`, command files) as host facts.
4. Do not touch README sections beyond these edits (project rule: README changes only on explicit user request; this plan is that request, limited to points 1-2).

## Acceptance criteria
- [ ] No Polish word or diacritic in `README.md` and `docs/guide/*.md` (grep result shown).
- [ ] No `samodzielnie`/`bez pytań` in those files.
- [ ] No sentence tells the user to "run"/"rerun"/"type" a slash command as the way to get work done, except where the host genuinely needs an explicit invocation (OpenCode/Codex facts, manual fan-out output, setup block) and those are phrased as host facts.
- [ ] Links and anchors in README/guide still resolve (e.g. `setup.md#_setit-se`).
- [ ] No file outside the scope list changed (`git status`).

## Verification
- `grep -nP '[^\x00-\x7F]' README.md docs/guide/*.md` reviewed (allowed: arrows, ✓/❌, typographic quotes).
- Grep `samodzielnie|bez pytań|\bRun \x60/` and review each remaining hit.
- `npm test` (docs not tested; sanity only).

## Files
README.md, docs/guide/*.md

## Depends on
none
