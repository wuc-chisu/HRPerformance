import type { Prisma, PrismaClient } from "@prisma/client";

import prisma from "@/lib/prisma";

type DbClient = PrismaClient | Prisma.TransactionClient;

const employeeSelect = {
  id: true,
  employeeId: true,
  name: true,
  email: true,
  systemRole: true,
  manager: true,
  department: true,
  position: true,
  staffWorkLocation: true,
} satisfies Prisma.EmployeeSelect;

export async function getActiveEmployees(db: DbClient = prisma) {
  const [employees, offboardingRecords] = await Promise.all([
    db.employee.findMany({ select: employeeSelect }),
    db.offboardingRecord.findMany({
      select: {
        employeeId: true,
        step8: true,
      },
    }),
  ]);

  const offboardedEmployeeIds = new Set(
    offboardingRecords
      .filter((record) =>
        Boolean((record.step8 as { confirmedOffboard?: boolean } | null)?.confirmedOffboard)
      )
      .map((record) => record.employeeId)
  );

  return employees.filter((employee) => !offboardedEmployeeIds.has(employee.employeeId));
}

export async function findActiveEmployeeByEmail(
  email: string,
  db: DbClient = prisma
) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return null;
  }

  const activeEmployees = await getActiveEmployees(db);
  return (
    activeEmployees.find(
      (employee) => employee.email.trim().toLowerCase() === normalizedEmail
    ) || null
  );
}
