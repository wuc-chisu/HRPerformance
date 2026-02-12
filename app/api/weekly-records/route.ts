import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// POST new weekly record
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      employeeId,
      startDate,
      endDate,
      plannedWorkHours,
      actualWorkHours,
      assignedTasks,
      weeklyOverdueTasks,
    } = body;

    if (!employeeId || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Find employee by employeeId
    const employee = await prisma.employee.findUnique({
      where: { employeeId },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    const record = await prisma.weeklyRecord.create({
      data: {
        employeeId: employee.id,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        plannedWorkHours,
        actualWorkHours,
        assignedTasks,
        weeklyOverdueTasks,
      },
    });

    return NextResponse.json({
      startDate: record.startDate.toISOString().split("T")[0],
      endDate: record.endDate.toISOString().split("T")[0],
      plannedWorkHours: record.plannedWorkHours,
      actualWorkHours: record.actualWorkHours,
      assignedTasks: record.assignedTasks,
      weeklyOverdueTasks: record.weeklyOverdueTasks,
    });
  } catch (error) {
    console.error("Error creating weekly record:", error);
    return NextResponse.json(
      { error: "Failed to create weekly record" },
      { status: 500 }
    );
  }
}
