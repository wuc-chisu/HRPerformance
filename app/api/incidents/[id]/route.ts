import prisma from "@/lib/prisma";
import {
  calculateIncidentTotals,
  formatIncidentRecord,
  syncAutomaticWarningsForEmployee,
} from "@/lib/incidentTracking";
import { parseDateForDatabase } from "@/lib/dateUtils";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const {
      appealDecision,
      decisionDate,
      reviewedBy,
      finalAction,
      meetingCompleted,
      followUpEmailSent,
      improvementPlanReceived,
      manager,
      recordType,
      issuedBy,
      reason,
      occurrenceDate,
      historyMemo,
      historyType,
      historyCreatedBy,
    } = body;

    const existingRecord = await (prisma as any).incidentRecord.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            name: true,
            department: true,
          },
        },
      },
    });

    if (!existingRecord) {
      return NextResponse.json(
        { error: "Incident record not found" },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      const transaction = tx as any;

      const updatedRecord = await transaction.incidentRecord.update({
        where: { id },
        
        data: {
          status:
            (appealDecision ?? existingRecord.appealDecision) === "DECLINED"
              ? "CONFIRMED"
              : (appealDecision ?? existingRecord.appealDecision) === "APPROVED"
              ? "REJECTED"
              : "PENDING",
          appealDecision: appealDecision ? appealDecision : undefined,
          decisionDate: decisionDate
            ? parseDateForDatabase(decisionDate)
            : decisionDate === null
            ? null
            : undefined,
          reviewedBy: reviewedBy ?? undefined,
          finalAction: finalAction
            ? finalAction
            : undefined,
          meetingCompleted:
            typeof meetingCompleted === "boolean" ? meetingCompleted : undefined,
          followUpEmailSent:
            typeof followUpEmailSent === "boolean" ? followUpEmailSent : undefined,
          improvementPlanReceived:
            typeof improvementPlanReceived === "boolean"
              ? improvementPlanReceived
              : undefined,
          manager: manager ?? undefined,
          recordType: recordType ?? undefined,
          issuedBy: issuedBy ?? undefined,
          reason: reason ?? undefined,
          occurrenceDate: occurrenceDate
            ? parseDateForDatabase(occurrenceDate)
            : undefined,
        },
      });

      if (historyMemo && historyCreatedBy) {
        await transaction.incidentHistory.create({
          data: {
            incidentId: id,
            memo: historyMemo,
            type: historyType || "NOTE",
            createdBy: historyCreatedBy,
          },
        });
      }

      if (
        existingRecord.status !== "CONFIRMED" &&
        updatedRecord.status === "CONFIRMED"
      ) {
        await syncAutomaticWarningsForEmployee(
          transaction,
          existingRecord.employee.id,
          historyCreatedBy || reviewedBy || "SYSTEM"
        );
      }
    });

    const refreshedRecord = await (prisma as any).incidentRecord.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            name: true,
            department: true,
          },
        },
        histories: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!refreshedRecord) {
      return NextResponse.json(
        { error: "Incident record not found after update" },
        { status: 404 }
      );
    }

    const totalsMap = await calculateIncidentTotals(prisma, [refreshedRecord.employeeId]);

    return NextResponse.json({
      record: formatIncidentRecord(refreshedRecord, totalsMap),
    });
  } catch (error) {
    console.error("Error updating incident record:", error);
    return NextResponse.json(
      { error: "Failed to update incident record", details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const existingRecord = await (prisma as any).incidentRecord.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingRecord) {
      return NextResponse.json(
        { error: "Incident record not found" },
        { status: 404 }
      );
    }

    await (prisma as any).incidentRecord.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting incident record:", error);
    return NextResponse.json(
      { error: "Failed to delete incident record", details: String(error) },
      { status: 500 }
    );
  }
}
