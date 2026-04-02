"use client";

import { useMemo, useState } from "react";
import { Employee, HolidayRecord, TimeOffRequest, TimeOffStatus, TimeOffType } from "@/lib/employees";

const TIME_OFF_LABELS: Record<TimeOffType, string> = {
  PTO: "PTO",
  SICK_LEAVE: "Sick Leave",
  PERSONAL_LEAVE_UNPAID: "Personal Leave (Unpaid)",
  JURY_DUTY: "Jury Duty",
  MEDICAL_LEAVE: "Medical Leave",
};

const STATUS_COLORS: Record<TimeOffStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800 border border-amber-200",
  APPROVED: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  REJECTED: "bg-rose-100 text-rose-800 border border-rose-200",
  CANCELLED: "bg-slate-100 text-slate-700 border border-slate-200",
};

interface TimeOffManagerProps {
  employees: Employee[];
  requests: TimeOffRequest[];
  holidays: HolidayRecord[];
  selectedYear: number;
  onCreateRequest: (payload: {
    employeeId: string;
    requestType: TimeOffType;
    startDate: string;
    endDate: string;
    hours?: number | null;
    reason?: string;
  }) => Promise<void>;
  onUpdateRequest: (id: string, payload: { status?: TimeOffStatus; managerNote?: string }) => Promise<void>;
  onDeleteRequest: (id: string) => Promise<void>;
  onCreateHoliday: (payload: {
    name: string;
    date: string;
    workLocation: "USA" | "Taiwan";
    isPaid: boolean;
    notes?: string;
  }) => Promise<void>;
  onDeleteHoliday: (id: string) => Promise<void>;
}

