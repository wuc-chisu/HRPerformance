import prisma from "@/lib/prisma";
import { allocateHoursAcrossOverlaps, getFullyCoveredOverlaps, WeeklyRecordWindow } from "@/lib/timeOffAdjustments";
import { NextResponse } from "next/server";

class TimeOffRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type TimeOffStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

type EmployeeWithWeeklyRecords = {
  employeeId: string;
  name: string;
  department: string;
  weeklyRecords: WeeklyRecordWindow[];
};

type TimeOffRequestWithEmployeeAndWeeklyRecords = {
  id: string;
  employee: EmployeeWithWeeklyRecords;
  requestType: string;
  status: TimeOffStatus;
  startDate: Date;
  endDate: Date;
  hours: number | null;
  reason: string | null;
  managerNote: string | null;
  approvedAt: Date | null;
  plannedHoursAdjustedAt: Date | null;
  createdAt: Date;
};

type TimeOffRequestResponseRecord = {
  id: string;
  employee: {
    employeeId: string;
    name: string;
    department: string;
  } | null;
  requestType: string;
  status: TimeOffStatus;
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
  findUnique: (args: {
    where: { id: string };
    include: {
      employee: {
        include: {
          weeklyRecords: {
            orderBy: { startDate: "asc" };
          };
        };
      };
    };
  }) => Promise<TimeOffRequestWithEmployeeAndWeeklyRecords | null>;
  update: (args: {
    where: { id: string };
    data: {
      status?: TimeOffStatus;
      managerNote?: string | null;
      approvedAt?: Date | null;
      plannedHoursAdjustedAt?: Date | null;
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
  }) => Promise<TimeOffRequestResponseRecord>;
  delete: (args: { where: { id: string } }) => Promise<unknown>;
};

type WeeklyRecordModel = {
  update: (args: {
    where: { id: string };
    data: { plannedWorkHours: number };
  }) => Promise<unknown>;
};

type TransactionClient = {
  timeOffRequest: TimeOffRequestModel;
  weeklyRecord: WeeklyRecordModel;
};

const timeOffRequestModel = (prisma as unknown as { timeOffRequest: TimeOffRequestModel }).timeOffRequest;

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { status, managerNote } = body;

    if (!id) {
      return NextResponse.json({ error: "Request ID is required" }, { status: 400 });
    }

    const allowedStatuses = new Set<TimeOffStatus>(["PENDING", "APPROVED", "REJECTED", "CANCELLED"]);
    if (status && !allowedStatuses.has(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (rawTx) => {
      const tx = rawTx as unknown as TransactionClient;
      const existing = await tx.timeOffRequest.findUnique({
        where: { id },
        include: {
          employee: {
            include: {
              weeklyRecords: {
                orderBy: { startDate: "asc" },
              },
            },
          },
        },
      });

      if (!existing) {
        throw new TimeOffRequestError("Time-off request not found", 404);
      }

      const nextStatus = status || existing.status;
      const nextManagerNote = typeof managerNote === "string" ? managerNote : existing.managerNote;

      let approvedAt = existing.approvedAt;
      let plannedHoursAdjustedAt = existing.plannedHoursAdjustedAt;

      if (nextStatus === "APPROVED" && !existing.plannedHoursAdjustedAt) {
        if (existing.hours == null || existing.hours <= 0) {
          throw new TimeOffRequestError("Approved requests require time-off hours so planned work hours can be deducted", 400);
        }

        const { overlaps, isFullyCovered } = getFullyCoveredOverlaps(
          existing.startDate,
          existing.endDate,
          existing.employee.weeklyRecords
        );

        if (isFullyCovered && overlaps.length > 0) {
          const deductions = allocateHoursAcrossOverlaps(Number(existing.hours), overlaps);

          for (const entry of deductions) {
          await tx.weeklyRecord.update({
            where: { id: entry.record.id },
            data: {
              plannedWorkHours: Math.max(0, Number(entry.record.plannedWorkHours) - entry.allocatedHours),
            },
          });
        }

          plannedHoursAdjustedAt = new Date();
        }

        approvedAt = existing.approvedAt || new Date();
      }

      return tx.timeOffRequest.update({
        where: { id },
        data: {
          ...(status ? { status: nextStatus } : {}),
          ...(typeof managerNote === "string" ? { managerNote: nextManagerNote } : {}),
          ...(nextStatus === "APPROVED" ? { approvedAt } : {}),
          ...(plannedHoursAdjustedAt ? { plannedHoursAdjustedAt } : {}),
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
    });

    const response = updated;

    return NextResponse.json({
      id: response.id,
      employeeId: response.employee?.employeeId,
      employeeName: response.employee?.name,
      department: response.employee?.department,
      requestType: response.requestType,
      status: response.status,
      startDate: response.startDate.toISOString().split("T")[0],
      endDate: response.endDate.toISOString().split("T")[0],
      hours: response.hours,
      reason: response.reason || "",
      managerNote: response.managerNote || "",
      approvedAt: response.approvedAt?.toISOString() || null,
      plannedHoursAdjustedAt: response.plannedHoursAdjustedAt?.toISOString() || null,
      createdAt: response.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Error updating time-off request:", error);
    if (error instanceof TimeOffRequestError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { error: "Failed to update time-off request", details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Request ID is required" }, { status: 400 });
    }

    await timeOffRequestModel.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting time-off request:", error);
    return NextResponse.json(
      { error: "Failed to delete time-off request", details: String(error) },
      { status: 500 }
    );
  }
}
