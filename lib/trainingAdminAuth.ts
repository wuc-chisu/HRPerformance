import { NextResponse } from "next/server";

import { getAuthenticatedEmployee } from "@/lib/current-employee";

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

export async function resolveTrainingAdminAuthContext(request: Request): Promise<TrainingAdminAuthContext | null> {
  const employee = await getAuthenticatedEmployee();
  if (!employee) {
    return null;
  }

  return {
    employee: {
      id: employee.id,
      employeeId: employee.employeeId,
      email: employee.email.trim(),
      name: employee.name.trim(),
      systemRole: employee.systemRole.trim(),
    },
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
