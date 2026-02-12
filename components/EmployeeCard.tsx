"use client";

import { Employee } from "@/lib/employees";

interface EmployeeCardProps {
  employee: Employee;
  onSelect: (employeeId: string) => void;
}

export default function EmployeeCard({
  employee,
  onSelect,
}: EmployeeCardProps) {
  const latestWeek = employee.weeklyRecords[0];
  const hoursStatus =
    latestWeek && latestWeek.actualWorkHours >= latestWeek.plannedWorkHours
      ? "text-green-600"
      : "text-red-600";

  return (
    <div
      className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-300 hover:shadow-lg transition-shadow cursor-pointer"
      onClick={() => onSelect(employee.id)}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{employee.name}</h3>
          <p className="text-sm text-gray-600">{employee.id}</p>
        </div>
        <span className="bg-blue-200 text-blue-700 text-xs font-semibold px-3 py-1 rounded">
          {employee.position}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <p className="text-gray-600">Department</p>
          <p className="font-medium text-gray-900">{employee.department}</p>
        </div>
        <div>
          <p className="text-gray-600">Joined</p>
          <p className="font-medium text-gray-900">
            {new Date(employee.joinDate).toLocaleDateString()}
          </p>
        </div>
      </div>

      {latestWeek && (
        <div className="border-t pt-4 mt-4">
          <p className="text-xs text-gray-600 mb-3">Latest Week Performance</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-gray-600">Week Range</p>
              <p className="text-xs font-medium text-gray-900">
                {new Date(latestWeek.startDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}{" "}
                -{" "}
                {new Date(latestWeek.endDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Actual Hours</p>
              <p className={`text-lg font-bold ${hoursStatus}`}>
                {latestWeek.actualWorkHours}h
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Tasks</p>
              <p className="text-lg font-bold text-gray-900">
                {latestWeek.assignedTasks}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Overdue</p>
              <p
                className={`text-lg font-bold ${
                  latestWeek.weeklyOverdueTasks > 0
                    ? "text-red-600"
                    : "text-green-600"
                }`}
              >
                {latestWeek.weeklyOverdueTasks}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
