import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import {
  calculateQuizScorePercent,
  finalizeAssignmentCompletionFromQuiz,
  isQuizUnlocked,
  resolveCurrentTrainingEmployee,
} from "@/lib/trainingWorkflow";

type RouteContext = {
  params: Promise<{
    assignmentId: string;
  }>;
};

type QuizChoice = "A" | "B" | "C" | "D";

function normalizeChoice(value: unknown): QuizChoice | null {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
  return normalized === "A" || normalized === "B" || normalized === "C" || normalized === "D"
    ? (normalized as QuizChoice)
    : null;
}

async function loadAssignmentForQuiz(employeeId: string, assignmentId: string) {
  return prisma.employeeTrainingAssignment.findFirst({
    where: {
      id: assignmentId,
      employeeId,
    },
    include: {
      employee: {
        select: {
          id: true,
          employeeId: true,
          name: true,
          email: true,
        },
      },
      trainingCycle: {
        select: {
          id: true,
          sequence: true,
          cycleStartDate: true,
          cycleDueDate: true,
          status: true,
        },
      },
      trainingProgram: {
        select: {
          id: true,
          programCode: true,
          trainingName: true,
          examRequired: true,
          passingScore: true,
          certificateRequired: true,
          completionMethod: true,
          modules: {
            where: {
              isActive: true,
              status: "ACTIVE",
            },
            select: {
              id: true,
              isRequired: true,
              title: true,
            },
          },
          quizQuestions: {
            where: {
              isActive: true,
              status: "ACTIVE",
            },
            orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
            select: {
              id: true,
              question: true,
              displayOrder: true,
              answerA: true,
              answerB: true,
              answerC: true,
              answerD: true,
              correctAnswer: true,
            },
          },
        },
      },
      moduleProgress: {
        select: {
          trainingProgramModuleId: true,
          status: true,
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
}

function buildQuizPayload(assignment: NonNullable<Awaited<ReturnType<typeof loadAssignmentForQuiz>>>, input: {
  unlocked: boolean;
  inProgressAttemptId: string | null;
  attemptNumber: number | null;
}) {
  const latestAttempt = assignment.quizAttempts[0] || null;
  const latestPassingAttempt = assignment.quizAttempts.find((attempt) => attempt.passed === true) || null;
  const activeCertificate = assignment.certificates[0] || null;

  return {
    assignment: {
      id: assignment.id,
      status: assignment.status,
      completionDate: assignment.completionDate?.toISOString() || null,
    },
    trainingProgram: {
      id: assignment.trainingProgram.id,
      trainingName: assignment.trainingProgram.trainingName,
      passingScore: assignment.trainingProgram.passingScore,
      examRequired: assignment.trainingProgram.examRequired,
      certificateRequired: assignment.trainingProgram.certificateRequired,
    },
    cycle: {
      id: assignment.trainingCycle.id,
      sequence: assignment.trainingCycle.sequence,
      startDate: assignment.trainingCycle.cycleStartDate.toISOString(),
      dueDate: assignment.trainingCycle.cycleDueDate.toISOString(),
    },
    finalExam: {
      unlocked: input.unlocked,
      inProgressAttemptId: input.inProgressAttemptId,
      attemptNumber: input.attemptNumber,
      alreadyPassed: assignment.status === "COMPLETED" || Boolean(latestPassingAttempt),
      latestResult: latestAttempt
        ? {
            id: latestAttempt.id,
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
      certificateId: activeCertificate?.certificateId || null,
    },
    questions: input.unlocked
      ? assignment.trainingProgram.quizQuestions.map((question) => ({
          id: question.id,
          displayOrder: question.displayOrder,
          question: question.question,
          choices: [
            { value: "A", label: question.answerA },
            { value: "B", label: question.answerB },
            { value: "C", label: question.answerC },
            { value: "D", label: question.answerD },
          ],
        }))
      : [],
  };
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const employee = await resolveCurrentTrainingEmployee();
    if (!employee) {
      return NextResponse.json({ error: "You must be signed in as an employee." }, { status: 401 });
    }

    const { assignmentId } = await context.params;
    const assignment = await loadAssignmentForQuiz(employee.id, assignmentId);

    if (!assignment) {
      return NextResponse.json({ error: "Training assignment not found." }, { status: 404 });
    }

    if (!assignment.trainingProgram.examRequired) {
      return NextResponse.json({ error: "This training program does not use a final quiz." }, { status: 400 });
    }

    const totalRequiredModules = assignment.trainingProgram.modules.filter((module) => module.isRequired).length;
    const completedRequiredModules = assignment.trainingProgram.modules.filter((module) => {
      if (!module.isRequired) return false;
      return assignment.moduleProgress.some(
        (progress) =>
          progress.trainingProgramModuleId === module.id && progress.status === "COMPLETED"
      );
    }).length;

    const unlocked = isQuizUnlocked({
      activeRequiredModuleCount: totalRequiredModules,
      completedRequiredModuleCount: completedRequiredModules,
    });

    let inProgressAttemptId: string | null = null;
    let attemptNumber: number | null = null;

    if (unlocked && assignment.status !== "COMPLETED") {
      const existingInProgress = assignment.quizAttempts.find((attempt) => attempt.status === "IN_PROGRESS") || null;
      if (existingInProgress) {
        inProgressAttemptId = existingInProgress.id;
        attemptNumber = existingInProgress.attemptNumber;
      } else {
        const maxAttemptNumber = assignment.quizAttempts[0]?.attemptNumber || 0;
        const createdAttempt = await prisma.employeeTrainingQuizAttempt.create({
          data: {
            employeeId: assignment.employeeId,
            assignmentId: assignment.id,
            trainingProgramId: assignment.trainingProgramId,
            trainingCycleId: assignment.trainingCycleId,
            attemptNumber: maxAttemptNumber + 1,
            status: "IN_PROGRESS",
            startedAt: new Date(),
            passingScoreUsed: assignment.trainingProgram.passingScore,
          },
          select: {
            id: true,
            attemptNumber: true,
          },
        });
        inProgressAttemptId = createdAttempt.id;
        attemptNumber = createdAttempt.attemptNumber;
      }
    }

    const refreshedAssignment =
      inProgressAttemptId && !assignment.quizAttempts.some((attempt) => attempt.id === inProgressAttemptId)
        ? await loadAssignmentForQuiz(employee.id, assignmentId)
        : assignment;

    return NextResponse.json(
      buildQuizPayload(refreshedAssignment || assignment, {
        unlocked,
        inProgressAttemptId,
        attemptNumber,
      })
    );
  } catch (error) {
    console.error("Error loading employee final quiz:", error);
    return NextResponse.json({ error: "Failed to load final quiz." }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const employee = await resolveCurrentTrainingEmployee();
    if (!employee) {
      return NextResponse.json({ error: "You must be signed in as an employee." }, { status: 401 });
    }

    const { assignmentId } = await context.params;
    const assignment = await loadAssignmentForQuiz(employee.id, assignmentId);

    if (!assignment) {
      return NextResponse.json({ error: "Training assignment not found." }, { status: 404 });
    }

    if (!assignment.trainingProgram.examRequired) {
      return NextResponse.json({ error: "This training program does not use a final quiz." }, { status: 400 });
    }

    const totalRequiredModules = assignment.trainingProgram.modules.filter((module) => module.isRequired).length;
    const completedRequiredModules = assignment.trainingProgram.modules.filter((module) => {
      if (!module.isRequired) return false;
      return assignment.moduleProgress.some(
        (progress) =>
          progress.trainingProgramModuleId === module.id && progress.status === "COMPLETED"
      );
    }).length;

    const unlocked = isQuizUnlocked({
      activeRequiredModuleCount: totalRequiredModules,
      completedRequiredModuleCount: completedRequiredModules,
    });

    if (!unlocked) {
      return NextResponse.json(
        { error: "Complete all required course modules to unlock the quiz." },
        { status: 400 }
      );
    }

    const latestPassingAttempt = assignment.quizAttempts.find((attempt) => attempt.passed === true) || null;
    if (assignment.status === "COMPLETED" || latestPassingAttempt) {
      return NextResponse.json(
        buildQuizPayload(assignment, {
          unlocked: true,
          inProgressAttemptId: null,
          attemptNumber: null,
        })
      );
    }

    const body = await request.json().catch(() => ({}));
    const attemptId = typeof body.attemptId === "string" ? body.attemptId.trim() : "";
    const rawAnswers = Array.isArray(body.answers) ? body.answers : [];

    if (!attemptId) {
      return NextResponse.json({ error: "Quiz attempt ID is required." }, { status: 400 });
    }

    const attempt = await prisma.employeeTrainingQuizAttempt.findFirst({
      where: {
        id: attemptId,
        assignmentId: assignment.id,
        employeeId: employee.id,
      },
      include: {
        answers: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Quiz attempt not found." }, { status: 404 });
    }

    if (attempt.status !== "IN_PROGRESS") {
      const refreshed = await loadAssignmentForQuiz(employee.id, assignmentId);
      return NextResponse.json(
        buildQuizPayload(refreshed || assignment, {
          unlocked: true,
          inProgressAttemptId: null,
          attemptNumber: null,
        })
      );
    }

    const questionIds = assignment.trainingProgram.quizQuestions.map((question) => question.id);
    if (questionIds.length === 0) {
      return NextResponse.json({ error: "No active quiz questions are configured for this training program." }, { status: 400 });
    }

    const answersByQuestionId = new Map<string, QuizChoice>();
    for (const item of rawAnswers) {
      const questionId = typeof item?.questionId === "string" ? item.questionId.trim() : "";
      const selectedAnswer = normalizeChoice(item?.selectedAnswer);
      if (!questionId || !selectedAnswer) {
        return NextResponse.json({ error: "Every answer must include a valid question ID and selected choice." }, { status: 400 });
      }
      answersByQuestionId.set(questionId, selectedAnswer);
    }

    const unanswered = questionIds.filter((questionId) => !answersByQuestionId.has(questionId));
    if (unanswered.length > 0 || answersByQuestionId.size !== questionIds.length) {
      return NextResponse.json(
        { error: "Answer every quiz question before submitting." },
        { status: 400 }
      );
    }

    const passingScore = assignment.trainingProgram.passingScore ?? 0;
    const gradedAnswers = assignment.trainingProgram.quizQuestions.map((question) => {
      const selectedAnswer = answersByQuestionId.get(question.id)!;
      const isCorrect = selectedAnswer === question.correctAnswer;
      return {
        trainingProgramQuizQuestionId: question.id,
        selectedAnswer,
        isCorrect,
      };
    });

    const correctCount = gradedAnswers.filter((answer) => answer.isCorrect).length;
    const scorePercent = calculateQuizScorePercent(correctCount, gradedAnswers.length);
    const passed = scorePercent >= passingScore;
    const submittedAt = new Date();

    const result = await prisma.$transaction(async (tx) => {
      if (attempt.answers.length > 0) {
        await tx.employeeTrainingQuizAnswer.deleteMany({
          where: {
            quizAttemptId: attempt.id,
          },
        });
      }

      await tx.employeeTrainingQuizAnswer.createMany({
        data: gradedAnswers.map((answer) => ({
          quizAttemptId: attempt.id,
          trainingProgramQuizQuestionId: answer.trainingProgramQuizQuestionId,
          selectedAnswer: answer.selectedAnswer,
          isCorrect: answer.isCorrect,
          answeredAt: submittedAt,
        })),
      });

      const updatedAttempt = await tx.employeeTrainingQuizAttempt.update({
        where: { id: attempt.id },
        data: {
          status: "GRADED",
          submittedAt,
          gradedAt: submittedAt,
          scorePercent,
          passingScoreUsed: passingScore,
          passed,
        },
      });

      let completion = null;
      if (passed) {
        completion = await finalizeAssignmentCompletionFromQuiz(tx, {
          employee: {
            id: assignment.employee.id,
            employeeId: assignment.employee.employeeId,
            name: assignment.employee.name,
          },
          assignment: {
            id: assignment.id,
            trainingProgramId: assignment.trainingProgramId,
            trainingCycleId: assignment.trainingCycleId,
            status: assignment.status,
            completionDate: assignment.completionDate,
            certificateReference: assignment.certificateReference,
          },
          trainingProgram: {
            id: assignment.trainingProgram.id,
            trainingName: assignment.trainingProgram.trainingName,
            programCode: assignment.trainingProgram.programCode,
            certificateRequired: assignment.trainingProgram.certificateRequired,
          },
          trainingCycle: {
            id: assignment.trainingCycle.id,
            cycleStartDate: assignment.trainingCycle.cycleStartDate,
          },
          quizAttempt: {
            id: updatedAttempt.id,
            scorePercent: updatedAttempt.scorePercent,
            passingScoreUsed: updatedAttempt.passingScoreUsed,
            submittedAt: updatedAttempt.submittedAt,
          },
        });
      }

      return {
        updatedAttempt,
        completion,
      };
    });

    return NextResponse.json({
      result: {
        attemptId: result.updatedAttempt.id,
        attemptNumber: result.updatedAttempt.attemptNumber,
        scorePercent: result.updatedAttempt.scorePercent,
        passingScoreUsed: result.updatedAttempt.passingScoreUsed,
        passed: result.updatedAttempt.passed,
        startedAt: result.updatedAttempt.startedAt.toISOString(),
        submittedAt: result.updatedAttempt.submittedAt?.toISOString() || null,
        completionDate: result.completion?.completionDate?.toISOString() || null,
        certificateId: result.completion?.certificate?.certificateId || null,
      },
      message: passed
        ? "Congratulations - You Passed"
        : "You have not yet reached the required passing score.",
    });
  } catch (error) {
    console.error("Error submitting employee final quiz:", error);
    return NextResponse.json({ error: "Failed to submit final quiz." }, { status: 500 });
  }
}
