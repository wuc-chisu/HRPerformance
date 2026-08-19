import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import {
  isStrictHrAdminInAdminView,
  resolveTrainingAdminAuthContext,
} from "@/lib/trainingAdminAuth";

type RouteContext = {
  params: Promise<{
    certificateId: string;
  }>;
};

function formatDate(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const authContext = await resolveTrainingAdminAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ error: "You must be signed in to view training certificates." }, { status: 401 });
    }

    const { certificateId } = await context.params;
    const certificate = await prisma.trainingCertificate.findUnique({
      where: { certificateId },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            name: true,
            email: true,
          },
        },
        trainingProgram: {
          select: {
            id: true,
            trainingName: true,
            programCode: true,
            category: true,
            requirementType: true,
          },
        },
        trainingCycle: {
          select: {
            id: true,
            sequence: true,
            cycleStartDate: true,
            cycleDueDate: true,
          },
        },
        assignment: {
          select: {
            id: true,
            status: true,
            completionDate: true,
          },
        },
        completionRecord: {
          select: {
            id: true,
            completedAt: true,
            examScore: true,
          },
        },
        finalQuizAttempt: {
          select: {
            id: true,
            attemptNumber: true,
            scorePercent: true,
            passingScoreUsed: true,
            submittedAt: true,
            passed: true,
          },
        },
      },
    });

    if (!certificate || certificate.status !== "ACTIVE") {
      return NextResponse.json({ error: "Training certificate not found." }, { status: 404 });
    }

    const canAdminView = isStrictHrAdminInAdminView(authContext);
    const isOwner = authContext.employee.id === certificate.employeeId;

    if (!canAdminView && !isOwner) {
      return NextResponse.json(
        { error: "You do not have permission to view this certificate." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      certificate: {
        id: certificate.id,
        certificateId: certificate.certificateId,
        status: certificate.status,
        completionDate: formatDate(certificate.completionDate),
        createdAt: formatDate(certificate.createdAt),
        employeeName: certificate.employeeNameSnapshot,
        employeeCode: certificate.employeeCodeSnapshot,
        trainingProgramName: certificate.trainingProgramNameSnapshot,
        trainingProgramCode: certificate.trainingProgramCodeSnapshot,
        finalScore: certificate.finalScore,
        requiredPassingScore: certificate.requiredPassingScore,
      },
      employee: certificate.employee,
      trainingProgram: certificate.trainingProgram,
      cycle: {
        ...certificate.trainingCycle,
        cycleStartDate: formatDate(certificate.trainingCycle.cycleStartDate),
        cycleDueDate: formatDate(certificate.trainingCycle.cycleDueDate),
      },
      assignment: {
        ...certificate.assignment,
        completionDate: formatDate(certificate.assignment.completionDate),
      },
      completionRecord: certificate.completionRecord
        ? {
            ...certificate.completionRecord,
            completedAt: formatDate(certificate.completionRecord.completedAt),
          }
        : null,
      finalQuizAttempt: certificate.finalQuizAttempt
        ? {
            ...certificate.finalQuizAttempt,
            submittedAt: formatDate(certificate.finalQuizAttempt.submittedAt),
          }
        : null,
      access: {
        viewedAs: canAdminView ? "HR_ADMIN" : "EMPLOYEE",
      },
    });
  } catch (error) {
    console.error("Error loading training certificate:", error);
    return NextResponse.json({ error: "Failed to load training certificate." }, { status: 500 });
  }
}
