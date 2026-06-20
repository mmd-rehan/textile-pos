#!/usr/bin/env sh
#
# Backend container entrypoint.
#
# Mirrors what `npm run setup` does to the database, then starts the API:
#   1. wait for MySQL to actually answer a query (belt-and-suspenders on top of
#      the compose `depends_on: service_healthy` condition)
#   2. prisma migrate deploy   (migrations only — never `prisma db push`)
#   3. prisma db seed          (STANDARD system seed; idempotent + production-safe)
#   4. node dist/main.js
#
# Fail-fast: `set -e` means a failed migration or seed exits non-zero and the
# container does NOT start the API against a half-initialised database.
#
# Dev/demo data is created ONLY when SEED_DEV_DATA=true — that flag is read inside
# prisma/seed.ts, so the default `prisma db seed` below seeds system data only.
# Secrets (DATABASE_URL, JWT_SECRET, passwords) are never echoed by this script.

set -e

SCHEMA="prisma/schema.prisma"

# ts-node only needs to transpile the seed (the project is already type-checked at
# build time); transpile-only keeps startup fast and avoids type-checking the seed
# against the slim runtime.
export TS_NODE_TRANSPILE_ONLY=1

echo "==> Waiting for the database to become reachable..."
attempt=0
max_attempts=30            # 30 x 2s = up to ~60s
until echo 'SELECT 1;' | npx prisma db execute --stdin --schema "$SCHEMA" >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "ERROR: database was not reachable after ${max_attempts} attempts (~60s)." >&2
    echo "       Check the mysql service and DATABASE_URL host/credentials." >&2
    exit 1
  fi
  echo "    not ready yet (attempt ${attempt}/${max_attempts}); retrying in 2s..."
  sleep 2
done
echo "==> Database is reachable."

echo "==> Running database migrations..."
npx prisma migrate deploy

echo "==> Running standard seed..."
npx prisma db seed

echo "==> Starting backend..."
exec node dist/main.js
