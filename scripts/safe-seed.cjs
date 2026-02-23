const { Client } = require('pg');
const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/hrperformance';
const client = new Client({ connectionString });

const sampleEmployees = [
  {
    id: "EMP-001",
    name: "John Smith",
    department: "Engineering",
    position: "Senior Developer",
    joinDate: "2020-01-15",
    overallOverdueTasks: 2,
    weeklyRecords: [
      { startDate: "2025-02-10", endDate: "2025-02-16", plannedWorkHours: 40, actualWorkHours: 42, assignedTasks: 8, weeklyOverdueTasks: 0 },
      { startDate: "2025-02-03", endDate: "2025-02-09", plannedWorkHours: 40, actualWorkHours: 39, assignedTasks: 7, weeklyOverdueTasks: 1 },
      { startDate: "2025-01-27", endDate: "2025-02-02", plannedWorkHours: 40, actualWorkHours: 40, assignedTasks: 9, weeklyOverdueTasks: 1 },
    ],
  },
  {
    id: "EMP-002",
    name: "Sarah Johnson",
    department: "Product",
    position: "Product Manager",
    joinDate: "2021-06-20",
    overallOverdueTasks: 0,
    weeklyRecords: [
      { startDate: "2025-02-10", endDate: "2025-02-16", plannedWorkHours: 40, actualWorkHours: 44, assignedTasks: 12, weeklyOverdueTasks: 0 },
      { startDate: "2025-02-03", endDate: "2025-02-09", plannedWorkHours: 40, actualWorkHours: 41, assignedTasks: 11, weeklyOverdueTasks: 0 },
      { startDate: "2025-01-27", endDate: "2025-02-02", plannedWorkHours: 40, actualWorkHours: 40, assignedTasks: 10, weeklyOverdueTasks: 0 },
    ],
  },
  {
    id: "EMP-003",
    name: "Michael Chen",
    department: "Design",
    position: "UX Designer",
    joinDate: "2022-03-10",
    overallOverdueTasks: 5,
    weeklyRecords: [
      { startDate: "2025-02-10", endDate: "2025-02-16", plannedWorkHours: 40, actualWorkHours: 38, assignedTasks: 6, weeklyOverdueTasks: 2 },
      { startDate: "2025-02-03", endDate: "2025-02-09", plannedWorkHours: 40, actualWorkHours: 37, assignedTasks: 5, weeklyOverdueTasks: 2 },
      { startDate: "2025-01-27", endDate: "2025-02-02", plannedWorkHours: 40, actualWorkHours: 39, assignedTasks: 7, weeklyOverdueTasks: 1 },
    ],
  },
  {
    id: "EMP-004",
    name: "Emily Rodriguez",
    department: "Marketing",
    position: "Marketing Specialist",
    joinDate: "2023-01-05",
    overallOverdueTasks: 3,
    weeklyRecords: [
      { startDate: "2025-02-10", endDate: "2025-02-16", plannedWorkHours: 40, actualWorkHours: 41, assignedTasks: 10, weeklyOverdueTasks: 0 },
      { startDate: "2025-02-03", endDate: "2025-02-09", plannedWorkHours: 40, actualWorkHours: 42, assignedTasks: 9, weeklyOverdueTasks: 1 },
      { startDate: "2025-01-27", endDate: "2025-02-02", plannedWorkHours: 40, actualWorkHours: 40, assignedTasks: 11, weeklyOverdueTasks: 2 },
    ],
  },
];

async function main() {
  await client.connect();
  
  // ⚠️ SAFETY CHECK: Only seed if database is empty
  const employeeCount = await client.query('SELECT COUNT(*) FROM "Employee"');
  const count = parseInt(employeeCount.rows[0].count);
  
  if (count > 0) {
    console.log('❌ DATABASE PROTECTION: Database is not empty!');
    console.log(`Found ${count} existing employees.`);
    console.log('');
    console.log('This seed script WILL NOT run to protect your data.');
    console.log('If you really want to reset the database:');
    console.log('  1. Create a backup: npm run backup');
    console.log('  2. Manually clear data in Prisma Studio');
    console.log('  3. Run this script again');
    console.log('');
    console.log('Or use: npm run force-seed (DANGEROUS - will delete all data!)');
    await client.end();
    process.exit(0);
  }

  console.log('Database is empty. Seeding sample data...');

  for (const emp of sampleEmployees) {
    const generatedId = 'emp_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
    const now = new Date().toISOString();
    await client.query(
      'INSERT INTO "Employee" ("id", "employeeId", "name", "department", "position", "joinDate", "overallOverdueTasks", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [generatedId, emp.id, emp.name, emp.department, emp.position, emp.joinDate, emp.overallOverdueTasks || 0, now, now]
    );

    for (const r of emp.weeklyRecords) {
      const wrId = 'wr_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
      const nowWr = new Date().toISOString();
      await client.query(
        'INSERT INTO "WeeklyRecord" ("id", "employeeId", "startDate", "endDate", "plannedWorkHours", "actualWorkHours", "assignedTasks", "weeklyOverdueTasks", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [wrId, generatedId, r.startDate, r.endDate, r.plannedWorkHours, r.actualWorkHours, r.assignedTasks, r.weeklyOverdueTasks, nowWr, nowWr]
      );
    }

    console.log('Created', emp.id);
  }

  console.log('✅ Seed complete');
  await client.end();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
