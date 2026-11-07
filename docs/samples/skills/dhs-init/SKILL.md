---
name: dhs-init
description: This skill should be used when the user invokes /dhs-init or asks to set up, initialize, or connect dev-harness in a project. It records the project in harness.config.json and generates the Claude Code subagents. It does not install the harness on the machine.
harness: dev-harness
---

# Set up dev-harness in this project

This skill is the full-mode, conversational version of `dhs init` (it exists only after `dhs install`; minimal mode runs `dhs init` in the terminal and gets the same result). It prepares the current project: it writes `harness.config.json` and then runs `dhs init`, which generates `.claude/agents/` and the Agent Delegation section of `CLAUDE.md` from the harness templates. Do not write those generated files by hand.

## How to work

Read the repository before asking anything. Decide everything the repository already shows, and say each such choice in one sentence so the user can object. Ask one question at a time, and only for a fact the repository does not contain or that is easy to get wrong. On a second run, read the existing `harness.config.json` and ask only about keys that are still missing. Leave every key the user already set as it is. To change a key that is already set, use `/dhs-config`.

Do not put a product requirements document into the config. A one-line product description and paths to existing docs are enough. The docs stay where they are.

Do not write framework rules yourself. `dhs init` installs the predefined JavaScript, TypeScript, React Native, Angular, Next.js, Python, Django and FastAPI packs. Do not commit unless the user asks.

## What to decide from the repository

State each of these and move on:

- **Product.** One line from the README or the existing docs. Ask only when the repository does not say what the product is.
- **Docs.** Paths that exist (architecture, PRD, README). An empty list is fine when none exist.
- **Verify command.** The repository's typecheck, lint and test command, taken from its scripts. Ask only when several equally plausible commands exist.
- **Task key.** `taskKeyPattern` is `\\b\\d{3}-[a-z0-9]+(?:-[a-z0-9]+)*\\b`. Feature files use that shape (`001-feature-example-name`). The Tracker section of `/dhs-config` replaces it with the Jira project key when Jira is connected.
- **Git.** The remote from `git remote` (usually `origin`) and `gh pr create --base <base> --head <task-branch>` when `gh` is available.
- **Changelog.** `CHANGELOG.md` when that file exists; otherwise say that the reviewer will create `CHANGELOG.md`.
- **Base branch.** `agents.baseBranch`, read from the repository's default branch (`git symbolic-ref refs/remotes/<remote>/HEAD`, usually `origin/HEAD`). State that name in one sentence. Worktrees are cut from the current tip of this branch. An in-place task branch and a pull request use it when the user names no other branch. Ask only when the default is ambiguous: the remote HEAD is missing, or more than one long-lived branch could be the default. A branch named in a later request does not replace this key. On a second run, leave a value that is already set. Change it later with `/dhs-config`.
- **Preset.** `presets` includes `default`. Add it if it is missing; do not remove other presets. 
- **Gates.** Leave `gates` unset so the harness defaults apply, unless the verify command would not match them. The config reference says when.
- **Roles.** All four: architect, implementer, bugfixer, reviewer. Ask one question for their models. Suggest `opus` for the architect and `sonnet` for the implementer, the bugfixer and the reviewer. One answer may accept all four suggestions or name a different model for any role. Store each value as `roles.<role>.model`. Do not check the name against a list. On a second run, leave a model that is already set and ask only for a role that has none. Change one later with `/dhs-config`, then run `dhs init`. `delegateWhen` in the language the user is speaking; the config reference has a starting point. `rules` and the reviewer's `checklist` start empty unless the user already stated a project rule. Leave `fetchFields` unset until Jira is connected. Do not set `roles.*.language`. That key is ignored. Do not ask about the brainstorm model. `/dhs-brainstorm` sets that model when the first member is created.
- **Content language.** `agents.contentLanguage` is the English name of the language for feature files, prompt files, feature-log notes, changelog entries, and every text written to the tracker. Ask one question and suggest the language of this conversation. On a second run, leave a value that is already set. Change it later with `/dhs-config`. Status names are a separate decision and are not derived from this key.
- **Local statuses.** `agents.statuses` with `todo`, `inProgress`, `codeReview`, `inReview` and `done`. When the key is absent, write the defaults `todo`, `in progress`, `code review`, `in review`, `done`. Do not take them from the user's language or from `agents.contentLanguage`. State the five values in one sentence and ask no separate question about statuses. Write other words only when the user gives them in this conversation; each value is a non-empty string. These are the words written into feature files. On a second run, leave an existing `agents.statuses` as it is, including non-English values, and do not offer to migrate. When a tracker is connected, do not write or ask about tracker statuses. Do not ask about Jira.

## What to ask

Ask only what is still unknown after the steps above, one question at a time:

1. A project rule the user volunteers. Do not solicit a list of rules.

Then write `harness.config.json`. Keep keys the user had already set. Fill only the gaps. The shape and the required keys are in [references/config.md](references/config.md). Read it before writing.

Run `dhs init` in the project root. With the config in place it asks nothing and refreshes the generated files. If it reports missing values, fix those keys and run it again. It also writes the project-local `/dhs-brainstorm` skill and the shared files under `.claude/brainstorm/`. It does not create the members or `.claude/brainstorm/app-context.md`. Do not offer to create members.

The same run detects the frameworks and writes their rules. Say each framework and the directories it covers in one sentence. A plain Angular or Django project gets that pack across the repository. A Django or FastAPI project also gets the Python pack. An Angular, Next.js or React Native project also gets JavaScript or TypeScript, whichever it is written in. A monorepo gets each pack only on the projects that use that framework, so an Angular app and a React Native app, or a Django service and a FastAPI service, do not share rules. To turn a detected pack off, add its id to `packsIgnored` in `harness.config.json` and run `dhs init` again. The command rewrites only files it generated. A rule file without the harness marker, including rules the project already had, stays.

When the `dhs init` output has a `suggest agents.validateCommand: <command>` line and `agents.validateCommand` is absent, ask one question offering that command: accept, change, or leave unset. Write the key only on acceptance (or the changed value), then run `dhs init` again. A value already set is kept as it is.

Tell the user which files were written. Do not commit them.

Then, only when `agents.tracker` is absent and `jiraOffer` is not `"declined"`, ask whether to connect Jira. One question. If the user agrees, follow the Tracker section of the `/dhs-config` skill in this conversation. If the user declines, set `jiraOffer` to `"declined"` in `harness.config.json` and leave the project on the feature files. Do not ask again on a later run of this skill when the tracker is already there or the offer was declined. A later `/dhs-config` asks the same question in that same situation.
