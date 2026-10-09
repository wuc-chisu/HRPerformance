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

# Regenerate Prisma client to match current schema.
echo "⚙️  Generating Prisma client..."
npx prisma generate

echo "✅ Production database setup complete."
