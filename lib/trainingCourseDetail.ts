import prisma from "@/lib/prisma";
import { calculateAssignmentComputedStatus } from "@/lib/trainingCompliance";
import { resolveCurrentTrainingEmployee } from "@/lib/trainingWorkflow";

export type EmployeeTrainingCourseDetail = {
  employee: {
    id: string;
    employeeId: string;
    name: string;
    email: string;
  };
  assignment: {
    id: string;
    status: string;
    calculatedStatus: "UPCOMING" | "DUE_SOON" | "URGENT" | "OVERDUE" | "COMPLETED";
    assignedDate: string;
    dueDate: string;
    completionDate: string | null;
    examScore: number | null;
    certificateReference: string | null;
    cycle: {
      id: string;
      status: string;
      sequence: number;
      startDate: string;
      dueDate: string;
    };
  };
  trainingProgram: {
    id: string;
    name: string;
    description: string | null;
    category: string;
    requirementType: string;
    trainingMethod: string;
    completionMethod: string;
    examRequired: boolean;
    passingScore: number | null;
    certificateRequired: boolean;
    status: string;
    startDate: string;
    dueDate: string;
  };
  progress: {
    totalRequiredModules: number;
    completedRequiredModules: number;
    percentage: number;
  };
  modules: Array<{
    id: string;
    title: string;
    description: string | null;
    moduleType: string;
    displayOrder: number;
    isRequired: boolean;
    contentReference: string | null;
    status: string;
    startedAt: string | null;
    completedAt: string | null;
    lastAccessedAt: string | null;
  }>;
  finalExam: {
    visible: boolean;
    passingScore: number | null;
    unlocked: boolean;
    attemptNumber: number | null;
    inProgressAttemptId: string | null;
    alreadyPassed: boolean;
    certificateId: string | null;
    latestResult: {
      attemptId: string;
      attemptNumber: number;
      scorePercent: number | null;
      passingScoreUsed: number | null;
      passed: boolean | null;
      startedAt: string;
      submittedAt: string | null;
    } | null;
    history: Array<{
      id: string;
      attemptNumber: number;
      scorePercent: number | null;
      passingScoreUsed: number | null;
      passed: boolean | null;
      startedAt: string;
      submittedAt: string | null;
      gradedAt: string | null;
    }>;
  };
  certificate: {
    available: boolean;
    certificateId: string | null;
  };
};

