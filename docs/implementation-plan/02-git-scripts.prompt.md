Implement seh phase 2 only.

Read, in this order:
1. docs/prd.md (spec; it wins on any conflict)
2. docs/implementation-plan.md (invariants and how to use phase files)
3. docs/implementation-plan/02-git-scripts.md (this slice)

Do that phase’s in-scope work and stop. Do not start later phases. Do not invent CLI commands, a test suite, or a global install. Do not commit unless I ask.

When you finish, report against the phase file’s “Done when” checklist. If that checklist and the shared done rules are true, set this phase’s Status to `done` in the Phase index in docs/implementation-plan.md. Do not mark it `done` if any item is still false.
