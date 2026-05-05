import prisma from "@/lib/prisma";
import { formatDateForResponse, parseDateForDatabase } from "@/lib/dateUtils";
import { allocateHoursAcrossOverlaps, getFullyCoveredOverlaps, WeeklyRecordWindow } from "@/lib/timeOffAdjustments";
import { NextResponse } from "next/server";

type PendingApprovedTimeOffRequest = {
  id: string;
  startDate: Date;
  endDate: Date;
  hours: number | null;
  plannedHoursAdjustedAt?: Date | null;
};

type PendingTimeOffModel = {
  findMany: (args: {
    where: Record<string, unknown>;
    orderBy: Array<{ startDate: "asc" }>;
  }) => Promise<PendingApprovedTimeOffRequest[]>;
  update: (args: {
    where: { id: string };
    data: { plannedHoursAdjustedAt: Date };
  }) => Promise<unknown>;
};

type WeeklyRecordModel = {
  create: (args: {
    data: {
      employeeId: string;
      startDate: Date;
      endDate: Date;
      plannedWorkHours: number;
      actualWorkHours: number;
      assignedTasks: number;
      assignedTasksDetails: unknown[];
      weeklyOverdueTasks: number;
      overdueTasksDetails: unknown[];
      allOverdueTasks: number;
      allOverdueTasksDetails: unknown[];
      managerComment: string | null;
    };
  }) => Promise<{
    id: string;
    startDate: Date;
    endDate: Date;
    plannedWorkHours: number;
    actualWorkHours: number;
    assignedTasks: number;
    assignedTasksDetails: unknown[];
    weeklyOverdueTasks: number;
    overdueTasksDetails: unknown[];
    allOverdueTasks: number;
    allOverdueTasksDetails: unknown[];
    managerComment: string | null;
  }>;
  findMany: (args: {
    where: { employeeId: string };
    orderBy: Array<{ startDate: "asc" }>;
  }) => Promise<WeeklyRecordWindow[]>;
  update: (args: {
    where: { id: string };
    data: { plannedWorkHours: number };
  }) => Promise<unknown>;
};

type HolidayModel = {
  findMany: (args: {
    where: {
      workLocation?: string;
      date?: { gte?: Date; lte?: Date };
    };
  }) => Promise<Array<{ id: string; date: Date; workLocation: string }>>;
};

type TransactionClient = {
  holiday: HolidayModel;
  timeOffRequest: PendingTimeOffModel;
  weeklyRecord: WeeklyRecordModel;
};

const missingAdjustedAtField = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("Unknown argument `plannedHoursAdjustedAt`");
};

