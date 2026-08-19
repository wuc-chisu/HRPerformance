import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

type ActiveEmployee = {
  id: string;
  employeeId: string;
  email: string;
  name: string;
  systemRole: string;
};

export type TrainingAdminAuthContext = {
  employee: ActiveEmployee;
  viewMode: "admin" | "employee";
};

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function resolveTrainingAdminAuthContext(request: Request): Promise<TrainingAdminAuthContext | null> {
  const clerk = await currentUser();
  const email = clerk?.primaryEmailAddress?.emailAddress || clerk?.emailAddresses[0]?.emailAddress || "";
  const normalizedEmail = normalizeText(email).toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      employeeId: true,
      email: true,
      name: true,
      systemRole: true,
    },
  });

  let offboardingRecords: Array<{ employeeId: string; step8: unknown }> = [];
  try {
    offboardingRecords = await prisma.offboardingRecord.findMany({
      select: {
        employeeId: true,
        step8: true,
      },
    });
  } catch {
    offboardingRecords = [];
  }

  const offboardedEmployeeIds = new Set(
    offboardingRecords
      .filter((record) => Boolean((record.step8 as { confirmedOffboard?: boolean } | null)?.confirmedOffboard))
      .map((record) => record.employeeId)
  );

  const activeEmployees = employees
    .filter((entry) => !offboardedEmployeeIds.has(entry.employeeId))
    .map((entry) => ({
      ...entry,
      email: normalizeText(entry.email),
      systemRole: normalizeText(entry.systemRole),
    }));

  const employee = activeEmployees.find((entry) => entry.email.toLowerCase() === normalizedEmail);

  if (!employee) {
    return null;
  }

  return {
    employee,
    viewMode: request.headers.get("x-view-mode") === "employee" ? "employee" : "admin",
  };
}

export function isStrictHrAdminInAdminView(context: TrainingAdminAuthContext) {
  return context.viewMode === "admin" && context.employee.systemRole.toLowerCase() === "hr admin";
}

export function trainingAdminForbiddenResponse() {
  return NextResponse.json(
    { error: "Course content management is restricted to HR Admin in Admin view." },
    { status: 403 }
  );
}
