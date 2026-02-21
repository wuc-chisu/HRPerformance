import prisma from "@/lib/prisma";
import { parseDateForDatabase } from "@/lib/dateUtils";
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
      assignedTasksDetails,
      weeklyOverdueTasks,
      overdueTasksDetails,
      allOverdueTasks,
      allOverdueTasksDetails,
      managerComment,
    } = body;

    const employee = await prisma.employee.findUnique({
      where: { employeeId },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    const safeAssignedTasksDetails = Array.isArray(assignedTasksDetails)
      ? assignedTasksDetails
      : [];
    const assignedTasksTotal = safeAssignedTasksDetails.reduce(
      (sum, detail) => sum + (detail?.count || 0),
      0
    );
    const assignedTasksValue =
      safeAssignedTasksDetails.length > 0
        ? assignedTasksTotal
        : assignedTasks ?? 0;

    const record = await prisma.weeklyRecord.create({
      data: {
        employeeId: employee.id,
        startDate: parseDateForDatabase(startDate),
        endDate: parseDateForDatabase(endDate),
        plannedWorkHours,
        actualWorkHours,
        assignedTasks: assignedTasksValue,
        assignedTasksDetails: safeAssignedTasksDetails,
        weeklyOverdueTasks: Array.isArray(overdueTasksDetails)
          ? overdueTasksDetails.reduce(
              (sum, detail) => sum + (detail?.count || 0),
              0
            )
          : weeklyOverdueTasks,
        overdueTasksDetails: overdueTasksDetails || [],
        allOverdueTasks: allOverdueTasks || 0,
        allOverdueTasksDetails: allOverdueTasksDetails || [],
        managerComment: managerComment || null,
      },
    });

    return NextResponse.json({
      recordId: record.id,
      startDate: record.startDate.toISOString().split("T")[0],
      endDate: record.endDate.toISOString().split("T")[0],
      plannedWorkHours: record.plannedWorkHours,
      actualWorkHours: record.actualWorkHours,
      assignedTasks: record.assignedTasks,
      assignedTasksDetails: record.assignedTasksDetails || [],
      weeklyOverdueTasks: record.weeklyOverdueTasks,
      overdueTasksDetails: record.overdueTasksDetails || [],
      allOverdueTasks: record.allOverdueTasks || 0,
      allOverdueTasksDetails: record.allOverdueTasksDetails || [],
      managerComment: record.managerComment || "",
    });
  } catch (error) {
    console.error("Error creating weekly record:", error);
    return NextResponse.json(
      { error: "Failed to create weekly record", details: String(error) },
      { status: 500 }
    );
  }
}
