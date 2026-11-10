# Phase 1 — Payload and server

## Goal

After `dhs install`, the consuming project can start Monitor locally: `node .dhs/monitor --host cursor`. The process binds loopback, enforces setup guards, and serves a stub page (no agent yet).

## In scope

- Package directory `monitor/` (seventh payload). Entry that Node can run (`node .dhs/monitor`).
- `dhs install` copies `monitor/` to `.dhs/monitor/` and vendors `@cursor/sdk` (and its runtime deps) from the installer package into `.dhs/monitor/node_modules`. No `npm install` in the consumer root. Do not copy `*.test.js`.
- `package.json` of `dev-harness-layer`: `files` includes `monitor/`; add `@cursor/sdk` as a package dependency so the installer has it to copy.
- [`src/cli.js`](../../src/cli.js) `PAYLOAD_DIRS` includes `monitor`.
- Optional consumer `package.json` script `dhs:monitor` (see index **Accepted decisions**). Uninstall removes it only on exact match.
- CLI flags: `--host` required; `--port` optional (default 7310); `--max-agents` parsed here and stored for phase 2 (default 4). Unknown host id in `hosts.json`: stop. Host other than `cursor`: stop with “not implemented” (no fallback).
- Bind `127.0.0.1` only. Instance lock `.dhs/monitor/instance.lock`. Second start in the same cwd: print URL, exit 0.
- Guards: missing `.dhs/`, missing `harness.config.json`, VERSION mismatch → nonzero, tell user `dhs install` / `/dhs-setup`. Do not serve UI.
- Stub HTML so phase 3 can attach layout without SDK.

## Out of scope

- `Agent.create`, chat, task list, stage buttons
- `dhs monitor` as an npx subcommand
- Claude Code / OpenCode adapters
- README

## Inputs

- [ideas/monitor.md](../ideas/monitor.md) §§4–5, 14.1
- [monitor-plan.md](../monitor-plan.md) invariants and decisions
- [prd.md](prd.md)

## Outputs

| Path | What |
|------|------|
| `monitor/` | launcher, HTTP server, stub UI, tests |
| `package.json` | `files` + `@cursor/sdk` dependency |
| `src/cli.js` | copy `monitor/`; vendor node_modules; optional npm script |
| `src/cli.test.js` | copy, exclude tests, script merge/uninstall, vendor dir present |

## Behaviour

- Usage on missing `--host` (nonzero).
- Lock file records pid, port, cwd. Stale lock (dead pid): replace and bind.
- Different cwd: independent instance and lock.
- Do not listen on `0.0.0.0`.

## Done when

- Tests fail if install omits `monitor/`, copies `*.test.js`, or skips vendoring the SDK when the installer has it
- Tests fail if a consumer `dhs:monitor` script is overwritten when the key already existed
- Tests fail if `--host` is optional or defaults to `cursor`
- Tests fail if bind is not loopback, or a second start in the same cwd starts a second listener
- Guards match the contract (exit nonzero + message) for missing install, missing config, VERSION mismatch
- Stub page is reachable on the printed URL after a successful start in a fixture project
- CLI still accepts only `install` and `uninstall` as `dhs` subcommands
