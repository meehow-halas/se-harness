# Shared helpers for .seh/scripts/jira. Sourced, not invoked.

. "$(dirname "$0")/lib.sh"

jira_json() {
  node "$(dirname "$0")/jira-json.js" "$@"
}

require_curl() {
  if ! command -v curl >/dev/null 2>&1; then
    blocked "curl is not available" "install curl and retry this script"
  fi
}

require_node() {
  if ! command -v node >/dev/null 2>&1; then
    blocked "node is not available" "install Node.js and retry this script"
  fi
}

credentials_path() {
  _root=$(project_root)
  if [ -f "$_root/harness.credentials.local.json" ]; then
    printf '%s/harness.credentials.local.json\n' "$_root"
    return 0
  fi
  _main=
  if git rev-parse --git-common-dir >/dev/null 2>&1; then
    _main=$(CDPATH= cd -- "$(dirname "$(abs_git_common_dir)")" && pwd)
  fi
  if [ -n "$_main" ] && [ -f "$_main/harness.credentials.local.json" ]; then
    printf '%s/harness.credentials.local.json\n' "$_main"
    return 0
  fi
  printf '%s/harness.credentials.local.json\n' "$_root"
}

require_tracker_config() {
  _cfg=$(config_path)
  if [ ! -f "$_cfg" ]; then
    blocked "harness.config.json is missing" "run /{{prefix}}setit-se in this project"
  fi
  if ! jira_json project-key "$_cfg" >/dev/null 2>&1; then
    blocked "Jira is not connected" "run /{{prefix}}setit-se and connect Jira"
  fi
}

load_jira() {
  require_curl
  require_node
  require_tracker_config
  SEH_JIRA_CFG=$(config_path)
  SEH_JIRA_CREDS=$(credentials_path)
  if [ ! -f "$SEH_JIRA_CREDS" ]; then
    blocked "Jira token is missing" "put jiraToken in harness.credentials.local.json"
  fi
  SEH_JIRA_CURL_CFG=$(mktemp)
  SEH_JIRA_BODY=$(mktemp)
  trap 'rm -f "$SEH_JIRA_CURL_CFG" "$SEH_JIRA_BODY"' EXIT
  _curl_err=$(mktemp)
  if ! SEH_JIRA_URL=$(jira_json curl-config "$SEH_JIRA_CFG" "$SEH_JIRA_CREDS" "$SEH_JIRA_CURL_CFG" 2>"$_curl_err"); then
    _msg=$(cat "$_curl_err")
    rm -f "$_curl_err"
    case $_msg in
      missing-token)
        blocked "Jira token is missing" "put jiraToken in harness.credentials.local.json"
        ;;
      missing)
        blocked "Jira is not connected" "run /{{prefix}}setit-se and connect Jira"
        ;;
      *)
        blocked "Jira URL or user is missing" "run /{{prefix}}setit-se and connect Jira"
        ;;
    esac
  fi
  rm -f "$_curl_err"
  chmod 600 "$SEH_JIRA_CURL_CFG" 2>/dev/null || true
}

jira_http() {
  _method=$1
  _path=$2
  _data=${3-}
  _url="${SEH_JIRA_URL}${_path}"
  set -- curl --config "$SEH_JIRA_CURL_CFG" --url "$_url" -X "$_method" -o "$SEH_JIRA_BODY" -w '%{http_code}'
  if [ -n "$_data" ]; then
    set -- "$@" --data-binary "@$_data"
  fi
  SEH_JIRA_CODE=$("$@") || blocked "Jira request failed" "check the Jira URL and retry"
  case $SEH_JIRA_CODE in
    2*)
      return 0
      ;;
  esac
  _err=$(jira_json http-error "$SEH_JIRA_CODE" "$SEH_JIRA_BODY" 2>/dev/null || printf '%s' "$SEH_JIRA_CODE")
  blocked "Jira HTTP $_err" "fix the Jira mapping in /{{prefix}}setit-se or retry"
}

read_body_file() {
  _file=${1-}
  if [ -n "$_file" ]; then
    if [ ! -f "$_file" ]; then
      blocked "body file $_file does not exist" "pass --file with a readable path, or stdin"
    fi
    printf '%s\n' "$_file"
    return 0
  fi
  _tmp=$(mktemp)
  cat > "$_tmp"
  printf '%s\n' "$_tmp"
}

# Hard guard: agents.tracker.readOnly true means no write verb reaches the
# tracker. Runs before credentials are read and before any curl.
guard_read_only() {
  _ro_cfg=$(config_path)
  if [ ! -f "$_ro_cfg" ] || ! command -v node >/dev/null 2>&1; then
    return 0
  fi
  if [ "$(jira_json read-only "$_ro_cfg" 2>/dev/null)" = "true" ]; then
    blocked "tracker is read-only" "edit repo files (agents.tracker.readOnly)"
  fi
}
