# Stops

Not questions and not Consultant `must-fix`. Report in one line:

```text
BLOCKED: <what stopped> — <what the user or another skill must do>
```

Do not use `BLOCKED: rule=<id> …`.

If a `.seh/scripts/` helper refuses, copy its `BLOCKED:` line into the report, stop that path, and do not work around it with raw `git` or `gh`.

Examples: `seh install` missing, `/{{prefix}}setit-se` not run yet, `.seh/VERSION` does not match `seh.generatedFrom`, user approval missing, open blocker task, dirty task worktree when `return-to-base` must remove it, `/{{prefix}}shipit` given a list of tasks, PR failed, project tests failing on untouched code, a `.seh/scripts/` helper refused. A dirty primary checkout does not block `start-task`; after the file-tracker copy, `start-task` removes only this task’s uncommitted tracker copies from the launch tree.

Commands in a `BLOCKED:` line are written with `/`. On a host whose `invokePrefix` in `.seh/references/hosts.json` is another character (Codex: `$`), say that character instead when relaying the line.
