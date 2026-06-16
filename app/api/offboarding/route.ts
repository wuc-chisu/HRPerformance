import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

function parseOptionalDate(value?: string | null) {
  return value ? new Date(value) : null;
}

function normalizeStepData(step: unknown, fallback: Record<string, boolean>) {
  if (!step || typeof step !== "object") return fallback;
  return {
    ...fallback,
    ...(step as Record<string, boolean>),
  };
}

function countCompletion(payload: {
  step1: Record<string, boolean>;
  step2: Record<string, boolean>;
  step3: Record<string, boolean>;
  step4: Record<string, boolean>;
  step5: Record<string, boolean>;
  step6: Record<string, boolean>;
  step7: Record<string, boolean>;
  step8: Record<string, boolean>;
}) {
  const checks = [
    ...Object.values(payload.step1),
    ...Object.values(payload.step2),
    ...Object.values(payload.step3),
    ...Object.values(payload.step4),
    ...Object.values(payload.step5),
    ...Object.values(payload.step6),
    ...Object.values(payload.step7),
    ...Object.values(payload.step8),
  ];

  const completed = checks.filter(Boolean).length;
  const total = checks.length;
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");

    if (employeeId) {
      const record = await (prisma as any).offboardingRecord.findUnique({
        where: { employeeId },
      });

      return NextResponse.json(record || null);
    }

    const records = await (prisma as any).offboardingRecord.findMany({
      orderBy: { updatedAt: "desc" },
      take: 200,
    });

    return NextResponse.json(records);
  } catch (error) {
    console.error("Error fetching offboarding records:", error);
    return NextResponse.json(
      { error: "Failed to fetch offboarding records" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      employeeId,
      separationType,
      leaveType,
      noticeDate,
      lastWorkingDate,
      hrResponsible,
      itResponsible,
      step1,
      step2,
      step3,
      step4,
      step5,
      step6,
      step7,
      step8,
    } = body;

    if (!employeeId) {
      return NextResponse.json({ error: "employeeId is required" }, { status: 400 });
    }

    const employee = await (prisma as any).employee.findUnique({
      where: { employeeId },
      select: { employeeId: true, staffWorkLocation: true },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const isTaiwanEmployee = String(employee.staffWorkLocation || "")
      .toLowerCase()
      .includes("taiwan");

    if (isTaiwanEmployee && noticeDate && lastWorkingDate) {
      const noticeMs = new Date(lastWorkingDate).getTime() - new Date(noticeDate).getTime();
      const noticeDays = Math.floor(noticeMs / (1000 * 60 * 60 * 24));
      if (!Number.isFinite(noticeDays)) {
        return NextResponse.json(
          {
            error: "Invalid notice or last working date",
            details: "Notice Date and Last Working Date must be valid dates.",
          },
          { status: 400 }
        );
      }
      if (noticeDays < 30) {
        return NextResponse.json(
          {
            error: "Taiwan notice period requirement not met",
            details: `Taiwan employees require at least 30 days notice. Current gap is ${noticeDays} day(s).`,
          },
          { status: 400 }
        );
      }
    }

    const normalized = {
      step1: normalizeStepData(step1, {
        receivedManagerRequest: false,
        emailedItDisable: false,
        sentTerminationNotice: false,
        sentOffboardingAcknowledgement: false,
        receivedResignationNotice: false,
        sentResignationAcceptance: false,
        requestedConfirmationOfReceipt: false,
        savedEmailDeliveryRecord: false,
      }),
      step2: normalizeStepData(step2, {
        notifyDirectManager: false,
        notifyIT: false,
        notifyPayroll: false,
        notifyLeadership: false,
        notifiedAcademicAffairs: false,
        notifiedStudentServices: false,
      }),
      step3: normalizeStepData(step3, {
        disableGmail: false,
        disableGoogleDrive: false,
        disableGoogleAdmin: false,
        disableMoodle: false,
        disableGoogleClassroom: false,
        disableClickUp: false,
        disableVpnRemoteAccess: false,
        disableOtherSystems: false,
        disableEmailLogin: false,
      }),
      step4: normalizeStepData(step4, {
        returnLaptopCharger: false,
        returnIdBadge: false,
        returnKeys: false,
        returnOfficeEquipment: false,
        returnDocuments: false,
        signedPropertyChecklist: false,
      }),
      step5: normalizeStepData(step5, {
        reassignClickUpTasks: false,
        documentIncompleteWork: false,
        continuityConfirmed: false,
      }),
      step6: normalizeStepData(step6, {
        confidentialityAcknowledged: false,
        noDataRetentionAcknowledged: false,
        propertyReturnAcknowledged: false,
        studentDataProtectionAcknowledged: false,
        signedOrRefusalDocumented: false,
      }),
      step7: normalizeStepData(step7, {
        finalSalaryCalculated: false,
        ptoVacationPayoutCalculated: false,
        expenseReimbursementProcessed: false,
        severanceSeparationPaymentCalculated: false,
        accountantPayrollNotified: false,
        paymentDateConfirmed: false,
        finalCompensationIssued: false,
      }),
      step8: normalizeStepData(step8, {
        uploadTerminationNotice: false,
        uploadOffboardingAcknowledgement: false,
        resignationLetter: false,
        resignationAcceptanceLetter: false,
        propertyReturnChecklistUs: false,
        accessSuspensionConfirmation: false,
        finalCompensationWorksheet: false,
        uploadManagerRecommendationReport: false,
        uploadPerformanceReports: false,
        uploadWrittenWarnings: false,
        uploadPipDocumentation: false,
        employeeFilesArchived: false,
        offboardingCaseCompleted: false,
      }),
    };

    const completionPercent = countCompletion(normalized);

    const saved = await (prisma as any).offboardingRecord.upsert({
      where: { employeeId },
      update: {
        separationType: separationType || "Resignation",
        leaveType: leaveType || "Active working notice",
        noticeDate: parseOptionalDate(noticeDate),
        lastWorkingDate: parseOptionalDate(lastWorkingDate),
        hrResponsible: hrResponsible || "",
        itResponsible: itResponsible || "",
        step1: normalized.step1,
        step2: normalized.step2,
        step3: normalized.step3,
        step4: normalized.step4,
        step5: normalized.step5,
        step6: normalized.step6,
        step7: normalized.step7,
        step8: normalized.step8,
        completionPercent,
      },
      create: {
        employeeId,
        separationType: separationType || "Resignation",
        leaveType: leaveType || "Active working notice",
        noticeDate: parseOptionalDate(noticeDate),
        lastWorkingDate: parseOptionalDate(lastWorkingDate),
        hrResponsible: hrResponsible || "",
        itResponsible: itResponsible || "",
        step1: normalized.step1,
        step2: normalized.step2,
        step3: normalized.step3,
        step4: normalized.step4,
        step5: normalized.step5,
        step6: normalized.step6,
        step7: normalized.step7,
        step8: normalized.step8,
        completionPercent,
      },
    });

    return NextResponse.json(saved);
  } catch (error) {
    console.error("Error saving offboarding record:", error);
    return NextResponse.json(
      { error: "Failed to save offboarding record", details: String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { employeeId, confirmedOffboard } = body || {};

    if (!employeeId) {
      return NextResponse.json({ error: "employeeId is required" }, { status: 400 });
    }

    const existing = await (prisma as any).offboardingRecord.findUnique({
      where: { employeeId },
      select: { step8: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Offboarding record not found" }, { status: 404 });
    }

    const step8 = {
      ...(existing.step8 || {}),
      confirmedOffboard: Boolean(confirmedOffboard),
    };

    const updated = await (prisma as any).offboardingRecord.update({
      where: { employeeId },
      data: { step8 },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating offboarding confirmation:", error);
    return NextResponse.json(
      { error: "Failed to update offboarding confirmation", details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");

    if (!employeeId) {
      return NextResponse.json({ error: "employeeId is required" }, { status: 400 });
    }

    await (prisma as any).offboardingRecord.delete({
      where: { employeeId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting offboarding record:", error);
    return NextResponse.json(
      { error: "Failed to delete offboarding record", details: String(error) },
      { status: 500 }
    );
  }
}
