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
# ui: true when the task changes something a user sees (screen, interaction, UI text, navigation); absent = false.
# With ui: true and agents.designer.enabled, the Designer adds section 5 and `UX:` acceptance criteria.
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

## UX/UI decisions

Only when `ui: true`; written by the Designer, not the Architect. Layout, states (loading / empty / error), interaction, copy, accessibility, components or design system to reuse. Its acceptance criteria are appended above, each starting with `UX:`. Delete this section when `ui: false`.

Paths may appear as constraints (“do not change X”), never as a step list. A basename in `depends` must already be at the configured `done` status before implementation starts.
