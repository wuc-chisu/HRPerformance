#!/bin/bash

# Export database data and commit to GitHub as a backup
# This creates a JSON export that can be tracked in Git

EXPORT_DIR="data-exports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
EXPORT_FILE="${EXPORT_DIR}/employees_${TIMESTAMP}.json"
LATEST_LINK="${EXPORT_DIR}/employees_latest.json"

# Create export directory if it doesn't exist
mkdir -p "$EXPORT_DIR"

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

echo "📤 Exporting employee data from database..."

# Use Node.js script to export all data (avoids COPY format encoding issues)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NODE_OUTPUT=$(node "$SCRIPT_DIR/export-data.cjs" "$EXPORT_FILE" 2>&1)
NODE_EXIT=$?

if [ $NODE_EXIT -ne 0 ]; then
  echo "❌ Export script failed:"
  echo "$NODE_OUTPUT"
  exit 1
fi

# Parse stats from Node.js output
DEPT_COUNT=$(echo "$NODE_OUTPUT" | grep '^DEPTS:' | cut -d: -f2)
COUNT=$(echo "$NODE_OUTPUT" | grep '^EMPS:' | cut -d: -f2)
INCIDENT_COUNT=$(echo "$NODE_OUTPUT" | grep '^INCIDENTS:' | cut -d: -f2)
COMMENT_COUNT=$(echo "$NODE_OUTPUT" | grep '^COMMENTS:' | cut -d: -f2)

if [ -s "$EXPORT_FILE" ]; then
    # Create/update latest link
    ln -sf "$(basename "$EXPORT_FILE")" "$LATEST_LINK"

    SIZE=$(du -h "$EXPORT_FILE" | cut -f1)
    
    echo "✅ Export successful!"
    echo "   File: $EXPORT_FILE"
    echo "   Departments: $DEPT_COUNT"
    echo "   Employees: $COUNT"
    echo "   Incident records: $INCIDENT_COUNT"
    echo "   Monthly comments: $COMMENT_COUNT"
    echo "   Size: $SIZE"
    echo ""
    
    # Commit to Git (non-interactive for automation)
    git add "$EXPORT_DIR" 2>/dev/null || true
    git commit -m "backup: export ($DEPT_COUNT depts, $COUNT employees, $INCIDENT_COUNT incidents) - $TIMESTAMP" 2>/dev/null || echo "ℹ️  No changes to commit"
    
    echo "💾 Data exported and backed up locally."
else
    echo "❌ Export failed!"
    exit 1
fi
