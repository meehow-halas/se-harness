# Cursor Agent CLI at N=4

CI in this phase uses a **fake spawn**. It does not run the real Cursor Agent CLI, so there is no RSS or rate-limit sample from a live terminal login in CI.

What the fake measures (and the product must keep):

| N | Result |
|---|--------|
| 4 live agents | Four CLI spawns, four ids, independent `send` / stream |
| 5th with `--max-agents` 4 | Refused with a visible error; **not** queued |

`--max-agents` (default 4) is a starting cap, not unbounded N. Env for those processes must not include a Monitor-supplied `CURSOR_API_KEY`. Auth is the CLI’s own login.

## Live CLI login (2026-11-10)

Run locally against Cursor Agent CLI `2026.11.05-86047df` on PATH, logged in as a team account. Monitor used `createSession` four times (`composer-2.5`, ACP `session/new` only; no `send`). Darwin RSS from `ps` after the fourth process was live:

| Process | Count | RSS |
|---------|-------|-----|
| Monitor Node | 1 | 49 MB |
| `agent` (ACP) | 4 | 268–272 MB each (1077 MB together) |

Four distinct CLI session ids. Spawn of each process took about 5 s. No CLI errors, spawn failures, or rate-limit messages at N=4. The 5th `createSession` with `--max-agents` 4 was refused (`cap`); live count stayed 4.

RAM is roughly 4× one `agent` process plus the Monitor Node process (here ~1.1 GB for the four CLIs). Spawn errors, RAM, or account rate limits may still appear at or below 4 on other machines or after `send`.
