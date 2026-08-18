import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const clerkUser = await currentUser();

    if (!clerkUser) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    const workEmail =
      clerkUser.primaryEmailAddress?.emailAddress ||
      clerkUser.emailAddresses[0]?.emailAddress ||
      "";

    const normalizedEmail = workEmail.trim().toLowerCase();

    if (!normalizedEmail) {
      return NextResponse.json(
        { error: "No Google email address is available for this account." },
        { status: 403 }
      );
    }

    const [employees, offboardingRecords] = await Promise.all([
      prisma.employee.findMany({
        select: {
          employeeId: true,
          name: true,
          email: true,
          systemRole: true,
          manager: true,
        },
      }),
      prisma.offboardingRecord.findMany({
        select: {
          employeeId: true,
          step8: true,
        },
      }),
    ]);

    const offboardedEmployeeIds = new Set(
      offboardingRecords
        .filter((record) => Boolean((record.step8 as { confirmedOffboard?: boolean } | null)?.confirmedOffboard))
        .map((record) => record.employeeId)
    );

    const activeEmployees = employees.filter(
      (employee) => !offboardedEmployeeIds.has(employee.employeeId)
    );

    const matchedEmployee = activeEmployees.find(
      (employee) => employee.email.trim().toLowerCase() === normalizedEmail
    );

    if (!matchedEmployee) {
      return NextResponse.json(
        {
          error:
            "Your authenticated Google email does not match an active employee record. Please contact HR Admin for access.",
        },
        { status: 403 }
      );
    }

    const directReports = activeEmployees
      .filter(
        (employee) =>
          employee.manager.trim().toLowerCase() === matchedEmployee.name.trim().toLowerCase()
      )
      .map((employee) => ({
        employeeId: employee.employeeId,
        employeeName: employee.name,
        workEmail: employee.email,
      }));

    return NextResponse.json({
      employeeId: matchedEmployee.employeeId,
      employeeName: matchedEmployee.name,
      workEmail: matchedEmployee.email,
      systemRole: matchedEmployee.systemRole || "Employee",
      isDirectManager: directReports.length > 0,
      directReports,
    });
  } catch (error) {
    console.error("Error loading current user context:", error);
    return NextResponse.json(
      { error: "Failed to load current user context" },
      { status: 500 }
    );
  }
}