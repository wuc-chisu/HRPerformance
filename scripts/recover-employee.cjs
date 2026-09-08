#!/usr/bin/env node

require('dotenv/config');

const crypto = require('crypto');
const fs = require('fs');
const { Pool } = require('pg');

const [employeeId, exportPath = 'data-exports/employees_latest.json'] = process.argv.slice(2);

if (!employeeId) {
  console.error('Usage: node scripts/recover-employee.cjs <employee-id> [export-path]');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const exportData = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
  const employee = (exportData.employees || []).find((record) => record.employeeId === employeeId);

  if (!employee) {
    throw new Error(`${employeeId} is absent from ${exportPath}.`);
  }

  const client = await pool.connect();
  const columns = await client.query(
    `SELECT column_name, data_type
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'Employee'`
  );
  const columnTypes = new Map(columns.rows.map((column) => [column.column_name, column.data_type]));
  const entries = [
    ['id', crypto.randomUUID()],
    ['updatedAt', new Date()],
    ...Object.entries(employee)
    .filter(([field, value]) => field !== 'id' && field !== 'updatedAt' && value !== undefined && columnTypes.has(field))
    .map(([field, value]) => [
      field,
      columnTypes.get(field) === 'jsonb' && typeof value !== 'string' ? JSON.stringify(value) : value,
    ]),
  ];

  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT 1 FROM "Employee" WHERE "employeeId" = $1', [employeeId]);
    if (existing.rowCount) {
      throw new Error(`${employeeId} already exists; no changes were made.`);
    }

    const fields = entries.map(([field]) => `"${field}"`);
    const values = entries.map(([, value]) => value);
    const placeholders = values.map((_, index) => `$${index + 1}`);
    const result = await client.query(
      `INSERT INTO "Employee" (${fields.join(', ')}) VALUES (${placeholders.join(', ')})
       RETURNING "id", "employeeId", "name"`,
      values
    );
    await client.query('COMMIT');

    const restored = result.rows[0];
    console.log(`Restored ${restored.employeeId}: ${restored.name} (${restored.id})`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });