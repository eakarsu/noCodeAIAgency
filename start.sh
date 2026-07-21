#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_root="${RUNTIME_PROJECT_SOURCE:-$script_dir}"
cd "$project_root"

runtime_port="${PORT:-}"
if [[ ! "$runtime_port" =~ ^[0-9]+$ ]] || (( runtime_port < 1024 || runtime_port > 65535 )); then
  echo "ERROR: PORT must be an explicitly assigned numeric port between 1024 and 65535." >&2
  exit 1
fi
if lsof -tiTCP:"$runtime_port" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "ERROR: assigned port $runtime_port is already occupied." >&2
  exit 1
fi

if [ "${NODE_ENV:-}" != "production" ]; then
  echo "Starting isolated non-production validation on assigned port ${runtime_port}."
  exec npm run dev -- --hostname 127.0.0.1 --port "$runtime_port"
fi

export HOSTNAME=127.0.0.1 PORT="$runtime_port"
echo "Starting the pre-built application without installing dependencies, changing the database, seeding data, or terminating other processes."
exec npm run start
