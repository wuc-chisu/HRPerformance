import prisma from "@/lib/prisma";
import { formatDateForResponse, parseDateForDatabase } from "@/lib/dateUtils";
import { getPerformanceScoringVersion } from "@/lib/performanceScoring";
import { NextResponse } from "next/server";
import { getAuthenticatedEmployee } from "@/lib/current-employee";
import {
  canViewEmployeeRecord,
  isEmployee,
  isExecutive,
  isManager,
  isSelfOrDirectReport,
} from "@/lib/rbac";

// GET single weekly record by id
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const currentEmployee = await getAuthenticatedEmployee();
    if (!currentEmployee) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    const params = await context.params;
    const recordId = params.id;

    const record = await prisma.weeklyRecord.findUnique({
      where: { id: recordId },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            name: true,
            manager: true,
          },
        },
      },
    });

    if (!record) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    if (!canViewEmployeeRecord(currentEmployee, record.employee)) {
      return NextResponse.json(
        { error: "You do not have permission to view this performance record." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      recordId: record.id,
      startDate: formatDateForResponse(record.startDate),
      endDate: formatDateForResponse(record.endDate),
      plannedWorkHours: record.plannedWorkHours,
      actualWorkHours: record.actualWorkHours,
      averageQualityOfWorkScore: record.averageQualityOfWorkScore,
      assignedTasks: record.assignedTasks,
      assignedTasksDetails: (record as any).assignedTasksDetails || [],
      weeklyOverdueTasks: record.weeklyOverdueTasks,
      overdueTasksDetails: (record as any).overdueTasksDetails || [],
      allOverdueTasks: (record as any).allOverdueTasks || 0,
      allOverdueTasksDetails: (record as any).allOverdueTasksDetails || [],
      managerComment: (record as any).managerComment || "",
    });
  } catch (error) {
    console.error("Error fetching weekly record:", error);
    return NextResponse.json(
      { error: "Failed to fetch weekly record" },
      { status: 500 }
    );
  }
}

