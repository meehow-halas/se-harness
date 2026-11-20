# Brief: stage 02

Work in /Users/michal.halas@stxnext.pl/projects/se-harness (read CLAUDE.md first; project rules win). Do not commit, push, touch .env, add dependencies, or edit files outside the scope. Done = every acceptance criterion checked with evidence, reported with real command output. Context: docs/language-and-intent/README.md (goal, decisions, assumptions).

## Spec (verbatim)

# 02 skills + references: language-neutral mode detection
Executor: agent

## Goal
Skills detect `autonomous` (and other modes, conventions mode) from the user's intent in whatever language they write, with no hardcoded Polish words.

## Scope
In: `skills/{designit,doit,shipit,planit,checkit,runit,setit-se}/SKILL.md`, `references/session-fanout.md`, `CHANGELOG.md`, `package.json` version.
Out: `references/codex-adapters.test.js` (a unicode fixture, not Polish wording; leave), README/guide (stage 01), agents/packs unless grep shows hits.

## Decisions
- Q1, Q2 (see README).

## Detailed plan
1. Replace lists like (`samodzielnie`, `sam`, `bez pytań`, `autonomicznie`, `autonomous`) with intent wording: "the user asked, in any language, for the work to be done without asking questions or alone". Keep the English token `autonomous`. Locations: designit:56, doit:50, shipit:58, runit:54, planit:50, session-fanout.md:39.
2. designit:62 conventions mode: drop Polish `naucz się konwencji`; describe by intent (user asks to learn the project's UX conventions), keep `ux-conventions` file name.
3. setit-se:66: remove the Polish example "Czy zostawić te modele?"; say "or the same question in the user's language".
4. checkit:113: "Akceptuję" example -> language-neutral wording ("the user's own words accepting the review").
5. session-fanout.md:39,48 and any "mode words" text: keep carrying the user's words, no Polish examples.
6. Ensure skills state: conversation language follows the user (check existing wording; add one line only if missing).
7. Review "run /{{prefix}}x" in BLOCKED messages (runit:66, planit:56): these are output hints for the user; keep as functional but make them read as a suggestion, not the only path. Do not change the `BLOCKED:` contract unless a test fixes it; tests that assert exact text must stay green and, if the text changes, tests are updated with it (not weakened).
8. Patch bump in `package.json` (+ `package-lock.json` if it carries the version), CHANGELOG entry under the new version (Changed/Fixed). If an untagged entry for the current version already exists, extend it instead.

## Acceptance criteria
- [ ] `grep -rnE '[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]|samodzielnie|bez pyta|autonomicznie' skills agents packs references brainstorm scripts src` returns only the unicode fixture in `references/codex-adapters.test.js`.
- [ ] Each of the six mode-detection sentences describes intent in any language and still names `autonomous`.
- [ ] `npm test` passes (actual output quoted); no test deleted or weakened.
- [ ] Version bumped (patch) or existing untagged entry extended; CHANGELOG line present.
- [ ] `seh install` still does not copy `*.test.js` (covered by existing tests).

## Verification
- Run the grep above.
- Narrowest tests first (files touching skills/references), then `npm test`.

## Files
skills/*/SKILL.md, references/session-fanout.md, CHANGELOG.md, package.json

## Depends on
01 `done`
