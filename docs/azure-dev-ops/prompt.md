# Azure DevOps tracker — commissioning prompt

Use this file when asking an agent to implement **one phase** of the ADO plan.

## Read order

1. [docs/prd.md](../prd.md) — product invariants; wins until ADO slices update it in phase 1.
2. [docs/azure-dev-ops/spec.md](spec.md) — ADO architecture and **recommended defaults**.
3. [docs/azure-dev-ops/plan.md](plan.md) — phase index and shared rules.
4. The phase file named in your task, e.g. `docs/azure-dev-ops/03-crud.md`.
5. That phase’s `.prompt.md` sibling.

## Task line template

```text
Implement docs/azure-dev-ops phase <N> only.

Read the files in docs/azure-dev-ops/prompt.md (read order).
Do not implement other phases. Do not commit unless I ask.

When finished, report against the phase “Done when” checklist.
If all items and shared done rules hold, set phase <N> Status to done in docs/azure-dev-ops/plan.md.
```

## Choosing between options

When a phase or the spec presents **multiple viable options** (API version, auth channel, field storage, HTML strategy, etc.):

1. **Default to the option marked Recommended** in [spec.md](spec.md) or in that phase file.
2. If the spec table has a “Recommended” column, **do not** pick from “Rejected for dhs” unless the user **explicitly** overrides in the commissioning message.
3. If you must deviate, **state the deviation in the report** and why; do not silently substitute (e.g. `az boards` instead of REST).
4. When reporting design choices to the user, list options **with the recommended option first** and label it **(Recommended)**.

## Shared constraints

- No new `dhs` CLI subcommands; no global install; no machine-wide paths.
- Token never in argv, stdout, chat, or git.
- `npm test` for script tests; no second runner.
- Do not implement PRD Deferred items outside this plan’s phases.
- Minimal diff: match `scripts/jira` layout and tone unless ADO forces a difference (document in phase report).
