Implement Monitor phase 9 only.

Read, in this order:
1. docs/ideas/monitor.md (behaviour; it wins on any conflict)
2. docs/monitor-plan.md (invariants, decisions, how to use phase files)
3. docs/monitor-plan/prd.md
4. docs/monitor-plan/09-cursor-agent-cli.md (this slice)

Do that phase’s in-scope work and stop. Do not start later phases. Do not implement Claude Code. Do not require `CURSOR_API_KEY`. Do not commit unless I ask.

If you must ask a question, keep it short and plain. Always mark the recommended option (label it Recommended). Do not ask when the idea file, Monitor PRD, or Accepted decisions in docs/monitor-plan.md already settle it.

When you finish, report against the phase file’s “Done when” checklist. If that checklist and the shared done rules are true, set this phase’s Status to `done` in the Phase index in docs/monitor-plan.md. Do not mark it `done` if any item is still false.
