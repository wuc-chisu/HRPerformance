import { promises as fs } from "fs";
import path from "path";

import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import {
  isStrictHrAdminInAdminView,
  resolveTrainingAdminAuthContext,
  trainingAdminForbiddenResponse,
} from "@/lib/trainingAdminAuth";

export const runtime = "nodejs";

const UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "training-content");
const MAX_UPLOAD_SIZE_BYTES = 250 * 1024 * 1024;

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function isColumnCompatibilityError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("column") &&
    (normalized.includes("contentstoragekey") ||
      normalized.includes("contentfilename") ||
      normalized.includes("contentmimetype") ||
      normalized.includes("contentsizebytes") ||
      normalized.includes("contentreference"))
  );
}

async function persistUploadMetadata(params: {
  moduleId: string;
  programId: string;
  contentReference: string;
  contentStorageKey: string;
  contentFileName: string;
  contentMimeType: string | null;
  contentSizeBytes: number;
}) {
  const { moduleId, programId, contentReference, contentStorageKey, contentFileName, contentMimeType, contentSizeBytes } = params;

  try {
    await prisma.$executeRaw`
      UPDATE "TrainingProgramModule"
      SET
        "contentReference" = ${contentReference},
        "contentStorageKey" = ${contentStorageKey},
        "contentFileName" = ${contentFileName},
        "contentMimeType" = ${contentMimeType},
        "contentSizeBytes" = ${contentSizeBytes},
        "updatedAt" = NOW()
      WHERE "id" = ${moduleId} AND "trainingProgramId" = ${programId}
    `;

    return {
      contentReference,
      contentStorageKey,
      contentFileName,
      contentMimeType,
      contentSizeBytes,
      compatibilityMode: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!isColumnCompatibilityError(message)) {
      throw error;
    }

    await prisma.$executeRaw`
      UPDATE "TrainingProgramModule"
      SET
        "contentReference" = ${contentReference},
        "updatedAt" = NOW()
      WHERE "id" = ${moduleId} AND "trainingProgramId" = ${programId}
    `;

    return {
      contentReference,
      contentStorageKey: null,
      contentFileName: null,
      contentMimeType: null,
      contentSizeBytes: null,
      compatibilityMode: true,
    };
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string; moduleId: string }> }) {
  try {
    const authContext = await resolveTrainingAdminAuthContext(request);
    if (!authContext) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    if (!isStrictHrAdminInAdminView(authContext)) {
      return trainingAdminForbiddenResponse();
    }

    const { id, moduleId } = await context.params;
    const module = await prisma.trainingProgramModule.findFirst({
      where: {
        id: moduleId,
        trainingProgramId: id,
      },
      select: {
        id: true,
        moduleType: true,
      },
    });

    if (!module) {
      return NextResponse.json({ error: "Module not found." }, { status: 404 });
    }

    if (module.moduleType !== "DOCUMENT") {
      return NextResponse.json(
        { error: "Local file upload is only supported for Document modules. Provide a Video URL for Video modules." },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file !== "object" || !("arrayBuffer" in file)) {
      return NextResponse.json({ error: "A file is required." }, { status: 400 });
    }

    const typedFile = file as File;

    if (typedFile.size <= 0) {
      return NextResponse.json({ error: "The uploaded file is empty." }, { status: 400 });
    }

    if (typedFile.size > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File is too large. Maximum supported upload size is 250 MB." },
        { status: 400 }
      );
    }

    const fileExtension = path.extname(typedFile.name) || "";
    const safeName = sanitizeFileName(path.basename(typedFile.name, fileExtension));
    const timestamp = Date.now();
    const storageFileName = `${timestamp}_${safeName}${fileExtension}`;
    const moduleFolder = path.join(UPLOAD_ROOT, id, moduleId);
    const absolutePath = path.join(moduleFolder, storageFileName);

    await fs.mkdir(moduleFolder, { recursive: true });
    const arrayBuffer = await typedFile.arrayBuffer();
    await fs.writeFile(absolutePath, Buffer.from(arrayBuffer));

    const contentReference = `/uploads/training-content/${id}/${moduleId}/${storageFileName}`;
    const contentStorageKey = `${id}/${moduleId}/${storageFileName}`;

    const persisted = await persistUploadMetadata({
      moduleId,
      programId: id,
      contentReference,
      contentStorageKey,
      contentFileName: typedFile.name,
      contentMimeType: typedFile.type || null,
      contentSizeBytes: typedFile.size,
    });

    return NextResponse.json({
      id: moduleId,
      contentReference: persisted.contentReference,
      contentStorageKey: persisted.contentStorageKey,
      contentFileName: persisted.contentFileName,
      contentMimeType: persisted.contentMimeType,
      contentSizeBytes: persisted.contentSizeBytes,
      compatibilityMode: persisted.compatibilityMode,
      moduleType: module.moduleType,
      uploadStatus: "completed",
    });
  } catch (error) {
    console.error("Error uploading module content:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: process.env.NODE_ENV === "development" ? `Failed to upload module content: ${errorMessage}` : "Failed to upload module content",
      },
      { status: 500 }
    );
  }
}
