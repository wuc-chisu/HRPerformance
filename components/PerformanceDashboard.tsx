"use client";

import { employees as defaultEmployees } from "@/lib/employees";

interface PerformanceDashboardProps {
  employees?: typeof defaultEmployees;
}

export default function PerformanceDashboard({
  employees = defaultEmployees,
}: PerformanceDashboardProps) {
  const stats = {
    totalEmployees: employees.length,
    withOverdueTasks: employees.filter((e) => e.overallOverdueTasks > 0).length,
    perfectAttendance: employees.filter(
      (e) =>
        e.weeklyRecords[0] &&
        e.weeklyRecords[0].actualWorkHours >= e.weeklyRecords[0].plannedWorkHours
    ).length,
    totalOverdueTasks: employees.reduce(
      (sum, e) => sum + e.overallOverdueTasks,
      0
    ),
  };

  const getDepartmentStats = () => {
    const departments = new Map<string, { count: number; overdue: number }>();

    employees.forEach((emp) => {
      const existing = departments.get(emp.department) || {
        count: 0,
        overdue: 0,
      };
      departments.set(emp.department, {
        count: existing.count + 1,
        overdue: existing.overdue + emp.overallOverdueTasks,
      });
    });

    return departments;
  };

  const departments = getDepartmentStats();

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-blue-300">
          <p className="text-gray-600 text-sm font-semibold uppercase">
            Total Employees
          </p>
          <p className="text-3xl font-bold text-blue-400 mt-2">
            {stats.totalEmployees}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-green-300">
          <p className="text-gray-600 text-sm font-semibold uppercase">
            On Time This Week
          </p>
          <p className="text-3xl font-bold text-green-400 mt-2">
            {stats.perfectAttendance}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-red-300">
          <p className="text-gray-600 text-sm font-semibold uppercase">
            With Overdue Tasks
          </p>
          <p className="text-3xl font-bold text-red-400 mt-2">
            {stats.withOverdueTasks}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-yellow-300">
          <p className="text-gray-600 text-sm font-semibold uppercase">
            Total Overdue Tasks
          </p>
          <p className="text-3xl font-bold text-yellow-500 mt-2">
            {stats.totalOverdueTasks}
          </p>
        </div>
      </div>

      {/* Department Stats */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Performance by Department
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from(departments.entries()).map(
            ([deptName, deptStats]) => (
              <div
                key={deptName}
                className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200"
              >
                <div>
                  <p className="font-semibold text-gray-900">{deptName}</p>
                  <p className="text-sm text-gray-600">
                    {deptStats.count} employees
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Overdue Tasks</p>
                  <p
                    className={`text-2xl font-bold ${
                      deptStats.overdue > 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {deptStats.overdue}
                  </p>
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
