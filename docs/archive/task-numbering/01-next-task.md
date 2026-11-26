# 01: next-task script, Architect, PRD, guide, release

## Goal

A new files basename gets its number from `.seh/scripts/next-task`, which sees the task directories, task branches (local and remote) and a per-clone counter, and always returns `max + 1`. Numbers never repeat and never go backwards within a clone. Gaps are allowed.

## Scope

In:
- New script `scripts/next-task` (POSIX `sh`, sources `scripts/lib.sh`) and `scripts/next-task.test.js`.
- `agents/architect.md`: the naming rule (line 134) and the "no git scripts" lines (8, 169) get an exception for `next-task`.
- `docs/prd.md`: **Files tracker (default)**, **Binding → Naming** (line ~198), the script table (line ~565–576) and the sentence "Architect and Consultant: no git writes. They do not call these scripts."
- `docs/guide/trackers.md` (files tracker section) and `docs/guide/setup.md:150` (script list).
- `package.json` version, `CHANGELOG.md`.

Out:
- `git fetch` (Q2). Renumbering existing tasks. Tracker keys (Jira/ADO with `create` ON): unchanged.
- Any change to `start-task`, `pr-state` or branch-suffix logic (`<basename>-N`).
- `README.md` (project rule: not without an explicit ask).
- Other plans (`docs/worktree-run/`).

## Decisions

Q1, Q2, Q3, Q4, Q6, Q7 (see [README](README.md)).

## Detailed plan

### Contract `next-task`

- No arguments. Run from the project checkout or any seh worktree of it.
- Success: `OK`, then `number: <NNN>` (zero-padded to at least 3 digits; `1000` stays `1000`). With git disabled or no git repo, also `git: disabled`.
- Every successful call **allocates**: the counter is set to the returned number (gaps when the number is not used are accepted).
- Refusals (`BLOCKED: <what> — <what to do>`, exit 1):
  - lock still held after the wait (about 5 s): `another next-task is running — retry; remove <lock dir> if no seh session is running`;
  - counter file exists but its content is not a positive integer: name the file, tell the user to fix or delete it.

### Computation

`n = max(A, B, C) + 1`, where missing sources count as 0:
- **A, directories:** the names in `docs/features/`, `docs/prompt/`, `docs/feature-log/` (under the project root) that start with `[0-9]+-`. The leading number counts.
- **B, branches** (git enabled only): `git for-each-ref --format='%(refname)' refs/heads refs/remotes`. Strip `refs/heads/` or `refs/remotes/<remote>/`. Skip `HEAD`. A name counts only when it matches `^[0-9]+-` followed by a slug that contains at least one letter, optionally ending in `-[0-9]+` (Q6): `042-login`, `042-login-2` → 42; `1234-2`, `1234`, `PROJ-12` → not counted.
- **C, counter** (git enabled only): `$(git rev-parse --git-common-dir)/seh-next-task`, one line, last allocated number.

Numbers are parsed as decimal (strip leading zeros: `008`, `009` must not hit the shell octal trap).

### Git enabled vs disabled

Use the same notion as the other scripts: git disabled = config present with empty `agents.baseBranch` (`git_gate` / `_extract_base_branch` in `scripts/lib.sh`), or not inside a git work tree / no `git`. Disabled → A only, no counter read or written, `git: disabled` line. The script does not depend on `agents.git` operations: it never writes refs, so `worktree`, `commit`, `push`, `pr` toggles do not affect it.

### Lock

Read-compute-write runs under `mkdir "<git-common-dir>/seh-next-task.lock"`. Retry for about 5 s (`sleep 1`, POSIX), then `BLOCKED:`. Release with `rmdir` and a `trap` on exit. The counter is written through a temp file + `mv` in the same directory.

### Architect

