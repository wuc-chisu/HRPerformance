# Data Storage Architecture

## Overview
**All data is stored in PostgreSQL database.** JSON files are backups only.

## Data Flow Diagram

```
User Creates Record
  ↓
React Component (app/page.tsx)
  ↓
POST /api/{endpoint} (create)
  ↓
Prisma ORM
  ↓
PostgreSQL Database (Primary Storage) ✅
  ↓
fetchEmployees() - Reload from DB
  ↓
UI Updates with Fresh Data
```

## Storage Locations

### 🟢 PRIMARY: PostgreSQL Database
- **Host**: `localhost` (configurable via `.env.local`)
- **Database**: `hrperformance`
- **Tables**: Employee, WeeklyRecord, TimeOffRequest, IncidentRecord, Department, Holiday, etc.
- **When**: Immediately when you create/edit/delete records
- **Persistence**: ✅ Permanent (survives app restart)

### 🔵 SECONDARY: JSON Exports (Backups)
- **Location**: `data-exports/employees_latest.json`
- **When**: Only when you run `npm run export-to-github`
- **Persistence**: ✅ Version-controlled backup (but not real-time)

### 🔴 TERTIARY: SQL Backups (Disaster Recovery)
- **Location**: `backups/hrperformance_*.sql`
- **When**: Automatically created before DB restore
- **Persistence**: ✅ Full database snapshots

## What Gets Stored Where

| Feature | Real-Time DB | JSON Export | SQL Backup |
|---------|--------------|-------------|-----------|
| New Employee | ✅ Instant | ❌ Manual | ✅ Periodic |
| Weekly Record | ✅ Instant | ❌ Manual | ✅ Periodic |
| Time-Off Request | ✅ Instant | ❌ Manual | ✅ Periodic |
| Incident Report | ✅ Instant | ❌ Manual | ✅ Periodic |
| Onboarding Status | ✅ Instant | ❌ Manual | ✅ Periodic |

## API Endpoints → Database

### Employees
- **POST** `/api/employees` → Creates `Employee` record in DB
- **PUT** `/api/employees/{id}` → Updates `Employee` record in DB
- **DELETE** `/api/employees/{id}` → Deletes `Employee` record from DB
- **GET** `/api/employees` → Queries `Employee` table from DB ✅

### Weekly Records
- **POST** `/api/weekly-records` → Creates `WeeklyRecord` in DB
- **PUT** `/api/weekly-records/{id}` → Updates `WeeklyRecord` in DB
- **DELETE** `/api/weekly-records/{id}` → Deletes `WeeklyRecord` from DB
- **GET** `/api/weekly-records` → Queries `WeeklyRecord` table from DB ✅

### Time-Off Requests
- **POST** `/api/time-off` → Creates `TimeOffRequest` in DB
- **GET** `/api/time-off` → Queries `TimeOffRequest` table from DB ✅

### Incidents
- **POST** `/api/incidents` → Creates `IncidentRecord` in DB
- **GET** `/api/incidents` → Queries `IncidentRecord` table from DB ✅

**Key Principle**: Every POST/PUT/DELETE triggers `fetchEmployees()` to reload fresh data from the database.

## How to Verify Data is in DB

### Check PostgreSQL directly:
```bash
# Count all employees
psql -d hrperformance -Atc "SELECT COUNT(*) FROM \"Employee\";"

# View latest weekly record
psql -d hrperformance -c "SELECT \"employeeId\", \"startDate\", \"endDate\", \"actualWorkHours\" FROM \"WeeklyRecord\" ORDER BY \"createdAt\" DESC LIMIT 5;"

# Count time-off requests
psql -d hrperformance -Atc "SELECT COUNT(*) FROM \"TimeOffRequest\";"
```

### Check via API:
```bash
# All employees (from DB)
curl http://localhost:3001/api/employees | jq '.[0] | {id, name, email}'

# Weekly records for employee
curl http://localhost:3001/api/weekly-records | jq '.[] | select(.employeeId=="FAC250006")'
```

## Automated Daily Exports (Optional)

To automatically export data to JSON every day at midnight:

```bash
npm install  # Install node-schedule dependency
npm run export:schedule &  # Start background scheduler
```

This will:
- Export to `data-exports/employees_latest.json` daily at 00:00 UTC
- Keep a permanent JSON backup for version control
- Log all exports to `.export-logs.txt`

## Data Backup Strategy

### Manual Backup
```bash
npm run backup
# Creates: backups/hrperformance_YYYYMMDD_HHMMSS.sql
```

### Manual Export
```bash
npm run export-to-github
# Creates: data-exports/employees_*.json (with timestamps)
```

### Auto-Restore from Backup
```bash
ALLOW_DB_REPLACE=yes npm run restore backups/hrperformance_20260424_110341.sql
```

## Summary

✅ **Current behavior**: All new records automatically save to PostgreSQL database
✅ **Data is persistent**: Survives app restart
✅ **JSON is optional**: Use for backups/exports only
✅ **Real-time operations**: DB is the source of truth

**No action needed** — your data is already being stored correctly in the database!

