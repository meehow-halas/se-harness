# 05 — agents and work skills

## Goal

Agents follow per-action / per-op flags at run time; nothing is baked into generated markdown.

## Scope in

- Architect: new task → `create` ON: create issue, bind; OFF: files basename, `tracker:` empty. Existing locally started task with empty `tracker:` and `create` ON: create and bind at this step. Write spec/prompt to tracker or file per flag; `link` only with `create` ON.
- Implementer / Reviewer: same binding rule at their first touch; log/comments and status per flag; status OFF → local frontmatter (stub file when spec on tracker).
- Reviewer after acceptance: run enabled git ops only; final report lists what was left to the developer (uncommitted worktree path, local commit, pushed branch without PR).
- `doit`, `checkit`, `runit`, `shipit`, `planit`, `references/session-fanout.md`: replace `readOnly` wording; `runit` `pr-state` check unchanged; `shipit` `BLOCKED:` when any git op OFF; `shipit` todo listing works when spec and status are local.
- `scripts/fanout-plan` dependency reads (if it reads status): status source per flag.

## Acceptance criteria

- `grep -rn readOnly agents skills references scripts` → only the migration rule in `setit-se`.
- `npm test` green.
