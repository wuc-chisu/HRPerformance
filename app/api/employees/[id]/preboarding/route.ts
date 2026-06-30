import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

async function resolveParams(context: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  if (typeof (context as any).params?.then === "function") {
    return await (context as any).params;
  }
  return (context as any).params;
}

export async function GET(request: Request, context: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  try {
    const params = await resolveParams(context);
    const employeeId = params?.id;
    if (!employeeId) {
      return NextResponse.json({ error: "Employee ID is required" }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({
      where: { employeeId },
      select: {
        preboardingSteps: true,
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json({ preboardingSteps: employee.preboardingSteps || {} });
  } catch (error) {
    console.error("Error fetching preboarding steps:", error);
    return NextResponse.json(
      { error: "Failed to load preboarding steps" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  try {
    const params = await resolveParams(context);
    const employeeId = params?.id;
    if (!employeeId) {
      return NextResponse.json({ error: "Employee ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const completedSteps = body?.completedSteps;

    if (!completedSteps || typeof completedSteps !== "object") {
      return NextResponse.json(
        { error: "completedSteps must be an object" },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.update({
      where: { employeeId },
      data: {
        preboardingSteps: completedSteps,
      },
      select: {
        preboardingSteps: true,
      },
    });

    return NextResponse.json({ preboardingSteps: employee.preboardingSteps || {} });
  } catch (error) {
    console.error("Error saving preboarding steps:", error);
    return NextResponse.json(
      { error: "Failed to save preboarding steps" },
      { status: 500 }
    );
  }
}
