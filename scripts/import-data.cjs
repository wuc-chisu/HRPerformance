#!/usr/bin/env node
/**
 * Dynamic HR Data Importer
 *
 * Reads a JSON export and imports all data into the current DB schema.
 * Column names are discovered from information_schema — no hardcoding.
 *
 * • New DB columns not in the JSON: skipped (DB default/null used).
 * • JSON keys not in the DB: silently ignored (forward compat with old exports).
 * • New tables added via Prisma: picked up automatically via FK discovery as long
 *   as the JSON key matches the TABLE_JSON_KEY map or the auto-derived name.
 *
 * Usage: node scripts/import-data.cjs <json-file>
 */

const { Client } = require('pg');
const fs = require('fs');

const jsonFile = process.argv[2];
if (!jsonFile) {
  console.error('Usage: node import-data.cjs <json-file>');
  process.exit(1);
}

// ─── JSON key ↔ table name mapping ──────────────────────────────────────────
// Must match TABLE_JSON_KEY in export-data.cjs. Only overrides needed when the
// auto-derived name (camelCase + 's') differs from the desired key.
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

// Reverse lookup: json key → table name
const JSON_KEY_TO_TABLE = Object.fromEntries(
  Object.entries(TABLE_JSON_KEY).map(([t, k]) => [k, t])
);

function tableToJsonKey(tableName) {
  if (TABLE_JSON_KEY[tableName]) return TABLE_JSON_KEY[tableName];
  const camel = tableName.charAt(0).toLowerCase() + tableName.slice(1);
  if (camel.endsWith('y') && !/[aeiou]y$/.test(camel)) return camel.slice(0, -1) + 'ies';
  return camel + 's';
}

