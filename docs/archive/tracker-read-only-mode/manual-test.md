# Tracker read-only mode: manual test on a test project

Run once on Jira (`PROJ-123` below), once on ADO (use a numeric id, e.g. `42`, wherever `<KEY>` appears). Needs a real tracker item you can read. Live tracker steps are yours: seh must never receive credentials in chat. Enter the token only in the local ignored file when `/<prefix>setit-se` asks.

Use a **throwaway item** or one whose change history you can inspect. Read-only is proven by the tracker showing zero change.

## 1. Prepare a test project and connect

```bash
mkdir ~/projects/seh-readonly-test && cd ~/projects/seh-readonly-test
git init -b dev && git commit --allow-empty -m init
node ~/projects/se-harness/src/cli.js install
```

Open the folder in the host. Run `/<prefix>setit-se`:

1. Base branch `dev`.
2. Add tracker → Jira (or Azure DevOps) → URL/org, user, project → token step.
3. After `meta` prints `OK`: **Read-only mode → yes**.
4. Map `blocker` (pick a status, or `null`). Answer `fetchFields` if asked.

Expected:
- `harness.config.json` has `agents.tracker.readOnly: true`.
- No question about `todo`…`done` status maps, `issueTypes` / `workItemTypes`, or artifact storage. Skeleton values stay.
- `blocker` is what you chose.
- Token file `harness.credentials.local.json` is ignored by git: `git status --short` does not list it; `git check-ignore -v harness.credentials.local.json` matches.

## 2. Guard check (offline, no tracker traffic)

```bash
sh .seh/scripts/jira comment <KEY> "x"      # ADO: sh .seh/scripts/ado comment <KEY> "x"
echo "exit=$?"
```

Repeat for `create`, `set`, `transition`, `link`.

Expected: `BLOCKED: tracker is read-only — edit repo files (agents.tracker.readOnly)`, `exit` non-zero, for every verb. Same output with `harness.credentials.local.json` removed (verified offline against an unreachable URL: no HTTP).

## 3. Before snapshot

In the tracker UI (or API as yourself), record for `<KEY>`: title, description, every field seh will read (`fetchFields`), all comments (count + last timestamp), state/status, links, full history/audit trail (last entry timestamp and author).

Save as text or screenshots; step 8 compares to this.

## 4. Show task

```text
Show task <KEY>
```

Expected:
- Agent runs `jira get <KEY>` / `ado get <KEY>` and answers from tracker data (title, status, description, `fetchFields`).
- Spec/prompt/log sections come from repo files, so empty now.
- No `docs/` files created.

## 5. planit on the tracker item

```text
/<prefix>planit <KEY>
```

Expected:
- Files created, named by the key: `docs/features/<KEY>.feature.md`, `docs/prompt/<KEY>.prompt.md`, `docs/feature-log/<KEY>.log.md`.
- Spec frontmatter: `id: <KEY>`, `status` = the `agents.statuses` `todo` string.
- Spec content is derived from the tracker data, not a verbatim copy.
- Any `depends` is frontmatter only.
- No `create`, `set`, `comment`, `transition`, `link` calls in the transcript; no `BLOCKED:` lines (the agent must not even try).

## 6. New task from a sentence

```text
/<prefix>planit Add a hello command that prints "hello"
```

Expected:
- Files named by a basename `NNN-<type>-<slug>` (e.g. `001-feature-hello-command`) under the three `docs/` dirs, status `todo`.
- **No** tracker item created (check the tracker project's recent items).
- Basename, not a tracker key, as branch/task key.

## 7. doit, then checkit on the key

```text
/<prefix>doit <KEY>
/<prefix>checkit <KEY>
```

Expected:
- `start-task <KEY>` works with a tracker-key name (worktree/branch `<KEY>`, three files carried into the worktree).
- Implementer moves spec frontmatter `status` through `in progress` → `implemented`; Reviewer through `in review` → `done` (`done` only after your acceptance in `interactive` mode; a ❌ round goes back to `in progress`), all strings from `agents.statuses`. These are file edits only.
- Log file `docs/feature-log/<KEY>.log.md` gains rows: implementation, decisions (`Q<n>`), reviewer report.
- Final spec frontmatter: `status: done`.
- No tracker-write verb calls in the transcript.

If `<KEY>` has `depends` on another tracker key and `blocker` is mapped: the dependency status is read from the tracker (`get`); a blocked dependency stops the task with the usual message.

## 8. After snapshot

Re-take the step-3 snapshot.

Expected: identical to before. Same fields, same comments (count and last timestamp), same state, same links, no new history/audit entries by your user. If anything differs, record the exact diff and the command that caused it (search the transcript for `jira` / `ado` calls).

## 9. Toggle read-only off

```text
/<prefix>setit-se
```

→ Change → toggle read-only → off.

Expected:
- `readOnly: false` written.
- Asks exactly the missing maps: status keys `todo`…`done`, `issueTypes` / `workItemTypes`, artifact storage (`artifactsOnTrackerOnly` counts as missing, since read-only never asked it). `blocker` is not re-asked.
- Files from steps 5–7 untouched (`git status` / diff of `docs/` unchanged, `<KEY>` log intact).
- Now `/<prefix>planit Add a goodbye command` creates a **tracker item** (full write path), not a files basename.
- Optional: toggle back on → no questions about already-filled maps; `readOnly: true`; maps kept.

## Record for each step

Result (pass/fail), the file names created, the `BLOCKED:` lines from step 2, the before/after snapshot diff, and the config diff from steps 1 and 9. Report failures with the exact output.

## Expected end state

- Tracker: unchanged by steps 4–8 (only step 9's new item, if you ran it).
- Repo: three files per task, full status history in frontmatter, full log in the log file.
