# Shared helpers for seh git/gh allowlist scripts. Sourced, not invoked.
# Reads harness.config.json at the consuming project's git root, not inside the seh package.

set -eu

blocked() {
  printf 'BLOCKED: %s — %s\n' "$1" "$2"
  exit 1
}

ok() {
  printf 'OK\n'
  for _line in "$@"; do
    printf '%s\n' "$_line"
  done
  exit 0
}

unchanged() {
  printf 'UNCHANGED\n'
  for _line in "$@"; do
    printf '%s\n' "$_line"
  done
  exit 0
}

require_git() {
  if ! command -v git >/dev/null 2>&1; then
    blocked "git is not available" "install git and retry this script"
  fi
  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    blocked "this directory is not a git repository" "run the script from the project repository"
  fi
}

repo_root() {
  git rev-parse --show-toplevel
}

# Project root: the git toplevel when there is a repo, else the current
# directory. Lets the scripts read harness.config.json when git is disabled.
project_root() {
  if _pr=$(git rev-parse --show-toplevel 2>/dev/null) && [ -n "$_pr" ]; then
    printf '%s\n' "$_pr"
    return 0
  fi
  pwd
}

abs_git_common_dir() {
  _g=$(git rev-parse --git-common-dir)
  CDPATH= cd -- "$_g" && pwd
}

seh_worktree_path() {
  printf '%s/seh-worktrees/%s\n' "$(abs_git_common_dir)" "$1"
}

# Print the worktree directory that has $1 checked out, or empty.
worktree_path_for_branch() {
  git worktree list --porcelain | awk -v want="refs/heads/$1" '
    $1 == "worktree" {
      wt = $2
      for (i = 3; i <= NF; i++) wt = wt " " $i
    }
    $1 == "branch" && $2 == want { print wt; exit }
  '
}

is_seh_worktree() {
  _root=$(repo_root)
  _prefix="$(abs_git_common_dir)/seh-worktrees/"
  case $_root in
    "$_prefix"*)
      return 0
      ;;
  esac
  return 1
}

link_if_missing() {
  _src=$1
  _dst=$2
  if [ -e "$_dst" ] || [ -L "$_dst" ]; then
    return 0
  fi
  if [ -e "$_src" ] || [ -L "$_src" ]; then
    ln -s "$_src" "$_dst"
  fi
}

sync_launch_files() {
  _launch=$1
  _wt=$2
  _task=$3
  if [ "$_launch" = "$_wt" ]; then
    return 0
  fi
  for _rel in \
    "docs/features/${_task}.feature.md" \
    "docs/prompt/${_task}.prompt.md" \
    "docs/feature-log/${_task}.log.md"; do
    if [ -f "$_launch/$_rel" ]; then
      if [ -f "$_wt/$_rel" ] && [ -n "$(git -C "$_wt" status --porcelain -- "$_rel")" ]; then
        # The worktree already holds uncommitted work on this file (the
        # Implementer or Reviewer wrote it there). A launch copy is stale
        # relative to that work: leave both files alone, do not overwrite.
        continue
      fi
      mkdir -p "$_wt/$(dirname "$_rel")"
      cp "$_launch/$_rel" "$_wt/$_rel"
      _st=$(git -C "$_launch" status --porcelain -- "$_rel")
      _xy=$(printf '%s\n' "$_st" | cut -c1-2)
      if [ -z "$_st" ]; then
        :
      elif [ "$_xy" = "??" ]; then
        rm -f "$_launch/$_rel"
      else
        git -C "$_launch" restore --source=HEAD --worktree --staged -- "$_rel"
      fi
    fi
  done
  link_if_missing "$_launch/.seh" "$_wt/.seh"
  link_if_missing "$_launch/harness.config.json" "$_wt/harness.config.json"
}

current_branch() {
  git rev-parse --abbrev-ref HEAD
}

# Print the branch that holds task $1: the branch checked out in its seh
# worktree when there is one (it may be <task>-N), else the task name.
task_branch() {
  _t=$1
  _wt=$(seh_worktree_path "$_t")
  if [ -d "$_wt" ]; then
    _b=$(git -C "$_wt" rev-parse --abbrev-ref HEAD 2>/dev/null || true)
    if [ -n "$_b" ] && [ "$_b" != "HEAD" ]; then
      printf '%s\n' "$_b"
      return 0
    fi
  fi
  printf '%s\n' "$_t"
}

# Exit 0 when branch $1 has a pull request that is closed or merged and no
# open one: its history belongs to an old PR, so new work must not add to it.
# Without gh (or without an answer) the branch is not treated as historical.
branch_is_historical() {
  command -v gh >/dev/null 2>&1 || return 1
  _states=$(gh pr list --head "$1" --state all --json state --jq '[.[].state] | join(" ")' 2>/dev/null) || return 1
  case " $_states " in
    *" OPEN "*) return 1 ;;
  esac
  case " $_states " in
    *" MERGED "*|*" CLOSED "*) return 0 ;;
  esac
  return 1
}

