#!/usr/bin/env node

require('dotenv/config');

const { Pool } = require('pg');

const employeeId = process.argv[2];

if (!employeeId) {
  console.error('Usage: node scripts/clear-preboarding.cjs <employee-id>');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE "Employee"
       SET "preboardingSteps" = '{}'::jsonb
       WHERE "employeeId" = $1
       RETURNING "employeeId", "name", "preboardingSteps"`,
      [employeeId]
    );

    if (result.rowCount !== 1) {
      throw new Error(`Employee ${employeeId} was not found; no changes were made.`);
    }

    await client.query('COMMIT');
    const employee = result.rows[0];
    console.log(`Cleared preboarding for ${employee.employeeId}: ${employee.name}`);
    console.log(JSON.stringify(employee.preboardingSteps));
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
  .finally(() => pool.end());