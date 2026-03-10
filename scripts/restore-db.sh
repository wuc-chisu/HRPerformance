#!/bin/bash

# Database restore script
# Usage: ./scripts/restore-db.sh [backup_file]

BACKUP_DIR="backups"

# Use PostgreSQL 15 tools (explicit path to avoid version mismatch)
PSQL="/usr/local/Cellar/postgresql@15/15.15_1/bin/psql"

# Fallback to default if PostgreSQL 15 not found
if [ ! -x "$PSQL" ]; then
  # Try to find any available psql
  PSQL=$(find /usr/local/Cellar/postgresql@*/*/bin/psql -type f 2>/dev/null | sort -V | tail -1)
  if [ -z "$PSQL" ]; then
    # Last resort: use whatever is in PATH
    PSQL=$(command -v psql)
    if [ -z "$PSQL" ]; then
      echo "❌ psql not found!"
      exit 1
    fi
  fi
fi
    echo "Available backups:"
    ls -lh "$BACKUP_DIR"/*.sql 2>/dev/null || echo "No backups found"
    echo ""
    echo "Usage: ./scripts/restore-db.sh <backup_file>"
    echo "Example: ./scripts/restore-db.sh backups/hrperformance_20260223_120000.sql"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "⚠️  WARNING: This will REPLACE all data in the database!"
echo "Backup file: $BACKUP_FILE"
read -p "Are you sure? (type 'yes' to continue): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
fi

# Create a safety backup before restore
echo "Creating safety backup before restore..."
./scripts/backup-db.sh

echo "Restoring from backup..."
echo "Using: $PSQL"
"$PSQL" -d hrperformance < "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Database restored successfully!"
else
    echo "❌ Restore failed!"
    exit 1
fi
