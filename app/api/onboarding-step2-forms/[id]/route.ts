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

type Step2FormRecord = { name?: unknown; status?: unknown; dateCompleted?: unknown; url?: unknown };

// A form has onboarding history if any employee recorded activity against its title.
async function formTitleHasHistory(title: string): Promise<boolean> {
  const employees = await prisma.employee.findMany({ select: { onboardingStep2Forms: true } });
  return employees.some((employee) => {
    const entries = Array.isArray(employee.onboardingStep2Forms) ? employee.onboardingStep2Forms : [];
    return (entries as Step2FormRecord[]).some(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        entry.name === title &&
        (entry.status !== "Pending" || Boolean(entry.dateCompleted) || Boolean(entry.url))
    );
  });
}

function parseFormInput(input: unknown) {
  const body = input as Record<string, unknown>;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const googleDriveUrl = typeof body.googleDriveUrl === "string" ? body.googleDriveUrl.trim() : "";
  const displayOrder = Number(body.displayOrder);
  const appliesTo = Array.isArray(body.appliesTo)
    ? [...new Set(body.appliesTo.filter((item): item is string => typeof item === "string" && WORKER_TYPES.has(item)))]
    : [];
  const appliesToLocation = Array.isArray(body.appliesToLocation)
    ? [...new Set(body.appliesToLocation.filter((item): item is string => typeof item === "string" && LOCATIONS.has(item)))]
    : [];

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
  try { new URL(googleDriveUrl); } catch { throw new Error("Google Drive URL must be a valid URL."); }

  return { title, googleDriveUrl, displayOrder, appliesTo, appliesToLocation, isActive: body.isActive !== false,
    section: typeof body.section === "string" && body.section.trim() ? body.section.trim() : "Staff forms",
    detailText: typeof body.detailText === "string" && body.detailText.trim() ? body.detailText.trim() : null,
    allowNotApplicable: Boolean(body.allowNotApplicable) };
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await resolveTrainingAdminAuthContext(request);
  if (!auth || !canManageForms(auth)) return trainingAdminForbiddenResponse();
  try {
    const { id } = await context.params;
    const form = await prisma.onboardingStep2FormTemplate.update({ where: { id }, data: parseFormInput(await request.json()) });
    return NextResponse.json(form);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update form." }, { status: 400 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await resolveTrainingAdminAuthContext(request);
  if (!auth || !canManageForms(auth)) return trainingAdminForbiddenResponse();
  try {
    const { id } = await context.params;
    const body = await request.json();
    if (typeof body.isActive !== "boolean") throw new Error("isActive is required.");
    const form = await prisma.onboardingStep2FormTemplate.update({ where: { id }, data: { isActive: body.isActive } });
    return NextResponse.json(form);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to update form." }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await resolveTrainingAdminAuthContext(request);
  if (!auth || !canManageForms(auth)) return trainingAdminForbiddenResponse();
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const force = body?.force === true;

    const existing = await prisma.onboardingStep2FormTemplate.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Form not found." }, { status: 404 });

    if (!force && (await formTitleHasHistory(existing.title))) {
      return NextResponse.json(
        { error: "This form has onboarding history and cannot be deleted. Deactivate it instead." },
        { status: 409 }
      );
    }

    await prisma.onboardingStep2FormTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to delete form." }, { status: 400 });
  }
}

