import prisma from "@/lib/prisma";
import {
  calculateIncidentTotals,
  formatIncidentRecord,
  syncAutomaticWarningsForEmployee,
} from "@/lib/incidentTracking";
import { parseDateForDatabase } from "@/lib/dateUtils";
import { NextResponse } from "next/server";
import { getAuthenticatedEmployee } from "@/lib/current-employee";
import { isEmployee, isExecutive, isManager, isSelfOrDirectReport } from "@/lib/rbac";

export async function GET(request: Request) {
  try {
    const currentEmployee = await getAuthenticatedEmployee();
    if (!currentEmployee) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    if (isEmployee(currentEmployee.systemRole)) {
      return NextResponse.json(
        { error: "Employees cannot access corrective actions." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const employeeIdParam = searchParams.get("employeeId");

    let allowedEmployeeDbIds: string[] | null = null;
    if (isManager(currentEmployee.systemRole)) {
      const reports = await prisma.employee.findMany({
        where: {
          OR: [
            { manager: { equals: currentEmployee.name, mode: "insensitive" } },
            { manager: { equals: currentEmployee.employeeId, mode: "insensitive" } },
          ],
        },
        select: { id: true },
      });
      allowedEmployeeDbIds = [currentEmployee.id, ...reports.map((r) => r.id)];
    }

    const employee = employeeIdParam
      ? await prisma.employee.findUnique({
          where: { employeeId: employeeIdParam },
          select: { id: true },
        })
      : null;

    if (employeeIdParam && !employee) {
      return NextResponse.json({ records: [] });
    }

    if (isManager(currentEmployee.systemRole) && employee) {
      if (!allowedEmployeeDbIds?.includes(employee.id)) {
        return NextResponse.json({ records: [] });
      }
    }

    let whereClause: Record<string, unknown> | undefined = undefined;
    if (employee) {
      whereClause = { employeeId: employee.id };
    } else if (allowedEmployeeDbIds) {
      whereClause = { employeeId: { in: allowedEmployeeDbIds } };
    }

    const records = await (prisma as any).incidentRecord.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            name: true,
            department: true,
          },
        },
        histories: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: [{ occurrenceDate: "desc" }, { createdAt: "desc" }],
    });

    const totalsMap = await calculateIncidentTotals(
      prisma,
      records.map((record: any) => record.employeeId)
    );

    return NextResponse.json({
      records: records.map((record: any) => formatIncidentRecord(record, totalsMap)),
    });
  } catch (error) {
    console.error("Error fetching incidents:", error);
    return NextResponse.json(
      { error: "Failed to fetch incident records" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const currentEmployee = await getAuthenticatedEmployee();
    if (!currentEmployee) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    if (isExecutive(currentEmployee.systemRole) || isEmployee(currentEmployee.systemRole)) {
      return NextResponse.json(
        { error: "You do not have permission to create corrective action records." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      employeeId,
      manager,
      recordType,
      occurrenceDate,
      issuedBy,
      reason,
      appealDecision,
      decisionDate,
      reviewedBy,
      finalAction,
      historyMemo,
    } = body;

    if (!employeeId || !recordType || !occurrenceDate || !issuedBy || !manager || !reason) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: employeeId, manager, recordType, occurrenceDate, issuedBy, reason",
        },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { employeeId },
      select: { id: true, employeeId: true, name: true, department: true, manager: true },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    if (isManager(currentEmployee.systemRole)) {
      if (!isSelfOrDirectReport(currentEmployee, employee)) {
        return NextResponse.json(
          { error: "Managers can only create corrective action records for themselves or their direct reports." },
          { status: 403 }
        );
      }
    }

    await prisma.$transaction(async (tx: any) => {
      const transaction = tx as any;

      const createdRecord = await transaction.incidentRecord.create({
        data: {
          employeeId: employee.id,
          name: employee.name,
          department: employee.department,
          manager,
          recordType,
          occurrenceDate: parseDateForDatabase(occurrenceDate),
          issuedBy,
          reason,
          status: "PENDING",
          appealDecision: "PENDING",
          decisionDate: decisionDate ? parseDateForDatabase(decisionDate) : null,
          reviewedBy: reviewedBy || null,
          finalAction: finalAction || "NONE",
          isAutoGenerated: false,
          meetingCompleted: false,
          emailSent: false,
          followUpEmailSent: false,
          improvementPlanReceived: false,
        },
      });

      if (historyMemo) {
        await transaction.incidentHistory.create({
          data: {
            incidentId: createdRecord.id,
            memo: historyMemo,
            type: "NOTE",
            createdBy: issuedBy,
          },
        });
      }

      if (createdRecord.status === "CONFIRMED") {
        await syncAutomaticWarningsForEmployee(transaction, employee.id, issuedBy);
      }
    });

    const records = await (prisma as any).incidentRecord.findMany({
      where: { employeeId: employee.id },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            name: true,
            department: true,
          },
        },
        histories: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: [{ occurrenceDate: "desc" }, { createdAt: "desc" }],
    });

    const totalsMap = await calculateIncidentTotals(prisma, [employee.id]);

    return NextResponse.json(
      {
        records: records.map((record: any) => formatIncidentRecord(record, totalsMap)),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating incident record:", error);
    return NextResponse.json(
      { error: "Failed to create incident record", details: String(error) },
      { status: 500 }
    );
  }
}
