---
name: dhs-improveit
description: This skill should be used when the user invokes /dhs-improveit or asks to propose improvements to a named module. It launches the project's improver for one module, reports the result, and for each accepted proposal offers /dhs-planit without launching it.
harness: dev-harness
---

# Propose module improvements with the improver

Read `references/launch.md` first. It holds the shared launch rules: the start checks, what a launch contains, the languages, the modes and the stops. Follow them, with the differences below. This skill names a module, not a task. It does not write proposals, improvement files or tracker issues itself.

This skill launches exactly one agent, the project's improver, for one module.

## Entry checks

Do not launch in these cases. Report and stop:

- `agents.roles.improver` is missing from `harness.config.json`: point to `/dhs-config` to add the role.
- The request asks for `Mode: critical` or `Mode: autonomous`: the improver runs only interactively. Say so and do not launch it.

## Scope line

Print the scope line from `references/launch.md` "Announce and launch" with `<stages>` = `improver`, `Mode: interactive` and `<condition>` = `proposal written`. Of the run-mode tokens from `references/launch.md` "Mode", only `interactive` is accepted; `critical` and `auto` get the interactive-only answer from the entry checks.

## Launch

The user names a module (a path or a name) and may name a focus as free text. When the module is missing, ask which module.

Launch the improver once, in `Mode: interactive`, with the language lines, the module and the focus. Use a description such as `[improve <module>] `. There is no task key. Do not use a `[<short key>] ` task prefix.

## Report

Report the improver's result in one message. For each accepted proposal, offer `/dhs-planit` and do not launch it. This skill does not chain.
