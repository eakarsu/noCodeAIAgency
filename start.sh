#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_root="${RUNTIME_PROJECT_SOURCE:-$script_dir}"
cd "$project_root"
if [[ -f "$project_root/.env" ]]; then
  set -a
  source "$project_root/.env"
  set +a
fi

runtime_port="${BACKEND_PORT:-${PORT:-}}"
frontend_port="${FRONTEND_PORT:-}"
if [[ ! "$runtime_port" =~ ^[0-9]+$ ]] || (( runtime_port < 1024 || runtime_port > 65535 )); then
  echo "ERROR: PORT must be an explicitly assigned numeric port between 1024 and 65535." >&2
  exit 1
fi
if lsof -tiTCP:"$runtime_port" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "ERROR: assigned port $runtime_port is already occupied." >&2
  exit 1
fi
if [[ -n "$frontend_port" ]]; then
  if [[ ! "$frontend_port" =~ ^[0-9]+$ ]] || (( frontend_port < 1024 || frontend_port > 65535 )) || [[ "$frontend_port" == "$runtime_port" ]]; then
    echo "ERROR: FRONTEND_PORT must be a distinct numeric port between 1024 and 65535." >&2
    exit 1
  fi
  if lsof -tiTCP:"$frontend_port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "ERROR: assigned frontend port $frontend_port is already occupied." >&2
    exit 1
  fi
fi

if [ "${NODE_ENV:-}" != "production" ]; then
  echo "Starting isolated non-production validation on assigned port ${runtime_port}."
  start_command=(npm run dev -- --hostname 127.0.0.1 --port "$runtime_port")
else
  export HOSTNAME=127.0.0.1 PORT="$runtime_port"
  echo "Starting the pre-built application without installing dependencies, changing the database, seeding data, or terminating other processes."
  start_command=(npm run start)
fi

if [[ -z "$frontend_port" ]]; then
  exec "${start_command[@]}"
fi

"${start_command[@]}" &
application_pid=$!
BACKEND_PORT="$runtime_port" FRONTEND_PORT="$frontend_port" node scripts/runtime-ui-proxy.mjs &
proxy_pid=$!
cleanup() {
  trap - INT TERM EXIT
  kill "$application_pid" "$proxy_pid" 2>/dev/null || true
}
trap cleanup INT TERM EXIT
while kill -0 "$application_pid" 2>/dev/null && kill -0 "$proxy_pid" 2>/dev/null; do
  sleep 1
done
cleanup
set +e
wait "$application_pid"; application_status=$?
wait "$proxy_pid"; proxy_status=$?
set -e
if (( application_status != 0 || proxy_status != 0 )); then
  echo "ERROR: a child service exited unexpectedly (application=$application_status proxy=$proxy_status)." >&2
  exit 1
fi
