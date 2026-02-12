"use client";

import { Employee, WeeklyRecord } from "@/lib/employees";

interface WeeklyRecordsTableProps {
  employee: Employee;
  onEditRecord?: (record: WeeklyRecord, index: number) => void;
  onDeleteRecord?: (index: number) => void;
  onAddRecord?: () => void;
}

export default function WeeklyRecordsTable({
  employee,
  onEditRecord,
  onDeleteRecord,
  onAddRecord,
}: WeeklyRecordsTableProps) {
  const getPerformanceStatus = (record: WeeklyRecord) => {
    const hoursStatus =
      record.actualWorkHours >= record.plannedWorkHours ? "good" : "poor";
    const tasksStatus = record.weeklyOverdueTasks === 0 ? "good" : "poor";

    return {
      hours: hoursStatus,
      tasks: tasksStatus,
    };
  };

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
                Planned Hours
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Actual Hours
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Assigned Tasks
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Weekly Overdue
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
              return (
                <tr
                  key={index}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {new Date(record.startDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(record.endDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {record.plannedWorkHours}h
                  </td>
                  <td
                    className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${
                      status.hours === "good"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {record.actualWorkHours}h
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {record.assignedTasks}
                  </td>
                  <td
                    className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${
                      record.weeklyOverdueTasks === 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {record.weeklyOverdueTasks}
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
                employee.overallOverdueTasks > 0
                  ? "text-red-600"
                  : "text-green-600"
              }`}
            >
              {employee.overallOverdueTasks}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Performance Trend</p>
            <div className="flex gap-1 mt-2">
              {employee.weeklyRecords.map((record, idx) => (
                <div
                  key={idx}
                  className={`h-12 w-3 rounded ${
                    record.weeklyOverdueTasks === 0
                      ? "bg-green-500"
                      : record.weeklyOverdueTasks <= 2
                        ? "bg-yellow-500"
                        : "bg-red-500"
                  }`}
                  title={`Week ${record.week}: ${record.weeklyOverdueTasks} overdue`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