function jsonKeyToTable(key) {
  if (JSON_KEY_TO_TABLE[key]) return JSON_KEY_TO_TABLE[key];
  // Auto-reverse: camelCases/ies → PascalCase
  let t = key;
  if (t.endsWith('ies')) t = t.slice(0, -3) + 'y';
  else if (t.endsWith('s')) t = t.slice(0, -1);
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
let _idCounter = 0;
function genId(prefix = 'x') {
  _idCounter++;
  return `${prefix}_${Date.now().toString(36)}_${_idCounter.toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

// Build a parameterized INSERT and execute it
async function insertRow(client, tableName, colValues) {
  const cols   = Object.keys(colValues);
  const vals   = Object.values(colValues);
  const placeholders = cols.map((_, i) => `$${i + 1}`);
  const sql = `INSERT INTO "${tableName}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders.join(', ')})`;
  await client.query(sql, vals);
}

// ─── Core importer ───────────────────────────────────────────────────────────
// Recursively import records for `tableName`, attaching parentFkCol = parentFkVal.
// dbSchema  = { tableName: { colName: { type } } }
// childrenOf = { tableName: [{ table, fkColumn }] }
async function importRecords(client, tableName, records, parentFkCol, parentFkVal, dbSchema, childrenOf) {
  if (!records || records.length === 0) return 0;

  const schema   = dbSchema[tableName] || {};
  const children = childrenOf[tableName] || [];

  // Determine which JSON array keys under this table correspond to child tables
  const childKeySet = new Set(children.map(c => tableToJsonKey(c.table)));

  let count = 0;
  const now = new Date().toISOString();

  for (const record of records) {
    const colValues = {};
    if ('id' in schema) {
      colValues.id = genId(tableName.slice(0, 3).toLowerCase());
    }
    if ('updatedAt' in schema) {
      colValues.updatedAt = now;
    }

    // FK to parent
    if (parentFkCol && parentFkVal) {
      colValues[parentFkCol] = parentFkVal;
    }

    // Map JSON fields → DB columns dynamically
    for (const [key, val] of Object.entries(record)) {
      if (childKeySet.has(key)) continue;        // child arrays handled below
      if (!(key in schema))     continue;        // column not in DB (old export / removed field)
      if (key === 'id' || key === 'updatedAt') continue;  // already set above
      if (parentFkCol && key === parentFkCol)   continue;  // already set above

      const colType = schema[key].type;
      if (val === null || val === undefined) {
        colValues[key] = null;
      } else if (colType === 'json' || colType === 'jsonb') {
        colValues[key] = typeof val === 'string' ? val : JSON.stringify(val);
      } else {
        colValues[key] = val;
      }
    }

    // Use exported createdAt if available, otherwise now
    if ('createdAt' in schema && !colValues.createdAt) {
      colValues.createdAt = record.createdAt || now;
    }

    const newId = colValues.id;
    await insertRow(client, tableName, colValues);
    count++;

    // Recurse into each child table
    for (const child of children) {
      const childKey = tableToJsonKey(child.table);
      const childRecords = record[childKey];
      if (childRecords && childRecords.length > 0) {
        await importRecords(client, child.table, childRecords, child.fkColumn, newId, dbSchema, childrenOf);
      }
    }
  }

  return count;
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const raw  = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  // Support legacy format: plain array of employees
  const data = Array.isArray(raw) ? { employees: raw } : raw;

  const client = new Client({ database: 'hrperformance' });
  await client.connect();

  try {
    // ── Discover DB schema ──────────────────────────────────────────────────
    const colRes = await client.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name NOT LIKE '\\_%'
      ORDER BY table_name, ordinal_position
    `);

    const dbSchema = {}; // { tableName: { colName: { type } } }
    for (const r of colRes.rows) {
      if (!dbSchema[r.table_name]) dbSchema[r.table_name] = {};
      dbSchema[r.table_name][r.column_name] = { type: r.data_type };
    }

    // ── Discover FK relationships ───────────────────────────────────────────
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
    `);

    // childrenOf[parent] = [{ table, fkColumn }]
    const childrenOf  = {};
    // parentOf[child]   = parentTable  (used for topological delete order)
    const parentOf    = {};

    for (const row of fkRes.rows) {
      if (!childrenOf[row.parent_table]) childrenOf[row.parent_table] = [];
      if (!childrenOf[row.parent_table].some(c => c.table === row.child_table)) {
        childrenOf[row.parent_table].push({ table: row.child_table, fkColumn: row.child_column });
      }
      parentOf[row.child_table] = row.parent_table;
    }

    // ── Topological delete order (children before parents) ─────────────────
    const allTables = Object.keys(dbSchema).filter(t => !t.startsWith('_'));
    const deleteOrder = [];
    const visited = new Set();

    function visitForDelete(t) {
      if (visited.has(t)) return;
      visited.add(t);
      // Visit children first
      for (const child of (childrenOf[t] || [])) visitForDelete(child.table);
      deleteOrder.push(t);
    }

    // Start from root tables (those with no parent)
    const childTables = new Set(Object.keys(parentOf));
    const rootTables  = allTables.filter(t => !childTables.has(t));
    for (const t of rootTables) visitForDelete(t);
    // Any remaining unvisited (isolated tables)
    for (const t of allTables) visitForDelete(t);

    // ── Wipe and rebuild inside a transaction ───────────────────────────────
    await client.query('BEGIN');
    try {
      // Delete children before parents (deleteOrder has children first)
      for (const t of deleteOrder) {
        await client.query(`DELETE FROM "${t}"`);
      }

      const stats = { employees: 0, departments: 0, incidents: 0 };

      // Import each root table found in the JSON
      for (const jsonKey of Object.keys(data)) {
        const tableName = jsonKeyToTable(jsonKey);
        if (!dbSchema[tableName]) {
          // Unknown key in JSON — skip gracefully
          continue;
        }
        if (childTables.has(tableName)) {
          // Child tables are handled recursively; skip here
          continue;
        }

        const records = data[jsonKey];
        if (!Array.isArray(records)) continue;

        if (tableName === 'Department') {
          // Departments use ON CONFLICT since they have a unique name constraint
          const schema = dbSchema['Department'] || {};
          const now = new Date().toISOString();
          for (const dept of records) {
            const colValues = {};
            if ('id' in schema) {
              colValues.id = genId('dpt');
            }
            if ('updatedAt' in schema) {
              colValues.updatedAt = now;
            }
            for (const [k, v] of Object.entries(dept)) {
              if (k in schema && k !== 'id' && k !== 'updatedAt') colValues[k] = v;
            }
            if ('createdAt' in schema) colValues.createdAt = dept.createdAt || now;
            const cols  = Object.keys(colValues);
            const vals  = Object.values(colValues);
            const ph    = cols.map((_, i) => `$${i + 1}`);
            await client.query(
              `INSERT INTO "Department" (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${ph.join(', ')}) ON CONFLICT (name) DO NOTHING`,
              vals
            );
            stats.departments++;
          }
        } else if (tableName === 'Employee') {
          const n = await importRecords(client, 'Employee', records, null, null, dbSchema, childrenOf);
          stats.employees = n;
          stats.incidents = records.reduce((s, e) => s + (e.incidentRecords || []).length, 0);
        } else {
          await importRecords(client, tableName, records, null, null, dbSchema, childrenOf);
        }
      }

      await client.query('COMMIT');

      // Print progress (each employee) was already inside importRecords; print summary here
      console.log(`\n✅ Import complete!`);
      console.log(`   Departments : ${stats.departments}`);
      console.log(`   Employees   : ${stats.employees}`);
      console.log(`   Incidents   : ${stats.incidents}`);

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }

  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('Import error:', err.message);
  process.exit(1);
});
