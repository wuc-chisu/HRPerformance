import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

type OnboardingEmailType = "forms" | "documents";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const employeeId = (await context.params).id;
    const body = await request.json().catch(() => ({}));
    const emailType = body?.emailType as OnboardingEmailType;

    if (!employeeId || !["forms", "documents"].includes(emailType)) {
      return NextResponse.json({ error: "A valid employee ID and email type are required." }, { status: 400 });
    }

    const field = emailType === "forms"
      ? "onboardingStep2FormsEmailSentAt"
      : "onboardingStep2DocumentsEmailSentAt";

    const updated = await prisma.employee.updateMany({
      where: { employeeId },
      data: { [field]: new Date() },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, emailType, sentAt: new Date().toISOString() });
  } catch (error) {
    console.error("Error recording onboarding email:", error);
    return NextResponse.json({ error: "Failed to record onboarding email" }, { status: 500 });
  }
}