export async function getEmployeeTrainingCourseDetail(
  assignmentId: string
): Promise<EmployeeTrainingCourseDetail | null> {
  const employee = await resolveCurrentTrainingEmployee();
  if (!employee) {
    return null;
  }

  const assignment = await prisma.employeeTrainingAssignment.findFirst({
    where: {
      id: assignmentId,
      employeeId: employee.id,
    },
    include: {
      trainingCycle: {
        select: {
          id: true,
          status: true,
          sequence: true,
          cycleStartDate: true,
          cycleDueDate: true,
        },
      },
      trainingProgram: {
        select: {
          id: true,
          trainingName: true,
          description: true,
          category: true,
          requirementType: true,
          trainingMethod: true,
          completionMethod: true,
          examRequired: true,
          passingScore: true,
          certificateRequired: true,
          status: true,
          startDate: true,
          dueDate: true,
          modules: {
            where: {
              isActive: true,
              status: "ACTIVE",
            },
            orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
            select: {
              id: true,
              title: true,
              description: true,
              moduleType: true,
              displayOrder: true,
              isRequired: true,
              contentReference: true,
            },
          },
        },
      },
      moduleProgress: {
        select: {
          trainingProgramModuleId: true,
          status: true,
          startedAt: true,
          completedAt: true,
          lastAccessedAt: true,
        },
      },
      quizAttempts: {
        orderBy: [{ attemptNumber: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          attemptNumber: true,
          status: true,
          startedAt: true,
          submittedAt: true,
          gradedAt: true,
          scorePercent: true,
          passingScoreUsed: true,
          passed: true,
        },
      },
      certificates: {
        where: {
          status: "ACTIVE",
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          certificateId: true,
        },
      },
    },
  });

  if (!assignment) {
    return null;
  }

  const progressByModuleId = new Map(
    assignment.moduleProgress.map((progress) => [progress.trainingProgramModuleId, progress])
  );

  const modules = assignment.trainingProgram.modules.map((module) => {
    const progress = progressByModuleId.get(module.id);
    return {
      id: module.id,
      title: module.title,
      description: module.description,
      moduleType: module.moduleType,
      displayOrder: module.displayOrder,
      isRequired: module.isRequired,
      contentReference: module.contentReference,
      status: progress?.status || "NOT_STARTED",
      startedAt: progress?.startedAt?.toISOString() || null,
      completedAt: progress?.completedAt?.toISOString() || null,
      lastAccessedAt: progress?.lastAccessedAt?.toISOString() || null,
    };
  });

  const totalRequiredModules = modules.filter((module) => module.isRequired).length;
  const completedRequiredModules = modules.filter(
    (module) => module.isRequired && module.status === "COMPLETED"
  ).length;
  const percentage = totalRequiredModules > 0 ? Math.round((completedRequiredModules / totalRequiredModules) * 100) : 0;
  const calculatedStatus = calculateAssignmentComputedStatus({
    status: assignment.status,
    dueDate: assignment.dueDate,
    completionDate: assignment.completionDate,
  });
  const latestAttempt = assignment.quizAttempts[0] || null;
  const inProgressAttempt = assignment.quizAttempts.find((attempt) => attempt.status === "IN_PROGRESS") || null;
  const latestPassingAttempt =
    assignment.quizAttempts.find((attempt) => attempt.passed === true) || null;
  const nextAttemptNumber = latestAttempt ? latestAttempt.attemptNumber + 1 : 1;
  const activeCertificate = assignment.certificates[0] || null;

  return {
    employee: {
      id: employee.id,
      employeeId: employee.employeeId,
      name: employee.name,
      email: employee.email,
    },
    assignment: {
      id: assignment.id,
      status: assignment.status,
      calculatedStatus,
      assignedDate: assignment.assignedDate.toISOString(),
      dueDate: assignment.dueDate.toISOString(),
      completionDate: assignment.completionDate?.toISOString() || null,
      examScore: assignment.examScore,
      certificateReference: assignment.certificateReference,
      cycle: {
        id: assignment.trainingCycle.id,
        status: assignment.trainingCycle.status,
        sequence: assignment.trainingCycle.sequence,
        startDate: assignment.trainingCycle.cycleStartDate.toISOString(),
        dueDate: assignment.trainingCycle.cycleDueDate.toISOString(),
      },
    },
    trainingProgram: {
      id: assignment.trainingProgram.id,
      name: assignment.trainingProgram.trainingName,
      description: assignment.trainingProgram.description,
      category: assignment.trainingProgram.category,
      requirementType: assignment.trainingProgram.requirementType,
      trainingMethod: assignment.trainingProgram.trainingMethod,
      completionMethod: assignment.trainingProgram.completionMethod,
      examRequired: assignment.trainingProgram.examRequired,
      passingScore: assignment.trainingProgram.passingScore,
      certificateRequired: assignment.trainingProgram.certificateRequired,
      status: assignment.trainingProgram.status,
      startDate: assignment.trainingProgram.startDate.toISOString(),
      dueDate: assignment.trainingProgram.dueDate.toISOString(),
    },
    progress: {
      totalRequiredModules,
      completedRequiredModules,
      percentage,
    },
    modules,
    finalExam: {
      visible: assignment.trainingProgram.examRequired,
      passingScore: assignment.trainingProgram.passingScore,
      unlocked: completedRequiredModules === totalRequiredModules,
      attemptNumber: inProgressAttempt?.attemptNumber || (assignment.status === "COMPLETED" ? null : nextAttemptNumber),
      inProgressAttemptId: inProgressAttempt?.id || null,
      alreadyPassed: assignment.status === "COMPLETED" || Boolean(latestPassingAttempt),
      certificateId: activeCertificate?.certificateId || null,
      latestResult: latestAttempt
        ? {
            attemptId: latestAttempt.id,
            attemptNumber: latestAttempt.attemptNumber,
            scorePercent: latestAttempt.scorePercent,
            passingScoreUsed: latestAttempt.passingScoreUsed,
            passed: latestAttempt.passed,
            startedAt: latestAttempt.startedAt.toISOString(),
            submittedAt: latestAttempt.submittedAt?.toISOString() || null,
          }
        : null,
      history: assignment.quizAttempts.map((attempt) => ({
        id: attempt.id,
        attemptNumber: attempt.attemptNumber,
        scorePercent: attempt.scorePercent,
        passingScoreUsed: attempt.passingScoreUsed,
        passed: attempt.passed,
        startedAt: attempt.startedAt.toISOString(),
        submittedAt: attempt.submittedAt?.toISOString() || null,
        gradedAt: attempt.gradedAt?.toISOString() || null,
      })),
    },
    certificate: {
      available: Boolean(activeCertificate),
      certificateId: activeCertificate?.certificateId || null,
    },
  };
}
