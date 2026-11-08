# Shared helpers for dhs git/gh allowlist scripts. Sourced, not invoked.
# Reads harness.config.json at the consuming project's git root, not inside the dhs package.

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

current_branch() {
  git rev-parse --abbrev-ref HEAD
}

config_path() {
  printf '%s/harness.config.json\n' "$(repo_root)"
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

# Sets DHS_BASE_BRANCH. Must not be called from command substitution
# (BLOCKED: has to print on the script's stdout).
read_base_branch() {
  _cfg=$(config_path)
  if [ ! -f "$_cfg" ]; then
    blocked "harness.config.json is missing" "run /dhs-setup in this project"
  fi
  DHS_BASE_BRANCH=
  if ! DHS_BASE_BRANCH=$(_extract_base_branch "$_cfg"); then
    blocked "agents.baseBranch is missing from harness.config.json" "run /dhs-setup and set the base git branch"
  fi
  if [ -z "$DHS_BASE_BRANCH" ]; then
    blocked "agents.baseBranch is missing from harness.config.json" "run /dhs-setup and set the base git branch"
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

# Sets DHS_REMOTE. Must not be called from command substitution.
push_remote() {
  if git remote | grep -qx origin; then
    DHS_REMOTE=origin
    return 0
  fi
  _n=$(git remote | wc -l)
  _n=$(printf '%s' "$_n" | tr -d ' ')
  if [ "$_n" = "1" ]; then
    DHS_REMOTE=$(git remote)
    return 0
  fi
  blocked "no git remote named origin" "add a remote and retry"
}
