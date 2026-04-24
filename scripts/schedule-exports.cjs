#!/bin/bash
# Auto-export data to JSON backup daily
# Run via: `node scripts/schedule-exports.cjs` or cron

const schedule = require('node-schedule');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '../.export-logs.txt');

function log(msg) {
  const timestamp = new Date().toISOString();
  const logMsg = `[${timestamp}] ${msg}\n`;
  console.log(logMsg);
  fs.appendFileSync(LOG_FILE, logMsg, 'utf8');
}

// Run export to JSON
function runExport() {
  return new Promise((resolve, reject) => {
    log('Starting scheduled data export...');
    const proc = spawn('npm', ['run', 'export-to-github'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe',
    });

    let output = '';
    proc.stdout.on('data', (data) => {
      output += data.toString();
    });
    proc.stderr.on('data', (data) => {
      output += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        log(`✅ Export completed successfully\n${output}`);
        resolve(true);
      } else {
        log(`❌ Export failed with code ${code}\n${output}`);
        reject(new Error(`Export failed with exit code ${code}`));
      }
    });
  });
}

// Schedule daily export at midnight (00:00)
const rule = new schedule.RecurrenceRule();
rule.hour = 0;
rule.minute = 0;

const job = schedule.scheduleJob(rule, async () => {
  try {
    await runExport();
  } catch (err) {
    log(`Error in scheduled export: ${err.message}`);
  }
});

log('📅 Scheduled daily export at 00:00 UTC');
log('Scheduled job details:');
log(`  Next run: ${job.nextInvocation()}`);
log('Press Ctrl+C to stop the scheduler');

// Keep process alive
process.on('SIGINT', () => {
  log('Scheduler stopped');
  process.exit(0);
});
