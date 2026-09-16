#!/bin/sh
# Copy the generated leftover-redirect map onto host Nginx.
# Backs up /etc/nginx/redirects.map and restores it if `nginx -t` fails.
#
# From the compose project directory on the VPS (after generating the map):
#   sh deploy/nginx/apply-legacy-redirects.sh
#
# Optional environment:
#   MAP_HOST=/etc/nginx/redirects.map
#   CONTAINER_MAP=/tmp/redirects.map
#   API_SERVICE=api
#   NGINX=/usr/sbin/nginx
#   NGINX_RELOAD='/etc/rc.d/rc.nginx reload'
#   RETRIES=3
#   KEEP_BACKUPS=5

set -eu

MAP_HOST="${MAP_HOST:-/etc/nginx/redirects.map}"
CONTAINER_MAP="${CONTAINER_MAP:-/tmp/redirects.map}"
API_SERVICE="${API_SERVICE:-api}"
NGINX="${NGINX:-/usr/sbin/nginx}"
NGINX_RELOAD="${NGINX_RELOAD:-/etc/rc.d/rc.nginx reload}"
RETRIES="${RETRIES:-3}"
KEEP_BACKUPS="${KEEP_BACKUPS:-5}"
TMP_COPY="${TMP_COPY:-/tmp/redirects.map.incoming}"

log() {
  printf '%s\n' "$*" >&2
}

die() {
  log "error: $*"
  exit 1
}

retry() {
  _attempt=1
  _max="$1"
  shift
  while [ "$_attempt" -le "$_max" ]; do
    if "$@"; then
      return 0
    fi
    log "retry $_attempt/$_max failed: $*"
    if [ "$_attempt" -eq "$_max" ]; then
      return 1
    fi
    sleep $((_attempt * 2))
    _attempt=$((_attempt + 1))
  done
}

api_container() {
  if [ -n "${API_CONTAINER:-}" ]; then
    printf '%s\n' "$API_CONTAINER"
    return 0
  fi
  if docker compose ps -q "$API_SERVICE" >/dev/null 2>&1; then
    docker compose ps -q "$API_SERVICE"
    return 0
  fi
  docker-compose ps -q "$API_SERVICE"
}

prune_host_backups() {
  _dir=$(dirname "$MAP_HOST")
  _base=$(basename "$MAP_HOST")
  _keep="$1"
  # Newest first; drop extras. Portable (no xargs -r / ls --sort).
  set -- "$_dir"/$_base.bak.*
  [ -e "$1" ] || return 0
  _count=0
  for _file in $(ls -t "$_dir"/$_base.bak.* 2>/dev/null); do
    _count=$((_count + 1))
    if [ "$_count" -gt "$_keep" ]; then
      rm -f "$_file"
    fi
  done
}

restore_backup() {
  _backup="$1"
  if [ -n "$_backup" ] && [ -f "$_backup" ]; then
    log "restoring $_backup → $MAP_HOST"
    cp -p "$_backup" "$MAP_HOST"
  fi
}

CONTAINER=$(api_container) || die "could not find $API_SERVICE container"
[ -n "$CONTAINER" ] || die "could not find $API_SERVICE container"

log "copying $CONTAINER:$CONTAINER_MAP → $TMP_COPY"
retry "$RETRIES" docker cp "$CONTAINER:$CONTAINER_MAP" "$TMP_COPY" \
  || die "docker cp failed after $RETRIES attempts — host map was not touched"

[ -s "$TMP_COPY" ] || die "copied map is empty — host map was not touched"

HOST_BACKUP=""
if [ -f "$MAP_HOST" ]; then
  HOST_BACKUP="$MAP_HOST.bak.$(date +%Y%m%dT%H%M%S).$$"
  cp -p "$MAP_HOST" "$HOST_BACKUP"
  log "backed up $MAP_HOST → $HOST_BACKUP"
  prune_host_backups "$KEEP_BACKUPS"
fi

cp -p "$TMP_COPY" "$MAP_HOST"
log "installed $MAP_HOST"

if ! "$NGINX" -t; then
  log "nginx -t failed; rolling back"
  restore_backup "$HOST_BACKUP"
  if [ -f "$MAP_HOST" ]; then
    "$NGINX" -t || die "rollback also failed nginx -t"
  fi
  die "new redirects.map rejected; previous map restored"
fi

# shellcheck disable=SC2086
retry "$RETRIES" sh -c "$NGINX_RELOAD" || {
  log "reload failed; rolling back"
  restore_backup "$HOST_BACKUP"
  "$NGINX" -t && sh -c "$NGINX_RELOAD" || true
  die "nginx reload failed; previous map restored if a backup existed"
}

log "ok: leftover redirects applied ($(wc -l < "$MAP_HOST") lines)"
