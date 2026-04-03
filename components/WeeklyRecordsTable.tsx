"use client";

import { AssignedTaskDetail, Employee, HolidayRecord, OverdueTaskDetail, TimeOffRequest, WeeklyRecord } from "@/lib/employees";
import { allocateHoursAcrossOverlaps, getFullyCoveredOverlaps, WeeklyRecordWindow } from "@/lib/timeOffAdjustments";
import { calculateWeeklyPerformanceScore } from "@/lib/performanceScoring";
import { formatDateInPacific } from "@/lib/dateUtils";
import { useMemo, useState } from "react";
import AssignedTaskManager from "./AssignedTaskManager";
import OverdueTaskManager from "./OverdueTaskManager";

interface WeeklyRecordsTableProps {
  employee: Employee;
  timeOffRequests?: TimeOffRequest[];
  holidays?: HolidayRecord[];
  selectedYear?: number;
  selectedMonth?: number;
  selectedWeekRange?: string | null;
  onEditRecord?: (record: WeeklyRecord, index: number) => void;
  onDeleteRecord?: (index: number) => void;
  onAddRecord?: () => void;
  onUpdateOverdueTasks?: (recordId: string, details: OverdueTaskDetail[]) => void;
  onUpdateAssignedTasks?: (recordId: string, details: AssignedTaskDetail[]) => void;
  onUpdateAllOverdueTasks?: (recordId: string, details: OverdueTaskDetail[]) => void;
}

