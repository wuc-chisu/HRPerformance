import prisma from "@/lib/prisma";
import {
  formatDateForResponse,
  formatDateTimeForResponse,
} from "@/lib/dateUtils";
import { NextResponse } from "next/server";
import {
  REQUIRED_HR_POLICY_SIGNOFFS,
  REQUIRED_ONBOARDING_FORMS,
  REQUIRED_TRAINING_ITEMS,
} from "@/lib/employees";

type OnboardingForm = {
  name?: string;
  status?: string;
  dateCompleted?: string | null;
  verifiedBy?: string;
  url?: string;
  extraUrls?: string[];
};

function parseOptionalDate(value?: string | null) {
  return value ? new Date(value) : null;
}

function buildDefaultStep2Forms() {
  return REQUIRED_ONBOARDING_FORMS.map((name) => ({
    name,
    status: "Pending",
    dateCompleted: null,
    verifiedBy: "HR",
    url: "",
    extraUrls: [],
  }));
}

function buildDefaultStep3Forms() {
  return REQUIRED_HR_POLICY_SIGNOFFS.map((name) => ({
    name,
    status: "Pending",
    dateCompleted: null,
    verifiedBy: "HR",
    url: "",
    extraUrls: [],
  }));
}

function buildDefaultStep4Forms() {
  return REQUIRED_TRAINING_ITEMS.map((name) => ({
    name,
    status: "Pending",
    dateCompleted: null,
    verifiedBy: "HR",
    url: "",
    extraUrls: [],
  }));
}

function normalizeStep2Forms(step2Forms: unknown) {
  if (!Array.isArray(step2Forms) || step2Forms.length === 0) {
    return buildDefaultStep2Forms();
  }

  const lookup = new Map(
    step2Forms
      .filter((item) => item && typeof item === "object")
      .map((item: OnboardingForm) => [item.name, item])
  );

  return REQUIRED_ONBOARDING_FORMS.map((name) => {
    const item = lookup.get(name);
    return {
      name,
      status:
        item?.status === "Submitted" ||
        item?.status === "Approved" ||
        item?.status === "N/A"
          ? item.status
          : "Pending",
      dateCompleted: item?.dateCompleted || null,
      verifiedBy: item?.verifiedBy || "HR",
      url: typeof item?.url === "string" ? item.url : "",
      extraUrls: Array.isArray(item?.extraUrls)
        ? item.extraUrls.filter((entry: unknown) => typeof entry === "string")
        : [],
    };
  });
}

function normalizeStep3Forms(step3Forms: unknown) {
  if (!Array.isArray(step3Forms) || step3Forms.length === 0) {
    return buildDefaultStep3Forms();
  }

  const lookup = new Map(
    step3Forms
      .filter((item) => item && typeof item === "object")
      .map((item: OnboardingForm) => [item.name, item])
  );

  return REQUIRED_HR_POLICY_SIGNOFFS.map((name) => {
    const item = lookup.get(name);
    return {
      name,
      status:
        item?.status === "Submitted" || item?.status === "Approved"
          ? item.status
          : "Pending",
      dateCompleted: item?.dateCompleted || null,
      verifiedBy: "HR",
      url: "",
      extraUrls: [],
    };
  });
}

function normalizeStep4Forms(step4Forms: unknown) {
  if (!Array.isArray(step4Forms) || step4Forms.length === 0) {
    return buildDefaultStep4Forms();
  }

  const lookup = new Map(
    step4Forms
      .filter((item) => item && typeof item === "object")
      .map((item: OnboardingForm) => [item.name, item])
  );

  return REQUIRED_TRAINING_ITEMS.map((name) => {
    const item = lookup.get(name);
    return {
      name,
      status:
        item?.status === "Submitted" || item?.status === "Approved"
          ? item.status
          : "Pending",
      dateCompleted: item?.dateCompleted || null,
      verifiedBy: item?.verifiedBy || "HR",
      url: typeof item?.url === "string" ? item.url : "",
      extraUrls: Array.isArray(item?.extraUrls)
        ? item.extraUrls.filter((entry: unknown) => typeof entry === "string")
        : [],
    };
  });
}

function getStep2Completed(forms: Array<{ status?: string }>) {
  return forms.length > 0 && forms.every((item) => item.status === "Approved" || item.status === "N/A");
}

function getStep3Completed(forms: Array<{ status?: string }>) {
  return forms.length > 0 && forms.every((item) => item.status === "Approved");
}

function getStep4Completed(forms: Array<{ status?: string }>) {
  return forms.length > 0 && forms.every((item) => item.status === "Approved");
}

