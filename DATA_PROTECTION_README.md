# 🛡️ Database Data Protection Guide

## Your data is now protected with multiple backup strategies!

Multiple layers of protection have been added to prevent accidental data loss, including local backups AND GitHub version control.

---

## 🔒 Protection Features

### 1. **Safe Seed Script**
- The `npm run seed` command now **checks if data exists** before running
- It will **refuse to run** if the database contains any employees
- This prevents accidental data deletion

### 2. **Local SQL Backups**
- Use `npm run backup` to create a timestamped SQL backup
- Backups are stored in the `backups/` directory
- Last 30 backups are kept automatically
- Perfect for quick local recovery

### 3. **GitHub JSON Exports** ⭐ NEW
- Use `npm run export-to-github` to export data as JSON and commit to GitHub
- Data is version controlled and accessible from anywhere
- Can recover data even if your computer dies
- JSON format is human-readable and diff-friendly

### 4. **Easy Restore**
- SQL Restore: `npm run restore <backup_file>`
- JSON Import: `npm run import-from-json <json_file>` 
- A safety backup is created before every restore

---

## 📋 Recommended Workflow

### Daily: Export to GitHub (Cloud Backup)
```bash
npm run export-to-github
# This will:
# 1. Export your data to JSON
# 2. Commit it to Git
# 3. Push to GitHub (optional)
```

### Before Risky Operations: Local Backup
```bash
npm run backup
# Quick SQL backup before making changes
```

### After Major Updates: Both!
```bash
npm run backup  # Local backup
npm run export-to-github  # Cloud backup
```

---

## 🌐 GitHub Export System (Recommended)

### Why Export to GitHub?
- ✅ **Safe from local disasters** (computer crash, disk failure)
- ✅ **Version history** - see changes over time
- ✅ **Accessible anywhere** - recover from any computer
- ✅ **Small file size** - JSON is compact
- ✅ **Human readable** - can view in GitHub web interface

### Export Your Data
```bash
npm run export-to-github
```
This will:
1. Export all employees and records to JSON
2. Save to `data-exports/employees_YYYYMMDD_HHMMSS.json`
3. Ask if you want to commit to Git
4. Ask if you want to push to GitHub

### Import from GitHub Export
```bash
# List available exports
ls -lh data-exports/

# Import the latest
npm run import-from-json data-exports/employees_latest.json

# Or import a specific export
npm run import-from-json data-exports/employees_20260223_120000.json
```

### View Your Data on GitHub
After exporting, you can view your data at:
```
https://github.com/wuc-chisu/HRPerformance/tree/main/data-exports
```

---

## 💾 Local SQL Backup System

### Create a Local Backup
```bash
npm run backup
```

### Check Your Backups
```bash
ls -lh backups/
```

### Restore from SQL Backup
```bash
npm run restore backups/hrperformance_20260223_120000.sql
```

---

## ⚠️ Emergency Commands (USE WITH CAUTION)

### Force Seed (Deletes all data!)
Only use this if you intentionally want to reset to sample data:
```bash
npm run force-seed
```

### Manual Backup/Restore
```bash
# Manual backup
pg_dump hrperformance > my_backup.sql

# Manual restore
psql -d hrperformance < my_backup.sql
```

---

## 🔄 Recommended Practices

1. **Backup before any schema changes:**
   ```bash
   npm run backup
   npx prisma migrate dev
   ```

2. **Backup before dangerous operations:**
   ```bash
   npm run backup
   npm run force-seed  # Only if you really want to!
   ```

3. **Create daily backups:**
   - Set up a cron job or reminder
   - Run `npm run backup` at the end of each workday

4. **Never use these commands on production data:**
   - `prisma db push` (resets database)
   - `npm run force-seed` (deletes all data)
   - `prisma migrate reset` (drops and recreates)

---

## 📊 Checking Your Data

### Via Command Line
```bash
psql -d hrperformance -c "SELECT COUNT(*) FROM \"Employee\";"
```

### Via Prisma Studio
```bash
npx prisma studio
```

---

## 🆘 If Data Was Lost

If you lost data and have a backup:
```bash
# Find your latest backup
ls -lt backups/ | head -5

# Restore it
npm run restore backups/hrperformance_YYYYMMDD_HHMMSS.sql
```

If you don't have a backup:
- Check if PostgreSQL has point-in-time recovery enabled
- Check system Time Machine or backup software
- Unfortunately, data may be unrecoverable

---

## 🎯 Summary

**Always do before risky operations:**
1. `npm run backup` ← Create a backup first!
2. Perform your operation
3. Verify data is still there
4. If something went wrong: `npm run restore <backup_file>`

**Your data is safe as long as you:**
- ✅ Create regular backups
- ✅ Use `npm run backup` before schema changes
- ✅ Never run `npm run force-seed` on real data
- ✅ Use `npx prisma migrate dev` instead of `prisma db push`
