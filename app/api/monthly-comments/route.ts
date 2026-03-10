import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeePublicId = searchParams.get("employeeId");
    const yearParam = searchParams.get("year");
    const monthParam = searchParams.get("month");

    if (!employeePublicId || !yearParam || !monthParam) {
      return NextResponse.json(
        { error: "employeeId, year, and month are required" },
        { status: 400 }
      );
    }

    const year = Number(yearParam);
    const month = Number(monthParam);

    if (Number.isNaN(year) || Number.isNaN(month)) {
      return NextResponse.json(
        { error: "year and month must be valid numbers" },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { employeeId: employeePublicId },
      select: { id: true },
    });

    if (!employee) {
      return NextResponse.json({ comment: "" });
    }

    const existing = await prisma.$queryRaw<Array<{ comment: string; updatedAt: Date }>>`
      SELECT "comment", "updatedAt"
      FROM "MonthlyPerformanceComment"
      WHERE "employeeId" = ${employee.id}
        AND "year" = ${year}
        AND "month" = ${month}
      LIMIT 1
    `;

    return NextResponse.json({
      comment: existing[0]?.comment || "",
      updatedAt: existing[0]?.updatedAt || null,
    });
  } catch (error) {
    console.error("Error fetching monthly comment:", error);
    return NextResponse.json(
      { error: "Failed to fetch monthly comment" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { employeeId: employeePublicId, year, month, comment } = body;

    if (!employeePublicId || typeof year !== "number" || typeof month !== "number") {
      return NextResponse.json(
        { error: "employeeId, year, and month are required" },
        { status: 400 }
      );
    }

    if (typeof comment !== "string") {
      return NextResponse.json(
        { error: "comment must be a string" },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { employeeId: employeePublicId },
      select: { id: true },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    const newId = crypto.randomUUID();

    const saved = await prisma.$queryRaw<Array<{ comment: string; updatedAt: Date }>>`
      INSERT INTO "MonthlyPerformanceComment" ("id", "employeeId", "year", "month", "comment", "createdAt", "updatedAt")
      VALUES (${newId}, ${employee.id}, ${year}, ${month}, ${comment}, NOW(), NOW())
      ON CONFLICT ("employeeId", "year", "month")
      DO UPDATE SET
        "comment" = EXCLUDED."comment",
        "updatedAt" = NOW()
      RETURNING "comment", "updatedAt"
    `;

    return NextResponse.json(saved[0]);
  } catch (error) {
    console.error("Error saving monthly comment:", error);
    return NextResponse.json(
      { error: "Failed to save monthly comment" },
      { status: 500 }
    );
  }
}
