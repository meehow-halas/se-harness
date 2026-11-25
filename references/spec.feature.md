---
# Files tracker: docs/features/<basename>.feature.md
# Example basename: 001-feature-example-name
# id: task key (basename on files; issue key on Jira).
# status: write the string from agents.statuses in harness.config.json for this step (Jira: agents.tracker.statuses). Do not invent names.
# The `todo` value below is an example of agents.statuses.todo (skeleton default).
id: 001-feature-example-name
title: Example name
status: todo
type: feature
depends: []
relates: []
# tracker: Jira / ADO issue key or work item id of a task whose basename is not the key; empty when unbound or when the basename is the key.
# With the tracker `spec` action ON, a bound task's local spec is this frontmatter only, and exists only if basename differs from the key or the `status` action is OFF.
tracker:
# ui: true when the task changes something a user sees (screen, interaction, UI text, navigation); absent = false.
# With ui: true and agents.designer.enabled, the Designer adds a `## UX/UI decisions` section after Architectural decisions and `UX:` acceptance criteria.
# The Architect writes that heading only from a design file (launch `Design: <path>`). Its presence tells the skills the Designer stage is done.
ui: false
---

# Example name

## Abstract

What, why, and for whom (2–5 sentences).

## Requirements

-

## Acceptance criteria

-

## Architectural decisions

Choices and why, not a tutorial.

Paths may appear as constraints (“do not change X”), never as a step list. A basename in `depends` must already be at the configured `done` status before implementation starts.
