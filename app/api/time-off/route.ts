import prisma from "@/lib/prisma";
import { parseDateForDatabase } from "@/lib/dateUtils";
import { NextResponse } from "next/server";

type EmployeeSummary = {
  employeeId: string;
  name: string;
  department: string;
};

type TimeOffRequestRecord = {
  id: string;
  employee: EmployeeSummary | null;
  requestType: string;
  status: string;
  startDate: Date;
  endDate: Date;
  hours: number | null;
  reason: string | null;
  managerNote: string | null;
  approvedAt: Date | null;
  plannedHoursAdjustedAt: Date | null;
  createdAt: Date;
};

type TimeOffRequestModel = {
  findMany: (args: {
    include: {
      employee: {
        select: {
          employeeId: true;
          name: true;
          department: true;
        };
      };
    };
    orderBy: Array<{ createdAt: "desc" }>;
  }) => Promise<TimeOffRequestRecord[]>;
  create: (args: {
    data: {
      employeeId: string;
      requestType: string;
      status: "PENDING";
      startDate: Date;
      endDate: Date;
      hours: number | null;
      reason: string | null;
    };
    include: {
      employee: {
        select: {
          employeeId: true;
          name: true;
          department: true;
        };
      };
    };
  }) => Promise<TimeOffRequestRecord>;
};

const timeOffRequestModel = (prisma as unknown as { timeOffRequest: TimeOffRequestModel }).timeOffRequest;

export async function GET() {
  try {
    const requests = await timeOffRequestModel.findMany({
      include: {
        employee: {
          select: {
            employeeId: true,
            name: true,
            department: true,
          },
        },
      },
      orderBy: [
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json(
      requests.map((request) => ({
        id: request.id,
        employeeId: request.employee?.employeeId,
        employeeName: request.employee?.name,
        department: request.employee?.department,
        requestType: request.requestType,
        status: request.status,
        startDate: request.startDate.toISOString().split("T")[0],
        endDate: request.endDate.toISOString().split("T")[0],
        hours: request.hours,
        reason: request.reason || "",
        managerNote: request.managerNote || "",
        approvedAt: request.approvedAt?.toISOString() || null,
        plannedHoursAdjustedAt: request.plannedHoursAdjustedAt?.toISOString() || null,
        createdAt: request.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Error fetching time-off requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch time-off requests" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      employeeId,
      requestType,
      startDate,
      endDate,
      hours,
      reason,
    } = body;

    if (!employeeId || !requestType || !startDate || !endDate || hours == null) {
      return NextResponse.json(
        { error: "Employee, leave type, start date, end date, and hours are required" },
        { status: 400 }
      );
    }

    if (Number(hours) <= 0) {
      return NextResponse.json(
        { error: "Hours must be greater than 0" },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { employeeId },
      select: { id: true },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    const created = await timeOffRequestModel.create({
      data: {
        employeeId: employee.id,
        requestType,
        status: "PENDING",
        startDate: parseDateForDatabase(startDate),
        endDate: parseDateForDatabase(endDate),
        hours: hours ? Number(hours) : null,
        reason: reason || null,
      },
      include: {
        employee: {
          select: {
            employeeId: true,
            name: true,
            department: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        id: created.id,
        employeeId: created.employee?.employeeId,
        employeeName: created.employee?.name,
        department: created.employee?.department,
        requestType: created.requestType,
        status: created.status,
        startDate: created.startDate.toISOString().split("T")[0],
        endDate: created.endDate.toISOString().split("T")[0],
        hours: created.hours,
        reason: created.reason || "",
        managerNote: created.managerNote || "",
        approvedAt: created.approvedAt?.toISOString() || null,
        plannedHoursAdjustedAt: created.plannedHoursAdjustedAt?.toISOString() || null,
        createdAt: created.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating time-off request:", error);
    return NextResponse.json(
      { error: "Failed to create time-off request", details: String(error) },
      { status: 500 }
    );
  }
}
