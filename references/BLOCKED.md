# Stops

Not questions and not Consultant `must-fix`. Report in one line:

```text
BLOCKED: <what stopped> — <what the user or another skill must do>
```

Do not use `BLOCKED: rule=<id> …`.

If a `.dhs/scripts/` helper refuses, copy its `BLOCKED:` line into the report, stop that path, and do not work around it with raw `git` or `gh`.

Examples: `dhs install` missing, `/dhs-setup` not run yet, `.dhs/VERSION` does not match `dhs.generatedFrom`, user approval missing, open blocker task, merge not confirmed, dirty checkout when Reviewer must switch branch, PR failed, project tests failing on untouched code, a `.dhs/scripts/` helper refused.
