const { Client } = require("pg");

async function dedupeHolidayUniqueKey(client) {
  try {
    const tableCheck = await client.query(
      "SELECT to_regclass('public.\"Holiday\"') AS tbl"
    );

    if (!tableCheck.rows[0]?.tbl) {
      console.log("ℹ️  Holiday table not found yet, skipping dedupe.");
      return;
    }

    const duplicateCountResult = await client.query(`
      SELECT COUNT(*)::int AS duplicate_rows
      FROM (
        SELECT "name", "date", "workLocation", COUNT(*)
        FROM "Holiday"
        GROUP BY "name", "date", "workLocation"
        HAVING COUNT(*) > 1
      ) d;
    `);

    const duplicateGroups = duplicateCountResult.rows[0]?.duplicate_rows || 0;
    if (duplicateGroups === 0) {
      console.log("✅ Holiday unique-key dedupe not needed.");
      return;
    }

    const deleted = await client.query(`
      WITH ranked AS (
        SELECT
          id,
          ROW_NUMBER() OVER (
            PARTITION BY "name", "date", "workLocation"
            ORDER BY "createdAt" ASC, id ASC
          ) AS rn
        FROM "Holiday"
      )
      DELETE FROM "Holiday" h
      USING ranked r
      WHERE h.id = r.id
        AND r.rn > 1;
    `);

    console.log(`⚠️  Removed ${deleted.rowCount || 0} duplicate Holiday rows before db push.`);
  } catch (error) {
    console.error("❌ Pre-sync Holiday dedupe failed:", error);
    throw error;
  }
}

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.log("ℹ️  DATABASE_URL not set, skipping pre-sync cleanup.");
    return;
  }

  const client = new Client({ connectionString });
  await client.connect();

  try {
    await dedupeHolidayUniqueKey(client);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
