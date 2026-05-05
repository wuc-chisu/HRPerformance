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

# Safety sync: if schema changes were added without migrations,
# ensure production DB still matches current Prisma schema.
echo "🧩 Syncing Prisma schema (db push)..."
npx prisma db push

# Regenerate Prisma client to match current schema.
echo "⚙️  Generating Prisma client..."
npx prisma generate

# Seed default departments only if the table is empty.
echo "🌱 Checking departments..."
node prisma/seed-departments.cjs

echo "✅ Production database setup complete."
