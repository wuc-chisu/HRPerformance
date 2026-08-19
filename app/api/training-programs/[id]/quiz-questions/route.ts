import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import {
  isStrictHrAdminInAdminView,
  resolveTrainingAdminAuthContext,
  trainingAdminForbiddenResponse,
} from "@/lib/trainingAdminAuth";

type QuestionStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
type QuizChoice = "A" | "B" | "C" | "D";

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseStatus(value: unknown, fallback: QuestionStatus = "DRAFT"): QuestionStatus {
  const normalized = normalizeText(value).toUpperCase();
  const allowed: QuestionStatus[] = ["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"];
  return allowed.includes(normalized as QuestionStatus) ? (normalized as QuestionStatus) : fallback;
}

function parseChoice(value: unknown): QuizChoice | null {
  const normalized = normalizeText(value).toUpperCase();
  const allowed: QuizChoice[] = ["A", "B", "C", "D"];
  return allowed.includes(normalized as QuizChoice) ? (normalized as QuizChoice) : null;
}

function mapQuestion(question: any) {
  return {
    id: question.id,
    trainingProgramId: question.trainingProgramId,
    question: question.question,
    displayOrder: question.displayOrder,
    status: question.status,
    answerA: question.answerA,
    answerB: question.answerB,
    answerC: question.answerC,
    answerD: question.answerD,
    correctAnswer: question.correctAnswer,
    isActive: question.isActive,
    answerRecordCount: question._count?.quizAnswers || 0,
    canDelete: (question._count?.quizAnswers || 0) === 0,
    createdAt: question.createdAt,
    updatedAt: question.updatedAt,
  };
}

function isCompatibilityError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("unknown argument") ||
    normalized.includes("unknown field") ||
    normalized.includes("select") ||
    normalized.includes("cannot read properties of undefined")
  );
}

function getQuizQuestionDelegate() {
  return (prisma as any).trainingProgramQuizQuestion as
    | {
        findMany: (...args: any[]) => Promise<any[]>;
        aggregate: (...args: any[]) => Promise<any>;
        create: (...args: any[]) => Promise<any>;
      }
    | undefined;
}

async function listQuestionsCompat(trainingProgramId: string) {
  const delegate = getQuizQuestionDelegate();
  if (delegate?.findMany) {
    return delegate.findMany({
      where: {
        trainingProgramId,
      },
      include: {
        _count: {
          select: {
            quizAnswers: true,
          },
        },
      },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    });
  }

  const rows = await prisma.$queryRaw<any[]>`
    SELECT
      q.*,
      COALESCE(COUNT(a.id), 0)::int AS "answerRecordCount"
    FROM "TrainingProgramQuizQuestion" q
    LEFT JOIN "EmployeeTrainingQuizAnswer" a
      ON a."trainingProgramQuizQuestionId" = q.id
    WHERE q."trainingProgramId" = ${trainingProgramId}
    GROUP BY q.id
    ORDER BY q."displayOrder" ASC, q."createdAt" ASC
  `;

  return rows.map((row) => ({
    ...row,
    _count: {
      quizAnswers: Number(row.answerRecordCount || 0),
    },
  }));
}

async function resolveNextDisplayOrderCompat(trainingProgramId: string) {
  const delegate = getQuizQuestionDelegate();
  if (delegate?.aggregate) {
    const maxOrder = await delegate.aggregate({
      where: { trainingProgramId },
      _max: { displayOrder: true },
    });
    return Number(maxOrder?._max?.displayOrder || 0) + 1;
  }

  const result = await prisma.$queryRaw<Array<{ maxOrder: number }>>`
    SELECT COALESCE(MAX("displayOrder"), 0)::int AS "maxOrder"
    FROM "TrainingProgramQuizQuestion"
    WHERE "trainingProgramId" = ${trainingProgramId}
  `;

  return Number(result?.[0]?.maxOrder || 0) + 1;
}