export default function TimeOffManager({
  employees,
  requests,
  holidays,
  selectedYear,
  onCreateRequest,
  onUpdateRequest,
  onDeleteRequest,
  onCreateHoliday,
  onDeleteHoliday,
}: TimeOffManagerProps) {
  const [requestForm, setRequestForm] = useState({
    employeeId: employees[0]?.id || "",
    requestType: "PTO" as TimeOffType,
    startDate: "",
    endDate: "",
    hours: "",
    reason: "",
  });
  const [holidayForm, setHolidayForm] = useState({
    name: "",
    date: `${selectedYear}-01-01`,
    workLocation: "USA" as "USA" | "Taiwan",
    isPaid: true,
    notes: "",
  });
  const [managerNotes, setManagerNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [requestNotice, setRequestNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [holidayNotice, setHolidayNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [filterEmployeeId, setFilterEmployeeId] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "month">("month");
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  const sortedEmployees = useMemo(
    () => [...employees].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: "base" })),
    [employees]
  );

  const filteredHolidays = useMemo(
    () => holidays.filter((holiday) => holiday.year === selectedYear).sort((a, b) => a.date.localeCompare(b.date)),
    [holidays, selectedYear]
  );

  const sortedRequests = useMemo(
    () => [...requests].sort((a, b) => `${b.startDate}-${b.createdAt}`.localeCompare(`${a.startDate}-${a.createdAt}`)),
    [requests]
  );

  const availableYears = useMemo(() => {
    const years = new Set<number>([new Date().getFullYear()]);
    requests.forEach((r) => {
      years.add(new Date(r.startDate).getFullYear());
      years.add(new Date(r.endDate).getFullYear());
    });
    return [...years].sort((a, b) => b - a);
  }, [requests]);

  const filteredRequests = useMemo(() => {
    return sortedRequests.filter((request) => {
      if (filterEmployeeId && request.employeeId !== filterEmployeeId) return false;
      if (filterMode === "month") {
        const monthStart = new Date(filterYear, filterMonth - 1, 1);
        const monthEnd = new Date(filterYear, filterMonth, 0);
        const reqStart = new Date(request.startDate);
        const reqEnd = new Date(request.endDate);
        if (reqStart > monthEnd || reqEnd < monthStart) return false;
      }
      return true;
    });
  }, [sortedRequests, filterEmployeeId, filterMode, filterMonth, filterYear]);

  const submitRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!requestForm.employeeId || !requestForm.startDate || !requestForm.endDate) {
      setRequestNotice({ type: "error", message: "Employee, start date, and end date are required." });
      return;
    }

    setSaving(true);
    setRequestNotice(null);
    try {
      await onCreateRequest({
        employeeId: requestForm.employeeId,
        requestType: requestForm.requestType,
        startDate: requestForm.startDate,
        endDate: requestForm.endDate,
        hours: requestForm.hours ? Number(requestForm.hours) : null,
        reason: requestForm.reason || undefined,
      });
      setRequestForm((prev) => ({
        ...prev,
        startDate: "",
        endDate: "",
        hours: "",
        reason: "",
      }));
      setFilterMode("all");
      setRequestNotice({ type: "success", message: "Time off request submitted successfully!" });
    } catch (err) {
      setRequestNotice({ type: "error", message: err instanceof Error ? err.message : "Failed to submit request. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const submitHoliday = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!holidayForm.name || !holidayForm.date) {
      setHolidayNotice({ type: "error", message: "Holiday name and date are required." });
      return;
    }

    setSaving(true);
    setHolidayNotice(null);
    try {
      await onCreateHoliday({
        name: holidayForm.name,
        date: holidayForm.date,
        workLocation: holidayForm.workLocation,
        isPaid: holidayForm.isPaid,
        notes: holidayForm.notes || undefined,
      });
      setHolidayForm({
        name: "",
        date: `${selectedYear}-01-01`,
        workLocation: "USA",
        isPaid: true,
        notes: "",
      });
      setHolidayNotice({ type: "success", message: "Holiday added successfully!" });
    } catch (err) {
      setHolidayNotice({ type: "error", message: err instanceof Error ? err.message : "Failed to add holiday. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Time Off Request</h2>
          <p className="text-sm text-gray-600 mb-6">
            Step 1: employee submits a request with total time-off hours. Step 2: the direct manager approves it, and approved hours are deducted from the overlapping weekly planned hours.
          </p>
          <form onSubmit={submitRequest} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Employee</label>
              <select
                value={requestForm.employeeId}
                onChange={(e) => setRequestForm((prev) => ({ ...prev, employeeId: e.target.value }))}
                className="w-full px-4 py-2 border border-emerald-200 rounded-lg bg-emerald-50 text-gray-900"
              >
                <option value="">Select employee...</option>
                {sortedEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name} ({employee.id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Leave Type</label>
              <select
                value={requestForm.requestType}
                onChange={(e) => setRequestForm((prev) => ({ ...prev, requestType: e.target.value as TimeOffType }))}
                className="w-full px-4 py-2 border border-emerald-200 rounded-lg bg-emerald-50 text-gray-900"
              >
                {Object.entries(TIME_OFF_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={requestForm.startDate}
                  onChange={(e) => setRequestForm((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-4 py-2 border border-emerald-200 rounded-lg bg-white text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={requestForm.endDate}
                  onChange={(e) => setRequestForm((prev) => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-4 py-2 border border-emerald-200 rounded-lg bg-white text-gray-900"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Hours</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={requestForm.hours}
                onChange={(e) => setRequestForm((prev) => ({ ...prev, hours: e.target.value }))}
                className="w-full px-4 py-2 border border-emerald-200 rounded-lg bg-white text-gray-900"
                placeholder="Example: 8"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Reason</label>
              <textarea
                value={requestForm.reason}
                onChange={(e) => setRequestForm((prev) => ({ ...prev, reason: e.target.value }))}
                rows={3}
                className="w-full px-4 py-2 border border-emerald-200 rounded-lg bg-white text-gray-900"
              />
            </div>
            {requestNotice && (
              <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
                requestNotice.type === "success"
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border border-rose-200 text-rose-800"
              }`}>
                {requestNotice.message}
              </div>
            )}
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 disabled:opacity-50"
            >
              {saving ? "Submitting..." : "Submit Request"}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Holiday Calendar</h2>
          <p className="text-sm text-gray-600 mb-6">
            Enter official holiday days for {selectedYear}. These will be stored year by year.
          </p>
          <form onSubmit={submitHoliday} className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Holiday Name</label>
              <input
                type="text"
                value={holidayForm.name}
                onChange={(e) => setHolidayForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-2 border border-amber-200 rounded-lg bg-white text-gray-900"
                placeholder="Example: Independence Day"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Date</label>
              <input
                type="date"
                value={holidayForm.date}
                onChange={(e) => setHolidayForm((prev) => ({ ...prev, date: e.target.value }))}
                className="w-full px-4 py-2 border border-amber-200 rounded-lg bg-white text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Holiday Location</label>
              <select
                value={holidayForm.workLocation}
                onChange={(e) => setHolidayForm((prev) => ({ ...prev, workLocation: e.target.value as "USA" | "Taiwan" }))}
                className="w-full px-4 py-2 border border-amber-200 rounded-lg bg-white text-gray-900"
              >
                <option value="USA">USA</option>
                <option value="Taiwan">Taiwan</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">Mapped by employee work location for holiday calculations.</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                id="isPaidHoliday"
                type="checkbox"
                checked={holidayForm.isPaid}
                onChange={(e) => setHolidayForm((prev) => ({ ...prev, isPaid: e.target.checked }))}
                className="h-4 w-4 rounded border-amber-300"
              />
              <label htmlFor="isPaidHoliday" className="text-sm font-medium text-gray-700">
                Paid holiday
              </label>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
              <textarea
                value={holidayForm.notes}
                onChange={(e) => setHolidayForm((prev) => ({ ...prev, notes: e.target.value }))}
                rows={2}
                className="w-full px-4 py-2 border border-amber-200 rounded-lg bg-white text-gray-900"
              />
            </div>
            {holidayNotice && (
              <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
                holidayNotice.type === "success"
                  ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border border-rose-200 text-rose-800"
              }`}>
                {holidayNotice.message}
              </div>
            )}
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600 disabled:opacity-50"
            >
              {saving ? "Adding..." : "Add Holiday"}
            </button>
          </form>

          <div className="space-y-3 max-h-90 overflow-y-auto pr-1">
            {filteredHolidays.length === 0 ? (
              <p className="text-sm text-gray-500">No holidays entered for {selectedYear} yet.</p>
            ) : (
              filteredHolidays.map((holiday) => (
                <div key={holiday.id} className="flex items-start justify-between gap-4 border border-amber-100 rounded-xl p-3 bg-amber-50/60">
                  <div>
                    <p className="font-semibold text-gray-900">{holiday.name}</p>
                    <p className="text-sm text-gray-600">{holiday.date} • {holiday.workLocation} {holiday.isPaid ? "• Paid" : "• Unpaid"}</p>
                    {holiday.notes ? <p className="text-sm text-gray-500 mt-1">{holiday.notes}</p> : null}
                  </div>
                  <button
                    onClick={() => onDeleteHoliday(holiday.id)}
                    className="text-sm font-semibold text-rose-600 hover:text-rose-700"
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Time Off Tracking</h2>
            <p className="text-sm text-gray-500 mt-1">
              Step 1: request submitted. Step 2: direct manager approves — approved hours are deducted from overlapping weekly planned hours exactly once.
            </p>
          </div>
          <span className="shrink-0 text-sm font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {filteredRequests.length} record{filteredRequests.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 mt-4 mb-6 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          {/* Employee picker */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Employee</label>
            <select
              value={filterEmployeeId}
              onChange={(e) => setFilterEmployeeId(e.target.value)}
              className="text-sm px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <option value="">All Employees</option>
              {sortedEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}
                </option>
              ))}
            </select>
          </div>

          <div className="hidden sm:block h-6 w-px bg-slate-300" />

          {/* Mode tabs */}
          <div className="flex gap-1 p-1 bg-white border border-slate-200 rounded-lg">
            <button
              onClick={() => setFilterMode("all")}
              className={`px-3 py-1 rounded-md text-sm font-semibold transition-colors ${
                filterMode === "all"
                  ? "bg-slate-700 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Show All
            </button>
            <button
              onClick={() => setFilterMode("month")}
              className={`px-3 py-1 rounded-md text-sm font-semibold transition-colors ${
                filterMode === "month"
                  ? "bg-slate-700 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              By Month
            </button>
          </div>

          {/* Month / Year pickers */}
          {filterMode === "month" && (
            <div className="flex items-center gap-2">
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(Number(e.target.value))}
                className="text-sm px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                {["January","February","March","April","May","June","July","August","September","October","November","December"].map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>{name}</option>
                ))}
              </select>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(Number(e.target.value))}
                className="text-sm px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-sm font-medium">No time-off records match the current filters.</p>
            </div>
          ) : (
            filteredRequests.map((request) => (
              <div key={request.id} className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-lg font-semibold text-gray-900">{request.employeeName}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[request.status]}`}>
                        {request.status}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
                        Step 1: Requested
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${request.status === "APPROVED" ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600 border border-slate-200"}`}>
                        Step 2: {request.status === "APPROVED" ? "Direct Manager Approved" : "Pending Manager Approval"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {TIME_OFF_LABELS[request.requestType]} • {request.startDate} to {request.endDate}
                      {request.hours ? ` • ${request.hours} hours` : ""}
                    </p>
                    <p className="text-sm text-gray-500">{request.department || ""} • Submitted {request.createdAt.slice(0, 10)}</p>
                    {request.plannedHoursAdjustedAt ? (
                      <p className="text-sm text-emerald-700 font-medium">
                        Planned work hours adjusted on {request.plannedHoursAdjustedAt.slice(0, 10)}.
                      </p>
                    ) : request.status === "APPROVED" ? (
                      <p className="text-sm text-amber-700 font-medium">
                        Approved. Planned work hours will be deducted after the matching weekly record is added.
                      </p>
                    ) : null}
                    {request.reason ? <p className="text-sm text-gray-700 mt-2">{request.reason}</p> : null}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => onUpdateRequest(request.id, { status: "APPROVED", managerNote: managerNotes[request.id] ?? request.managerNote ?? "" })}
                      disabled={request.status === "APPROVED"}
                      className="px-3 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Direct Manager Approve
                    </button>
                    <button
                      onClick={() => onUpdateRequest(request.id, { status: "REJECTED", managerNote: managerNotes[request.id] ?? request.managerNote ?? "" })}
                      disabled={request.status === "APPROVED"}
                      className="px-3 py-2 rounded-lg bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => onDeleteRequest(request.id)}
                      className="px-3 py-2 rounded-lg bg-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Manager Note</label>
                  <textarea
                    rows={2}
                    value={managerNotes[request.id] ?? request.managerNote ?? ""}
                    onChange={(e) => setManagerNotes((prev) => ({ ...prev, [request.id]: e.target.value }))}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white text-gray-900"
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
