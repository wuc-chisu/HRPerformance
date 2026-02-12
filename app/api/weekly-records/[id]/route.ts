import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// PUT update weekly record
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const recordId = params.id;
    const body = await request.json();
    const {
      startDate,
      endDate,
      plannedWorkHours,
      actualWorkHours,
      assignedTasks,
      weeklyOverdueTasks,
    } = body;

    const record = await prisma.weeklyRecord.update({
      where: { id: recordId },
      data: {
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
    console.error("Error updating weekly record:", error);
    return NextResponse.json(
      { error: "Failed to update weekly record" },
      { status: 500 }
    );
  }
}

// DELETE weekly record
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const recordId = params.id;

    await prisma.weeklyRecord.delete({
      where: { id: recordId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting weekly record:", error);
    return NextResponse.json(
      { error: "Failed to delete weekly record" },
      { status: 500 }
    );
  }
}
