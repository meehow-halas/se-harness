Implement dhs phase 10 only.

Read, in this order:
1. docs/prd.md (spec; it wins on any conflict)
2. docs/implementation-plan.md (invariants and how to use phase files)
3. docs/implementation-plan/10-parallel-worktrees.md (this slice)

Do that phase’s in-scope work and stop. Do not invent CLI commands or a global install. Do not commit unless I ask. Do not edit README.md unless I asked.

When you finish, report against the phase file’s “Done when” checklist. If that checklist and the shared done rules are true, set this phase’s Status to `done` in the Phase index in docs/implementation-plan.md. Do not mark it `done` if any item is still false.