// POST new weekly record
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      employeeId,
      startDate,
      endDate,
      plannedWorkHours,
      actualWorkHours,
      assignedTasks,
      assignedTasksDetails,
      weeklyOverdueTasks,
      overdueTasksDetails,
      allOverdueTasks,
      allOverdueTasksDetails,
      managerComment,
    } = body;

    const employee = await prisma.employee.findUnique({
      where: { employeeId },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    const safeAssignedTasksDetails = Array.isArray(assignedTasksDetails)
      ? assignedTasksDetails
      : [];
    const assignedTasksTotal = safeAssignedTasksDetails.reduce(
      (sum, detail) => sum + (detail?.count || 0),
      0
    );
    const assignedTasksValue =
      safeAssignedTasksDetails.length > 0
        ? assignedTasksTotal
        : assignedTasks ?? 0;

    const parsedStartDate = parseDateForDatabase(startDate);
    const parsedEndDate = parseDateForDatabase(endDate);

    const duplicateRecord = await prisma.weeklyRecord.findFirst({
      where: {
        employeeId: employee.id,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
      },
    });

    if (duplicateRecord) {
      return NextResponse.json(
        {
          error: "Weekly record already exists for this employee and week",
          record: {
            recordId: duplicateRecord.id,
            startDate: formatDateForResponse(duplicateRecord.startDate),
            endDate: formatDateForResponse(duplicateRecord.endDate),
            plannedWorkHours: duplicateRecord.plannedWorkHours,
            actualWorkHours: duplicateRecord.actualWorkHours,
          },
        },
        { status: 409 }
      );
    }

    const record = await prisma.$transaction(async (rawTx: any) => {
      const tx = rawTx as unknown as TransactionClient;

      const createdRecord = await tx.weeklyRecord.create({
        data: {
          employeeId: employee.id,
          startDate: parsedStartDate,
          endDate: parsedEndDate,
          plannedWorkHours,
          actualWorkHours,
          assignedTasks: assignedTasksValue,
          assignedTasksDetails: safeAssignedTasksDetails,
          weeklyOverdueTasks: Array.isArray(overdueTasksDetails)
            ? overdueTasksDetails.reduce(
                (sum, detail) => sum + (detail?.count || 0),
                0
              )
            : weeklyOverdueTasks,
          overdueTasksDetails: overdueTasksDetails || [],
          allOverdueTasks: allOverdueTasks || 0,
          allOverdueTasksDetails: allOverdueTasksDetails || [],
          managerComment: managerComment || null,
        },
      });

      const pendingApprovedRequests = await tx.timeOffRequest.findMany({
        where: {
          employeeId: employee.id,
          approvedAt: { not: null },
          plannedHoursAdjustedAt: null,
        },
        orderBy: [{ startDate: "asc" }],
      }).catch(async (error) => {
        if (!missingAdjustedAtField(error)) {
          throw error;
        }

        // Fallback for environments where Prisma client/schema has not yet picked up plannedHoursAdjustedAt.
        // Limit to requests overlapping the created week to avoid repeatedly reapplying old deductions.
        return tx.timeOffRequest.findMany({
          where: {
            employeeId: employee.id,
            approvedAt: { not: null },
            status: "APPROVED",
            startDate: { lte: parsedEndDate },
            endDate: { gte: parsedStartDate },
          },
          orderBy: [{ startDate: "asc" }],
        });
      });

      const employeeWeeklyRecords = await tx.weeklyRecord.findMany({
        where: { employeeId: employee.id },
        orderBy: [{ startDate: "asc" }],
      });

      const approvedRequestsForCreatedWeek = await tx.timeOffRequest.findMany({
        where: {
          employeeId: employee.id,
          approvedAt: { not: null },
          status: "APPROVED",
          startDate: { lte: parsedEndDate },
          endDate: { gte: parsedStartDate },
        },
        orderBy: [{ startDate: "asc" }],
      });

      let adjustedPlannedWorkHours = Number(createdRecord.plannedWorkHours);

      for (const request of approvedRequestsForCreatedWeek) {
        if (request.hours == null || request.hours <= 0) {
          continue;
        }

        const { overlaps, isFullyCovered } = getFullyCoveredOverlaps(
          request.startDate,
          request.endDate,
          employeeWeeklyRecords
        );

        if (!isFullyCovered || overlaps.length === 0) {
          continue;
        }

        const deductions = allocateHoursAcrossOverlaps(Number(request.hours), overlaps);
        const createdEntry = deductions.find((entry) => entry.record.id === createdRecord.id);

        if (createdEntry) {
          adjustedPlannedWorkHours = Math.max(0, adjustedPlannedWorkHours - createdEntry.allocatedHours);
        }
      }

      for (const request of pendingApprovedRequests) {
        if (request.hours == null || request.hours <= 0) {
          continue;
        }

        const { overlaps, isFullyCovered } = getFullyCoveredOverlaps(
          request.startDate,
          request.endDate,
          employeeWeeklyRecords
        );

        if (!isFullyCovered || overlaps.length === 0) {
          continue;
        }

        const deductions = allocateHoursAcrossOverlaps(Number(request.hours), overlaps);

        for (const entry of deductions) {
          if (entry.record.id === createdRecord.id) {
            continue;
          }

          await tx.weeklyRecord.update({
            where: { id: entry.record.id },
            data: {
              plannedWorkHours: Math.max(0, Number(entry.record.plannedWorkHours) - entry.allocatedHours),
            },
          });
        }

        await tx.timeOffRequest
          .update({
            where: { id: request.id },
            data: { plannedHoursAdjustedAt: new Date() },
          })
          .catch((error) => {
            if (!missingAdjustedAtField(error)) {
              throw error;
            }
          });
      }

      // Deduct hours for Taiwan holidays if employee is in Taiwan
      if (employee.staffWorkLocation === "Taiwan") {
        const taiwanHolidays = await tx.holiday.findMany({
          where: {
            workLocation: "Taiwan",
            date: {
              gte: parsedStartDate,
              lte: parsedEndDate,
            },
          },
        });

        if (taiwanHolidays.length > 0) {
          for (const h of taiwanHolidays) {
          }
        }

        if (taiwanHolidays.length > 0) {
          let holidayDeduction = 0;
          for (const holiday of taiwanHolidays) {
            const holidayDate = new Date(holiday.date);
            const dayOfWeek = holidayDate.getUTCDay();
            // Only deduct for workdays (Mon=1 to Fri=5, not Sat=6 or Sun=0)
            if (dayOfWeek >= 1 && dayOfWeek <= 5) {
              // Assume 8 hours per workday
              holidayDeduction += 8;
            } else {
            }
          }

          if (holidayDeduction > 0) {
            adjustedPlannedWorkHours = Math.max(0, adjustedPlannedWorkHours - holidayDeduction);
          }
        }
      }

      if (adjustedPlannedWorkHours !== Number(createdRecord.plannedWorkHours)) {
        await tx.weeklyRecord.update({
          where: { id: createdRecord.id },
          data: { plannedWorkHours: adjustedPlannedWorkHours },
        });

        return {
          ...createdRecord,
          plannedWorkHours: adjustedPlannedWorkHours,
        };
      }

      return createdRecord;
    });

    return NextResponse.json({
      recordId: record.id,
      startDate: formatDateForResponse(record.startDate),
      endDate: formatDateForResponse(record.endDate),
      plannedWorkHours: record.plannedWorkHours,
      actualWorkHours: record.actualWorkHours,
      assignedTasks: record.assignedTasks,
      assignedTasksDetails: record.assignedTasksDetails || [],
      weeklyOverdueTasks: record.weeklyOverdueTasks,
      overdueTasksDetails: record.overdueTasksDetails || [],
      allOverdueTasks: record.allOverdueTasks || 0,
      allOverdueTasksDetails: record.allOverdueTasksDetails || [],
      managerComment: record.managerComment || "",
    });
  } catch (error) {
    console.error("Error creating weekly record:", error);
    return NextResponse.json(
      { error: "Failed to create weekly record", details: String(error) },
      { status: 500 }
    );
  }
}
