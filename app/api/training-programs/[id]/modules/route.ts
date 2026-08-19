import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import {
  isStrictHrAdminInAdminView,
  resolveTrainingAdminAuthContext,
  trainingAdminForbiddenResponse,
} from "@/lib/trainingAdminAuth";

type ModuleType = "VIDEO" | "READING" | "DOCUMENT" | "EXTERNAL_LINK" | "QUIZ" | "OTHER";
type ModuleStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseModuleType(value: unknown): ModuleType {
  const normalized = normalizeText(value).toUpperCase();
  const allowed: ModuleType[] = ["VIDEO", "READING", "DOCUMENT", "EXTERNAL_LINK", "QUIZ", "OTHER"];
  if (!allowed.includes(normalized as ModuleType)) {
    throw new Error("Module Type is invalid.");
  }
  return normalized as ModuleType;
}

function parseModuleStatus(value: unknown): ModuleStatus {
  const normalized = normalizeText(value).toUpperCase();
  const allowed: ModuleStatus[] = ["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"];
  if (!allowed.includes(normalized as ModuleStatus)) {
    throw new Error("Module Status is invalid.");
  }
  return normalized as ModuleStatus;
}

function isValidHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function mapModule(module: any) {
  return {
    id: module.id,
    trainingProgramId: module.trainingProgramId,
    title: module.title,
    description: module.description,
    moduleType: module.moduleType,
    displayOrder: module.displayOrder,
    isRequired: module.isRequired,
    status: module.status,
    contentReference: module.contentReference,
    contentStorageKey: module.contentStorageKey,
    contentFileName: module.contentFileName,
    contentMimeType: module.contentMimeType,
    contentSizeBytes: module.contentSizeBytes,
    isActive: module.isActive,
    canDelete: (module._count?.progressRecords || 0) === 0,
    progressRecordCount: module._count?.progressRecords || 0,
    createdAt: module.createdAt,
    updatedAt: module.updatedAt,
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
        programCode: true,
        trainingMethod: true,
        status: true,
      },
    });

    if (!trainingProgram) {
      return NextResponse.json({ error: "Training program not found." }, { status: 404 });
    }

    const modules = await prisma.trainingProgramModule.findMany({
      where: {
        trainingProgramId: id,
      },
      include: {
        _count: {
          select: {
            progressRecords: true,
          },
        },
      },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({
      trainingProgram,
      moduleCount: modules.filter((module) => module.status !== "ARCHIVED").length,
      modules: modules.map(mapModule),
    });
  } catch (error) {
    console.error("Error fetching training program modules:", error);
    return NextResponse.json({ error: "Failed to fetch training program modules" }, { status: 500 });
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
        trainingMethod: true,
      },
    });

    if (!trainingProgram) {
      return NextResponse.json({ error: "Training program not found." }, { status: 404 });
    }

    if (trainingProgram.trainingMethod !== "WUC_INTERNAL_COURSE") {
      return NextResponse.json({ error: "Course content management is available only for WUC Internal Course programs." }, { status: 400 });
    }

    const body = await request.json();

    const title = normalizeText(body.title);
    if (!title) {
      return NextResponse.json({ error: "Module Title is required." }, { status: 400 });
    }

    const moduleType = parseModuleType(body.moduleType || "VIDEO");
    const status = parseModuleStatus(body.status || "DRAFT");
    const displayOrder = Number(body.displayOrder);
    const contentReferenceInput = normalizeText(body.contentReference);

    if (!Number.isInteger(displayOrder) || displayOrder <= 0) {
      return NextResponse.json({ error: "Display Order must be a positive integer." }, { status: 400 });
    }

    if (moduleType === "VIDEO" && status === "ACTIVE") {
      if (!contentReferenceInput) {
        return NextResponse.json({ error: "Active Video modules require a Video URL." }, { status: 400 });
      }
      if (!isValidHttpUrl(contentReferenceInput)) {
        return NextResponse.json({ error: "Video URL must be a valid http(s) link." }, { status: 400 });
      }
    }

    if (moduleType === "VIDEO" && contentReferenceInput && !isValidHttpUrl(contentReferenceInput)) {
      return NextResponse.json({ error: "Video URL must be a valid http(s) link." }, { status: 400 });
    }

    const contentReference =
      moduleType === "VIDEO" || moduleType === "EXTERNAL_LINK"
        ? contentReferenceInput || null
        : null;

    const module = await prisma.trainingProgramModule.create({
      data: {
        trainingProgramId: id,
        title,
        description: normalizeText(body.description) || null,
        moduleType,
        displayOrder,
        isRequired: Boolean(body.isRequired ?? true),
        status,
        isActive: status !== "ARCHIVED",
        contentReference,
      },
      include: {
        _count: {
          select: {
            progressRecords: true,
          },
        },
      },
    });

    return NextResponse.json(mapModule(module), { status: 201 });
  } catch (error) {
    console.error("Error creating training module:", error);
    return NextResponse.json({ error: "Failed to create training module" }, { status: 500 });
  }
}
