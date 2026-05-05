import prisma from "@/lib/prisma";
import {
  formatDateForResponse,
  formatDateTimeForResponse,
  parseDateForDatabase,
} from "@/lib/dateUtils";
import { NextResponse } from "next/server";
import {
  REQUIRED_HR_POLICY_SIGNOFFS,
  REQUIRED_ONBOARDING_FORMS,
  REQUIRED_TRAINING_ITEMS,
} from "@/lib/employees";

function normalizeProfessionalDevelopmentRecords(records: unknown) {
  if (!Array.isArray(records)) return [];

  return records
    .filter((item) => item && typeof item === "object")
    .map((item: any, index: number) => {
      const title = typeof item.title === "string" ? item.title.trim() : "";
      const hours = Number(item.hours);
      const rawDate = typeof item.date === "string" ? item.date.trim() : "";
      const hasValidDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate);
      const dateString = hasValidDate
        ? formatDateForResponse(parseDateForDatabase(rawDate))
        : "";

      if (!title || !dateString || !Number.isFinite(hours) || hours <= 0) {
        return null;
      }

      return {
        id:
          typeof item.id === "string" && item.id.trim().length > 0
            ? item.id
            : `pd-${index + 1}`,
        title,
        date: dateString,
        hours,
        createdAt:
          typeof item.createdAt === "string" && item.createdAt.trim().length > 0
            ? item.createdAt
            : undefined,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

function parseOptionalDate(value?: string | null) {
  return value ? new Date(value) : null;
}

function buildDefaultStep2Forms(joinDate: Date, completed: boolean) {
  return REQUIRED_ONBOARDING_FORMS.map((name) => ({
    name,
    status: "Pending",
    dateCompleted: null,
    verifiedBy: "HR",
    url: "",
    extraUrls: [],
  }));
}

function getStep2Completed(forms: Array<{ status?: string }>) {
  return forms.length > 0 && forms.every((item) => item.status === "Approved" || item.status === "N/A");
}

function buildDefaultStep3Forms(completed: boolean, completedAt?: Date | null) {
  return REQUIRED_HR_POLICY_SIGNOFFS.map((name) => ({
    name,
    status: completed ? "Approved" : "Pending",
    dateCompleted: completed ? formatDateForResponse(completedAt || new Date()) : null,
    verifiedBy: "HR",
    url: "",
    extraUrls: [],
  }));
}

function getStep3Completed(forms: Array<{ status?: string }>) {
  return forms.length > 0 && forms.every((item) => item.status === "Approved");
}

function buildDefaultStep4Forms(completed: boolean, completedAt?: Date | null) {
  return REQUIRED_TRAINING_ITEMS.map((name) => ({
    name,
    status: completed ? "Approved" : "Pending",
    dateCompleted: completed ? formatDateForResponse(completedAt || new Date()) : null,
    verifiedBy: "HR",
    url: "",
    extraUrls: [],
  }));
}

function getStep4Completed(forms: Array<{ status?: string }>) {
  return forms.length > 0 && forms.every((item) => item.status === "Approved");
}

function normalizeStep2Forms(step2Forms: unknown, joinDate: Date, completed: boolean) {
  if (Array.isArray(step2Forms) && step2Forms.length > 0) {
    const lookup = new Map(
      step2Forms
        .filter((item) => item && typeof item === "object")
        .map((item: any) => [item.name, item])
    );

    return REQUIRED_ONBOARDING_FORMS.map((name) => {
      const item = lookup.get(name);
      return {
        name,
        status:
          item?.status === "Submitted" || item?.status === "Approved" || item?.status === "N/A"
            ? item.status
            : "Pending",
        dateCompleted: item?.dateCompleted || null,
        verifiedBy: item?.verifiedBy || "HR",
        url: typeof item?.url === "string" ? item.url : "",
        extraUrls: Array.isArray(item?.extraUrls)
          ? item.extraUrls.filter((entry: unknown) => typeof entry === "string")
          : [],
      };
    });
  }

  return buildDefaultStep2Forms(joinDate, completed);
}

function normalizeStep3Forms(
  step3Forms: unknown,
  completed: boolean,
  completedAt?: Date | null
) {
  if (Array.isArray(step3Forms) && step3Forms.length > 0) {
    const lookup = new Map(
      step3Forms
        .filter((item) => item && typeof item === "object")
        .map((item: any) => [item.name, item])
    );

    return REQUIRED_HR_POLICY_SIGNOFFS.map((name) => {
      const item = lookup.get(name);
      return {
        name,
        status:
          item?.status === "Submitted" || item?.status === "Approved"
            ? item.status
            : "Pending",
        dateCompleted: item?.dateCompleted || null,
        verifiedBy: "HR",
        url: "",
        extraUrls: [],
      };
    });
  }

  return buildDefaultStep3Forms(completed, completedAt);
}

function normalizeStep4Forms(
  step4Forms: unknown,
  completed: boolean,
  completedAt?: Date | null,
  legacyStep2Forms?: unknown
) {
  if (Array.isArray(step4Forms) && step4Forms.length > 0) {
    const lookup = new Map(
      step4Forms
        .filter((item) => item && typeof item === "object")
        .map((item: any) => [item.name, item])
    );

    return REQUIRED_TRAINING_ITEMS.map((name) => {
      const item = lookup.get(name);
      return {
        name,
        status:
          item?.status === "Submitted" || item?.status === "Approved"
            ? item.status
            : "Pending",
        dateCompleted: item?.dateCompleted || null,
        verifiedBy: item?.verifiedBy || "HR",
        url: typeof item?.url === "string" ? item.url : "",
        extraUrls: Array.isArray(item?.extraUrls)
          ? item.extraUrls.filter((entry: unknown) => typeof entry === "string")
          : [],
      };
    });
  }

  if (Array.isArray(legacyStep2Forms) && legacyStep2Forms.length > 0) {
    const lookup = new Map(
      legacyStep2Forms
        .filter((item) => item && typeof item === "object")
        .map((item: any) => [item.name, item])
    );

    return REQUIRED_TRAINING_ITEMS.map((name) => {
      const item = lookup.get(name);
      return {
        name,
        status:
          item?.status === "Submitted" || item?.status === "Approved"
            ? item.status
            : completed
              ? "Approved"
              : "Pending",
        dateCompleted: item?.dateCompleted || (completed ? formatDateForResponse(completedAt || new Date()) : null),
        verifiedBy: item?.verifiedBy || "HR",
        url: typeof item?.url === "string" ? item.url : "",
        extraUrls: Array.isArray(item?.extraUrls)
          ? item.extraUrls.filter((entry: unknown) => typeof entry === "string")
          : [],
      };
    });
  }

  return buildDefaultStep4Forms(completed, completedAt);
}

function formatOnboarding(emp: any) {
  const step2Forms = normalizeStep2Forms(
    emp.onboardingStep2Forms,
    emp.joinDate,
    Boolean(emp.onboardingStep2Completed)
  );
  const step3Forms = normalizeStep3Forms(
    emp.onboardingStep3Forms,
    Boolean(emp.onboardingStep3Completed),
    emp.onboardingStep3CompletedAt
  );
  const step4Forms = normalizeStep4Forms(
    emp.onboardingStep4Forms,
    Boolean(emp.onboardingStep4Completed),
    emp.onboardingStep4CompletedAt,
    emp.onboardingStep2Forms
  );

  const systemAccess = {
    gmail: Boolean(emp.systemAccessGmail),
    clickup: Boolean(emp.systemAccessClickup),
    moodle: Boolean(emp.systemAccessMoodle),
    googleDrive: Boolean(emp.systemAccessGoogleDrive),
  };

  return {
    checklistAssigned: Boolean(emp.onboardingChecklistAssigned),
    enrolled: Boolean(emp.onboardingChecklistAssigned),
    step1Completed:
      systemAccess.gmail &&
      systemAccess.clickup &&
      systemAccess.moodle &&
      systemAccess.googleDrive,
    systemAccess,
    step2Completed: getStep2Completed(step2Forms),
    step2Forms,
    step3Completed: getStep3Completed(step3Forms),
    step3Forms,
    step4Completed: getStep4Completed(step4Forms),
    step4Forms,
    step5Completed: Boolean(emp.onboardingStep5Completed),
    step6AnnualTracking: Boolean(emp.onboardingStep6AnnualTracking),
    step2CompletedAt: formatDateTimeForResponse(emp.onboardingStep2CompletedAt),
    step3CompletedAt: formatDateTimeForResponse(emp.onboardingStep3CompletedAt),
    step4CompletedAt: formatDateTimeForResponse(emp.onboardingStep4CompletedAt),
    step5CompletedAt: formatDateTimeForResponse(emp.onboardingStep5CompletedAt),
    step6StartedAt: formatDateTimeForResponse(emp.onboardingStep6StartedAt),
    step6LastReviewAt: formatDateTimeForResponse(emp.onboardingStep6LastReviewAt),
    updatedBy: emp.onboardingStep1UpdatedBy || "System",
    updatedAt: formatDateTimeForResponse(emp.onboardingStep1UpdatedAt),
    notes: emp.onboardingStep1Notes || "",
  };
}

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
    const {
      id: nextEmployeeId,
      name,
      email,
      department,
      manager,
      position,
      joinDate,
      workAuthorizationStatus,
      staffWorkLocation,
      employeeType,
      contractWorkHours,
      officeSchedule,
      overallOverdueTasks,
      onboarding,
      professionalDevelopmentRecords,
    } = body;

    // Validate required fields
    if (!nextEmployeeId || !name || !department || !position || !joinDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const existingByTargetId = await prisma.employee.findUnique({
      where: { employeeId: nextEmployeeId },
      select: { employeeId: true },
    });

    const existingEmployee = await prisma.employee.findUnique({
      where: { employeeId },
      select: {
        onboardingStep2Forms: true,
        onboardingStep3Forms: true,
        onboardingStep4Forms: true,
      },
    });

    if (!existingEmployee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    if (existingByTargetId && nextEmployeeId !== employeeId) {
      return NextResponse.json(
        { error: "Employee ID already exists" },
        { status: 409 }
      );
    }

    const normalizedStep2Forms = onboarding
      ? (() => {
          // Guard against stale clients posting empty arrays and wiping existing progress.
          const incoming = onboarding.step2Forms;
          const existing = existingEmployee.onboardingStep2Forms;
          if (
            Array.isArray(incoming) &&
            incoming.length === 0 &&
            Array.isArray(existing) &&
            existing.length > 0
          ) {
            return normalizeStep2Forms(
              existing,
              parseDateForDatabase(joinDate),
              Boolean(onboarding.step2Completed)
            );
          }

          return normalizeStep2Forms(
            incoming,
            parseDateForDatabase(joinDate),
            Boolean(onboarding.step2Completed)
          );
        })()
      : null;
    const normalizedStep3Forms = onboarding
      ? (() => {
          const incoming = onboarding.step3Forms;
          const existing = existingEmployee.onboardingStep3Forms;
          if (
            Array.isArray(incoming) &&
            incoming.length === 0 &&
            Array.isArray(existing) &&
            existing.length > 0
          ) {
            return normalizeStep3Forms(
              existing,
              Boolean(onboarding.step3Completed),
              parseOptionalDate(onboarding.step3CompletedAt)
            );
          }

          return normalizeStep3Forms(
            incoming,
            Boolean(onboarding.step3Completed),
            parseOptionalDate(onboarding.step3CompletedAt)
          );
        })()
      : null;
    const normalizedStep4Forms = onboarding
      ? (() => {
          const incoming = onboarding.step4Forms;
          const existing = existingEmployee.onboardingStep4Forms;
          if (
            Array.isArray(incoming) &&
            incoming.length === 0 &&
            Array.isArray(existing) &&
            existing.length > 0
          ) {
            return normalizeStep4Forms(
              existing,
              Boolean(onboarding.step4Completed),
              parseOptionalDate(onboarding.step4CompletedAt)
            );
          }

          return normalizeStep4Forms(
            incoming,
            Boolean(onboarding.step4Completed),
            parseOptionalDate(onboarding.step4CompletedAt)
          );
        })()
      : null;

    const employee = await prisma.employee.update({
      where: { employeeId },
      data: {
        employeeId: nextEmployeeId,
        name,
        email: email || "",
        department,
        manager: manager || "",
        position,
        joinDate: parseDateForDatabase(joinDate),
        workAuthorizationStatus: workAuthorizationStatus || "Other Work Visa",
        staffWorkLocation: staffWorkLocation || "USA",
        employeeType: employeeType || "Full time",
        contractWorkHours: employeeType === "Contract" ? (parseInt(contractWorkHours) || null) : null,
        officeSchedule: officeSchedule ?? null,
        overallOverdueTasks: overallOverdueTasks || 0,
        ...(Array.isArray(professionalDevelopmentRecords)
          ? {
              professionalDevelopmentRecords:
                normalizeProfessionalDevelopmentRecords(professionalDevelopmentRecords),
            }
          : {}),
        ...(onboarding
          ? {
              onboardingChecklistAssigned: Boolean(onboarding.checklistAssigned),
              systemAccessGmail: Boolean(onboarding.systemAccess?.gmail),
              systemAccessClickup: Boolean(onboarding.systemAccess?.clickup),
              systemAccessMoodle: Boolean(onboarding.systemAccess?.moodle),
              systemAccessGoogleDrive: Boolean(onboarding.systemAccess?.googleDrive),
              onboardingStep2Completed: getStep2Completed(normalizedStep2Forms || []),
              onboardingStep2Forms: normalizedStep2Forms,
              onboardingStep3Completed: getStep3Completed(normalizedStep3Forms || []),
              onboardingStep3Forms: normalizedStep3Forms,
              onboardingStep4Completed: getStep4Completed(normalizedStep4Forms || []),
              onboardingStep4Forms: normalizedStep4Forms,
              onboardingStep5Completed: Boolean(onboarding.step5Completed),
              onboardingStep6AnnualTracking: Boolean(onboarding.step6AnnualTracking),
              onboardingStep1UpdatedBy: onboarding.updatedBy || "HR Manager",
              onboardingStep1UpdatedAt: new Date(),
              onboardingStep1Notes: onboarding.notes || "",
              onboardingStep2CompletedAt: parseOptionalDate(
                onboarding.step2CompletedAt
              ),
              onboardingStep3CompletedAt: parseOptionalDate(
                onboarding.step3CompletedAt
              ),
              onboardingStep4CompletedAt: parseOptionalDate(
                onboarding.step4CompletedAt
              ),
              onboardingStep5CompletedAt: parseOptionalDate(
                onboarding.step5CompletedAt
              ),
              onboardingStep6StartedAt: parseOptionalDate(
                onboarding.step6StartedAt
              ),
              onboardingStep6LastReviewAt: parseOptionalDate(
                onboarding.step6LastReviewAt
              ),
            }
          : {}),
      } as any,
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
      email: employee.email,
      department: employee.department,
      manager: employee.manager,
      position: employee.position,
      joinDate: formatDateForResponse(employee.joinDate),
      workAuthorizationStatus: employee.workAuthorizationStatus,
      staffWorkLocation: employee.staffWorkLocation || "USA",
      employeeType: (employee as any).employeeType || "Full time",
      contractWorkHours: (employee as any).contractWorkHours ?? null,
      officeSchedule: (employee as any).officeSchedule ?? null,
      overallOverdueTasks: employee.overallOverdueTasks,
      professionalDevelopmentRecords: normalizeProfessionalDevelopmentRecords(
        (employee as any).professionalDevelopmentRecords
      ),
      onboarding: formatOnboarding(employee),
      weeklyRecords: (employee.weeklyRecords as any[]).map((record: {
        startDate: Date;
        endDate: Date;
        plannedWorkHours: number;
        actualWorkHours: number;
        assignedTasks: number;
        assignedTasksDetails?: unknown;
        weeklyOverdueTasks: number;
        overdueTasksDetails?: unknown;
        allOverdueTasks?: number;
        allOverdueTasksDetails?: unknown;
      }) => ({
        startDate: formatDateForResponse(record.startDate),
        endDate: formatDateForResponse(record.endDate),
        plannedWorkHours: record.plannedWorkHours,
        actualWorkHours: record.actualWorkHours,
        assignedTasks: record.assignedTasks,
        assignedTasksDetails: (record as any).assignedTasksDetails || [],
        weeklyOverdueTasks: record.weeklyOverdueTasks,
        overdueTasksDetails: (record as any).overdueTasksDetails || [],
        allOverdueTasks: (record as any).allOverdueTasks || 0,
        allOverdueTasksDetails: (record as any).allOverdueTasksDetails || [],
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

    if (!employeeId) {
      return NextResponse.json(
        { error: "Employee ID is required" },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { employeeId },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    await prisma.$transaction([
      prisma.weeklyRecord.deleteMany({
        where: { employeeId: employee.id },
      }),
      prisma.employee.delete({
        where: { id: employee.id },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting employee:", error);
    return NextResponse.json(
      { error: "Failed to delete employee", details: String(error) },
      { status: 500 }
    );
  }
}