# Print the first free name <task>-N (N >= 2) with no local or remote branch.
next_task_branch() {
  _n=2
  while :; do
    _cand="$1-$_n"
    if ! local_branch_exists "$_cand" && ! remote_branch_exists "$_cand"; then
      printf '%s\n' "$_cand"
      return 0
    fi
    _n=$((_n + 1))
  done
}

config_path() {
  printf '%s/harness.config.json\n' "$(project_root)"
}

# Print agents.commitTrailer (one trailer line, e.g. "Co-Authored-By: Name <mail>")
# when it is set in harness.config.json; print nothing when it is absent or empty.
read_commit_trailer() {
  _cfg=$(config_path)
  if [ ! -f "$_cfg" ]; then
    return 0
  fi
  if command -v node >/dev/null 2>&1; then
    node -e '
var fs = require("fs");
var c = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
var t = c && c.agents && c.agents.commitTrailer;
if (typeof t === "string" && t.trim()) process.stdout.write(t.trim());
' "$_cfg" || true
    return 0
  fi
  if command -v python3 >/dev/null 2>&1; then
    python3 -c '
import json, sys
c = json.load(open(sys.argv[1], encoding="utf-8"))
t = (c.get("agents") or {}).get("commitTrailer")
if isinstance(t, str) and t.strip():
    sys.stdout.write(t.strip())
' "$_cfg" || true
  fi
}

# Print agents.baseBranch. Exit 0 with the (trimmed) value; empty output with
# exit 0 means the key is present but empty or null (git disabled). Exit 3
# means the key is absent or not a string; exit 2 means unreadable JSON.
_extract_base_branch() {
  _cfg=$1
  if command -v node >/dev/null 2>&1; then
    node -e '
var fs = require("fs");
var c;
try { c = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); } catch (e) { process.exit(2); }
var a = c && c.agents;
if (!a || typeof a !== "object" || !("baseBranch" in a)) process.exit(3);
var b = a.baseBranch;
if (b === null) process.exit(0);
if (typeof b !== "string") process.exit(3);
process.stdout.write(b.trim());
' "$_cfg"
    return $?
  fi
  if command -v python3 >/dev/null 2>&1; then
    python3 -c '
import json, sys
try:
    c = json.load(open(sys.argv[1], encoding="utf-8"))
except Exception:
    sys.exit(2)
a = c.get("agents") if isinstance(c, dict) else None
if not isinstance(a, dict) or "baseBranch" not in a:
    sys.exit(3)
b = a["baseBranch"]
if b is None:
    sys.exit(0)
if not isinstance(b, str):
    sys.exit(3)
sys.stdout.write(b.strip())
' "$_cfg"
    return $?
  fi
  _flat=$(tr -d '\n' < "$_cfg")
  case $_flat in
    *'"baseBranch"'*) ;;
    *) return 3 ;;
  esac
  printf '%s' "$_flat" | sed -n 's/.*"baseBranch"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'
}

# Print agents.reportChange as "true" or "false". Missing config file or missing
# key = true. Exit 2 when harness.config.json is unreadable JSON or the value is
# not a boolean.
read_report_change() {
  _cfg=$(config_path)
  if [ ! -f "$_cfg" ]; then
    printf 'true'
    return 0
  fi
  if ! command -v node >/dev/null 2>&1; then
    return 2
  fi
  node -e '
var fs = require("fs");
var c;
try { c = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); } catch (e) { process.exit(2); }
var a = c && c.agents;
if (!a || typeof a !== "object" || !("reportChange" in a)) { process.stdout.write("true"); process.exit(0); }
var v = a.reportChange;
if (v === true || v === false) { process.stdout.write(String(v)); process.exit(0); }
process.exit(2);
' "$_cfg"
}

# Git is disabled when harness.config.json exists and agents.baseBranch is
# present but empty or null. Call before require_git. Prints UNCHANGED with
# "git: disabled" plus any extra lines passed in, then exits 0. Returns
# normally when git is enabled or the config cannot decide (the usual
# BLOCKED: checks then run).
git_gate() {
  _cfg=$(config_path)
  if [ ! -f "$_cfg" ]; then
    return 0
  fi
  _gb=$(_extract_base_branch "$_cfg") || return 0
  if [ -z "$_gb" ]; then
    unchanged "git: disabled" "$@"
  fi
  return 0
}

