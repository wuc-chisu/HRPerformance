"use client";

import { Employee, WeeklyRecord } from "@/lib/employees";
import { calculateWeeklyPerformanceScore } from "@/lib/performanceScoring";
import { useState } from "react";
import AssignedTaskManager from "./AssignedTaskManager";
import OverdueTaskManager from "./OverdueTaskManager";

interface WeeklyRecordsTableProps {
  employee: Employee;
  onEditRecord?: (record: WeeklyRecord, index: number) => void;
  onDeleteRecord?: (index: number) => void;
  onAddRecord?: () => void;
  onUpdateOverdueTasks?: (recordId: string, details: any[]) => void;
  onUpdateAssignedTasks?: (recordId: string, details: any[]) => void;
  onUpdateAllOverdueTasks?: (recordId: string, details: any[]) => void;
}

export default function WeeklyRecordsTable({
  employee,
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

  const handleUpdateOverdue = (details: any[]) => {
    if (selectedRecord && selectedRecord.recordId && onUpdateOverdueTasks) {
      onUpdateOverdueTasks(selectedRecord.recordId, details);
    }
  };

  const handleViewAssigned = (record: WeeklyRecord) => {
    setSelectedAssignedRecord(record);
    setShowAssignedManager(true);
  };

  const handleUpdateAssigned = (details: any[]) => {
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

  const handleUpdateAllOverdue = (details: any[]) => {
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
    };
    sessionStorage.setItem("evaluationData", JSON.stringify(evaluationData));
    
    // Open evaluation in new window
    window.open("/evaluation", "_blank");
  };

  const allOverdueTotal =
    employee.weeklyRecords[0]?.allOverdueTasks ??
    employee.overallOverdueTasks ??
    0;

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
            {employee.weeklyRecords.map((record, index) => {
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
                  key={index}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {(() => {
                      const [year, month, day] = record.startDate.split('-');
                      const date = new Date(Number(year), Number(month) - 1, Number(day));
                      return date.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      });
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {(() => {
                      const [year, month, day] = record.endDate.split('-');
                      const date = new Date(Number(year), Number(month) - 1, Number(day));
                      return date.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      });
                    })()}
                  </td>
                  <td
                    className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${
                      status.hours === "good"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {record.actualWorkHours}/{record.plannedWorkHours}
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
                          onClick={() => onEditRecord(record, index)}
                          className="bg-blue-300 text-white px-3 py-1 rounded hover:bg-blue-400 transition-colors text-xs font-semibold"
                        >
                          Edit
                        </button>
                      )}
                      {onDeleteRecord && (
                        <button
                          onClick={() => onDeleteRecord(index)}
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
        />
      )}
    </div>
  );
}