// PUT update weekly record
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  console.log("\n🔄 [PUT] Starting weekly record update");
  
  try {
    const params = await context.params;
    const recordId = params.id;
    console.log("🔍 Record ID:", recordId);
    
    const body = await request.json();
    const {
      startDate,
      endDate,
      plannedWorkHours,
      actualWorkHours,
      averageQualityOfWorkScore,
      assignedTasks,
      assignedTasksDetails,
      weeklyOverdueTasks,
      overdueTasksDetails,
      allOverdueTasks,
      allOverdueTasksDetails,
      managerComment,
    } = body;

    console.log("📋 Data received - managerComment:", managerComment ? "yes" : "null");

    // Validate record exists
    const existingRecord = await prisma.weeklyRecord.findUnique({
      where: { id: recordId },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            name: true,
            manager: true,
          },
        },
      },
    });
    
    if (!existingRecord) {
      console.log("❌ Record not found:", recordId);
      const response = { error: "Record not found" };
      console.log("📤 Sending 404 response");
      return NextResponse.json(response, { status: 404 });
    }

    const currentEmployee = await getAuthenticatedEmployee();
    if (!currentEmployee) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    if (isExecutive(currentEmployee.systemRole) || isEmployee(currentEmployee.systemRole)) {
      return NextResponse.json(
        { error: "You do not have permission to manage performance records." },
        { status: 403 }
      );
    }

    if (isManager(currentEmployee.systemRole)) {
      if (!isSelfOrDirectReport(currentEmployee, existingRecord.employee)) {
        return NextResponse.json(
          { error: "Managers can only update performance records for themselves or their direct reports." },
          { status: 403 }
        );
      }
    }

    console.log("✅ Record found, proceeding with update");

    // Parse dates only when provided; otherwise keep existing values.
    const psd = startDate
      ? parseDateForDatabase(startDate)
      : existingRecord.startDate;
    const ped = endDate
      ? parseDateForDatabase(endDate)
      : existingRecord.endDate;
    const recordDate = startDate || formatDateForResponse(existingRecord.startDate);
    const hasQualityScore =
      averageQualityOfWorkScore !== undefined &&
      averageQualityOfWorkScore !== null;
    const qualityScore =
      hasQualityScore
        ? Number(averageQualityOfWorkScore)
        : existingRecord.averageQualityOfWorkScore;

    if (
      getPerformanceScoringVersion(recordDate) === "QUALITY_OF_WORK" &&
      hasQualityScore &&
      (qualityScore == null ||
        !Number.isFinite(qualityScore) ||
        qualityScore < 1 ||
        qualityScore > 5 ||
        !/^\d+(\.\d{1,2})?$/.test(String(averageQualityOfWorkScore ?? qualityScore)))
    ) {
      return NextResponse.json(
        { error: "Average Quality of Work Score must be between 1.00 and 5.00 with up to 2 decimal places" },
        { status: 400 }
      );
    }

    console.log("🗓️ Dates parsed");

    // Update the record
    console.log("📝 Calling prisma.weeklyRecord.update...");
    
    const record = await prisma.weeklyRecord.update({
      where: { id: recordId },
      data: {
        startDate: psd,
        endDate: ped,
        plannedWorkHours:
          plannedWorkHours !== undefined
            ? Number(plannedWorkHours) || 0
            : existingRecord.plannedWorkHours,
        actualWorkHours:
          actualWorkHours !== undefined
            ? Number(actualWorkHours) || 0
            : existingRecord.actualWorkHours,
        averageQualityOfWorkScore: qualityScore,
        assignedTasks:
          assignedTasks !== undefined
            ? Number(assignedTasks) || 0
            : existingRecord.assignedTasks,
        assignedTasksDetails:
          assignedTasksDetails !== undefined
            ? Array.isArray(assignedTasksDetails)
              ? assignedTasksDetails
              : []
            : ((existingRecord as any).assignedTasksDetails || []),
        weeklyOverdueTasks:
          weeklyOverdueTasks !== undefined
            ? Number(weeklyOverdueTasks) || 0
            : existingRecord.weeklyOverdueTasks,
        overdueTasksDetails:
          overdueTasksDetails !== undefined
            ? Array.isArray(overdueTasksDetails)
              ? overdueTasksDetails
              : []
            : ((existingRecord as any).overdueTasksDetails || []),
        allOverdueTasks:
          allOverdueTasks !== undefined
            ? Number(allOverdueTasks) || 0
            : ((existingRecord as any).allOverdueTasks || 0),
        allOverdueTasksDetails:
          allOverdueTasksDetails !== undefined
            ? Array.isArray(allOverdueTasksDetails)
              ? allOverdueTasksDetails
              : []
            : ((existingRecord as any).allOverdueTasksDetails || []),
        managerComment:
          managerComment !== undefined
            ? managerComment || null
            : ((existingRecord as any).managerComment || null),
      },
    });

    console.log("✅ Prisma update completed, record id:", record.id);

    // Build response with only serializable data
    const result = {
      success: true,
      recordId: String(record.id),
      managerComment: String(record.managerComment || ""),
    };

    console.log("✅ Response object created:", result);
    console.log("📤 Sending success response\n");

    return NextResponse.json(result);
  } catch (error) {
    console.error("\n❌ [ERROR] Exception caught:");
    
    if (error instanceof Error) {
      console.error("   Type:", error.constructor.name);
      console.error("   Message:", error.message);
      console.error("   Stack:", error.stack);
    } else {
      console.error("   Error:", error);
    }

    console.log("📤 Sending 500 error response");
    
    try {
      return NextResponse.json(
        {
          error: "Failed to update record",
          message: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      );
    } catch (responseError) {
      console.error("❌ CRITICAL: Failed to send error response:", responseError);
      return new NextResponse(
        JSON.stringify({ error: "Server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
}

// DELETE weekly record
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const currentEmployee = await getAuthenticatedEmployee();
    if (!currentEmployee) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    if (isExecutive(currentEmployee.systemRole) || isEmployee(currentEmployee.systemRole)) {
      return NextResponse.json(
        { error: "You do not have permission to manage performance records." },
        { status: 403 }
      );
    }

    const params = await context.params;
    const recordId = params.id;

    const existing = await prisma.weeklyRecord.findUnique({
      where: { id: recordId },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            name: true,
            manager: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ success: true, message: "Record already deleted" });
    }

    if (isManager(currentEmployee.systemRole)) {
      if (!isSelfOrDirectReport(currentEmployee, existing.employee)) {
        return NextResponse.json(
          { error: "Managers can only delete performance records for themselves or their direct reports." },
          { status: 403 }
        );
      }
    }

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
