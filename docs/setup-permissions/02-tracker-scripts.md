# 02 — `jira` / `ado` scripts

## Goal

Hard guard per action and per-flag body assembly in `get`.

## Scope in

- `scripts/jira-json.js`, `scripts/ado-json.js`: helper `write <action>` → `true` / `false`; missing `write` block → `BLOCKED: tracker config predates 2.0 — run /<prefix>setit-se`; `readOnly` ignored.
- `scripts/jira`, `scripts/ado` (+ `lib-jira.sh`, `lib-ado.sh`): verb guard per table in README (`create`/`link` ↔ `create`, `set spec` ↔ `spec`, `set prompt` ↔ `prompt`, `set log`/`comment` ↔ `log`, `transition` ↔ `status`). Guard runs before credentials and `curl`. Message names the action: `BLOCKED: tracker action <a> is disabled — write the repo file (agents.tracker.write.<a>)`.
- `get <key>`: each of spec / prompt / log from tracker field when its action is ON, else from `docs/…/<key>.*`; `status:` scalar from tracker when `status` ON, else from local frontmatter (empty when missing).
- `get` for a local basename with `tracker:` set: reads that tracker key.

## Acceptance criteria (tests)

- For each verb × its action OFF: non-zero exit, `BLOCKED:` naming the action, zero requests at the HTTP stub, also without credentials file.
- Same verb with its action ON and another action OFF: request reaches the stub (proves the guard reads the right flag, not "any off").
- `get` with mixed flags (e.g. spec ON, prompt OFF, log ON, status OFF): bodies come from the right store each; fixture values differ per store.
- Config with `readOnly: true` and no `write`: `BLOCKED:` run setup (no silent full write).
