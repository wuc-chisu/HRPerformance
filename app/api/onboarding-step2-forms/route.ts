import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import {
  resolveTrainingAdminAuthContext,
  trainingAdminForbiddenResponse,
} from "@/lib/trainingAdminAuth";

const WORKER_TYPES = new Set(["Employee", "Faculty", "Contractor"]);
const LOCATIONS = new Set(["US", "Taiwan"]);

function canManageForms(context: { viewMode: "admin" | "employee"; employee: { systemRole: string } }) {
  return context.viewMode === "admin" && ["hr admin", "executive"].includes(context.employee.systemRole.trim().toLowerCase());
}

function normalizeAppliesTo(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string" && WORKER_TYPES.has(item)))];
}

function normalizeAppliesToLocation(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string" && LOCATIONS.has(item)))];
}

function parseFormInput(input: unknown) {
  const body = input as Record<string, unknown>;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const googleDriveUrl = typeof body.googleDriveUrl === "string" ? body.googleDriveUrl.trim() : "";
  const displayOrder = Number(body.displayOrder);
  const appliesTo = normalizeAppliesTo(body.appliesTo);
  const appliesToLocation = normalizeAppliesToLocation(body.appliesToLocation);

  if (
    !title ||
    !googleDriveUrl ||
    !Number.isInteger(displayOrder) ||
    displayOrder < 0 ||
    appliesTo.length === 0 ||
    appliesToLocation.length === 0
  ) {
    throw new Error("Title, Google Drive URL, a non-negative display order, at least one worker type, and at least one location are required.");
  }

  try {
    new URL(googleDriveUrl);
  } catch {
    throw new Error("Google Drive URL must be a valid URL.");
  }

  return {
    title,
    googleDriveUrl,
    displayOrder,
    appliesTo,
    appliesToLocation,
    isActive: body.isActive !== false,
    section: typeof body.section === "string" && body.section.trim() ? body.section.trim() : "Staff forms",
    detailText: typeof body.detailText === "string" && body.detailText.trim() ? body.detailText.trim() : null,
    allowNotApplicable: Boolean(body.allowNotApplicable),
  };
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const workerType = params.get("workerType");
  const location = params.get("location");

  const where: Record<string, unknown> = {};
  if (workerType && WORKER_TYPES.has(workerType)) {
    where.isActive = true;
    where.appliesTo = { has: workerType };
  }
  if (location && LOCATIONS.has(location)) {
    where.isActive = true;
    where.appliesToLocation = { has: location };
  }

  const forms = await prisma.onboardingStep2FormTemplate.findMany({
    where: Object.keys(where).length > 0 ? where : undefined,
    orderBy: [{ displayOrder: "asc" }, { title: "asc" }],
  });

  // Only the management listing (no workerType/location filter) needs delete eligibility.
  if (workerType || location) {
    return NextResponse.json(forms);
  }

  const employees = await prisma.employee.findMany({ select: { onboardingStep2Forms: true } });
  const titlesWithHistory = new Set<string>();
  employees.forEach((employee) => {
    const entries = Array.isArray(employee.onboardingStep2Forms) ? employee.onboardingStep2Forms : [];
    (entries as Array<{ name?: unknown; status?: unknown; dateCompleted?: unknown; url?: unknown }>).forEach((entry) => {
      if (
        entry &&
        typeof entry === "object" &&
        typeof entry.name === "string" &&
        (entry.status !== "Pending" || Boolean(entry.dateCompleted) || Boolean(entry.url))
      ) {
        titlesWithHistory.add(entry.name);
      }
    });
  });

  return NextResponse.json(forms.map((form) => ({ ...form, canDelete: !titlesWithHistory.has(form.title) })));
}

export async function POST(request: Request) {
  const context = await resolveTrainingAdminAuthContext(request);
  if (!context || !canManageForms(context)) return trainingAdminForbiddenResponse();

  try {
    const form = await prisma.onboardingStep2FormTemplate.create({ data: parseFormInput(await request.json()) });
    return NextResponse.json(form, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create form." }, { status: 400 });
  }
}
