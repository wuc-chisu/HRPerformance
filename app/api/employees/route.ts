import prisma from "@/lib/prisma";
import { parseDateForDatabase } from "@/lib/dateUtils";
import { NextResponse } from "next/server";

// GET all employees with their weekly records
export async function GET() {
  try {
    const employees = await (prisma as any).employee.findMany({
      include: {
        weeklyRecords: {
          orderBy: {
            startDate: "desc",
          },
        },
      },
    });

    // Transform data to match the frontend format
    const formattedEmployees = employees.map((emp: any) => ({
      id: emp.employeeId,
      name: emp.name,
      email: emp.email,
      department: emp.department,
      manager: emp.manager,
      position: emp.position,
      joinDate: emp.joinDate.toISOString().split("T")[0],
      workAuthorizationStatus: emp.workAuthorizationStatus,
      overallOverdueTasks: emp.overallOverdueTasks,
      weeklyRecords: emp.weeklyRecords.map((record: any) => ({
        recordId: record.id,
        startDate: record.startDate.toISOString().split("T")[0],
        endDate: record.endDate.toISOString().split("T")[0],
        plannedWorkHours: record.plannedWorkHours,
        actualWorkHours: record.actualWorkHours,
        assignedTasks: record.assignedTasks,
        assignedTasksDetails: (record as any).assignedTasksDetails || [],
        weeklyOverdueTasks: record.weeklyOverdueTasks,
        overdueTasksDetails: (record as any).overdueTasksDetails || [],
        allOverdueTasks: (record as any).allOverdueTasks || 0,
        allOverdueTasksDetails: (record as any).allOverdueTasksDetails || [],
        managerComment: (record as any).managerComment || "",
      })),
    }));

    return NextResponse.json(formattedEmployees);
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    );
  }
}

// POST new employee
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employeeId, name, email, department, manager, position, joinDate, workAuthorizationStatus, overallOverdueTasks } = body;

    if (!employeeId || !name || !email || !department || !manager || !position || !joinDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const employee = await (prisma as any).employee.create({
      data: {
        employeeId,
        name,
        email,
        department,
        manager,
        position,
        joinDate: parseDateForDatabase(joinDate),
        workAuthorizationStatus: workAuthorizationStatus || "Other Work Visa",
        overallOverdueTasks: overallOverdueTasks || 0,
      },
      include: {
        weeklyRecords: true,
      },
    });

    return NextResponse.json({
      id: employee.employeeId,
      name: employee.name,
      email: employee.email,
      department: employee.department,
      manager: employee.manager,
      position: employee.position,
      joinDate: employee.joinDate.toISOString().split("T")[0],
      workAuthorizationStatus: employee.workAuthorizationStatus,
      overallOverdueTasks: employee.overallOverdueTasks,
      weeklyRecords: [],
    });
  } catch (error) {
    console.error("Error creating employee:", error);
    return NextResponse.json(
      { error: "Failed to create employee" },
      { status: 500 }
    );
  }
}
