# Cursor Agent CLI at N=4

CI in this phase uses a **fake spawn**. It does not run the real Cursor Agent CLI, so there is no RSS or rate-limit sample from a live terminal login in CI.

What the fake measures (and the product must keep):

| N | Result |
|---|--------|
| 4 live agents | Four CLI spawns, four ids, independent `send` / stream |
| 5th with `--max-agents` 4 | Refused with a visible error; **not** queued |

What to expect against the real CLI (not yet run here): four CLI processes plus the Monitor Node process. RAM is roughly 4× one `agent` process. Spawn errors, RAM, or account rate limits may appear at or below 4. `--max-agents` (default 4) is a starting cap, not unbounded N.

Env for those processes must not include a Monitor-supplied `CURSOR_API_KEY`. Auth is the CLI’s own login.

When someone runs a live CLI login at N=4, record RSS, any CLI errors, and the date in this file.
