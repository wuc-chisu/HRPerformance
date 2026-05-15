const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const raw = JSON.parse(fs.readFileSync('data-exports/employees_latest.json', 'utf8'));
    const employees = Array.isArray(raw) ? raw : (raw.employees || []);
    const targetStartStr = '2026-04-26';
    const targetEndStr = '2026-05-02';
    const startDate = new Date(targetStartStr + 'T00:00:00.000Z');
    const endDate = new Date(targetEndStr + 'T00:00:00.000Z');

    let inserted = 0;
    const restored = [];
    const existingIds = [];

    for (const empJson of employees) {
      const dbEmp = await prisma.employee.findUnique({
        where: { employeeId: empJson.employeeId },
        select: { id: true, employeeId: true }
      });
      if (!dbEmp) continue;

      const existingRecord = await prisma.weeklyRecord.findFirst({
        where: {
          employeeId: dbEmp.id,
          startDate: startDate,
          endDat          endDat          endDat            endDat   ord) {
          endDat          endDat          endDat      continue;
      }

      const bac      const bac      Re      ||      const bac      const bac      Re      ||      const bac      const bac      Re     ba      const bac      const bac      Re      ||      const bac     data:       const bac      const bac      Re         const bac      const bac      ndD      const bac      const bac      Re      ||      const bac  Work      const bac      const bac      Re      ||      const baWork      const bac             const bac    ber(ba      const bac      cons
          weeklyOverdueTasks: Number(backu          weeklyOverdueTasks: Number(backu          wta          weeklyOverdueTasks: Number(backu        overdueTasksDetails: backup.overdueTasksDetails || [],
          allOverdueTasks: Number(backup.allOverdueTasks || 0),
          allOverdueTasksDetails: backup.allOverdueT          allOve],
          managerComment: backup.managerComme          managerComment: backup.managerComme          manaored.push(empJson.employeeId);
    }

    console.log('INSERTED=' + inserted);
        ole.log('RESTORED=' + restored.join(','));
    console.log('EXISTING=' + existingIds.join(','));
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}
run();
