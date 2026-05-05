#!/bin/bash
# Production database setup — runs on every deployment.
# Safe to run multiple times (idempotent).

set -e

echo "🔍 Starting production database setup..."

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL is not set. Aborting."
  exit 1
fi

# Apply any pending migrations (safe: skips already-applied ones).
echo "📦 Running Prisma migrations..."
npx prisma migrate deploy

# Pre-sync cleanup for known schema constraints.
echo "🧹 Running pre-sync data cleanup..."
node scripts/pre-db-push-fixes.cjs

# Safety sync: if schema changes were added without migrations,
# ensure production DB still matches current Prisma schema.
echo "🧩 Syncing Prisma schema (db push)..."
if npx prisma db push; then
  echo "✅ Prisma db push completed"
else
  if [ "${ALLOW_DB_PUSH_DATA_LOSS:-false}" = "true" ]; then
    echo "⚠️  Retrying db push with --accept-data-loss because ALLOW_DB_PUSH_DATA_LOSS=true"
    npx prisma db push --accept-data-loss
  else
    echo "❌ Prisma db push failed due to a potential data-loss change."
    echo "   Fix conflicting data first, or set ALLOW_DB_PUSH_DATA_LOSS=true to allow startup fallback."
    exit 1
  fi
fi

# Regenerate Prisma client to match current schema.
echo "⚙️  Generating Prisma client..."
npx prisma generate

# Seed default departments only if the table is empty.
echo "🌱 Checking departments..."
node prisma/seed-departments.cjs

echo "✅ Production database setup complete."
