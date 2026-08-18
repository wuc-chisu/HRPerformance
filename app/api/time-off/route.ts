import prisma from "@/lib/prisma";
import {
  formatDateForResponse,
  formatDateTimeForResponse,
  parseDateForDatabase,
} from "@/lib/dateUtils";
import { currentUser } from "@clerk/nextjs/server";
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
    where?: {
      employeeId?: string;
      status?: { in: string[] };
      startDate?: { lte: Date };
      endDate?: { gte: Date };
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
  findUnique: (args: {
    where: { employeeId: string };
    select: { id: true; employeeId: true; name: true; systemRole: true };
  }) => Promise<{
    id: string;
    employeeId: string;
    name: string;
    systemRole: string | null;
  } | null>;
};

const timeOffRequestModel = (prisma as unknown as { timeOffRequest: TimeOffRequestModel }).timeOffRequest;

type ResolvedCurrentEmployee = {
  employeeId: string;
  name: string;
  systemRole: string;
};

async function resolveCurrentEmployee(): Promise<ResolvedCurrentEmployee | null> {
  const clerkUser = await currentUser();
  const email = clerkUser?.primaryEmailAddress?.emailAddress || clerkUser?.emailAddresses[0]?.emailAddress || "";
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  const [employees, offboardingRecords] = await Promise.all([
    prisma.employee.findMany({
      select: {
        employeeId: true,
        name: true,
        email: true,
        systemRole: true,
      },
    }),
    prisma.offboardingRecord.findMany({
      select: {
        employeeId: true,
        step8: true,
      },
    }),
  ]);

  const offboardedEmployeeIds = new Set(
    offboardingRecords
      .filter((record) => Boolean((record.step8 as { confirmedOffboard?: boolean } | null)?.confirmedOffboard))
      .map((record) => record.employeeId)
  );

  const activeEmployees = employees.filter(
    (entry) => !offboardedEmployeeIds.has(entry.employeeId)
  );

  const matchedEmployee = activeEmployees.find(
    (entry) => entry.email.trim().toLowerCase() === normalizedEmail
  );

  if (!matchedEmployee) {
    return null;
  }

  return {
    employeeId: matchedEmployee.employeeId,
    name: matchedEmployee.name,
    systemRole: matchedEmployee.systemRole || "Employee",
  };
}

function getInclusiveDateStrings(startDate: string, endDate: string) {
  const dates: string[] = [];
  const current = new Date(parseDateForDatabase(startDate));
  const finalDate = parseDateForDatabase(endDate);

  while (current <= finalDate) {
    dates.push(formatDateForResponse(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function allocateHoursAcrossDates(hours: number, dates: string[]) {
  const allocation = new Map<string, number>();
  if (dates.length === 0) {
    return allocation;
  }

  const perDay = hours / dates.length;
  for (const date of dates) {
    allocation.set(date, perDay);
  }

  return allocation;
}

async function getConflictDate(employeeId: string, startDate: string, endDate: string, hours: number) {
  const candidateDates = getInclusiveDateStrings(startDate, endDate);
  const candidateAllocation = allocateHoursAcrossDates(hours, candidateDates);

  const overlappingRequests = await timeOffRequestModel.findMany({
    where: {
      employeeId,
      status: { in: ["PENDING", "APPROVED"] },
      startDate: { lte: parseDateForDatabase(endDate) },
      endDate: { gte: parseDateForDatabase(startDate) },
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
    orderBy: [{ createdAt: "desc" }],
  });

  const dailyTotals = new Map<string, number>();

  for (const request of overlappingRequests) {
    const existingDates = getInclusiveDateStrings(
      formatDateForResponse(request.startDate),
      formatDateForResponse(request.endDate)
    );
    const existingAllocation = allocateHoursAcrossDates(Number(request.hours || 0), existingDates);

    for (const [date, value] of existingAllocation) {
      dailyTotals.set(date, (dailyTotals.get(date) || 0) + value);
    }
  }

  for (const [date, value] of candidateAllocation) {
    if ((dailyTotals.get(date) || 0) + value > 8) {
      return date;
    }
  }

  return null;
}

export async function GET() {
  try {
    const currentEmployee = await resolveCurrentEmployee();
    if (!currentEmployee) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    const requests = await timeOffRequestModel.findMany({
      where: currentEmployee.systemRole === "Employee" ? { employeeId: currentEmployee.employeeId } : undefined,
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
        startDate: formatDateForResponse(request.startDate),
        endDate: formatDateForResponse(request.endDate),
        hours: request.hours,
        reason: request.reason || "",
        managerNote: request.managerNote || "",
        approvedAt: formatDateTimeForResponse(request.approvedAt),
        plannedHoursAdjustedAt: formatDateTimeForResponse(request.plannedHoursAdjustedAt),
        createdAt: formatDateTimeForResponse(request.createdAt),
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
    const currentEmployee = await resolveCurrentEmployee();
    if (!currentEmployee) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    const body = await request.json();
    const {
      employeeId,
      requestType,
      startDate,
      endDate,
      hours,
      reason,
    } = body;

    const targetEmployeeId = currentEmployee.systemRole === "Employee"
      ? currentEmployee.employeeId
      : String(employeeId || "").trim();
    const totalHours = Number(hours);

    if (!targetEmployeeId || !requestType || !startDate || !endDate || hours == null) {
      return NextResponse.json(
        { error: "Employee, leave type, start date, end date, and hours are required" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(totalHours) || totalHours <= 0) {
      return NextResponse.json(
        { error: "Hours must be greater than 0" },
        { status: 400 }
      );
    }

    if (parseDateForDatabase(startDate) > parseDateForDatabase(endDate)) {
      return NextResponse.json(
        { error: "Start date must be on or before end date" },
        { status: 400 }
      );
    }

    if (currentEmployee.systemRole === "Employee" && targetEmployeeId !== currentEmployee.employeeId) {
      return NextResponse.json(
        { error: "You can only create leave requests for your own employee record." },
        { status: 403 }
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { employeeId: targetEmployeeId },
      select: { id: true },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    const conflictDate = await getConflictDate(employee.id, startDate, endDate, totalHours);
    if (conflictDate) {
      return NextResponse.json(
        {
          error: "Leave for that date range would exceed 8 hours on at least one day.",
          details: `Conflict on ${conflictDate}`,
        },
        { status: 409 }
      );
    }

    const created = await timeOffRequestModel.create({
      data: {
        employeeId: employee.id,
        requestType,
        status: "PENDING",
        startDate: parseDateForDatabase(startDate),
        endDate: parseDateForDatabase(endDate),
        hours: totalHours,
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
        startDate: formatDateForResponse(created.startDate),
        endDate: formatDateForResponse(created.endDate),
        hours: created.hours,
        reason: created.reason || "",
        managerNote: created.managerNote || "",
        approvedAt: formatDateTimeForResponse(created.approvedAt),
        plannedHoursAdjustedAt: formatDateTimeForResponse(created.plannedHoursAdjustedAt),
        createdAt: formatDateTimeForResponse(created.createdAt),
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
