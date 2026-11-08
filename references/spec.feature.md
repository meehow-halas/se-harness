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
