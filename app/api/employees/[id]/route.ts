import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// PUT update employee
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const employeeId = params.id;
    
    if (!employeeId) {
      return NextResponse.json(
        { error: "Employee ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, department, position, joinDate, overallOverdueTasks } = body;

    // Validate required fields
    if (!name || !department || !position || !joinDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.update({
      where: { employeeId },
      data: {
        name,
        department,
        position,
        joinDate: new Date(joinDate),
        overallOverdueTasks: overallOverdueTasks || 0,
      },
      include: {
        weeklyRecords: {
          orderBy: {
            startDate: "desc",
          },
        },
      },
    });

    return NextResponse.json({
      id: employee.employeeId,
      name: employee.name,
      department: employee.department,
      position: employee.position,
      joinDate: employee.joinDate.toISOString().split("T")[0],
      overallOverdueTasks: employee.overallOverdueTasks,
      weeklyRecords: employee.weeklyRecords.map((record) => ({
        startDate: record.startDate.toISOString().split("T")[0],
        endDate: record.endDate.toISOString().split("T")[0],
        plannedWorkHours: record.plannedWorkHours,
        actualWorkHours: record.actualWorkHours,
        assignedTasks: record.assignedTasks,
        assignedTasksDetails: record.assignedTasksDetails || [],
        weeklyOverdueTasks: record.weeklyOverdueTasks,
      })),
    });
  } catch (error) {
    console.error("Error updating employee:", error);
    return NextResponse.json(
      { error: "Failed to update employee", details: String(error) },
      { status: 500 }
    );
  }
}

// DELETE employee
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const employeeId = params.id;

    await prisma.employee.delete({
      where: { employeeId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting employee:", error);
    return NextResponse.json(
      { error: "Failed to delete employee" },
      { status: 500 }
    );
  }
}
