"use client";

import { Employee, WeeklyRecord } from "@/data/employees";

interface WeeklyRecordsTableProps {
  employee: Employee;
}

export default function WeeklyRecordsTable({ employee }: WeeklyRecordsTableProps) {
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
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4">
        <h3 className="text-xl font-bold text-white">Weekly Performance Records</h3>
        <p className="text-blue-100 text-sm mt-1">
          {employee.name} • {employee.id}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Week
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Date
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
                    Week {record.week}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(record.date).toLocaleDateString("en-US", {
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
                    {record.actualWorkHours}/{record.plannedWorkHours}
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-gray-50 px-6 py-4 border-t">
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
