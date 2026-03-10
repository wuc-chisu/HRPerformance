#!/bin/bash

# Import employee data from JSON export
# Usage: ./scripts/import-from-json.sh [json_file]

EXPORT_DIR="data-exports"

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

# Count employees in the export
EMPLOYEE_COUNT=$(jq '. | length' "$JSON_FILE" 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "This file contains $EMPLOYEE_COUNT employees"
else
    echo "Unable to parse JSON file"
    exit 1
fi

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

# Use Node.js to import the data
node -e "
const fs = require('fs');
const { Client } = require('pg');

async function importData() {
  const client = new Client({ 
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/hrperformance' 
  });
  
  await client.connect();
  
  // Read JSON file
  const employees = JSON.parse(fs.readFileSync('$JSON_FILE', 'utf8'));
  
  // Clear existing data
  await client.query('DELETE FROM \"WeeklyRecord\"');
  await client.query('DELETE FROM \"Employee\"');
  
  // Import employees
  for (const emp of employees) {
    const empId = 'emp_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
    const now = new Date().toISOString();
    
    await client.query(
      'INSERT INTO \"Employee\" (\"id\", \"employeeId\", \"name\", \"department\", \"position\", \"joinDate\", \"workAuthorizationStatus\", \"overallOverdueTasks\", \"createdAt\", \"updatedAt\") VALUES (\$1, \$2, \$3, \$4, \$5, \$6, \$7, \$8, \$9, \$10)',
      [empId, emp.employeeId, emp.name, emp.department, emp.position, emp.joinDate, emp.workAuthorizationStatus || 'Other Work Visa', emp.overallOverdueTasks || 0, now, now]
    );
    
    if (emp.weeklyRecords && emp.weeklyRecords.length > 0) {
      for (const record of emp.weeklyRecords) {
        const recordId = 'wr_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
        
        await client.query(
          'INSERT INTO \"WeeklyRecord\" (\"id\", \"employeeId\", \"startDate\", \"endDate\", \"plannedWorkHours\", \"actualWorkHours\", \"assignedTasks\", \"assignedTasksDetails\", \"weeklyOverdueTasks\", \"overdueTasksDetails\", \"allOverdueTasks\", \"allOverdueTasksDetails\", \"managerComment\", \"createdAt\", \"updatedAt\") VALUES (\$1, \$2, \$3, \$4, \$5, \$6, \$7, \$8, \$9, \$10, \$11, \$12, \$13, \$14, \$15)',
          [
            recordId, empId, record.startDate, record.endDate, 
            record.plannedWorkHours, record.actualWorkHours, record.assignedTasks,
            JSON.stringify(record.assignedTasksDetails || []),
            record.weeklyOverdueTasks,
            JSON.stringify(record.overdueTasksDetails || []),
            record.allOverdueTasks || 0,
            JSON.stringify(record.allOverdueTasksDetails || []),
            record.managerComment || null,
            now, now
          ]
        );
      }
    }
    
    console.log('Imported: ' + emp.employeeId + ' - ' + emp.name);
  }
  
  await client.end();
  console.log('✅ Import complete! Imported ' + employees.length + ' employees');
}

importData().catch(console.error);
"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Data imported successfully!"
    psql -d hrperformance -c "SELECT COUNT(*) as total_employees FROM \"Employee\";"
else
    echo "❌ Import failed!"
    exit 1
fi