Replace in `agents/architect.md:134` "smallest positive integer not used by any `NNN-` prefix in the three task directories, at least three digits" with: run `.seh/scripts/next-task` once and take `number:`; never compute the number yourself; a `BLOCKED:` line stops the new task (copy it into the report). Keep the slug rule and "Never renumber". In lines 8 and 169 allow `next-task` as the one script the Architect runs besides the tracker script: it reads refs and writes only the counter in `.git/`, no git writes.

### PRD

- **Files tracker (default):** one paragraph: new basename number = `next-task` (max of directories, task branches local + remote as of the last fetch, per-clone counter, + 1). No reuse, no fill of gaps, never renumbered. Repeats are still possible between clones that have not fetched each other's branches; the slug keeps the basenames distinct.
- **Naming** (`create` OFF line): point to that rule.
- Script table: new row `next-task` | Architect (new files basename) | `agents.baseBranch` | read refs, write the counter, contract above.
- "Architect and Consultant: no git writes. They do not call these scripts." → the Architect calls only `next-task` (no git writes).

### Guide

- `docs/guide/trackers.md`: one or two sentences under the files tracker on how numbers are assigned, and that gaps are normal.
- `docs/guide/setup.md:150`: add `next-task` (read-only, counter in `.git/`) to the list.

### Release

Minor (Q4). If `CHANGELOG.md` has an untagged `2.2.0`, add to it; otherwise set `package.json` to `2.2.0` and add `## [2.2.0] - <date>`. Entries: **Added** `next-task`; **Changed** Architect numbering (max + 1 from directories, task branches and counter; gaps are no longer filled).

## Acceptance criteria

- [ ] Empty repo, git enabled → `OK`, `number: 001`; counter file holds `1`.
- [ ] Directories hold `001-…`, `003-…` → `number: 004` (gap 002 not reused).
- [ ] Local branch `005-login` only (no files) → `006`.
- [ ] Remote-tracking ref only (`refs/remotes/origin/007-pay`, made with `git update-ref`) → `008`.
- [ ] Counter `010`, nothing else → `011`; a second call → `012`.
- [ ] Directories higher than counter win; counter higher than directories wins.
- [ ] `008-a`, `009-b` in directories → `010` (no octal error).
- [ ] Branches `1234-2`, `1234`, `PROJ-12` are ignored; `042-login-2` counts as 42.
- [ ] Called from inside a seh worktree (`.git/seh-worktrees/<task>`) → uses the same counter as the main checkout.
- [ ] Git disabled config (empty `agents.baseBranch`) with branch `050-x` present → number from directories only, `git: disabled`, no counter file created.
- [ ] Not a git repo → directories only, `git: disabled`.
- [ ] Lock dir already present → `BLOCKED:` naming the lock; exit 1; counter unchanged.
- [ ] Counter holds `abc` → `BLOCKED:` naming the file; exit 1.
- [ ] 5 parallel calls → 5 distinct numbers, counter = the highest.
- [ ] `agents/architect.md` has no "smallest positive integer" rule and tells the Architect to use `next-task`; its "no git scripts" lines name `next-task` as the exception.
- [ ] PRD: files tracker rule, Naming, script table row and the Architect sentence describe the same contract.
- [ ] Guide `trackers.md` and `setup.md` mention `next-task`.
- [ ] `seh install` copies `scripts/next-task` (executable) and not `next-task.test.js` (existing install tests stay green).
- [ ] Version / `CHANGELOG.md` per Q4.
- [ ] `npm test` green.

## Verification

1. `node --test scripts/next-task.test.js`
2. `npm test`
3. Diff review: `agents/architect.md`, `docs/prd.md`, `docs/guide/trackers.md`, `docs/guide/setup.md`, `CHANGELOG.md`, `package.json`.

## Files

- `scripts/next-task` (new, executable), `scripts/next-task.test.js` (new)
- `scripts/lib.sh` (only if a shared helper is needed)
- `agents/architect.md`
- `docs/prd.md`, `docs/guide/trackers.md`, `docs/guide/setup.md`
- `package.json`, `CHANGELOG.md`

Version: minor (Q4), shared 2.2.0.

## Depends on

None.
