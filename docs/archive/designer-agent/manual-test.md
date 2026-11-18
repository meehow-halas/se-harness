# Designer: manual test on a test project

Needs a host with `/<prefix>` skills and a small project with a UI (any React, Vue, Svelte, Next.js, or Django-templates tree). Files tracker is enough. Four scenarios; run them in order.

## 0. Prepare

```bash
mkdir ~/projects/seh-designer-test && cd ~/projects/seh-designer-test
git init -b dev && git commit --allow-empty -m init
node ~/projects/se-harness/src/cli.js install
```

Add a minimal UI file (for example a React component) and a backend file, then run `/<prefix>setit-se`.

Expected:
- Role models are asked per host with **five** roles in the table; the `designer` row equals the `implementer` row.
- The Designer switch is asked, recommending yes (UI stack detected). Answer yes.
- `harness.config.json` has `agents.roles.designer.model` for every host `id` and `agents.designer.enabled: true`.
- A live `designer` agent exists in every host `agentsDir` (Codex: `designer.toml`).

## 1. Backend task: the Designer does not run

`/<prefix>runit` (or `/<prefix>planit`) on "add a health-check endpoint returning 200".

Expected:
- Spec has `ui: false` (or no `ui`) and no **UX/UI decisions** section.
- No `designer` run, no `D<n>` rows in the log.

## 2. UI task in three modes

For each mode use a new task: "add an empty state to the orders list".

| Mode | Launch | Expected |
|------|--------|----------|
| interactive | `/<prefix>planit` | Spec `ui: true`. After the Architect the Designer asks one question at a time (each with a recommendation) and shows the UX section before writing it. Spec then has **UX/UI decisions** and `UX:` criteria; log has `D<n>` rows. |
| critical | `/<prefix>planit` with "critical" | The Designer asks at most one question, only for a critical UX decision (e.g. it contradicts the existing design system); everything else is written as `D<n>`. |
| autonomous | `/<prefix>runit` with "samodzielnie" | No questions. Every decision is a `D<n>` row; the pipeline continues to the Implementer. |

Also check in each: status stays `todo` after the Designer; the Designer made no git change (`git status` shows only spec/log files); the prompt changed only by a component-reuse pointer.

## 3. Gate: `doit` on `ui: true` without a UX section

Copy a `ui: true` spec, delete its **UX/UI decisions** section and `UX:` criteria, and run `/<prefix>doit <KEY>`; then `/<prefix>checkit <KEY>`.

Expected: both stop for that task with `BLOCKED: <KEY> needs the Designer stage — run /<prefix>planit <KEY>`. `/<prefix>planit <KEY>` then fills the section; `doit` proceeds.

## 4. Designer disabled

Run `/<prefix>setit-se` and set `agents.designer.enabled` to `false`. Run `/<prefix>planit` on a UI task.

Expected: spec has `ui: true` but the Designer does not run; `doit` is not blocked by the gate. Also: remove `agents.designer` and `agents.roles.designer` from the config by hand and run `/<prefix>setit-se`: it asks for the designer model per host and the switch before anything else.
