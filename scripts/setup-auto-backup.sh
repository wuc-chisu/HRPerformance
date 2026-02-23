#!/bin/bash

# Setup automatic daily backups using cron
# This will backup your database every day at 11:59 PM

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_SCRIPT="$SCRIPT_DIR/backup-db.sh"

# Create the cron job command
CRON_COMMAND="59 23 * * * cd $PROJECT_DIR && bash $BACKUP_SCRIPT >> $PROJECT_DIR/backups/backup.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "$BACKUP_SCRIPT"; then
    echo "✅ Automatic backup is already configured"
    exit 0
fi

echo "Setting up automatic daily backups..."
echo "Backups will run every day at 11:59 PM"
echo ""

# Add to crontab
(crontab -l 2>/dev/null; echo "$CRON_COMMAND") | crontab -

if [ $? -eq 0 ]; then
    echo "✅ Automatic backup configured successfully!"
    echo ""
    echo "Your database will be backed up daily at 11:59 PM"
    echo "Backups are saved in: $PROJECT_DIR/backups/"
    echo ""
    echo "To view configured cron jobs: crontab -l"
    echo "To remove automatic backups: crontab -e (then delete the line)"
else
    echo "❌ Failed to configure automatic backup"
    echo "You can manually add this to your crontab:"
    echo "$CRON_COMMAND"
    exit 1
fi
