#!/bin/bash

# Export database data and commit to GitHub as a backup
# This creates a JSON export that can be tracked in Git

EXPORT_DIR="data-exports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
EXPORT_FILE="${EXPORT_DIR}/employees_${TIMESTAMP}.json"
LATEST_LINK="${EXPORT_DIR}/employees_latest.json"

# Create export directory if it doesn't exist
mkdir -p "$EXPORT_DIR"

echo "📤 Exporting employee data from database..."

# Export data to JSON using psql
psql -d hrperformance -c "
COPY (
  SELECT json_agg(json_build_object(
    'employeeId', e.\"employeeId\",
    'name', e.name,
    'department', e.department,
    'position', e.position,
    'joinDate', e.\"joinDate\",
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
    COUNT=$(psql -d hrperformance -t -c "SELECT COUNT(*) FROM \"Employee\";" | xargs)
    SIZE=$(du -h "$EXPORT_FILE" | cut -f1)
    
    echo "✅ Export successful!"
    echo "   File: $EXPORT_FILE"
    echo "   Employees: $COUNT"
    echo "   Size: $SIZE"
    echo ""
    
    # Commit to Git
    read -p "Do you want to commit this export to GitHub? (y/n): " COMMIT_CHOICE
    
    if [ "$COMMIT_CHOICE" = "y" ] || [ "$COMMIT_CHOICE" = "Y" ]; then
        git add "$EXPORT_DIR"
        git commit -m "backup: export employee data ($COUNT employees) - $TIMESTAMP"
        
        read -p "Push to GitHub now? (y/n): " PUSH_CHOICE
        if [ "$PUSH_CHOICE" = "y" ] || [ "$PUSH_CHOICE" = "Y" ]; then
            git push origin main
            echo "🚀 Data backed up to GitHub!"
        else
            echo "💾 Data committed locally. Run 'git push' to upload to GitHub."
        fi
    else
        echo "💾 Export saved locally only."
    fi
else
    echo "❌ Export failed!"
    exit 1
fi