export default function WeeklyRecordsTable({
  employee,
  timeOffRequests = [],
  holidays = [],
  selectedYear,
  selectedMonth,
  selectedWeekRange,
  onEditRecord,
  onDeleteRecord,
  onAddRecord,
  onUpdateOverdueTasks,
  onUpdateAssignedTasks,
  onUpdateAllOverdueTasks,
}: WeeklyRecordsTableProps) {
  const [showOverdueManager, setShowOverdueManager] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<WeeklyRecord | null>(null);
  const [showAssignedManager, setShowAssignedManager] = useState(false);
  const [selectedAssignedRecord, setSelectedAssignedRecord] =
    useState<WeeklyRecord | null>(null);
  const [showAllOverdueManager, setShowAllOverdueManager] = useState(false);
  const [selectedAllOverdueRecord, setSelectedAllOverdueRecord] =
    useState<WeeklyRecord | null>(null);

  const getRecordKey = (record: WeeklyRecord) =>
    record.recordId || `${record.startDate}-${record.endDate}`;

  const timeOffAdjustmentByRecordKey = useMemo(() => {
    const weeklyRecordWindows: WeeklyRecordWindow[] = employee.weeklyRecords
      .map((record) => ({
        id: record.recordId || `${record.startDate}-${record.endDate}`,
        startDate: new Date(`${record.startDate}T12:00:00Z`),
        endDate: new Date(`${record.endDate}T12:00:00Z`),
        plannedWorkHours: record.plannedWorkHours,
      }))
      .sort((left, right) => left.startDate.getTime() - right.startDate.getTime());

    const adjustments = new Map<string, number>();

    for (const request of timeOffRequests) {
      if (
        request.status !== "APPROVED" ||
        !request.plannedHoursAdjustedAt ||
        request.hours == null ||
        request.hours <= 0
      ) {
        continue;
      }

      const { overlaps, isFullyCovered } = getFullyCoveredOverlaps(
        new Date(`${request.startDate}T12:00:00Z`),
        new Date(`${request.endDate}T12:00:00Z`),
        weeklyRecordWindows
      );

      if (!isFullyCovered || overlaps.length === 0) {
        continue;
      }

      const deductions = allocateHoursAcrossOverlaps(Number(request.hours), overlaps);

      for (const entry of deductions) {
        adjustments.set(
          entry.record.id,
          Math.round(((adjustments.get(entry.record.id) || 0) + entry.allocatedHours) * 100) / 100
        );
      }
    }

    return adjustments;
  }, [employee.weeklyRecords, timeOffRequests]);

  const holidayAdjustmentByRecordKey = useMemo(() => {
    const adjustments = new Map<string, number>();
    const location = employee.staffWorkLocation === "Taiwan" ? "Taiwan" : "USA";
    const locationHolidays = holidays.filter((holiday) => holiday.workLocation === location);

    for (const record of employee.weeklyRecords) {
      const recordKey = getRecordKey(record);
      const weekStart = new Date(`${record.startDate}T12:00:00Z`);
      const weekEnd = new Date(`${record.endDate}T12:00:00Z`);

      let deductionHours = 0;
      for (const holiday of locationHolidays) {
        const holidayDate = new Date(`${holiday.date}T12:00:00Z`);
        if (holidayDate >= weekStart && holidayDate <= weekEnd) {
          const day = holidayDate.getUTCDay();
          if (day >= 1 && day <= 5) {
            deductionHours += 8;
          }
        }
      }

      if (deductionHours > 0) {
        adjustments.set(recordKey, deductionHours);
      }
    }

    return adjustments;
  }, [employee.weeklyRecords, employee.staffWorkLocation, holidays]);

  const getPerformanceStatus = (record: WeeklyRecord) => {
    const hoursStatus =
      record.actualWorkHours >= record.plannedWorkHours ? "good" : "poor";
    const tasksStatus = record.weeklyOverdueTasks === 0 ? "good" : "poor";

    return {
      hours: hoursStatus,
      tasks: tasksStatus,
    };
  };

  const handleViewOverdue = (record: WeeklyRecord) => {
    setSelectedRecord(record);
    setShowOverdueManager(true);
  };

  const handleUpdateOverdue = (details: OverdueTaskDetail[]) => {
    if (selectedRecord && selectedRecord.recordId && onUpdateOverdueTasks) {
      onUpdateOverdueTasks(selectedRecord.recordId, details);
    }
  };

  const handleViewAssigned = (record: WeeklyRecord) => {
    setSelectedAssignedRecord(record);
    setShowAssignedManager(true);
  };

  const handleUpdateAssigned = (details: AssignedTaskDetail[]) => {
    if (
      selectedAssignedRecord &&
      selectedAssignedRecord.recordId &&
      onUpdateAssignedTasks
    ) {
      onUpdateAssignedTasks(selectedAssignedRecord.recordId, details);
    }
  };

  const handleViewAllOverdue = (record: WeeklyRecord) => {
    setSelectedAllOverdueRecord(record);
    setShowAllOverdueManager(true);
  };

  const handleUpdateAllOverdue = (details: OverdueTaskDetail[]) => {
    if (
      selectedAllOverdueRecord &&
      selectedAllOverdueRecord.recordId &&
      onUpdateAllOverdueTasks
    ) {
      onUpdateAllOverdueTasks(selectedAllOverdueRecord.recordId, details);
    }
  };

  const handleViewEvaluation = (record: WeeklyRecord) => {
    // Store evaluation data in sessionStorage
    const evaluationData = {
      record,
      employeeName: employee.name,
      employeeId: employee.id,
      employeeEmail: employee.email,
      workAuthorizationStatus: employee.workAuthorizationStatus,
    };
    sessionStorage.setItem("evaluationData", JSON.stringify(evaluationData));

    // Open evaluation in new window with a small delay to ensure sessionStorage is written
    setTimeout(() => {
      window.open("/evaluation", "_blank");
    }, 50);
  };

  const allOverdueTotal =
    employee.weeklyRecords[0]?.allOverdueTasks ??
    employee.overallOverdueTasks ??
    0;

  const filteredRecords = employee.weeklyRecords.filter((record) => {
    if (selectedYear !== undefined && selectedMonth !== undefined) {
      const date = new Date(`${record.startDate}T12:00:00`);
      if (
        date.getFullYear() !== selectedYear ||
        date.getMonth() !== selectedMonth
      ) {
        return false;
      }
    }

    if (selectedWeekRange) {
      const [start, end] = selectedWeekRange.split("|");
      return record.startDate === start && record.endDate === end;
    }

    return true;
  });

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-gradient-to-r from-purple-300 to-pink-300 px-6 py-4 flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-white">Weekly Performance Records</h3>
          <p className="text-blue-100 text-sm mt-1">
            {employee.name} • {employee.id}
          </p>
        </div>
        {onAddRecord && (
          <button
            onClick={onAddRecord}
            className="bg-green-300 text-white px-4 py-2 rounded-lg hover:bg-green-400 transition-colors font-semibold"
          >
            + Add Record
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Week Start
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Week End
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Hours (Actual/Planned)
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Assigned Tasks
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Weekly Overdue
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                All Overdue
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Evaluation
              </th>
              {(onEditRecord || onDeleteRecord) && (
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredRecords.map((record) => {
              const status = getPerformanceStatus(record);
              const assignedDetailsTotal = (
                record.assignedTasksDetails || []
              ).reduce((sum, detail) => sum + detail.count, 0);
              const assignedTasksTotal =
                (record.assignedTasksDetails || []).length > 0
                  ? assignedDetailsTotal
                  : record.assignedTasks;
              // Sum up all overdue tasks from overdueTasksDetails for this week
              const weeklyOverdueTotal = (record.overdueTasksDetails || []).reduce(
                (sum, detail) => sum + detail.count,
                0
              );
              
              return (
                <tr
                  key={record.recordId || `${record.startDate}-${record.endDate}`}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatDateInPacific(record.startDate, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDateInPacific(record.endDate, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td
                    className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${
                      status.hours === "good"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    <div>
                      <div className="relative inline-block group">
                        {record.actualWorkHours}/
                        <span
                          className="underline decoration-dotted underline-offset-2 cursor-help hover:text-amber-700 transition-colors"
                          title="Hover for deduction details"
                        >
                          {record.plannedWorkHours}
                        </span>
                        {(() => {
                          const timeOff = timeOffAdjustmentByRecordKey.get(getRecordKey(record)) || 0;
                          const holidays = holidayAdjustmentByRecordKey.get(getRecordKey(record)) || 0;
                          const total = timeOff + holidays;
                          let tooltipText = "No deductions";
                          if (total > 0) {
                            const parts = [];
                            if (timeOff > 0) parts.push(`Time Off: -${timeOff}h`);
                            if (holidays > 0) parts.push(`Holidays: -${holidays}h`);
                            parts.push(`Total: -${total}h`);
                            tooltipText = parts.join(" | ");
                          }
                          return (
                            <div className="absolute hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white text-xs rounded px-2 py-1 z-10 pointer-events-none whitespace-nowrap">
                              {tooltipText}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    <div className="flex items-center gap-3">
                      <span>{assignedTasksTotal}</span>
                      <button
                        onClick={() => handleViewAssigned(record)}
                        className="bg-blue-300 text-white px-3 py-1 rounded hover:bg-blue-400 transition-colors text-xs font-semibold"
                      >
                        Edit Details
                      </button>
                    </div>
                  </td>
                  <td
                    className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${
                      weeklyOverdueTotal === 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span>
                        {(record.overdueTasksDetails || []).length > 0
                          ? weeklyOverdueTotal
                          : record.weeklyOverdueTasks}
                      </span>
                      <button
                        onClick={() => handleViewOverdue(record)}
                        className="bg-red-300 text-white px-3 py-1 rounded hover:bg-red-400 transition-colors text-xs font-semibold"
                      >
                        Edit Details
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    <div className="flex items-center gap-3">
                      <span>{record.allOverdueTasks || 0}</span>
                      <button
                        onClick={() => handleViewAllOverdue(record)}
                        className="bg-orange-300 text-white px-3 py-1 rounded hover:bg-orange-400 transition-colors text-xs font-semibold"
                      >
                        Edit Details
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleViewEvaluation(record)}
                      className="bg-purple-300 text-white px-3 py-1 rounded hover:bg-purple-400 transition-colors text-xs font-semibold"
                    >
                      View Evaluation
                    </button>
                  </td>
                  {(onEditRecord || onDeleteRecord) && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2 flex">
                      {onEditRecord && (
                        <button
                          onClick={() => {
                            const originalIndex = employee.weeklyRecords.findIndex(
                              (r) =>
                                r.recordId === record.recordId ||
                                (r.startDate === record.startDate &&
                                  r.endDate === record.endDate)
                            );
                            onEditRecord(record, originalIndex);
                          }}
                          className="bg-blue-300 text-white px-3 py-1 rounded hover:bg-blue-400 transition-colors text-xs font-semibold"
                        >
                          Edit
                        </button>
                      )}
                      {onDeleteRecord && (
                        <button
                          onClick={() => {
                            const originalIndex = employee.weeklyRecords.findIndex(
                              (r) =>
                                r.recordId === record.recordId ||
                                (r.startDate === record.startDate &&
                                  r.endDate === record.endDate)
                            );
                            onDeleteRecord(originalIndex);
                          }}
                          className="bg-red-300 text-white px-3 py-1 rounded hover:bg-red-400 transition-colors text-xs font-semibold"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredRecords.length === 0 && (
        <div className="px-6 py-6 text-sm text-gray-600 border-t">
          No weekly records found for the selected year/month/week.
        </div>
      )}

      <div className="bg-blue-50 px-6 py-4 border-t">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Overall Overdue Tasks</p>
            <p
              className={`text-2xl font-bold ${
                allOverdueTotal > 0
                  ? "text-red-600"
                  : "text-green-600"
              }`}
            >
              {allOverdueTotal}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Performance Trend</p>
            <div className="flex gap-1 mt-2">
              {employee.weeklyRecords.map((record, idx) => (
                <div
                  key={idx}
                  className={`h-12 w-3 rounded ${(() => {
                    const score = calculateWeeklyPerformanceScore(record).totalScore;
                    if (score >= 90) return "bg-green-500";
                    if (score >= 80) return "bg-green-400";
                    if (score >= 70) return "bg-blue-500";
                    return "bg-red-500";
                  })()}`}
                  title={`Score: ${calculateWeeklyPerformanceScore(record).totalScore.toFixed(1)}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Overdue Task Manager Modal */}
      {showOverdueManager && selectedRecord && (
        <OverdueTaskManager
          overdueTasksDetails={selectedRecord.overdueTasksDetails || []}
          weeklyOverdueTasks={selectedRecord.weeklyOverdueTasks}
          onUpdate={handleUpdateOverdue}
          onClose={() => {
            setShowOverdueManager(false);
            setSelectedRecord(null);
          }}
          title="Weekly Overdue Tasks Details"
        />
      )}

      {/* Assigned Task Manager Modal */}
      {showAssignedManager && selectedAssignedRecord && (
        <AssignedTaskManager
          assignedTasksDetails={selectedAssignedRecord.assignedTasksDetails || []}
          onUpdate={handleUpdateAssigned}
          onClose={() => {
            setShowAssignedManager(false);
            setSelectedAssignedRecord(null);
          }}
        />
      )}

      {/* All Overdue Task Manager Modal */}
      {showAllOverdueManager && selectedAllOverdueRecord && (
        <OverdueTaskManager
          overdueTasksDetails={
            selectedAllOverdueRecord.allOverdueTasksDetails || []
          }
          weeklyOverdueTasks={selectedAllOverdueRecord.allOverdueTasks || 0}
          onUpdate={handleUpdateAllOverdue}
          onClose={() => {
            setShowAllOverdueManager(false);
            setSelectedAllOverdueRecord(null);
          }}
          title="All Overdue Tasks Details"
        />
      )}
    </div>
  );
}
