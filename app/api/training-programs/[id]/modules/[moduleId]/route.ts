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

async function resolveModule(trainingProgramId: string, moduleId: string) {
  return prisma.trainingProgramModule.findFirst({
    where: {
      id: moduleId,
      trainingProgramId,
    },
    include: {
      _count: {
        select: {
          progressRecords: true,
        },
      },
    },
  });
}

export async function GET(request: Request, context: { params: Promise<{ id: string; moduleId: string }> }) {
  try {
    const authContext = await resolveTrainingAdminAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    if (!isStrictHrAdminInAdminView(authContext)) {
      return trainingAdminForbiddenResponse();
    }

    const { id, moduleId } = await context.params;
    const module = await resolveModule(id, moduleId);

    if (!module) {
      return NextResponse.json({ error: "Module not found." }, { status: 404 });
    }

    return NextResponse.json(mapModule(module));
  } catch (error) {
    console.error("Error fetching module:", error);
    return NextResponse.json({ error: "Failed to fetch module" }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string; moduleId: string }> }) {
  try {
    const authContext = await resolveTrainingAdminAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    if (!isStrictHrAdminInAdminView(authContext)) {
      return trainingAdminForbiddenResponse();
    }

    const { id, moduleId } = await context.params;
    const existing = await resolveModule(id, moduleId);
    if (!existing) {
      return NextResponse.json({ error: "Module not found." }, { status: 404 });
    }

    const body = await request.json();

    const title = normalizeText(body.title);
    if (!title) {
      return NextResponse.json({ error: "Module Title is required." }, { status: 400 });
    }

    const moduleType = parseModuleType(body.moduleType || existing.moduleType);
    const status = parseModuleStatus(body.status || existing.status);
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
        : moduleType === "DOCUMENT"
          ? existing.contentReference
          : null;

    const updated = await prisma.trainingProgramModule.update({
      where: {
        id: moduleId,
      },
      data: {
        title,
        description: normalizeText(body.description) || null,
        moduleType,
        displayOrder,
        isRequired: Boolean(body.isRequired ?? existing.isRequired),
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

    return NextResponse.json(mapModule(updated));
  } catch (error) {
    console.error("Error updating module:", error);
    return NextResponse.json({ error: "Failed to update module" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string; moduleId: string }> }) {
  try {
    const authContext = await resolveTrainingAdminAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    if (!isStrictHrAdminInAdminView(authContext)) {
      return trainingAdminForbiddenResponse();
    }

    const { id, moduleId } = await context.params;
    const existing = await resolveModule(id, moduleId);

    if (!existing) {
      return NextResponse.json({ error: "Module not found." }, { status: 404 });
    }

    if (existing._count.progressRecords > 0) {
      return NextResponse.json(
        { error: "This module has historical employee progress. Archive it instead of deleting." },
        { status: 409 }
      );
    }

    await prisma.trainingProgramModule.delete({
      where: {
        id: moduleId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting module:", error);
    return NextResponse.json({ error: "Failed to delete module" }, { status: 500 });
  }
}