async function createQuestionCompat(params: {
  trainingProgramId: string;
  question: string;
  displayOrder: number;
  status: QuestionStatus;
  answerA: string;
  answerB: string;
  answerC: string;
  answerD: string;
  correctAnswer: QuizChoice;
}) {
  const {
    trainingProgramId,
    question,
    displayOrder,
    status,
    answerA,
    answerB,
    answerC,
    answerD,
    correctAnswer,
  } = params;

  const delegate = getQuizQuestionDelegate();
  if (delegate?.create) {
    return delegate.create({
      data: {
        trainingProgramId,
        question,
        displayOrder,
        status,
        isActive: status === "ACTIVE",
        answerA,
        answerB,
        answerC,
        answerD,
        correctAnswer,
      },
      include: {
        _count: {
          select: {
            quizAnswers: true,
          },
        },
      },
    });
  }

  const generatedId = globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const inserted = await prisma.$queryRaw<any[]>`
    INSERT INTO "TrainingProgramQuizQuestion" (
      "id",
      "trainingProgramId",
      "question",
      "displayOrder",
      "status",
      "isActive",
      "answerA",
      "answerB",
      "answerC",
      "answerD",
      "correctAnswer"
    )
    VALUES (
      ${generatedId},
      ${trainingProgramId},
      ${question},
      ${displayOrder},
      CAST(${status} AS "TrainingQuizQuestionStatus"),
      ${status === "ACTIVE"},
      ${answerA},
      ${answerB},
      ${answerC},
      ${answerD},
      CAST(${correctAnswer} AS "TrainingQuizChoice")
    )
    RETURNING *
  `;

  const row = inserted[0];
  return {
    ...row,
    _count: {
      quizAnswers: 0,
    },
  };
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authContext = await resolveTrainingAdminAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    if (!isStrictHrAdminInAdminView(authContext)) {
      return trainingAdminForbiddenResponse();
    }

    const { id } = await context.params;
    const trainingProgram = await prisma.trainingProgram.findUnique({
      where: { id },
      select: {
        id: true,
        trainingName: true,
        examRequired: true,
        passingScore: true,
        status: true,
      },
    });

    if (!trainingProgram) {
      return NextResponse.json({ error: "Training program not found." }, { status: 404 });
    }

    const questions = await listQuestionsCompat(id);

    const activeQuestionCount = questions.filter((question) => question.status === "ACTIVE").length;

    return NextResponse.json({
      trainingProgram,
      questionCount: questions.length,
      activeQuestionCount,
      questions: questions.map(mapQuestion),
    });
  } catch (error) {
    console.error("Error fetching quiz questions:", error);
    return NextResponse.json({ error: "Failed to fetch quiz questions." }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const authContext = await resolveTrainingAdminAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    if (!isStrictHrAdminInAdminView(authContext)) {
      return trainingAdminForbiddenResponse();
    }

    const { id } = await context.params;
    const trainingProgram = await prisma.trainingProgram.findUnique({
      where: { id },
      select: {
        id: true,
      },
    });

    if (!trainingProgram) {
      return NextResponse.json({ error: "Training program not found." }, { status: 404 });
    }

    const body = await request.json();
    const question = normalizeText(body.question);
    const answerA = normalizeText(body.answerA);
    const answerB = normalizeText(body.answerB);
    const answerC = normalizeText(body.answerC);
    const answerD = normalizeText(body.answerD);
    const correctAnswer = parseChoice(body.correctAnswer);
    const status = parseStatus(body.status, "ACTIVE");
    const displayOrderRaw = Number(body.displayOrder);

    if (!question || !answerA || !answerB || !answerC || !answerD) {
      return NextResponse.json({ error: "Question and all answer choices are required." }, { status: 400 });
    }

    if (!correctAnswer) {
      return NextResponse.json({ error: "Correct Answer must be one of A, B, C, or D." }, { status: 400 });
    }

    let displayOrder = Number.isInteger(displayOrderRaw) && displayOrderRaw > 0 ? displayOrderRaw : 0;
    if (!displayOrder) {
      displayOrder = await resolveNextDisplayOrderCompat(id);
    }

    let created: any;
    try {
      created = await createQuestionCompat({
        trainingProgramId: id,
        question,
        displayOrder,
        status,
        answerA,
        answerB,
        answerC,
        answerD,
        correctAnswer,
      });
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : String(createError);
      if (!isCompatibilityError(message)) {
        throw createError;
      }

      created = await createQuestionCompat({
        trainingProgramId: id,
        question,
        displayOrder,
        status,
        answerA,
        answerB,
        answerC,
        answerD,
        correctAnswer,
      });
    }

    return NextResponse.json(
      mapQuestion({
        ...created,
        isActive: typeof created.isActive === "boolean" ? created.isActive : status === "ACTIVE",
        _count: created._count || { quizAnswers: 0 },
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating quiz question:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? `Failed to create quiz question: ${message}`
            : "Failed to create quiz question.",
      },
      { status: 500 }
    );
  }
}
