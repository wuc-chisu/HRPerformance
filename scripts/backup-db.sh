#!/bin/bash

# Automatic database backup script
# Creates timestamped backups in the backups/ directory

BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/hrperformance_${TIMESTAMP}.sql"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create backup
echo "Creating backup: $BACKUP_FILE"
pg_dump hrperformance > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Backup created successfully: $BACKUP_FILE"
    
    # Keep only last 30 backups
    ls -t "$BACKUP_DIR"/*.sql | tail -n +31 | xargs rm -f 2>/dev/null
    
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
