#!/usr/bin/env bash
set -euo pipefail
PID_FILE="${MINIO_TEST_PID:-/tmp/prizn-minio.pid}"
if [[ -f "$PID_FILE" ]]; then
  pid="$(cat "$PID_FILE")"
  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid" 2>/dev/null || true
    wait "$pid" 2>/dev/null || true
    echo "Stopped MinIO (pid $pid)"
  fi
  rm -f "$PID_FILE"
fi
