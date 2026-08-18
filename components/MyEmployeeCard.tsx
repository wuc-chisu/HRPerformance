"use client";

import type { Employee } from "@/lib/employees";
import { formatCompactDate } from "@/lib/dateUtils";

type MyEmployeeCardProps = {
  employee: Employee;
};

export default function MyEmployeeCard({ employee }: MyEmployeeCardProps) {
  const officeScheduleSummary = employee.officeSchedule
    ? `${employee.officeSchedule.days.map((day) => day.slice(0, 3)).join(", ")} • ${employee.officeSchedule.startTime} - ${employee.officeSchedule.endTime}`
    : "Not set";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">My Employee Card</h2>
        <p className="mt-2 text-sm text-slate-600">
          Read-only view of your employee record.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-sm text-slate-500">Employee ID</p>
            <p className="font-semibold text-slate-900">{employee.id}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Name</p>
            <p className="font-semibold text-slate-900">{employee.name}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Work Email</p>
            <p className="font-semibold text-slate-900">{employee.email || "Not specified"}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Department</p>
            <p className="font-semibold text-slate-900">{employee.department}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Position</p>
            <p className="font-semibold text-slate-900">{employee.position}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Manager</p>
            <p className="font-semibold text-slate-900">{employee.manager || "Not assigned"}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Hire Date</p>
            <p className="font-semibold text-slate-900">{formatCompactDate(employee.joinDate)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">System Role</p>
            <p className="font-semibold text-slate-900">{employee.systemRole || "Employee"}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Work Location</p>
            <p className="font-semibold text-slate-900">{employee.staffWorkLocation || "USA"}</p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Office Schedule</p>
          <p className="font-semibold text-slate-900">{officeScheduleSummary}</p>
        </div>
      </div>
    </div>
  );
}