import type { Prisma, PrismaClient } from "@prisma/client";

import { auth } from "@/auth";
import { findActiveEmployeeByEmail } from "@/lib/auth-employee";
import prisma from "@/lib/prisma";

type DbClient = PrismaClient | Prisma.TransactionClient;

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function resolveCurrentTrainingEmployee(db: DbClient = prisma) {
  const session = await auth();
  const email = session?.user?.email;
  return email ? findActiveEmployeeByEmail(email, db) : null;
}

function buildCertificateBaseId(input: {
  programCode: string | null;
  trainingProgramName: string;
  cycleStartDate: Date;
  employeeCode: string;
}) {
  const normalizedProgramCode =
    normalizeText(input.programCode).toUpperCase() ||
    normalizeText(input.trainingProgramName)
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 24) ||
    "TRAINING";

  return `${normalizedProgramCode}-${input.cycleStartDate.getUTCFullYear()}-${input.employeeCode}`;
}

async function generateUniqueCertificateId(
  db: DbClient,
  input: {
    programCode: string | null;
    trainingProgramName: string;
    cycleStartDate: Date;
    employeeCode: string;
  }
) {
  const baseId = buildCertificateBaseId(input);
  let candidate = baseId;
  let suffix = 1;

  while (await db.trainingCertificate.findUnique({ where: { certificateId: candidate }, select: { id: true } })) {
    suffix += 1;
    candidate = `${baseId}-${suffix}`;
  }

  return candidate;
}

export async function ensureTrainingCertificate(
  db: DbClient,
  input: {
    employee: { id: string; employeeId: string; name: string };
    assignment: { id: string };
    trainingProgram: { id: string; programCode: string | null; trainingName: string; certificateRequired: boolean };
    trainingCycle: { id: string; cycleStartDate: Date };
    completionDate: Date;
    completionRecordId?: string | null;
    finalQuizAttemptId?: string | null;
    finalScore?: number | null;
    requiredPassingScore?: number | null;
  }
) {
  if (!input.trainingProgram.certificateRequired) {
    return null;
  }

  const existing = await db.trainingCertificate.findFirst({
    where: {
      employeeId: input.employee.id,
      assignmentId: input.assignment.id,
      trainingCycleId: input.trainingCycle.id,
      status: "ACTIVE",
    },
  });

  if (existing) {
    return existing;
  }

  const certificateId = await generateUniqueCertificateId(db, {
    programCode: input.trainingProgram.programCode,
    trainingProgramName: input.trainingProgram.trainingName,
    cycleStartDate: input.trainingCycle.cycleStartDate,
    employeeCode: input.employee.employeeId,
  });

  return db.trainingCertificate.create({
    data: {
      certificateId,
      employeeId: input.employee.id,
      employeeNameSnapshot: input.employee.name,
      employeeCodeSnapshot: input.employee.employeeId,
      trainingProgramId: input.trainingProgram.id,
      trainingProgramNameSnapshot: input.trainingProgram.trainingName,
      trainingProgramCodeSnapshot: input.trainingProgram.programCode,
      trainingCycleId: input.trainingCycle.id,
      assignmentId: input.assignment.id,
      completionRecordId: input.completionRecordId || null,
      finalQuizAttemptId: input.finalQuizAttemptId || null,
      completionDate: input.completionDate,
      finalScore: input.finalScore ?? null,
      requiredPassingScore: input.requiredPassingScore ?? null,
      status: "ACTIVE",
    },
  });
}

export async function finalizeAssignmentCompletionFromQuiz(
  db: DbClient,
  input: {
    employee: { id: string; employeeId: string; name: string };
    assignment: {
      id: string;
      trainingProgramId: string;
      trainingCycleId: string;
      status: string;
      completionDate: Date | null;
      certificateReference: string | null;
    };
    trainingProgram: {
      id: string;
      trainingName: string;
      programCode: string | null;
      certificateRequired: boolean;
    };
    trainingCycle: {
      id: string;
      cycleStartDate: Date;
    };
    quizAttempt: {
      id: string;
      scorePercent: number | null;
      passingScoreUsed: number | null;
      submittedAt: Date | null;
    };
  }) {
  const completionDate = input.quizAttempt.submittedAt || new Date();

  await db.employeeTrainingAssignment.update({
    where: { id: input.assignment.id },
    data: {
      status: "COMPLETED",
      completionDate,
      examScore: input.quizAttempt.scorePercent ?? null,
    },
  });

  let completionRecord = await db.trainingCompletionRecord.findFirst({
    where: {
      assignmentId: input.assignment.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!completionRecord) {
    completionRecord = await db.trainingCompletionRecord.create({
      data: {
        employeeId: input.employee.id,
        trainingProgramId: input.trainingProgram.id,
        trainingCycleId: input.trainingCycle.id,
        assignmentId: input.assignment.id,
        completedAt: completionDate,
        examScore: input.quizAttempt.scorePercent ?? null,
      },
    });
  }

  const certificate = await ensureTrainingCertificate(db, {
    employee: input.employee,
    assignment: { id: input.assignment.id },
    trainingProgram: input.trainingProgram,
    trainingCycle: input.trainingCycle,
    completionDate,
    completionRecordId: completionRecord.id,
    finalQuizAttemptId: input.quizAttempt.id,
    finalScore: input.quizAttempt.scorePercent,
    requiredPassingScore: input.quizAttempt.passingScoreUsed,
  });

  if (certificate) {
    await Promise.all([
      db.employeeTrainingAssignment.update({
        where: { id: input.assignment.id },
        data: {
          certificateReference: certificate.certificateId,
        },
      }),
      db.trainingCompletionRecord.update({
        where: { id: completionRecord.id },
        data: {
          certificateReference: certificate.certificateId,
        },
      }),
    ]);
  }

  return {
    completionRecord,
    certificate,
    completionDate,
  };
}

export function calculateQuizScorePercent(correctCount: number, totalQuestions: number) {
  if (totalQuestions <= 0) return 0;
  return Math.round((correctCount / totalQuestions) * 100);
}

export function isQuizUnlocked(params: {
  activeRequiredModuleCount: number;
  completedRequiredModuleCount: number;
}) {
  return params.completedRequiredModuleCount >= params.activeRequiredModuleCount;
}
