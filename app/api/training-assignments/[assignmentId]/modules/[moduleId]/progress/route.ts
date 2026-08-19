import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";

type ProgressAction = "OPEN" | "COMPLETE";

type RouteContext = {
  params: Promise<{
    assignmentId: string;
    moduleId: string;
  }>;
};

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseAction(value: unknown): ProgressAction | null {
  const normalized = normalizeText(value).toUpperCase();
  if (normalized === "OPEN" || normalized === "COMPLETE") {
    return normalized;
  }
  return null;
}

async function resolveCurrentEmployee() {
  const clerk = await currentUser();
  const email = clerk?.primaryEmailAddress?.emailAddress || clerk?.emailAddresses[0]?.emailAddress || "";
  const normalizedEmail = normalizeText(email).toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  const employees = await prisma.employee.findMany({
    select: {
      id: true,
      employeeId: true,
      email: true,
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
  } catch {
    offboardingRecords = [];
  }

  const offboardedEmployeeIds = new Set(
    offboardingRecords
      .filter((record) => Boolean((record.step8 as { confirmedOffboard?: boolean } | null)?.confirmedOffboard))
      .map((record) => record.employeeId)
  );

  return (
    employees
      .filter((employee) => !offboardedEmployeeIds.has(employee.employeeId))
      .find((employee) => normalizeText(employee.email).toLowerCase() === normalizedEmail) || null
  );
}

function summarizeModuleProgress(params: {
  module: { id: string; isRequired: boolean };
  activeModules: Array<{ id: string; isRequired: boolean }>;
  progressRows: Array<{
    trainingProgramModuleId: string;
    status: string;
    startedAt: Date | null;
    completedAt: Date | null;
    lastAccessedAt: Date | null;
  }>;
  examRequired: boolean;
  passingScore: number | null;
}) {
  const { module, activeModules, progressRows, examRequired, passingScore } = params;
  const progressByModuleId = new Map(progressRows.map((row) => [row.trainingProgramModuleId, row]));
  const moduleProgress = progressByModuleId.get(module.id) || null;

  const totalRequiredModules = activeModules.filter((item) => item.isRequired).length;
  const completedRequiredModules = activeModules.filter((item) => {
    if (!item.isRequired) {
      return false;
    }
    const progress = progressByModuleId.get(item.id);
    return progress?.status === "COMPLETED";
  }).length;

  return {
    module: {
      id: module.id,
      status: moduleProgress?.status || "NOT_STARTED",
      startedAt: moduleProgress?.startedAt?.toISOString() || null,
      completedAt: moduleProgress?.completedAt?.toISOString() || null,
      lastAccessedAt: moduleProgress?.lastAccessedAt?.toISOString() || null,
    },
    progress: {
      totalRequiredModules,
      completedRequiredModules,
      percentage:
        totalRequiredModules > 0 ? Math.round((completedRequiredModules / totalRequiredModules) * 100) : 0,
    },
    finalExam: {
      visible: examRequired,
      passingScore,
      unlocked: completedRequiredModules === totalRequiredModules,
    },
  };
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const employee = await resolveCurrentEmployee();
    if (!employee) {
      return NextResponse.json({ error: "You must be signed in as an employee." }, { status: 401 });
    }

    const { assignmentId, moduleId } = await context.params;
    const assignment = await prisma.employeeTrainingAssignment.findFirst({
      where: {
        id: assignmentId,
        employeeId: employee.id,
      },
      select: {
        id: true,
        employeeId: true,
        trainingProgramId: true,
        trainingProgram: {
          select: {
            examRequired: true,
            passingScore: true,
            modules: {
              where: {
                isActive: true,
                status: "ACTIVE",
              },
              select: {
                id: true,
                isRequired: true,
              },
            },
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found." }, { status: 404 });
    }

    const module = assignment.trainingProgram.modules.find((item) => item.id === moduleId);
    if (!module) {
      return NextResponse.json({ error: "Module not found in your assigned course." }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const action = parseAction(body.action);
    if (!action) {
      return NextResponse.json({ error: "Action must be OPEN or COMPLETE." }, { status: 400 });
    }

    const now = new Date();
    const existing = await prisma.employeeTrainingModuleProgress.findFirst({
      where: {
        assignmentId,
        trainingProgramModuleId: moduleId,
        employeeId: employee.id,
      },
    });

    if (action === "OPEN") {
      if (!existing) {
        await prisma.employeeTrainingModuleProgress.create({
          data: {
            employeeId: employee.id,
            assignmentId,
            trainingProgramModuleId: moduleId,
            status: "IN_PROGRESS",
            startedAt: now,
            lastAccessedAt: now,
          },
        });
      } else if (existing.status === "NOT_STARTED") {
        await prisma.employeeTrainingModuleProgress.update({
          where: { id: existing.id },
          data: {
            status: "IN_PROGRESS",
            startedAt: existing.startedAt || now,
            completedAt: null,
            lastAccessedAt: now,
          },
        });
      } else {
        await prisma.employeeTrainingModuleProgress.update({
          where: { id: existing.id },
          data: {
            lastAccessedAt: now,
          },
        });
      }
    }

    if (action === "COMPLETE") {
      if (!existing || existing.status === "NOT_STARTED") {
        return NextResponse.json(
          { error: "Open the course first to set the module In Progress before completing it." },
          { status: 400 }
        );
      }

      if (existing.status !== "COMPLETED") {
        await prisma.employeeTrainingModuleProgress.update({
          where: { id: existing.id },
          data: {
            status: "COMPLETED",
            startedAt: existing.startedAt || now,
            completedAt: now,
            lastAccessedAt: now,
          },
        });
      }
    }

    const progressRows = await prisma.employeeTrainingModuleProgress.findMany({
      where: {
        assignmentId,
        trainingProgramModuleId: {
          in: assignment.trainingProgram.modules.map((item) => item.id),
        },
      },
      select: {
        trainingProgramModuleId: true,
        status: true,
        startedAt: true,
        completedAt: true,
        lastAccessedAt: true,
      },
    });

    const summary = summarizeModuleProgress({
      module,
      activeModules: assignment.trainingProgram.modules,
      progressRows,
      examRequired: assignment.trainingProgram.examRequired,
      passingScore: assignment.trainingProgram.passingScore,
    });

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Error updating employee module progress:", error);
    return NextResponse.json({ error: "Failed to update module progress." }, { status: 500 });
  }
}
