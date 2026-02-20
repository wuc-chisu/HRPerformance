import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

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
    });
    
    if (!existingRecord) {
      console.log("❌ Record not found:", recordId);
      const response = { error: "Record not found" };
      console.log("📤 Sending 404 response");
      return NextResponse.json(response, { status: 404 });
    }

    console.log("✅ Record found, proceeding with update");

    // Parse dates
    const [sy, sm, sd] = startDate.split("-");
    const [ey, em, ed] = endDate.split("-");
    const psd = new Date(Number(sy), Number(sm) - 1, Number(sd));
    const ped = new Date(Number(ey), Number(em) - 1, Number(ed));

    console.log("🗓️ Dates parsed");

    // Update the record
    console.log("📝 Calling prisma.weeklyRecord.update...");
    
    const record = await prisma.weeklyRecord.update({
      where: { id: recordId },
      data: {
        startDate: psd,
        endDate: ped,
        plannedWorkHours: Number(plannedWorkHours) || 0,
        actualWorkHours: Number(actualWorkHours) || 0,
        assignedTasks: Number(assignedTasks) || 0,
        assignedTasksDetails: Array.isArray(assignedTasksDetails) ? assignedTasksDetails : [],
        weeklyOverdueTasks: Number(weeklyOverdueTasks) || 0,
        overdueTasksDetails: Array.isArray(overdueTasksDetails) ? overdueTasksDetails : [],
        allOverdueTasks: Number(allOverdueTasks) || 0,
        allOverdueTasksDetails: Array.isArray(allOverdueTasksDetails) ? allOverdueTasksDetails : [],
        managerComment: managerComment || null,
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
