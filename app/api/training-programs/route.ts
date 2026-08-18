import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import {
  buildAlertBuckets,
  calculateAssignmentComputedStatus,
  calculateCycleDurationDays,
  calculateNextCycleDate,
  calculateDueDateFromWindow,
  deriveRecurrenceInterval,
  resolveEligibleEmployees,
} from "@/lib/trainingCompliance";

type ActiveEmployee = {
  id: string;
  employeeId: string;
  email: string;
  name: string;
  systemRole: string;
  department: string;
  position: string;
  staffWorkLocation: string;
};

type AuthContext = {
  employee: ActiveEmployee;
  activeEmployees: ActiveEmployee[];
  viewMode: "admin" | "employee";
};

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toDate(value: unknown, label: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required`);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${label} is invalid`);
  }

  return parsed;
}

async function resolveAuthContext(request: Request): Promise<AuthContext | null> {
  const clerk = await currentUser();
  const email = clerk?.primaryEmailAddress?.emailAddress || clerk?.emailAddresses[0]?.emailAddress || "";
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) return null;

  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      employeeId: true,
      email: true,
      name: true,
      systemRole: true,
      department: true,
      position: true,
      staffWorkLocation: true,
    },
  });

  let offboardingRecords: Array<{ employeeId: string; step8: unknown }> = [];
  try {
    offboardingRecords = await prisma.offboardingRecord.findMany({
      select: {
        employeeId: true,
        step8: true,
      },
    });
  } catch (error) {
    console.warn("Skipping offboarding filter in training auth context:", error);
  }

  const offboardedEmployeeIds = new Set(
    offboardingRecords
      .filter((record) => Boolean((record.step8 as { confirmedOffboard?: boolean } | null)?.confirmedOffboard))
      .map((record) => record.employeeId)
  );

  const activeEmployees = employees
    .filter((entry) => !offboardedEmployeeIds.has(entry.employeeId))
    .map((entry) => ({
      ...entry,
      email: normalizeText(entry.email),
      systemRole: normalizeText(entry.systemRole),
      department: normalizeText(entry.department),
      position: normalizeText(entry.position),
      staffWorkLocation: normalizeText(entry.staffWorkLocation),
    }));

  const employee = activeEmployees.find((entry) => entry.email.toLowerCase() === normalizedEmail);

  if (!employee) return null;

  return {
    employee,
    activeEmployees,
    viewMode: request.headers.get("x-view-mode") === "employee" ? "employee" : "admin",
  };
}

function isAuthorizedAdmin(context: AuthContext) {
  const role = normalizeText(context.employee.systemRole).toLowerCase();
  return context.viewMode !== "employee" && role !== "employee";
}

async function assignEmployeesToCycle(input: {
  trainingProgramId: string;
  trainingCycleId: string;
  dueDate: Date;
  appliesTo: string[];
  customGroupName: string | null;
  activeEmployees: ActiveEmployee[];
}) {
  const employees = resolveEligibleEmployees(input.activeEmployees, input.appliesTo, input.customGroupName);

  if (employees.length === 0) return;

  await prisma.employeeTrainingAssignment.createMany({
    data: employees.map((employee) => ({
      employeeId: employee.id,
      trainingProgramId: input.trainingProgramId,
      trainingCycleId: input.trainingCycleId,
      assignedDate: new Date(),
      dueDate: input.dueDate,
      status: "ASSIGNED",
    })),
    skipDuplicates: true,
  });
}

function mapProgram(program: any) {
  const currentCycle = [...(program.cycles || [])].sort(
    (a: any, b: any) => new Date(b.cycleStartDate).getTime() - new Date(a.cycleStartDate).getTime()
  )[0] || null;

  return {
    id: program.id,
    programCode: program.programCode,
    trainingName: program.trainingName,
    category: program.category,
    requirementType: program.requirementType,
    appliesTo: program.appliesTo,
    customGroupName: program.customGroupName,
    startDate: program.startDate,
    dueDate: program.dueDate,
    recurrence: program.recurrence,
    recurrenceIntervalValue: program.recurrenceIntervalValue,
    recurrenceIntervalUnit: program.recurrenceIntervalUnit,
    nextCycleDate: program.nextCycleDate,
    trainingMethod: program.trainingMethod,
    completionMethod: program.completionMethod,
    examRequired: program.examRequired,
    passingScore: program.passingScore,
    certificateRequired: program.certificateRequired,
    status: program.status,
    canDelete: (program._count?.assignments || 0) === 0 && (program._count?.completionRecords || 0) === 0,
    alerts: {
      dueSoon: 0,
      urgent: 0,
      overdue: 0,
    },
    currentCycleId: currentCycle?.id || null,
    assignmentCount: program._count?.assignments || 0,
    completionCount: program._count?.completionRecords || 0,
    createdAt: program.createdAt,
    updatedAt: program.updatedAt,
  };
}

