# Shared helpers for .seh/scripts/ado. Sourced, not invoked.

. "$(dirname "$0")/lib.sh"

ado_json() {
  node "$(dirname "$0")/ado-json.js" "$@"
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
  _root=$(repo_root)
  if [ -f "$_root/harness.credentials.local.json" ]; then
    printf '%s/harness.credentials.local.json\n' "$_root"
    return 0
  fi
  _main=$(CDPATH= cd -- "$(dirname "$(abs_git_common_dir)")" && pwd)
  if [ -f "$_main/harness.credentials.local.json" ]; then
    printf '%s/harness.credentials.local.json\n' "$_main"
    return 0
  fi
  printf '%s/harness.credentials.local.json\n' "$_root"
}

require_tracker_config() {
  _cfg=$(config_path)
  if [ ! -f "$_cfg" ]; then
    blocked "harness.config.json is missing" "run /<prefix>setit-se in this project"
  fi
  if ! ado_json project "$_cfg" >/dev/null 2>&1; then
    blocked "Azure DevOps is not connected" "run /<prefix>setit-se and connect Azure DevOps"
  fi
}

load_ado() {
  require_git
  require_curl
  require_node
  require_tracker_config
  SEH_ADO_CFG=$(config_path)
  SEH_ADO_CREDS=$(credentials_path)
  if [ ! -f "$SEH_ADO_CREDS" ]; then
    blocked "Azure DevOps token is missing" "put adoPat in harness.credentials.local.json"
  fi
  SEH_ADO_CURL_CFG=$(mktemp)
  SEH_ADO_BODY=$(mktemp)
  trap 'rm -f "$SEH_ADO_CURL_CFG" "$SEH_ADO_BODY"' EXIT
  _curl_err=$(mktemp)
  if ! SEH_ADO_URL=$(ado_json curl-config "$SEH_ADO_CFG" "$SEH_ADO_CREDS" "$SEH_ADO_CURL_CFG" 2>"$_curl_err"); then
    _msg=$(cat "$_curl_err")
    rm -f "$_curl_err"
    case $_msg in
      missing-token)
        blocked "Azure DevOps token is missing" "put adoPat in harness.credentials.local.json"
        ;;
      wrong-kind|missing)
        blocked "Azure DevOps is not connected" "run /<prefix>setit-se and connect Azure DevOps"
        ;;
      *)
        blocked "Azure DevOps organization URL or project is missing" "run /<prefix>setit-se and connect Azure DevOps"
        ;;
    esac
  fi
  rm -f "$_curl_err"
  chmod 600 "$SEH_ADO_CURL_CFG" 2>/dev/null || true
}

ado_http() {
  _method=$1
  _path=$2
  _data=${3-}
  _url="${SEH_ADO_URL}${_path}"
  set -- curl --config "$SEH_ADO_CURL_CFG" --url "$_url" -X "$_method" -o "$SEH_ADO_BODY" -w '%{http_code}'
  if [ -n "$_data" ]; then
    set -- "$@" --data-binary "@$_data"
  fi
  SEH_ADO_CODE=$("$@") || blocked "Azure DevOps request failed" "check the organization URL and retry"
  case $SEH_ADO_CODE in
    2*)
      return 0
      ;;
  esac
  _err=$(ado_json http-error "$SEH_ADO_CODE" "$SEH_ADO_BODY" 2>/dev/null || printf '%s' "$SEH_ADO_CODE")
  blocked "Azure DevOps HTTP $_err" "fix the Azure DevOps mapping in /<prefix>setit-se or retry"
}

require_task() {
  if [ -z "${1-}" ]; then
    blocked "missing task id" "pass the numeric work item id"
  fi
  case $1 in
    -*)
      blocked "invalid task id $1" "pass a positive integer work item id, not an option"
      ;;
  esac
  case $1 in
    *[!0-9]*)
      blocked "invalid task id $1" "pass a positive integer work item id"
      ;;
  esac
  case $1 in
    0|"")
      blocked "invalid task id $1" "pass a positive integer work item id"
      ;;
  esac
}
