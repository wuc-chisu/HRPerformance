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
  console.log('Clearing existing data...');
  await client.query('DELETE FROM "WeeklyRecord"');
  await client.query('DELETE FROM "Employee"');

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

  console.log('Seed complete');
  await client.end();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
