import prisma from "../lib/prisma";
import { employees as sampleEmployees } from "../lib/employees";

async function main() {
  console.log("Clearing existing data...");
  await prisma.weeklyRecord.deleteMany();
  await prisma.employee.deleteMany();

  console.log("Seeding employees and weekly records...");
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
            weeklyOverdueTasks: r.weeklyOverdueTasks,
          })),
        },
      },
    });

    console.log(`Created employee ${created.employeeId}`);
  }

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
