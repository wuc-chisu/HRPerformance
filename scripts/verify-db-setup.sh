#!/bin/bash
# Verify database schema and seed baseline data when needed.

set -e

echo "🔍 Checking database setup..."

# Keep schema in sync for local/dev databases that may not have Prisma migration history.
PAGER=cat npx prisma db push >/dev/null

# Seed default departments only if table is empty.
DEPT_COUNT=$(psql -U chisu -d hrperformance -tAc "SELECT COUNT(*) FROM \"Department\";" 2>/dev/null || echo "0")
if [ "$DEPT_COUNT" = "0" ]; then
  echo "⚠️  Department table is empty. Seeding defaults..."
  node prisma/seed-departments.cjs
fi

echo "✅ Database is properly configured"