// PATCH onboarding step updates only
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const employeeId = params.id;

    if (!employeeId) {
      return NextResponse.json({ error: "Employee ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const step = Number(body?.step);
    const payload = body?.payload || {};

    if (!Number.isInteger(step) || step < 1 || step > 5) {
      return NextResponse.json({ error: "Invalid onboarding step" }, { status: 400 });
    }

    const existing = await prisma.employee.findUnique({
      where: { employeeId },
      select: {
        employeeId: true,
        onboardingStep2Forms: true,
        onboardingStep3Forms: true,
        onboardingStep4Forms: true,
        onboardingStep2CompletedAt: true,
        onboardingStep3CompletedAt: true,
        onboardingStep4CompletedAt: true,
        onboardingStep5CompletedAt: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    let data: Record<string, unknown> = {};

    if (step === 1) {
      data = {
        onboardingChecklistAssigned: Boolean(payload.checklistAssigned),
        systemAccessGmail: Boolean(payload.systemAccess?.gmail),
        systemAccessClickup: Boolean(payload.systemAccess?.clickup),
        systemAccessMoodle: Boolean(payload.systemAccess?.moodle),
        systemAccessGoogleDrive: Boolean(payload.systemAccess?.googleDrive),
        onboardingStep1UpdatedBy: payload.updatedBy || "HR Manager",
        onboardingStep1UpdatedAt: new Date(),
        onboardingStep1Notes: payload.notes || "",
      };
    }

    if (step === 2) {
      const incomingForms = payload.forms;
      const forms =
        Array.isArray(incomingForms) && incomingForms.length === 0 &&
        Array.isArray(existing.onboardingStep2Forms) && existing.onboardingStep2Forms.length > 0
          ? normalizeStep2Forms(existing.onboardingStep2Forms)
          : normalizeStep2Forms(incomingForms);

      const completed = getStep2Completed(forms);

      data = {
        onboardingStep2Forms: forms,
        onboardingStep2Completed: completed,
        onboardingStep2CompletedAt: completed
          ? parseOptionalDate(payload.step2CompletedAt) || existing.onboardingStep2CompletedAt || new Date()
          : null,
      };
    }

    if (step === 3) {
      const incomingForms = payload.forms;
      const forms =
        Array.isArray(incomingForms) && incomingForms.length === 0 &&
        Array.isArray(existing.onboardingStep3Forms) && existing.onboardingStep3Forms.length > 0
          ? normalizeStep3Forms(existing.onboardingStep3Forms)
          : normalizeStep3Forms(incomingForms);

      const completed = getStep3Completed(forms);

      data = {
        onboardingStep3Forms: forms,
        onboardingStep3Completed: completed,
        onboardingStep3CompletedAt: completed
          ? parseOptionalDate(payload.step3CompletedAt) || existing.onboardingStep3CompletedAt || new Date()
          : null,
      };
    }

    if (step === 4) {
      const incomingForms = payload.forms;
      const forms =
        Array.isArray(incomingForms) && incomingForms.length === 0 &&
        Array.isArray(existing.onboardingStep4Forms) && existing.onboardingStep4Forms.length > 0
          ? normalizeStep4Forms(existing.onboardingStep4Forms)
          : normalizeStep4Forms(incomingForms);

      const completed = getStep4Completed(forms);

      data = {
        onboardingStep4Forms: forms,
        onboardingStep4Completed: completed,
        onboardingStep4CompletedAt: completed
          ? parseOptionalDate(payload.step4CompletedAt) || existing.onboardingStep4CompletedAt || new Date()
          : null,
      };
    }

    if (step === 5) {
      const activated = Boolean(payload.activated);
      data = {
        onboardingChecklistAssigned: activated,
        onboardingStep5Completed: activated,
        onboardingStep5CompletedAt: activated
          ? parseOptionalDate(payload.step5CompletedAt) || existing.onboardingStep5CompletedAt || new Date()
          : null,
      };
    }

    const updated = await prisma.employee.update({
      where: { employeeId },
      data: data as any,
      select: {
        employeeId: true,
        onboardingChecklistAssigned: true,
        onboardingStep2Completed: true,
        onboardingStep3Completed: true,
        onboardingStep4Completed: true,
        onboardingStep5Completed: true,
        onboardingStep2CompletedAt: true,
        onboardingStep3CompletedAt: true,
        onboardingStep4CompletedAt: true,
        onboardingStep5CompletedAt: true,
      },
    });

    return NextResponse.json({
      id: updated.employeeId,
      checklistAssigned: Boolean(updated.onboardingChecklistAssigned),
      step2Completed: Boolean(updated.onboardingStep2Completed),
      step3Completed: Boolean(updated.onboardingStep3Completed),
      step4Completed: Boolean(updated.onboardingStep4Completed),
      step5Completed: Boolean(updated.onboardingStep5Completed),
      step2CompletedAt: formatDateTimeForResponse(updated.onboardingStep2CompletedAt),
      step3CompletedAt: formatDateTimeForResponse(updated.onboardingStep3CompletedAt),
      step4CompletedAt: formatDateTimeForResponse(updated.onboardingStep4CompletedAt),
      step5CompletedAt: formatDateTimeForResponse(updated.onboardingStep5CompletedAt),
      updatedAt: formatDateForResponse(new Date()),
    });
  } catch (error) {
    console.error("Error updating onboarding step:", error);
    return NextResponse.json(
      { error: "Failed to update onboarding step", details: String(error) },
      { status: 500 }
    );
  }
}
