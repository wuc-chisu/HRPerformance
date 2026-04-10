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
      select: { employeeId: true },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const normalized = {
      step1: normalizeStepData(step1, {
        receivedNotice: false,
        confirmedLastWorkingDate: false,
        preparedExitAgreement: false,
        preparedFinalPayrollCalculation: false,
      }),
      step2: normalizeStepData(step2, {
        notifyDirectManager: false,
        notifyIT: false,
        notifyPayroll: false,
        notifyLeadership: false,
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
        transferDriveOwnership: false,
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
        signedConfidentialityObligations: false,
        signedPropertyReturnClause: false,
        signedNoDataRetentionClause: false,
      }),
      step7: normalizeStepData(step7, {
        finalWagesIssued: false,
        accruedCompensationIncluded: false,
      }),
      step8: normalizeStepData(step8, {
        retainedExitAgreement: false,
        retainedPropertyChecklist: false,
        retainedAccessTerminationConfirmation: false,
        retainedPerformanceWarningRecords: false,
      }),
    };

    const completionPercent = countCompletion(normalized);

    const saved = await (prisma as any).offboardingRecord.upsert({
      where: { employeeId },
      update: {
        separationType: separationType || "Resignation",
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
