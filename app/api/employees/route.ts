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

// GET all employees with their weekly records
export async function GET() {
  try {
    const employees = await (prisma as any).employee.findMany({
      include: {
        weeklyRecords: {
          orderBy: {
            startDate: "desc",
          },
        },
      },
    });

    // Transform data to match the frontend format
    const formattedEmployees = employees.map((emp: any) => ({
      id: emp.employeeId,
      name: emp.name,
      email: emp.email,
      department: emp.department,
      manager: emp.manager,
      position: emp.position,
      joinDate: formatDateForResponse(emp.joinDate),
      workAuthorizationStatus: emp.workAuthorizationStatus,
      staffWorkLocation: emp.staffWorkLocation || "USA",
      employeeType: emp.employeeType || "Full time",
      contractWorkHours: emp.contractWorkHours ?? null,
      officeSchedule: emp.officeSchedule ?? null,
      overallOverdueTasks: emp.overallOverdueTasks,
      professionalDevelopmentRecords: normalizeProfessionalDevelopmentRecords(
        emp.professionalDevelopmentRecords
      ),
      onboarding: formatOnboarding(emp),
      weeklyRecords: emp.weeklyRecords.map((record: any) => ({
        recordId: record.id,
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
        managerComment: (record as any).managerComment || "",
      })),
    }));

    return NextResponse.json(formattedEmployees);
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    );
  }
}

// POST new employee
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      employeeId,
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
    } = body;

    if (!employeeId || !name || !email || !department || !manager || !position || !joinDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const employee = await (prisma as any).employee.create({
      data: {
        employeeId,
        name,
        email,
        department,
        manager,
        position,
        joinDate: parseDateForDatabase(joinDate),
        workAuthorizationStatus: workAuthorizationStatus || "Other Work Visa",
        staffWorkLocation: staffWorkLocation || "USA",
        employeeType: employeeType || "Full time",
        contractWorkHours: employeeType === "Contract" ? (parseInt(contractWorkHours) || null) : null,
        officeSchedule: officeSchedule ?? null,
        overallOverdueTasks: overallOverdueTasks || 0,
        onboardingChecklistAssigned: false,
        systemAccessGmail: false,
        systemAccessClickup: false,
        systemAccessMoodle: false,
        systemAccessGoogleDrive: false,
        onboardingStep2Completed: false,
        onboardingStep2Forms: buildDefaultStep2Forms(
          parseDateForDatabase(joinDate),
          false
        ),
        onboardingStep3Completed: false,
        onboardingStep3Forms: buildDefaultStep3Forms(false),
        onboardingStep4Completed: false,
        onboardingStep4Forms: buildDefaultStep4Forms(false),
        onboardingStep5Completed: false,
        professionalDevelopmentRecords: [],
        onboardingStep6AnnualTracking: false,
        onboardingStep1UpdatedBy: "System",
        onboardingStep1UpdatedAt: new Date(),
        onboardingStep1Notes: "New hire onboarding not started.",
      },
      include: {
        weeklyRecords: true,
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
      professionalDevelopmentRecords: [],
      onboarding: formatOnboarding(employee),
      weeklyRecords: [],
    });
  } catch (error) {
    console.error("Error creating employee:", error);
    return NextResponse.json(
      { error: "Failed to create employee" },
      { status: 500 }
    );
  }
}
