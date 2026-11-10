# Cursor SDK at N=4

**Superseded by phase 9** for live runtime. This note records what the phase 2 fake SDK measured. CLI N=4: [09-n4-cli.md](09-n4-cli.md).

CI in this phase uses a **fake Agent**. It does not spawn the real `@cursor/sdk` local executor, so there is no RSS or rate-limit sample from a live `CURSOR_API_KEY` in CI.

What the fake measures (and the product must keep):

| N | Result |
|---|--------|
| 4 live agents | Four `Agent.create` calls, four ids, independent `send`/`stream` |
| 5th with `--max-agents` 4 | Refused with a visible error; **not** queued |

What to expect against the real SDK (not yet run here): four local agents ≈ four executor processes plus the Monitor Node process. RAM is roughly 4× one local agent. Spawn errors, RAM, or account rate limits may appear at or below 4. `--max-agents` (default 4) is a starting cap, not unbounded N.

When someone runs a live key at N=4, record RSS, any SDK errors, and the date in this file.
