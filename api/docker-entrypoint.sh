#!/bin/sh
set -e

echo "[boot] Running prisma migrate deploy..."
npx prisma migrate deploy

# Idempotent upserts (admin + journal). Default on; set SEED_ON_BOOT=false to skip.
if [ "${SEED_ON_BOOT:-true}" = "true" ]; then
  echo "[boot] Running database seed..."
  node prisma/run-seed.cjs
else
  echo "[boot] Skipping seed (SEED_ON_BOOT=${SEED_ON_BOOT})"
fi

echo "[boot] Starting API..."
exec node dist/main.js
