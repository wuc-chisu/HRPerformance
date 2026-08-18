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

async function normalizeProgramCycleStatuses(input: {
  trainingProgramId: string;
  currentCycleId: string;
  nextCycleDate: Date | null;
}) {
  const cycles = await prisma.trainingCycle.findMany({
    where: {
      trainingProgramId: input.trainingProgramId,
    },
    select: {
      id: true,
      cycleStartDate: true,
    },
  });

  for (const cycle of cycles) {
    const isCurrent = cycle.id === input.currentCycleId;
    const isUpcoming =
      !isCurrent &&
      input.nextCycleDate != null &&
      new Date(cycle.cycleStartDate).toISOString() === input.nextCycleDate.toISOString();

    await prisma.trainingCycle.update({
      where: { id: cycle.id },
      data: {
        status: isCurrent ? "CURRENT" : isUpcoming ? "UPCOMING" : "ARCHIVED",
      },
    });
  }
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
  const currentCycle = [...program.cycles].sort(
    (a, b) => new Date(b.cycleStartDate).getTime() - new Date(a.cycleStartDate).getTime()
  )[0] || null;

  const computedStatuses = (currentCycle?.assignments || []).map((assignment: any) =>
    calculateAssignmentComputedStatus({
      status: assignment.status,
      dueDate: new Date(assignment.dueDate),
      completionDate: assignment.completionDate ? new Date(assignment.completionDate) : null,
    })
  );

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
    canDelete:
      program._count.assignments === 0 &&
      program._count.completionRecords === 0 &&
      (program.cycles || []).every(
        (cycle: any) => cycle._count.assignments === 0 && cycle._count.completionRecords === 0
      ),
    alerts: buildAlertBuckets(computedStatuses),
    currentCycleId: currentCycle?.id || null,
    assignmentCount: program._count.assignments,
    completionCount: program._count.completionRecords,
    createdAt: program.createdAt,
    updatedAt: program.updatedAt,
  };
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authContext = await resolveAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    if (!isAuthorizedAdmin(authContext)) {
      return NextResponse.json({ error: "Training program management is restricted to HR Admin." }, { status: 403 });
    }

    const { id } = await context.params;
    const program = await prisma.trainingProgram.findUnique({
      where: { id },
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

    if (!program) {
      return NextResponse.json({ error: "Training program not found." }, { status: 404 });
    }

    return NextResponse.json(mapProgram(program));
  } catch (error) {
    console.error("Error fetching training program:", error);
    return NextResponse.json({ error: "Failed to fetch training program" }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authContext = await resolveAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    if (!isAuthorizedAdmin(authContext)) {
      return NextResponse.json({ error: "Training program management is restricted to HR Admin." }, { status: 403 });
    }

    const { id } = await context.params;
    const existing = await prisma.trainingProgram.findUnique({
      where: { id },
      include: {
        cycles: {
          orderBy: {
            sequence: "asc",
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Training program not found." }, { status: 404 });
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

    await prisma.trainingProgram.update({
      where: { id },
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

    const existingCurrent = existing.cycles.find(
      (cycle) => new Date(cycle.cycleStartDate).toISOString() === startDate.toISOString()
    );

    const currentCycle = existingCurrent
      ? await prisma.trainingCycle.update({
          where: { id: existingCurrent.id },
          data: {
            cycleDueDate: dueDate,
            status: "CURRENT",
            windowDays,
          },
        })
      : await prisma.trainingCycle.create({
          data: {
            trainingProgramId: id,
            cycleStartDate: startDate,
            cycleDueDate: dueDate,
            status: "CURRENT",
            sequence: (existing.cycles.at(-1)?.sequence || 0) + 1,
            windowDays,
          },
        });

    if (nextCycleDate) {
      const upcomingDueDate = calculateDueDateFromWindow(nextCycleDate, windowDays);
      const existingUpcoming = existing.cycles.find(
        (cycle) => new Date(cycle.cycleStartDate).toISOString() === nextCycleDate.toISOString()
      );

      if (existingUpcoming) {
        await prisma.trainingCycle.update({
          where: { id: existingUpcoming.id },
          data: {
            cycleDueDate: upcomingDueDate,
            status: "UPCOMING",
            windowDays,
          },
        });
      } else {
        await prisma.trainingCycle.create({
          data: {
            trainingProgramId: id,
            cycleStartDate: nextCycleDate,
            cycleDueDate: upcomingDueDate,
            status: "UPCOMING",
            sequence: (existing.cycles.at(-1)?.sequence || 1) + 1,
            windowDays,
          },
        });
      }
    }

    await normalizeProgramCycleStatuses({
      trainingProgramId: id,
      currentCycleId: currentCycle.id,
      nextCycleDate,
    });

    if (status === "ACTIVE") {
      await assignEmployeesToCycle({
        trainingProgramId: id,
        trainingCycleId: currentCycle.id,
        dueDate,
        appliesTo,
        customGroupName,
        activeEmployees: authContext.activeEmployees,
      });
    }

    const updatedProgram = await prisma.trainingProgram.findUnique({
      where: { id },
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

    return NextResponse.json(mapProgram(updatedProgram));
  } catch (error) {
    console.error("Error updating training program:", error);
    return NextResponse.json({ error: "Failed to update training program" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authContext = await resolveAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    if (!isAuthorizedAdmin(authContext)) {
      return NextResponse.json({ error: "Training program management is restricted to HR Admin." }, { status: 403 });
    }

    const { id } = await context.params;

    const existing = await prisma.trainingProgram.findUnique({
      where: { id },
      include: {
        cycles: {
          include: {
            _count: {
              select: {
                assignments: true,
                completionRecords: true,
              },
            },
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

    if (!existing) {
      return NextResponse.json({ error: "Training program not found." }, { status: 404 });
    }

    const hasHistoricalData =
      existing._count.assignments > 0 ||
      existing._count.completionRecords > 0 ||
      existing.cycles.some((cycle) => cycle._count.assignments > 0 || cycle._count.completionRecords > 0);

    if (hasHistoricalData) {
      return NextResponse.json(
        {
          error:
            "This training program has historical records and cannot be permanently deleted. Archive the training program instead.",
        },
        { status: 409 }
      );
    }

    await prisma.trainingProgram.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting training program:", error);
    return NextResponse.json({ error: "Failed to delete training program" }, { status: 500 });
  }
}
