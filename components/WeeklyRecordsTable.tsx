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
  onSaveRecord?: (
    recordId: string,
    updates: Partial<WeeklyRecord>
  ) => Promise<void> | void;
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
  onSaveRecord,
}: WeeklyRecordsTableProps) {
  const [showOverdueManager, setShowOverdueManager] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<WeeklyRecord | null>(null);
  const [showAssignedManager, setShowAssignedManager] = useState(false);
  const [selectedAssignedRecord, setSelectedAssignedRecord] =
    useState<WeeklyRecord | null>(null);
  const [showAllOverdueManager, setShowAllOverdueManager] = useState(false);
  const [selectedAllOverdueRecord, setSelectedAllOverdueRecord] =
    useState<WeeklyRecord | null>(null);
  const [pendingUpdates, setPendingUpdates] = useState<
    Record<string, Partial<WeeklyRecord>>
  >({});
  const [savingRecordId, setSavingRecordId] = useState<string | null>(null);
  const [savedRecordIds, setSavedRecordIds] = useState<Record<string, boolean>>({});

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
    const rowUpdates =
      (record.recordId && pendingUpdates[record.recordId]) || undefined;
    setSelectedRecord(rowUpdates ? { ...record, ...rowUpdates } : record);
    setShowOverdueManager(true);
  };

  const handleUpdateOverdue = async (details: OverdueTaskDetail[]) => {
    if (!selectedRecord || !selectedRecord.recordId) {
      console.warn("Cannot update overdue tasks: missing selectedRecord or recordId");
      return;
    }

    const totalOverdue = details.reduce((sum, detail) => sum + detail.count, 0);
    console.log("📝 Updating overdue tasks for record:", selectedRecord.recordId);
    console.log("   Details:", details);
    console.log("   Total count:", totalOverdue);

    if (onSaveRecord) {
      try {
        setSavingRecordId(selectedRecord.recordId);
        await onSaveRecord(selectedRecord.recordId, {
          overdueTasksDetails: details,
          weeklyOverdueTasks: totalOverdue,
        });
        console.log("✅ Overdue tasks saved to DB");
        setSavedRecordIds((prev) => ({
          ...prev,
          [selectedRecord.recordId!]: true,
        }));
        setPendingUpdates((prev) => {
          const next = { ...prev };
          delete next[selectedRecord.recordId!];
          return next;
        });
      } catch (error) {
        console.error("❌ Failed to save overdue tasks:", error);
        alert(error instanceof Error ? error.message : "Failed to save overdue tasks.");
        throw error;
      } finally {
        setSavingRecordId(null);
      }
      return;
    }

    if (onUpdateOverdueTasks) {
      onUpdateOverdueTasks(selectedRecord.recordId, details);
    }
  };

  const handleViewAssigned = (record: WeeklyRecord) => {
    const rowUpdates =
      (record.recordId && pendingUpdates[record.recordId]) || undefined;
    setSelectedAssignedRecord(
      rowUpdates ? { ...record, ...rowUpdates } : record
    );
    setShowAssignedManager(true);
  };

  const handleUpdateAssigned = async (details: AssignedTaskDetail[]) => {
    if (!selectedAssignedRecord || !selectedAssignedRecord.recordId) {
      console.warn("Cannot update assigned tasks: missing selectedAssignedRecord or recordId");
      return;
    }

    const totalAssigned = details.reduce((sum, detail) => sum + detail.count, 0);
    console.log("📝 Updating assigned tasks for record:", selectedAssignedRecord.recordId);
    console.log("   Details:", details);
    console.log("   Total count:", totalAssigned);

    if (onSaveRecord) {
      try {
        setSavingRecordId(selectedAssignedRecord.recordId);
        await onSaveRecord(selectedAssignedRecord.recordId, {
          assignedTasksDetails: details,
          assignedTasks: totalAssigned,
        });
        console.log("✅ Assigned tasks saved to DB");
        setSavedRecordIds((prev) => ({
          ...prev,
          [selectedAssignedRecord.recordId!]: true,
        }));
        setPendingUpdates((prev) => {
          const next = { ...prev };
          delete next[selectedAssignedRecord.recordId!];
          return next;
        });
      } catch (error) {
        console.error("❌ Failed to save assigned tasks:", error);
        alert(error instanceof Error ? error.message : "Failed to save assigned tasks.");
        throw error;
      } finally {
        setSavingRecordId(null);
      }
      return;
    }

    if (onUpdateAssignedTasks) {
      onUpdateAssignedTasks(selectedAssignedRecord.recordId, details);
    }
  };

  const handleViewAllOverdue = (record: WeeklyRecord) => {
    const rowUpdates =
      (record.recordId && pendingUpdates[record.recordId]) || undefined;
    setSelectedAllOverdueRecord(
      rowUpdates ? { ...record, ...rowUpdates } : record
    );
    setShowAllOverdueManager(true);
  };

  const handleUpdateAllOverdue = async (details: OverdueTaskDetail[]) => {
    if (!selectedAllOverdueRecord || !selectedAllOverdueRecord.recordId) {
      console.warn("Cannot update all overdue tasks: missing selectedAllOverdueRecord or recordId");
      return;
    }

    const totalAllOverdue = details.reduce((sum, detail) => sum + detail.count, 0);
    console.log("📝 Updating all overdue tasks for record:", selectedAllOverdueRecord.recordId);
    console.log("   Details:", details);
    console.log("   Total count:", totalAllOverdue);

    if (onSaveRecord) {
      try {
        setSavingRecordId(selectedAllOverdueRecord.recordId);
        await onSaveRecord(selectedAllOverdueRecord.recordId, {
          allOverdueTasksDetails: details,
          allOverdueTasks: totalAllOverdue,
        });
        console.log("✅ All overdue tasks saved to DB");
        setSavedRecordIds((prev) => ({
          ...prev,
          [selectedAllOverdueRecord.recordId!]: true,
        }));
        setPendingUpdates((prev) => {
          const next = { ...prev };
          delete next[selectedAllOverdueRecord.recordId!];
          return next;
        });
      } catch (error) {
        console.error("❌ Failed to save all overdue tasks:", error);
        alert(error instanceof Error ? error.message : "Failed to save all overdue tasks.");
        throw error;
      } finally {
        setSavingRecordId(null);
      }
      return;
    }

    if (onUpdateAllOverdueTasks) {
      onUpdateAllOverdueTasks(selectedAllOverdueRecord.recordId, details);
    }
  };

  const handleSaveRecordUpdates = async (record: WeeklyRecord) => {
    if (!onSaveRecord || !record.recordId) {
      console.warn("Cannot save: missing onSaveRecord callback or recordId");
      return;
    }

    const updates = pendingUpdates[record.recordId] || {};

    console.log("🔄 [CLIENT] Saving record updates");
    console.log("   Record ID:", record.recordId);
    console.log("   Current record state:", {
      startDate: record.startDate,
      endDate: record.endDate,
      assignedTasksDetails: record.assignedTasksDetails,
      overdueTasksDetails: record.overdueTasksDetails,
      allOverdueTasksDetails: record.allOverdueTasksDetails,
    });
    console.log("   Pending updates:", updates);

    try {
      setSavingRecordId(record.recordId);
      await onSaveRecord(record.recordId, updates);
      console.log("✅ Save successful, clearing pending updates");
      setSavedRecordIds((prev) => ({
        ...prev,
        [record.recordId!]: true,
      }));
      setPendingUpdates((prev) => {
        const next = { ...prev };
        delete next[record.recordId!];
        return next;
      });
    } catch (error) {
      console.error("❌ Failed to save weekly record updates:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to save weekly record updates";
      console.error("Error details:", errorMessage);
      alert(errorMessage);
    } finally {
      setSavingRecordId(null);
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
      <div className="bg-linear-to-r from-purple-300 to-pink-300 px-6 py-4 flex justify-between items-center">
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
              const rowUpdates =
                (record.recordId && pendingUpdates[record.recordId]) || undefined;
              const status = getPerformanceStatus(record);
              const assignedDetailsTotal = (
                rowUpdates?.assignedTasksDetails || record.assignedTasksDetails || []
              ).reduce((sum, detail) => sum + detail.count, 0);
              const assignedTasksTotal =
                (rowUpdates?.assignedTasksDetails || record.assignedTasksDetails || []).length > 0
                  ? assignedDetailsTotal
                  : (rowUpdates?.assignedTasks ?? record.assignedTasks);
              // Sum up all overdue tasks from overdueTasksDetails for this week
              const weeklyOverdueTotal = ((rowUpdates?.overdueTasksDetails || record.overdueTasksDetails || [])).reduce(
                (sum, detail) => sum + detail.count,
                0
              );
              const allOverdueTotalForRow =
                rowUpdates?.allOverdueTasks ?? record.allOverdueTasks ?? 0;
              const hasPendingUpdates = Boolean(rowUpdates);
              
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
                        {(rowUpdates?.overdueTasksDetails || record.overdueTasksDetails || []).length > 0
                          ? weeklyOverdueTotal
                          : rowUpdates?.weeklyOverdueTasks ?? record.weeklyOverdueTasks}
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
                      <span>{allOverdueTotalForRow}</span>
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
                      {onSaveRecord && record.recordId && (
                        <>
                          <button
                            onClick={() => handleSaveRecordUpdates(record)}
                            disabled={savingRecordId === record.recordId}
                            className={`px-3 py-1 rounded transition-colors text-xs font-semibold ${
                              savingRecordId === record.recordId
                                ? "bg-green-200 text-white cursor-not-allowed"
                                : "bg-green-400 text-white hover:bg-green-500"
                            }`}
                          >
                            {savingRecordId === record.recordId
                              ? "Saving..."
                              : savedRecordIds[record.recordId]
                                ? "Saved"
                                : "Save Details to DB"}
                          </button>
                          {hasPendingUpdates && (
                            <button
                              onClick={() => {
                                setPendingUpdates((prev) => {
                                  const next = { ...prev };
                                  delete next[record.recordId!];
                                  return next;
                                });
                              }}
                              className="bg-gray-300 text-gray-800 px-3 py-1 rounded hover:bg-gray-400 transition-colors text-xs font-semibold"
                            >
                              Revert
                            </button>
                          )}
                        </>
                      )}
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
