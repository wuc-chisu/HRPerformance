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

# Export data to JSON using psql
"$PSQL" -d hrperformance -c "
COPY (
  SELECT json_agg(json_build_object(
    'employeeId', e.\"employeeId\",
    'name', e.name,
    'department', e.department,
    'position', e.position,
    'joinDate', e.\"joinDate\",
    'workAuthorizationStatus', e.\"workAuthorizationStatus\",
    'overallOverdueTasks', e.\"overallOverdueTasks\",
    'weeklyRecords', (
      SELECT json_agg(json_build_object(
        'startDate', wr.\"startDate\",
        'endDate', wr.\"endDate\",
        'plannedWorkHours', wr.\"plannedWorkHours\",
        'actualWorkHours', wr.\"actualWorkHours\",
        'assignedTasks', wr.\"assignedTasks\",
        'assignedTasksDetails', wr.\"assignedTasksDetails\",
        'weeklyOverdueTasks', wr.\"weeklyOverdueTasks\",
        'overdueTasksDetails', wr.\"overdueTasksDetails\",
        'allOverdueTasks', wr.\"allOverdueTasks\",
        'allOverdueTasksDetails', wr.\"allOverdueTasksDetails\",
        'managerComment', wr.\"managerComment\"
      ) ORDER BY wr.\"startDate\" DESC)
      FROM \"WeeklyRecord\" wr
      WHERE wr.\"employeeId\" = e.id
    )
  ))
  FROM \"Employee\" e
) TO STDOUT
" > "$EXPORT_FILE"

if [ $? -eq 0 ] && [ -s "$EXPORT_FILE" ]; then
    # Make the export pretty
    if command -v jq &> /dev/null; then
        jq '.' "$EXPORT_FILE" > "${EXPORT_FILE}.tmp" && mv "${EXPORT_FILE}.tmp" "$EXPORT_FILE"
    fi
    
    # Create/update latest link
    ln -sf "$(basename "$EXPORT_FILE")" "$LATEST_LINK"
    
    # Count employees
    COUNT=$("$PSQL" -d hrperformance -t -c "SELECT COUNT(*) FROM \"Employee\";" | xargs)
    SIZE=$(du -h "$EXPORT_FILE" | cut -f1)
    
    echo "✅ Export successful!"
    echo "   File: $EXPORT_FILE"
    echo "   Employees: $COUNT"
    echo "   Size: $SIZE"
    echo ""
    
    # Commit to Git (non-interactive for automation)
    git add "$EXPORT_DIR" 2>/dev/null || true
    git commit -m "backup: export employee data ($COUNT employees) - $TIMESTAMP" 2>/dev/null || echo "ℹ️  No changes to commit"
    
    echo "💾 Data exported and backed up locally."
else
    echo "❌ Export failed!"
    exit 1
fi
