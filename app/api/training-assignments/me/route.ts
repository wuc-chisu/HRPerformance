import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { buildAlertBuckets, calculateAssignmentComputedStatus } from "@/lib/trainingCompliance";

function getCycleStatusPriority(status: string) {
  if (status === "CURRENT") return 3;
  if (status === "UPCOMING") return 2;
  if (status === "ARCHIVED") return 1;
  return 0;
}

async function resolveCurrentEmployee() {
  const clerk = await currentUser();
  const email = clerk?.primaryEmailAddress?.emailAddress || clerk?.emailAddresses[0]?.emailAddress || "";
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) return null;

  const [employees, offboardingRecords] = await Promise.all([
    prisma.employee.findMany({
      select: {
        id: true,
        employeeId: true,
        email: true,
      },
    }),
    prisma.offboardingRecord.findMany({
      select: {
        employeeId: true,
        step8: true,
      },
    }),
  ]);

  const offboardedEmployeeIds = new Set(
    offboardingRecords
      .filter((record) => Boolean((record.step8 as { confirmedOffboard?: boolean } | null)?.confirmedOffboard))
      .map((record) => record.employeeId)
  );

  const activeEmployees = employees.filter((entry) => !offboardedEmployeeIds.has(entry.employeeId));

  return (
    activeEmployees.find((entry) => entry.email.trim().toLowerCase() === normalizedEmail) ||
    null
  );
}

export async function GET() {
  try {
    const employee = await resolveCurrentEmployee();
    if (!employee) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    const assignments = await prisma.employeeTrainingAssignment.findMany({
      where: {
        employeeId: employee.id,
      },
      include: {
        trainingProgram: {
          select: {
            id: true,
            trainingName: true,
            category: true,
            requirementType: true,
            trainingMethod: true,
            certificateRequired: true,
            examRequired: true,
            passingScore: true,
          },
        },
        trainingCycle: {
          select: {
            id: true,
            cycleStartDate: true,
            cycleDueDate: true,
            status: true,
            sequence: true,
          },
        },
      },
      orderBy: [{ dueDate: "asc" }],
    });

    const rows = assignments.map((assignment) => {
      const computedStatus = calculateAssignmentComputedStatus({
        status: assignment.status,
        dueDate: assignment.dueDate,
        completionDate: assignment.completionDate,
      });

      return {
        id: assignment.id,
        trainingProgramId: assignment.trainingProgramId,
        trainingProgramName: assignment.trainingProgram.trainingName,
        category: assignment.trainingProgram.category,
        requirementType: assignment.trainingProgram.requirementType,
        trainingMethod: assignment.trainingProgram.trainingMethod,
        examRequired: assignment.trainingProgram.examRequired,
        passingScore: assignment.trainingProgram.passingScore,
        certificateRequired: assignment.trainingProgram.certificateRequired,
        trainingCycleId: assignment.trainingCycleId,
        cycleSequence: assignment.trainingCycle.sequence,
        cycleStatus: assignment.trainingCycle.status,
        startDate: assignment.trainingCycle.cycleStartDate,
        dueDate: assignment.dueDate,
        assignedDate: assignment.assignedDate,
        completionDate: assignment.completionDate,
        examScore: assignment.examScore,
        certificateReference: assignment.certificateReference,
        status: assignment.status,
        calculatedStatus: computedStatus,
      };
    });

    const dedupedRows = Array.from(
      rows
        .sort((left, right) => {
          const cyclePriority = getCycleStatusPriority(right.cycleStatus) - getCycleStatusPriority(left.cycleStatus);
          if (cyclePriority !== 0) return cyclePriority;

          const dueDateDiff = new Date(right.dueDate).getTime() - new Date(left.dueDate).getTime();
          if (dueDateDiff !== 0) return dueDateDiff;

          return right.cycleSequence - left.cycleSequence;
        })
        .reduce((map, row) => {
          if (!map.has(row.trainingProgramId)) {
            map.set(row.trainingProgramId, row);
          }
          return map;
        }, new Map<string, (typeof rows)[number]>())
        .values()
    ).sort((left, right) => new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime());

    const alerts = buildAlertBuckets(dedupedRows.map((row) => row.calculatedStatus));

    return NextResponse.json({
      employeeId: employee.employeeId,
      assignments: dedupedRows,
      alerts,
    });
  } catch (error) {
    console.error("Error loading employee training assignments:", error);
    return NextResponse.json({ error: "Failed to load employee training assignments" }, { status: 500 });
  }
}
