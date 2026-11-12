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
  printf '%s/harness.config.json\n' "$(repo_root)"
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

# Print agents.baseBranch. Empty result means missing or invalid.
_extract_base_branch() {
  _cfg=$1
  if command -v node >/dev/null 2>&1; then
    node -e '
var fs = require("fs");
var c = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
var b = c && c.agents && c.agents.baseBranch;
if (typeof b !== "string" || !String(b).trim()) process.exit(1);
    process.stdout.write(String(b).trim());
' "$_cfg"
    return $?
  fi
  if command -v python3 >/dev/null 2>&1; then
    python3 -c '
import json, sys
c = json.load(open(sys.argv[1], encoding="utf-8"))
b = (c.get("agents") or {}).get("baseBranch")
if not isinstance(b, str) or not b.strip():
    sys.exit(1)
sys.stdout.write(b.strip())
' "$_cfg"
    return $?
  fi
  tr -d '\n' < "$_cfg" | sed -n 's/.*"baseBranch"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p'
}

# Sets SEH_BASE_BRANCH. Must not be called from command substitution
# (BLOCKED: has to print on the script's stdout).
read_base_branch() {
  _cfg=$(config_path)
  if [ ! -f "$_cfg" ]; then
    blocked "harness.config.json is missing" "run /{{prefix}}setit-se in this project"
  fi
  SEH_BASE_BRANCH=
  if ! SEH_BASE_BRANCH=$(_extract_base_branch "$_cfg"); then
    blocked "agents.baseBranch is missing from harness.config.json" "run /{{prefix}}setit-se and set the base git branch"
  fi
  if [ -z "$SEH_BASE_BRANCH" ]; then
    blocked "agents.baseBranch is missing from harness.config.json" "run /{{prefix}}setit-se and set the base git branch"
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
