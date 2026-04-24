import prisma from "@/lib/prisma";
import {
  formatDateForResponse,
  formatDateTimeForResponse,
  parseDateForDatabase,
} from "@/lib/dateUtils";
import { NextResponse } from "next/server";
import { REQUIRED_ONBOARDING_FORMS } from "@/lib/employees";

function parseOptionalDate(value?: string | null) {
  return value ? new Date(value) : null;
}

function buildDefaultStep2Forms(joinDate: Date, completed: boolean) {
  return REQUIRED_ONBOARDING_FORMS.map((name) => ({
    name,
    status: completed ? "Approved" : "Pending",
    dateCompleted: completed ? formatDateForResponse(joinDate) : null,
    verifiedBy: completed ? "System" : "HR",
    url: "",
    extraUrls: [],
  }));
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

  return buildDefaultStep2Forms(joinDate, completed);
}

function formatOnboarding(emp: any) {
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
    step2Completed: Boolean(emp.onboardingStep2Completed),
    step2Forms: normalizeStep2Forms(
      emp.onboardingStep2Forms,
      emp.joinDate,
      Boolean(emp.onboardingStep2Completed)
    ),
    step3Completed: Boolean(emp.onboardingStep3Completed),
    step4Completed: Boolean(emp.onboardingStep4Completed),
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

    if (existingByTargetId && nextEmployeeId !== employeeId) {
      return NextResponse.json(
        { error: "Employee ID already exists" },
        { status: 409 }
      );
    }

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
        ...(onboarding
          ? {
              onboardingChecklistAssigned: Boolean(onboarding.checklistAssigned),
              systemAccessGmail: Boolean(onboarding.systemAccess?.gmail),
              systemAccessClickup: Boolean(onboarding.systemAccess?.clickup),
              systemAccessMoodle: Boolean(onboarding.systemAccess?.moodle),
              systemAccessGoogleDrive: Boolean(onboarding.systemAccess?.googleDrive),
              onboardingStep2Completed: Boolean(onboarding.step2Completed),
              onboardingStep2Forms: normalizeStep2Forms(
                onboarding.step2Forms,
                parseDateForDatabase(joinDate),
                Boolean(onboarding.step2Completed)
              ),
              onboardingStep3Completed: Boolean(onboarding.step3Completed),
              onboardingStep4Completed: Boolean(onboarding.step4Completed),
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
      onboarding: formatOnboarding(employee),
      weeklyRecords: employee.weeklyRecords.map((record) => ({
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
