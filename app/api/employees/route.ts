import prisma from "@/lib/prisma";
import { parseDateForDatabase } from "@/lib/dateUtils";
import { NextResponse } from "next/server";
import { REQUIRED_ONBOARDING_FORMS } from "@/lib/employees";

function buildDefaultStep2Forms(joinDate: Date, completed: boolean) {
  return REQUIRED_ONBOARDING_FORMS.map((name) => ({
    name,
    status: completed ? "Approved" : "Pending",
    dateCompleted: completed ? joinDate.toISOString().split("T")[0] : null,
    verifiedBy: completed ? "System" : "",
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
        verifiedBy: item?.verifiedBy || "",
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
    step2CompletedAt: emp.onboardingStep2CompletedAt?.toISOString() || null,
    step3CompletedAt: emp.onboardingStep3CompletedAt?.toISOString() || null,
    step4CompletedAt: emp.onboardingStep4CompletedAt?.toISOString() || null,
    step5CompletedAt: emp.onboardingStep5CompletedAt?.toISOString() || null,
    step6StartedAt: emp.onboardingStep6StartedAt?.toISOString() || null,
    step6LastReviewAt: emp.onboardingStep6LastReviewAt?.toISOString() || null,
    updatedBy: emp.onboardingStep1UpdatedBy || "System",
    updatedAt: emp.onboardingStep1UpdatedAt?.toISOString() || null,
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
      joinDate: emp.joinDate.toISOString().split("T")[0],
      workAuthorizationStatus: emp.workAuthorizationStatus,
      employeeType: emp.employeeType || "Full time",
      contractWorkHours: emp.contractWorkHours ?? null,
      overallOverdueTasks: emp.overallOverdueTasks,
      onboarding: formatOnboarding(emp),
      weeklyRecords: emp.weeklyRecords.map((record: any) => ({
        recordId: record.id,
        startDate: record.startDate.toISOString().split("T")[0],
        endDate: record.endDate.toISOString().split("T")[0],
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
    const { employeeId, name, email, department, manager, position, joinDate, workAuthorizationStatus, employeeType, contractWorkHours, overallOverdueTasks } = body;

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
        employeeType: employeeType || "Full time",
        contractWorkHours: employeeType === "Contract" ? (parseInt(contractWorkHours) || null) : null,
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
        onboardingStep4Completed: false,
        onboardingStep5Completed: false,
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
      joinDate: employee.joinDate.toISOString().split("T")[0],
      workAuthorizationStatus: employee.workAuthorizationStatus,
      employeeType: (employee as any).employeeType || "Full time",
      contractWorkHours: (employee as any).contractWorkHours ?? null,
      overallOverdueTasks: employee.overallOverdueTasks,
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
