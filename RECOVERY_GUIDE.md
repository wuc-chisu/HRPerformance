# 🚨 QUICK RECOVERY GUIDE

## Your Data Was Lost? Here's How to Recover

### Option 1: Restore from Local SQL Backup
```bash
# List your backups
ls -lh backups/

# Restore the most recent
npm run restore backups/hrperformance_YYYYMMDD_HHMMSS.sql
```

### Option 2: Restore from GitHub Export
```bash
# Pull latest from GitHub
git pull origin main

# List available exports
ls -lh data-exports/

# Import the latest
npm run import-from-json data-exports/employees_latest.json
```

### Option 3: Check GitHub Web Interface
Visit: https://github.com/wuc-chisu/HRPerformance/tree/main/data-exports

View and download any previous data export from GitHub directly.

---

## ⚠️ IMPORTANT: To Prevent Future Data Loss

### Do This RIGHT NOW (After Adding Your Data):
```bash
# 1. Create local backup
npm run backup

# 2. Export to GitHub (RECOMMENDED!)
npm run export-to-github
```

### Do This DAILY:
```bash
# Export your data to GitHub every day
npm run export-to-github
```

### Do This BEFORE:
- Schema changes: `npm run backup`
- Dangerous operations: `npm run export-to-github`
- Testing new features: `npm run backup`

---

## All Available Commands

| Command | What It Does | When to Use |
|---------|-------------|-------------|
| `npm run backup` | Create local SQL backup | Before any risky operation |
| `npm run restore <file>` | Restore from SQL backup | When local backup exists |
| `npm run export-to-github` | Export JSON to GitHub | Daily backup (BEST!) |
| `npm run import-from-json <file>` | Import from JSON | Recover from GitHub export |
| `npm run seed` | Add sample data | Only for empty database |
| `npm run force-seed` | ⚠️ DELETES ALL DATA | Never use on real data! |

---

## 🛡️ Your Protection is Now Active

✅ Seed script won't delete your data  
✅ Local SQL backups available  
✅ GitHub JSON exports for cloud backup  
✅ Easy import/restore scripts  
✅ Multiple recovery options  

**You'll never lose data again if you export to GitHub regularly!**
