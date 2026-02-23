#!/bin/bash

# Database restore script
# Usage: ./scripts/restore-db.sh [backup_file]

BACKUP_DIR="backups"

if [ -z "$1" ]; then
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
psql -d hrperformance < "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Database restored successfully!"
else
    echo "❌ Restore failed!"
    exit 1
fi
