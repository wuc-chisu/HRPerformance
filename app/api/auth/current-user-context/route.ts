import { NextResponse } from "next/server";

import { getActiveEmployees } from "@/lib/auth-employee";
import { getAuthenticatedEmployee } from "@/lib/current-employee";

export async function GET() {
  try {
    const matchedEmployee = await getAuthenticatedEmployee();
    if (!matchedEmployee) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    const activeEmployees = await getActiveEmployees();

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
      id: matchedEmployee.id,
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