export async function GET(request: Request) {
  try {
    const context = await resolveAuthContext(request);
    if (!context) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    if (!isAuthorizedAdmin(context)) {
      return NextResponse.json({ error: "Training program management is restricted to HR Admin." }, { status: 403 });
    }

    const url = new URL(request.url);
    const category = url.searchParams.get("category") || undefined;
    const requirementType = url.searchParams.get("requirementType") || undefined;
    const status = url.searchParams.get("status") || undefined;
    const appliesTo = url.searchParams.get("appliesTo") || undefined;

    const programs = await prisma.trainingProgram.findMany({
      where: {
        ...(category ? { category: category as any } : {}),
        ...(requirementType ? { requirementType: requirementType as any } : {}),
        ...(status ? { status: status as any } : {}),
        ...(appliesTo ? { appliesTo: { has: appliesTo as any } } : {}),
      },
      include: {
        cycles: {
          select: {
            id: true,
            cycleStartDate: true,
          },
          orderBy: {
            cycleStartDate: "desc",
          },
        },
        _count: {
          select: {
            assignments: true,
            completionRecords: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(programs.map(mapProgram));
  } catch (error) {
    console.error("Error fetching training programs:", error);

    if (process.env.NODE_ENV !== "production") {
      try {
        const fallbackPrograms = await prisma.trainingProgram.findMany({
          where: {},
          orderBy: {
            createdAt: "desc",
          },
        });

        console.warn("Training programs GET used development fallback query.");
        return NextResponse.json(fallbackPrograms.map(mapProgram));
      } catch (fallbackError) {
        console.error("Training programs fallback query failed:", fallbackError);
      }
    }

    const errorMessage = error instanceof Error ? error.message : "Failed to fetch training programs";
    return NextResponse.json(
      {
        error: process.env.NODE_ENV !== "production" ? errorMessage : "Failed to fetch training programs",
        ...(process.env.NODE_ENV !== "production" ? { details: errorMessage } : {}),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const context = await resolveAuthContext(request);
    if (!context) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    if (!isAuthorizedAdmin(context)) {
      return NextResponse.json({ error: "Training program management is restricted to HR Admin." }, { status: 403 });
    }

    const body = await request.json();

    const trainingName = String(body.trainingName || "").trim();
    const programCode = typeof body.programCode === "string" ? body.programCode.trim().toUpperCase() : "";
    const category = body.category;
    const requirementType = body.requirementType || "REQUIRED";
    const appliesTo = Array.isArray(body.appliesTo) ? body.appliesTo : [];
    const customGroupName = typeof body.customGroupName === "string" ? body.customGroupName.trim() : null;
    const recurrence = body.recurrence;
    const trainingMethod = body.trainingMethod;
    const completionMethod = body.completionMethod || "HR_VERIFICATION";
    const examRequired = Boolean(body.examRequired);
    const passingScore = body.passingScore == null || body.passingScore === "" ? null : Number(body.passingScore);
    const certificateRequired = body.certificateRequired !== false;
    const status = body.status || "DRAFT";

    if (!trainingName || !category || !requirementType || appliesTo.length === 0 || !recurrence || !trainingMethod || !completionMethod) {
      return NextResponse.json({ error: "Missing required training program fields." }, { status: 400 });
    }

    const startDate = toDate(body.startDate, "Start Date");
    const dueDate = toDate(body.dueDate, "Due Date");

    if (dueDate < startDate) {
      return NextResponse.json({ error: "Due Date cannot be earlier than Start Date." }, { status: 400 });
    }

    if (examRequired && (passingScore == null || !Number.isFinite(passingScore) || passingScore < 0 || passingScore > 100)) {
      return NextResponse.json({ error: "Passing Score must be between 0 and 100." }, { status: 400 });
    }

    const recurrenceInterval = deriveRecurrenceInterval(
      recurrence,
      body.customRecurrenceIntervalValue ? Number(body.customRecurrenceIntervalValue) : null,
      body.customRecurrenceIntervalUnit || null
    );

    const nextCycleDate = calculateNextCycleDate(
      startDate,
      recurrence,
      recurrenceInterval.value,
      recurrenceInterval.unit
    );

    const windowDays = calculateCycleDurationDays(startDate, dueDate);

    const program = await prisma.trainingProgram.create({
      data: {
        programCode: programCode || null,
        trainingName,
        category,
        requirementType,
        appliesTo,
        customGroupName,
        startDate,
        dueDate,
        recurrence,
        recurrenceIntervalValue: recurrenceInterval.value,
        recurrenceIntervalUnit: recurrenceInterval.unit,
        nextCycleDate,
        trainingMethod,
        completionMethod,
        examRequired,
        passingScore,
        certificateRequired,
        status,
      },
    });

    const currentCycle = await prisma.trainingCycle.create({
      data: {
        trainingProgramId: program.id,
        cycleStartDate: startDate,
        cycleDueDate: dueDate,
        status: "CURRENT",
        sequence: 1,
        windowDays,
      },
    });

    if (nextCycleDate) {
      const upcomingDueDate = calculateDueDateFromWindow(nextCycleDate, windowDays);
      await prisma.trainingCycle.create({
        data: {
          trainingProgramId: program.id,
          cycleStartDate: nextCycleDate,
          cycleDueDate: upcomingDueDate,
          status: "UPCOMING",
          sequence: 2,
          windowDays,
        },
      });
    }

    if (status === "ACTIVE") {
      await assignEmployeesToCycle({
        trainingProgramId: program.id,
        trainingCycleId: currentCycle.id,
        dueDate,
        appliesTo,
        customGroupName,
        activeEmployees: context.activeEmployees,
      });
    }

    const createdProgram = await prisma.trainingProgram.findUnique({
      where: { id: program.id },
      include: {
        cycles: {
          include: {
            _count: {
              select: {
                assignments: true,
                completionRecords: true,
              },
            },
            assignments: {
              select: {
                status: true,
                dueDate: true,
                completionDate: true,
              },
            },
          },
          orderBy: {
            cycleStartDate: "desc",
          },
        },
        _count: {
          select: {
            assignments: true,
            completionRecords: true,
          },
        },
      },
    });

    return NextResponse.json(mapProgram(createdProgram), { status: 201 });
  } catch (error) {
    console.error("Error creating training program:", error);
    return NextResponse.json({ error: "Failed to create training program" }, { status: 500 });
  }
}
