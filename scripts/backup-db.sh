#!/bin/bash

# Automatic database backup script
# Creates timestamped backups in the backups/ directory

BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/hrperformance_${TIMESTAMP}.sql"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Use PostgreSQL 15 tools (explicit path to avoid version mismatch)
PG_DUMP="/usr/local/Cellar/postgresql@15/15.15_1/bin/pg_dump"

# Fallback to default if PostgreSQL 15 not found
if [ ! -x "$PG_DUMP" ]; then
  # Try to find any available pg_dump
  PG_DUMP=$(find /usr/local/Cellar/postgresql@*/*/bin/pg_dump -type f 2>/dev/null | sort -V | tail -1)
  if [ -z "$PG_DUMP" ]; then
    # Last resort: use whatever is in PATH
    PG_DUMP=$(command -v pg_dump)
    if [ -z "$PG_DUMP" ]; then
      echo "❌ pg_dump not found!"
      exit 1
    fi
  fi
fi

echo "Creating backup: $BACKUP_FILE"
echo "Using: $PG_DUMP"

"$PG_DUMP" hrperformance > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Backup created successfully: $BACKUP_FILE"
    
    # Keep only last 30 backups
    ls -t "$BACKUP_DIR"/*.sql 2>/dev/null | tail -n +31 | xargs rm -f 2>/dev/null
    
    # Show backup size
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "Backup size: $SIZE"
    
    # Count total backups
    COUNT=$(ls -1 "$BACKUP_DIR"/*.sql 2>/dev/null | wc -l)
    echo "Total backups: $COUNT"
else
    echo "❌ Backup failed!"
    exit 1
fi
