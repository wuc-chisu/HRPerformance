import prisma from "../lib/prisma";
import { employees as sampleEmployees } from "../lib/employees";

async function main() {
  // Check if database already has data
  const existingEmployees = await prisma.employee.count();

  if (existingEmployees > 0) {
    console.log(`✅ Database already has ${existingEmployees} employees. Skipping seed.`);
    console.log("💡 If you want to refresh data, run: npx prisma migrate reset");
    return;
  }

  console.log("🌱 Database is empty. Seeding employees and weekly records...");

  for (const emp of sampleEmployees) {
    const created = await prisma.employee.create({
      data: {
        employeeId: emp.id,
        name: emp.name,
        department: emp.department,
        position: emp.position,
        joinDate: new Date(emp.joinDate),
        overallOverdueTasks: emp.overallOverdueTasks || 0,
        weeklyRecords: {
          create: emp.weeklyRecords.map((r) => ({
            startDate: new Date(r.startDate),
            endDate: new Date(r.endDate),
            plannedWorkHours: r.plannedWorkHours,
            actualWorkHours: r.actualWorkHours,
            assignedTasks: r.assignedTasks,
            assignedTasksDetails: r.assignedTasksDetails || [],
            weeklyOverdueTasks: r.weeklyOverdueTasks,
            overdueTasksDetails: r.overdueTasksDetails || [],
            allOverdueTasks: r.allOverdueTasks || 0,
            allOverdueTasksDetails: r.allOverdueTasksDetails || [],
            managerComment: null,
          })),
        },
      },
    });

    console.log(`✅ Created employee: ${created.employeeId} - ${created.name}`);
  }

  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
