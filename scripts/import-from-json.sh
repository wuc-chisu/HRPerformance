#!/bin/bash

# Import employee data from JSON export
# Usage: ./scripts/import-from-json.sh [json_file]

EXPORT_DIR="data-exports"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REQUIRED_FLAG="ALLOW_DB_REPLACE"
REQUIRED_VALUE="yes"

if [ "${ALLOW_DB_REPLACE}" != "$REQUIRED_VALUE" ]; then
    echo "❌ Import blocked to protect live data."
    echo ""
    echo "To continue intentionally, run:"
    echo "  ALLOW_DB_REPLACE=yes ./scripts/import-from-json.sh <json_file>"
    exit 1
fi

if [ -z "$1" ]; then
    echo "Available exports:"
    ls -lh "$EXPORT_DIR"/*.json 2>/dev/null || echo "No exports found"
    echo ""
    echo "Usage: ./scripts/import-from-json.sh <json_file>"
    echo "Example: ./scripts/import-from-json.sh data-exports/employees_latest.json"
    exit 1
fi

JSON_FILE="$1"

if [ ! -f "$JSON_FILE" ]; then
    echo "❌ File not found: $JSON_FILE"
    exit 1
fi

echo "⚠️  WARNING: This will REPLACE all data in the database!"
echo "Import file: $JSON_FILE"
echo ""

# Show what's in the file
EMPLOYEE_COUNT=$(node -e "const r=JSON.parse(require('fs').readFileSync('$JSON_FILE','utf8')); const a=Array.isArray(r)?r:r.employees||[]; console.log(a.length)" 2>/dev/null || echo "?")
DEPT_COUNT=$(node -e "const r=JSON.parse(require('fs').readFileSync('$JSON_FILE','utf8')); console.log(Array.isArray(r)?0:(r.departments||[]).length)" 2>/dev/null || echo "?")
echo "This file contains $DEPT_COUNT departments and $EMPLOYEE_COUNT employees"
echo ""

read -p "Create a backup first? (RECOMMENDED - y/n): " BACKUP_CHOICE
if [ "$BACKUP_CHOICE" = "y" ] || [ "$BACKUP_CHOICE" = "Y" ]; then
    npm run backup
fi

read -p "Continue with import? (type 'yes' to continue): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Import cancelled"
    exit 0
fi

echo "Importing data..."

# Delegate to the dynamic Node.js importer
node "$SCRIPT_DIR/import-data.cjs" "$JSON_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Data imported successfully!"
else
    echo "❌ Import failed!"
    exit 1
fi
