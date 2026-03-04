#!/bin/bash
# Verify database is properly set up with all required tables

echo "🔍 Checking database setup..."

# Check if Department table exists
psql -U chisu -d hrperformance -c "SELECT 1 FROM \"Department\" LIMIT 1;" 2>/dev/null
if [ $? -ne 0 ]; then
  echo "⚠️  Department table missing. Running setup..."
  npx prisma migrate deploy
  if [ $? -ne 0 ]; then
    echo "❌ Migration failed"
    exit 1
  fi
  node prisma/seed-departments.cjs
  if [ $? -ne 0 ]; then
    echo "❌ Seeding failed"
    exit 1
  fi
  echo "✅ Database setup complete!"
else
  echo "✅ Database is properly configured"
fi