# Exit 0 when git operation $1 (worktree|commit|push|pr) is enabled in
# agents.git, 1 when it is disabled. No agents.git (or no config) = all enabled.
# The operations form a chain: one is enabled only when it and every operation
# before it are true. Must not be called from command substitution.
git_op_enabled() {
  _cfg=$(config_path)
  if [ ! -f "$_cfg" ]; then
    return 0
  fi
  _orc=0
  if command -v node >/dev/null 2>&1; then
    node -e '
var fs = require("fs");
var c;
try { c = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); } catch (e) { process.exit(0); }
var a = c && c.agents;
if (!a || typeof a !== "object" || !("git" in a)) process.exit(0);
var g = a.git || {};
var chain = ["worktree", "commit", "push", "pr"];
var need = chain.slice(0, chain.indexOf(process.argv[2]) + 1);
process.exit(need.every(function (k) { return g[k] === true; }) ? 0 : 1);
' "$_cfg" "$1" || _orc=$?
    return "$_orc"
  fi
  if command -v python3 >/dev/null 2>&1; then
    python3 -c '
import json, sys
try:
    c = json.load(open(sys.argv[1], encoding="utf-8"))
except Exception:
    sys.exit(0)
a = c.get("agents") if isinstance(c, dict) else None
if not isinstance(a, dict) or "git" not in a:
    sys.exit(0)
g = a["git"] if isinstance(a["git"], dict) else {}
chain = ["worktree", "commit", "push", "pr"]
need = chain[:chain.index(sys.argv[2]) + 1]
sys.exit(0 if all(g.get(k) is True for k in need) else 1)
' "$_cfg" "$1" || _orc=$?
    return "$_orc"
  fi
  case $(tr -d '\n' < "$_cfg") in
    *'"git"'*) blocked "cannot read agents.git without node or python3" "install node, then retry" ;;
  esac
  return 0
}

# Guard for the script of git operation $1. $2 is the --user-request value
# (empty when the flag was not passed): the user's explicit request runs this one
# operation. Otherwise a disabled operation prints UNCHANGED with
# "git: <op> disabled" plus any extra lines passed in, then exits 0.
git_op_gate() {
  _op=$1
  _req=$2
  shift 2
  if [ -n "$_req" ] || git_op_enabled "$_op"; then
    return 0
  fi
  unchanged "git: $_op disabled" "$@"
}

# BLOCKED when a --user-request value ($1) carries no words.
require_user_request() {
  if [ -z "$(printf '%s' "${1-}" | tr -d '[:space:]')" ]; then
    blocked "empty --user-request" "pass the user's own words"
  fi
}

# Sets SEH_BASE_BRANCH. Must not be called from command substitution
# (BLOCKED: has to print on the script's stdout).
read_base_branch() {
  _cfg=$(config_path)
  if [ ! -f "$_cfg" ]; then
    blocked "harness.config.json is missing" "run /{{prefix}}setit-se in this project"
  fi
  SEH_BASE_BRANCH=
  _rc=0
  SEH_BASE_BRANCH=$(_extract_base_branch "$_cfg") || _rc=$?
  if [ "$_rc" -ne 0 ]; then
    blocked "agents.baseBranch is missing from harness.config.json" "run /{{prefix}}setit-se and set the base git branch"
  fi
  if [ -z "$SEH_BASE_BRANCH" ]; then
    unchanged "git: disabled"
  fi
}

require_task() {
  if [ -z "${1-}" ]; then
    blocked "missing task branch name" "pass the task basename or issue key"
  fi
  case $1 in
    -*)
      blocked "invalid task branch name $1" "pass the task basename or issue key, not an option"
      ;;
  esac
}

require_not_base() {
  _task=$1
  _base=$2
  if [ "$_task" = "$_base" ]; then
    blocked "task branch $_task is the configured base branch" "use the task basename or issue key, not agents.baseBranch"
  fi
}

local_branch_exists() {
  git show-ref --verify --quiet "refs/heads/$1"
}

remote_branch_exists() {
  git show-ref --verify --quiet "refs/remotes/origin/$1"
}

require_on_task() {
  _task=$1
  _cur=$(current_branch)
  if [ "$_cur" = "HEAD" ]; then
    blocked "detached HEAD" "check out the task branch $_task and retry"
  fi
  if [ "$_cur" != "$_task" ]; then
    blocked "checkout is $_cur, not task branch $_task" "run start-task $_task, then retry"
  fi
}

# Sets SEH_REMOTE. Must not be called from command substitution.
push_remote() {
  if git remote | grep -qx origin; then
    SEH_REMOTE=origin
    return 0
  fi
  _n=$(git remote | wc -l)
  _n=$(printf '%s' "$_n" | tr -d ' ')
  if [ "$_n" = "1" ]; then
    SEH_REMOTE=$(git remote)
    return 0
  fi
  blocked "no git remote named origin" "add a remote and retry"
}
