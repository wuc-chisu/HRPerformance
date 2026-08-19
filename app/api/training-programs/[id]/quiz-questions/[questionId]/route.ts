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

function parseStatus(value: unknown, fallback: QuestionStatus): QuestionStatus {
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

async function resolveQuestion(trainingProgramId: string, questionId: string) {
  return prisma.trainingProgramQuizQuestion.findFirst({
    where: {
      id: questionId,
      trainingProgramId,
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

export async function GET(request: Request, context: { params: Promise<{ id: string; questionId: string }> }) {
  try {
    const authContext = await resolveTrainingAdminAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    if (!isStrictHrAdminInAdminView(authContext)) {
      return trainingAdminForbiddenResponse();
    }

    const { id, questionId } = await context.params;
    const question = await resolveQuestion(id, questionId);

    if (!question) {
      return NextResponse.json({ error: "Quiz question not found." }, { status: 404 });
    }

    return NextResponse.json(mapQuestion(question));
  } catch (error) {
    console.error("Error fetching quiz question:", error);
    return NextResponse.json({ error: "Failed to fetch quiz question." }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string; questionId: string }> }) {
  try {
    const authContext = await resolveTrainingAdminAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    if (!isStrictHrAdminInAdminView(authContext)) {
      return trainingAdminForbiddenResponse();
    }

    const { id, questionId } = await context.params;
    const existing = await resolveQuestion(id, questionId);

    if (!existing) {
      return NextResponse.json({ error: "Quiz question not found." }, { status: 404 });
    }

    const body = await request.json();
    const question = normalizeText(body.question) || existing.question;
    const answerA = normalizeText(body.answerA) || existing.answerA;
    const answerB = normalizeText(body.answerB) || existing.answerB;
    const answerC = normalizeText(body.answerC) || existing.answerC;
    const answerD = normalizeText(body.answerD) || existing.answerD;
    const correctAnswer = parseChoice(body.correctAnswer) || (existing.correctAnswer as QuizChoice);
    const status = parseStatus(body.status, existing.status as QuestionStatus);
    const displayOrderRaw = Number(body.displayOrder);
    const displayOrder = Number.isInteger(displayOrderRaw) && displayOrderRaw > 0 ? displayOrderRaw : existing.displayOrder;

    if (!question || !answerA || !answerB || !answerC || !answerD) {
      return NextResponse.json({ error: "Question and all answer choices are required." }, { status: 400 });
    }

    const updated = await prisma.trainingProgramQuizQuestion.update({
      where: {
        id: questionId,
      },
      data: {
        question,
        answerA,
        answerB,
        answerC,
        answerD,
        correctAnswer,
        displayOrder,
        status,
        isActive: status === "ACTIVE",
      },
      include: {
        _count: {
          select: {
            quizAnswers: true,
          },
        },
      },
    });

    return NextResponse.json(mapQuestion(updated));
  } catch (error) {
    console.error("Error updating quiz question:", error);
    return NextResponse.json({ error: "Failed to update quiz question." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string; questionId: string }> }) {
  try {
    const authContext = await resolveTrainingAdminAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    if (!isStrictHrAdminInAdminView(authContext)) {
      return trainingAdminForbiddenResponse();
    }

    const { id, questionId } = await context.params;
    const existing = await resolveQuestion(id, questionId);

    if (!existing) {
      return NextResponse.json({ error: "Quiz question not found." }, { status: 404 });
    }

    if (existing._count.quizAnswers > 0) {
      return NextResponse.json(
        { error: "This question has historical quiz answers. Archive it instead of deleting." },
        { status: 409 }
      );
    }

    await prisma.trainingProgramQuizQuestion.delete({
      where: {
        id: questionId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting quiz question:", error);
    return NextResponse.json({ error: "Failed to delete quiz question." }, { status: 500 });
  }
}
