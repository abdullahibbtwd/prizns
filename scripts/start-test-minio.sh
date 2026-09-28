#!/usr/bin/env bash
# Start the last free OSS MinIO server for local/CI API tests.
# Official Docker Hub + AIStor Quay images are removed or license-gated (2026).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DATA_DIR="${MINIO_TEST_DATA:-/tmp/prizn-minio-data}"
PID_FILE="${MINIO_TEST_PID:-/tmp/prizn-minio.pid}"
LOG_FILE="${MINIO_TEST_LOG:-/tmp/prizn-minio.log}"
ADDR="${MINIO_TEST_ADDR:-:9014}"
CONSOLE_ADDR="${MINIO_TEST_CONSOLE_ADDR:-:9015}"
RELEASE="${MINIO_OSS_RELEASE:-RELEASE.2025-09-07T16-13-09Z}"
RPM_VERSION="${MINIO_OSS_RPM_VERSION:-20250907161309.0.0-1}"
BIN_DIR="${ROOT_DIR}/.cache/minio-bin"
BIN="${BIN_DIR}/minio"

export MINIO_ROOT_USER="${MINIO_ROOT_USER:-minio_test}"
export MINIO_ROOT_PASSWORD="${MINIO_ROOT_PASSWORD:-minio_test_secret}"

if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "MinIO already running (pid $(cat "$PID_FILE"))"
  exit 0
fi

if [[ ! -x "$BIN" ]]; then
  mkdir -p "$BIN_DIR"
  RPM_URL="https://github.com/minio/minio/releases/download/${RELEASE}/minio-${RPM_VERSION}.x86_64.rpm"
  echo "Downloading OSS MinIO ${RELEASE}…"
  TMP="$(mktemp -d)"
  curl -fsSL -o "$TMP/minio.rpm" "$RPM_URL"
  if command -v rpm2cpio >/dev/null && command -v cpio >/dev/null; then
    (cd "$TMP" && rpm2cpio minio.rpm | cpio -idm)
  else
    # macOS / systems without rpm2cpio: use Docker only to extract the binary.
    if ! command -v docker >/dev/null; then
      echo "Need rpm2cpio+cpio or docker to extract the MinIO RPM" >&2
      exit 1
    fi
    docker run --rm -v "$TMP:/work" -w /work alpine:3.20 \
      sh -c "apk add --no-cache rpm2cpio cpio >/dev/null && rpm2cpio minio.rpm | cpio -idm"
  fi
  FOUND="$(find "$TMP" -type f -name minio | head -1)"
  if [[ -z "$FOUND" ]]; then
    echo "MinIO binary not found inside RPM" >&2
    exit 1
  fi
  install -m 755 "$FOUND" "$BIN"
  rm -rf "$TMP"
fi

mkdir -p "$DATA_DIR"
nohup "$BIN" server "$DATA_DIR" --address "$ADDR" --console-address "$CONSOLE_ADDR" \
  >"$LOG_FILE" 2>&1 &
echo $! >"$PID_FILE"

PORT="${ADDR##*:}"
for _ in $(seq 1 40); do
  if curl -sf "http://127.0.0.1:${PORT}/minio/health/live" >/dev/null; then
    echo "MinIO ready on ${ADDR}"
    exit 0
  fi
  sleep 0.5
done

echo "MinIO failed to become healthy; log:" >&2
tail -n 80 "$LOG_FILE" >&2 || true
exit 1
