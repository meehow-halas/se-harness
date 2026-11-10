# Phase 10 — Open browser and release the port

## Goal

Starting Monitor opens the printed loopback URL in the OS default browser. Stopping the terminal process (SIGINT/SIGTERM) unbinds the port so the same `--port` can be used immediately. Optional `--port` stays the phase 1 flag (default 7310); bind, lock, stdout, and the opener all use that port.

## In scope

- After a successful bind, open `http://127.0.0.1:<port>/` in the **default** browser. No new npm dependency. OS opener: darwin `open`, linux `xdg-open`, win32 `cmd /c start ""`. Detached spawn; opener failure is ignored (URL still printed).
- Second start in the same cwd (already running): print the **live** instance URL (port from the lock, not a different `--port` on this invocation), open that URL, exit 0. Do not bind a second listener.
- Tests and CI must not pop a real window: skip the opener when `DHS_MONITOR_NO_OPEN=1`. Optional `DHS_MONITOR_OPEN_BIN` (or equivalent injectable spawn) records argv for tests.
- SIGINT and SIGTERM once: stop the refresher, dispose sessions, **drop keep-alive and SSE** (`server.closeAllConnections` before `server.close`), remove the instance lock, exit. Hard timeout (about 2s) then `process.exit` so a hung `disposeAll` cannot keep the port.
- `--port` optional, default 7310, range 1–65535. Invalid value / missing argument: usage, exit 1 (phase 1). No hardcoded 7310 in the opener or shutdown path.

## Out of scope

- `/dhs-monitor` skill (still **Out of this Monitor delivery**)
- `dhs monitor` npx subcommand
- Forcing a Chrome `--new-window` (OS default tab-or-window is enough)
- Changing lock/cwd rules, `--host`, or `--max-agents`

## Inputs

- [ideas/monitor.md](../ideas/monitor.md) §4 (start; this phase adds open-URL and stop-unbinds; `--port` already in the index)
- Index decisions: Port, and the new Open URL / Stop bullets this slice lands
- Phase 1 launcher (`parseArgs`, bind, lock, `shutdownMonitor`); phase 5/8 SSE keep-alive

## Outputs

| Path | What |
|------|------|
| `monitor/index.js` | opener after bind / second start; shutdown closes connections and unbinds |
| `monitor/index.test.js` | SIGTERM with a live SSE client frees that `--port`; opener argv uses the effective URL |
| [ideas/monitor.md](../ideas/monitor.md) §4 | one sentence: start opens the URL; `--port` optional; Ctrl+C frees the port |

## Behaviour

- No `--port` → listen `127.0.0.1:7310`; stdout and opener use that URL.
- `--port n` → listen, lock, stdout, and opener use `n`.
- SSE (`/api/tasks/events` and session events) must not keep LISTEN after SIGTERM.
- Do not wait for the opener. Do not fail start if the browser cannot open.

## Done when

- Tests fail if SIGTERM (or SIGINT) with an open SSE connection leaves the chosen `--port` bound
- Tests fail if a second start in the same cwd binds another port instead of printing/opening the live URL
- Tests fail if the opener is called with 7310 when `--port` was a different value
- Tests fail if the opener runs when `DHS_MONITOR_NO_OPEN=1`
- Without `--port`, printed URL and opener still use 7310
- Idea §4 records open-on-start, optional `--port`, and stop-unbinds
- README was not edited
