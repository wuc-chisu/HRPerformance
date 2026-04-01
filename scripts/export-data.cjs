#!/usr/bin/env node
/**
 * Dynamic HR Data Exporter
 *
 * Automatically discovers ALL tables and columns from the live DB schema using
 * SELECT * and FK relationship detection. No column names are hardcoded here.
 *
 * Adding a new Prisma field → it appears in the next export automatically.
 * Adding a new Prisma table with FK → Employee → it nests under employees automatically.
 *
 * JSON key naming for known tables is defined in TABLE_JSON_KEY.
 * Unknown new tables get an auto-derived camelCase key (e.g. EmployeeDoc → employeeDocs).
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const outputFile = process.argv[2];
if (!outputFile) {
  console.error('Usage: node export-data.cjs <output-file>');
  process.exit(1);
}

// ─── JSON key overrides for known tables ────────────────────────────────────
// If a new table is added via Prisma, add it here only if the auto-derived
// key name (camelCase + 's') isn't clear enough. Otherwise it works automatically.
const TABLE_JSON_KEY = {
  Department:                  'departments',
  Employee:                    'employees',
  WeeklyRecord:                'weeklyRecords',
  Task:                        'tasks',
  Evaluation:                  'evaluations',
  MonthlyPerformanceComment:   'monthlyComments',
  IncidentRecord:              'incidentRecords',
  IncidentHistory:             'histories',
};

function tableToJsonKey(tableName) {
  if (TABLE_JSON_KEY[tableName]) return TABLE_JSON_KEY[tableName];
  // Auto-derive: PascalCase → camelCase + plural suffix
  const camel = tableName.charAt(0).toLowerCase() + tableName.slice(1);
  if (camel.endsWith('y') && !/[aeiou]y$/.test(camel)) return camel.slice(0, -1) + 'ies';
  return camel + 's';
}

// Columns to always exclude from export (meaningless across environments or regenerated)
const STRIP_COLS = new Set(['id', 'updatedAt']);

// Preferred sort order per table
function orderByClause(tableName) {
  if (tableName === 'Employee')       return 'ORDER BY name ASC';
  if (tableName === 'WeeklyRecord')   return 'ORDER BY "startDate" DESC';
  if (tableName === 'IncidentRecord') return 'ORDER BY "occurrenceDate" DESC';
  if (tableName === 'IncidentHistory')return 'ORDER BY "createdAt" ASC';
  return 'ORDER BY "createdAt" ASC NULLS LAST';
}

// ─── Recursive export tree builder ──────────────────────────────────────────
// Fetches rows for `tableName`, strips internal columns, then recursively
// attaches any child tables discovered via FK relationships.
async function buildTree(client, tableName, whereCol, whereVal, childrenOf, fkColsOf) {
  const params = whereCol ? [whereVal] : [];
  const where  = whereCol ? `WHERE "${whereCol}" = $1` : '';
  const order  = orderByClause(tableName);

  // SELECT * → all columns, including any added by future migrations
  const res = await client.query(`SELECT * FROM "${tableName}" ${where} ${order}`, params);

  const fkCols   = fkColsOf[tableName]  || new Set();
  const children = childrenOf[tableName] || [];

  return Promise.all(res.rows.map(async (row) => {
    // Copy every column except stripped/FK ones
    const out = {};
    for (const [col, val] of Object.entries(row)) {
      if (!STRIP_COLS.has(col) && !fkCols.has(col)) {
        out[col] = val;
      }
    }
    // Recursively attach children (row.id is available from SELECT * even though it's not in `out`)
    for (const child of children) {
      const jsonKey = tableToJsonKey(child.table);
      out[jsonKey] = await buildTree(client, child.table, child.fkColumn, row.id, childrenOf, fkColsOf);
    }
    return out;
  }));
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const client = new Client({ database: 'hrperformance' });
  await client.connect();

  try {
    // ── Discover all public application tables ──────────────────────────────
    const tablesRes = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE '\\_%'
    `);
    const allTables = tablesRes.rows.map(r => r.table_name);

    // ── Discover FK relationships via pg_constraint (reliable) ──────────────
    const fkRes = await client.query(`
      SELECT
        child_cls.relname  AS child_table,
        child_att.attname  AS child_column,
        parent_cls.relname AS parent_table
      FROM pg_constraint con
      JOIN pg_class     child_cls  ON con.conrelid   = child_cls.oid
      JOIN pg_namespace ns         ON child_cls.relnamespace = ns.oid
      JOIN pg_class     parent_cls ON con.confrelid  = parent_cls.oid
      JOIN LATERAL UNNEST(con.conkey) WITH ORDINALITY AS ck(attnum, ord) ON true
      JOIN pg_attribute child_att  ON child_att.attrelid = child_cls.oid
                                   AND child_att.attnum  = ck.attnum
      WHERE con.contype = 'f'
        AND ns.nspname  = 'public'
        AND child_cls.relname NOT LIKE '\\_%'
      ORDER BY child_cls.relname
    `);

    // childrenOf[parent] = [{ table, fkColumn }]   (no duplicates)
    const childrenOf = {};
    // fkColsOf[table]   = Set of FK column names (excluded from export since nesting is implicit)
    const fkColsOf   = {};

    for (const row of fkRes.rows) {
      if (!childrenOf[row.parent_table]) childrenOf[row.parent_table] = [];
      if (!childrenOf[row.parent_table].some(c => c.table === row.child_table)) {
        childrenOf[row.parent_table].push({ table: row.child_table, fkColumn: row.child_column });
      }
      if (!fkColsOf[row.child_table]) fkColsOf[row.child_table] = new Set();
      fkColsOf[row.child_table].add(row.child_column);
    }

    // Root tables = tables that are NOT a child of any other table
    const childTables = new Set(fkRes.rows.map(r => r.child_table));
    const rootTables  = allTables.filter(t => !childTables.has(t));

    // ── Build export ────────────────────────────────────────────────────────
    const exportData = {};
    for (const tableName of rootTables) {
      const jsonKey = tableToJsonKey(tableName);
      exportData[jsonKey] = await buildTree(client, tableName, null, null, childrenOf, fkColsOf);
    }

    // ── Write file ──────────────────────────────────────────────────────────
    fs.mkdirSync(path.dirname(path.resolve(outputFile)), { recursive: true });
    fs.writeFileSync(outputFile, JSON.stringify(exportData, null, 2), 'utf8');

    // ── Stats (read by export-to-github.sh) ────────────────────────────────
    const emps      = exportData.employees      || [];
    const depts     = exportData.departments    || [];
    const incidents = emps.reduce((s, e) => s + (e.incidentRecords || []).length, 0);
    const comments  = emps.reduce((s, e) => s + (e.monthlyComments  || []).length, 0);

    console.log(`DEPTS:${depts.length}`);
    console.log(`EMPS:${emps.length}`);
    console.log(`INCIDENTS:${incidents}`);
    console.log(`COMMENTS:${comments}`);

  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('Export error:', err.message);
  process.exit(1);
});
