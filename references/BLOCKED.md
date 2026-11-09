# Stops

Not questions and not Consultant `must-fix`. Report in one line:

```text
BLOCKED: <what stopped> — <what the user or another skill must do>
```

Do not use `BLOCKED: rule=<id> …`.

If a `.dhs/scripts/` helper refuses, copy its `BLOCKED:` line into the report, stop that path, and do not work around it with raw `git` or `gh`.

Examples: `dhs install` missing, `/dhs-setup` not run yet, `.dhs/VERSION` does not match `dhs.generatedFrom`, user approval missing, open blocker task, merge not confirmed, dirty task worktree when `return-to-base` must remove it, `/dhs-shipit` given a list of tasks, PR failed, project tests failing on untouched code, a `.dhs/scripts/` helper refused. A dirty primary checkout does not block `start-task`; after the file-tracker copy, `start-task` removes only this task’s uncommitted tracker copies from the launch tree.
