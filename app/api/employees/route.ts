import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET all employees with their weekly records
export async function GET() {
  try {
    const employees = await prisma.employee.findMany({
      include: {
        weeklyRecords: {
          orderBy: {
            startDate: "desc",
          },
        },
      },
    });

    // Transform data to match the frontend format
    const formattedEmployees = employees.map((emp) => ({
      id: emp.employeeId,
      name: emp.name,
      department: emp.department,
      position: emp.position,
      joinDate: emp.joinDate.toISOString().split("T")[0],
      overallOverdueTasks: emp.overallOverdueTasks,
      weeklyRecords: emp.weeklyRecords.map((record) => ({
        startDate: record.startDate.toISOString().split("T")[0],
        endDate: record.endDate.toISOString().split("T")[0],
        plannedWorkHours: record.plannedWorkHours,
        actualWorkHours: record.actualWorkHours,
        assignedTasks: record.assignedTasks,
        weeklyOverdueTasks: record.weeklyOverdueTasks,
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
    const { employeeId, name, department, position, joinDate, overallOverdueTasks } = body;

    if (!employeeId || !name || !department || !position || !joinDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.create({
      data: {
        employeeId,
        name,
        department,
        position,
        joinDate: new Date(joinDate),
        overallOverdueTasks: overallOverdueTasks || 0,
      },
      include: {
        weeklyRecords: true,
      },
    });

    return NextResponse.json({
      id: employee.employeeId,
      name: employee.name,
      department: employee.department,
      position: employee.position,
      joinDate: employee.joinDate.toISOString().split("T")[0],
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
