---
# Lesson file: docs/lessons/<group>/<topic>.md. Written by /{{prefix}}learnthelesson. Drop these comment lines.
# group: a seh pack name (csharp, angular, typescript, ...), general, or domain-<area>. Equals the folder name.
# topic: equals the file name without .md.
# paths: optional globs that scope the rendered rule. Omit the key for an always-loaded rule; never in general.
group: example-group
topic: example-topic
paths:
  - "**/*.ext"
---

# Example topic

## Rule

<!-- Project-agnostic: no project paths or names. Each rule is one line and observable. -->

- <what to do or avoid, checkable in a diff or a command>

## Why

- <the failure the rule prevents>

## In this project

<!-- Optional; delete the section when empty. Paths, legacy exceptions, examples. One line each. -->

- <project fact> — `<path:line>`

## Evidence

- <path:line, PR or review comment link, or the user's words> — <what happened>
