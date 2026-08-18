"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  Employee,
  HolidayRecord,
  TimeOffRequest,
  TimeOffStatus,
  TimeOffType,
} from "@/lib/employees";

const TIME_OFF_LABELS: Record<TimeOffType, string> = {
  PTO: "PTO",
  SICK_LEAVE: "Sick Leave",
  PERSONAL_LEAVE_UNPAID: "Personal Leave (Unpaid)",
  JURY_DUTY: "Jury Duty",
  MEDICAL_LEAVE: "Medical Leave",
};

const STATUS_STYLES: Record<TimeOffStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800 border border-amber-200",
  APPROVED: "bg-emerald-100 text-emerald-800 border border-emerald-200",
  REJECTED: "bg-rose-100 text-rose-800 border border-rose-200",
  CANCELLED: "bg-slate-100 text-slate-700 border border-slate-200",
};

function parseLocalDate(dateString: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (!match) return new Date(dateString);
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0);
}

function isFutureDate(dateString: string) {
  const date = parseLocalDate(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date > today;
}

type TimeOffManagerProps = {
  employees: Employee[];
  requests: TimeOffRequest[];
  holidays: HolidayRecord[];
  selectedYear: number;
  mode?: "admin" | "employee";
  onCreateRequest: (payload: {
    employeeId: string;
    requestType: TimeOffType;
    startDate: string;
    endDate: string;
    hours?: number | null;
    reason?: string;
  }) => Promise<void>;
  onUpdateRequest: (
    id: string,
    payload: { status?: TimeOffStatus; managerNote?: string }
  ) => Promise<void>;
  onDeleteRequest: (id: string) => Promise<void>;
  onCreateHoliday: (payload: {
    name: string;
    date: string;
    workLocation: "USA" | "Taiwan";
    isPaid: boolean;
    notes?: string;
  }) => Promise<void>;
  onDeleteHoliday: (id: string) => Promise<void>;
};

export default function TimeOffManager({
  employees,
  requests,
  holidays,
  selectedYear,
  mode = "admin",
  onCreateRequest,
  onUpdateRequest,
  onDeleteRequest,
  onCreateHoliday,
  onDeleteHoliday,
}: TimeOffManagerProps) {
  const isAdminMode = mode === "admin";
  const currentEmployee = employees[0] || null;

  const [requestForm, setRequestForm] = useState({
    employeeId: currentEmployee?.id || "",
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
  const [editingManagerNoteId, setEditingManagerNoteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [requestNotice, setRequestNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [holidayNotice, setHolidayNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [filterMode, setFilterMode] = useState<"all" | "month">("month");
  const [filterEmployeeId, setFilterEmployeeId] = useState("");
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(selectedYear);
  const [currentPage, setCurrentPage] = useState(1);
  const [showHolidayCalendar, setShowHolidayCalendar] = useState(false);
  const [holidayCalendarTab, setHolidayCalendarTab] = useState<"USA" | "Taiwan">("USA");

  useEffect(() => {
    if (!isAdminMode && currentEmployee) {
      setRequestForm((prev) => ({ ...prev, employeeId: currentEmployee.id }));
    }
  }, [currentEmployee, isAdminMode]);

  useEffect(() => {
    setHolidayForm((prev) => ({ ...prev, date: `${selectedYear}-01-01` }));
    setFilterYear(selectedYear);
  }, [selectedYear]);

  const sortedEmployees = useMemo(
    () => [...employees].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: "base" })),
    [employees]
  );

  const scopedRequests = useMemo(
    () => (isAdminMode ? requests : requests.filter((request) => request.employeeId === currentEmployee?.id)),
    [currentEmployee?.id, isAdminMode, requests]
  );

  const filteredRequests = useMemo(() => {
    return scopedRequests.filter((request) => {
      if (isAdminMode && filterEmployeeId && request.employeeId !== filterEmployeeId) {
        return false;
      }

      if (filterMode === "month") {
        const monthStart = new Date(filterYear, filterMonth - 1, 1);
        const monthEnd = new Date(filterYear, filterMonth, 0, 23, 59, 59, 999);
        const requestStart = parseLocalDate(request.startDate);
        const requestEnd = parseLocalDate(request.endDate);
        if (requestStart > monthEnd || requestEnd < monthStart) {
          return false;
        }
      }

      return true;
    });
  }, [filterEmployeeId, filterMode, filterMonth, filterYear, isAdminMode, scopedRequests]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / 5));
  const paginatedRequests = useMemo(() => {
    const startIndex = (currentPage - 1) * 5;
    return filteredRequests.slice(startIndex, startIndex + 5);
  }, [currentPage, filteredRequests]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterEmployeeId, filterMode, filterMonth, filterYear]);

  const filteredHolidays = useMemo(
    () => holidays.filter((holiday) => holiday.year === selectedYear).sort((a, b) => a.date.localeCompare(b.date)),
    [holidays, selectedYear]
  );

  const visibleHolidays = useMemo(
    () => filteredHolidays.filter((holiday) => holiday.workLocation === holidayCalendarTab),
    [filteredHolidays, holidayCalendarTab]
  );

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
      setRequestForm((prev) => ({ ...prev, startDate: "", endDate: "", hours: "", reason: "" }));
      setRequestNotice({ type: "success", message: "Time off request submitted successfully!" });
    } catch (error) {
      setRequestNotice({ type: "error", message: error instanceof Error ? error.message : "Failed to submit request." });
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
      setHolidayForm({ name: "", date: `${selectedYear}-01-01`, workLocation: "USA", isPaid: true, notes: "" });
      setHolidayNotice({ type: "success", message: "Holiday added successfully!" });
    } catch (error) {
      setHolidayNotice({ type: "error", message: error instanceof Error ? error.message : "Failed to add holiday." });
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
            Employee View stays scoped to the signed-in employee&apos;s own requests. Admin View can manage all requests.
          </p>
          <form onSubmit={submitRequest} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Employee</label>
              {isAdminMode ? (
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
              ) : (
                <input
                  type="text"
                  readOnly
                  value={currentEmployee ? `${currentEmployee.name} (${currentEmployee.id})` : "Current employee"}
                  className="w-full px-4 py-2 border border-emerald-200 rounded-lg bg-slate-50 text-gray-700"
                />
              )}
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
              <div className={`px-4 py-3 rounded-lg text-sm font-medium ${requestNotice.type === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-rose-50 border border-rose-200 text-rose-800"}`}>
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

        {isAdminMode && (
          <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Holiday Calendar</h2>
            <p className="text-sm text-gray-600 mb-6">Admin-only holiday maintenance for {selectedYear}.</p>
            <form onSubmit={submitHoliday} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Holiday Name</label>
                <input
                  type="text"
                  value={holidayForm.name}
                  onChange={(e) => setHolidayForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-amber-200 rounded-lg bg-white text-gray-900"
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
                <div className={`px-4 py-3 rounded-lg text-sm font-medium ${holidayNotice.type === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-rose-50 border border-rose-200 text-rose-800"}`}>
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

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => setShowHolidayCalendar((prev) => !prev)}
                className="w-full px-4 py-2 rounded-lg bg-amber-100 text-amber-700 text-sm font-semibold hover:bg-amber-200 border border-amber-200"
              >
                {showHolidayCalendar ? "Hide Calendar" : "View Full Calendar"}
              </button>

              {showHolidayCalendar && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => setHolidayCalendarTab("USA")}
                      className={`px-4 py-2 rounded-lg font-semibold ${holidayCalendarTab === "USA" ? "bg-amber-500 text-white" : "bg-white text-slate-700 border border-slate-200"}`}
                    >
                      USA Holidays
                    </button>
                    <button
                      type="button"
                      onClick={() => setHolidayCalendarTab("Taiwan")}
                      className={`px-4 py-2 rounded-lg font-semibold ${holidayCalendarTab === "Taiwan" ? "bg-amber-500 text-white" : "bg-white text-slate-700 border border-slate-200"}`}
                    >
                      Taiwan Holidays
                    </button>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {visibleHolidays.length === 0 ? (
                      <p className="text-sm text-slate-500">No holidays for {selectedYear}.</p>
                    ) : (
                      visibleHolidays.map((holiday) => (
                        <div key={holiday.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3">
                          <div>
                            <p className="font-semibold text-slate-900">{holiday.name}</p>
                            <p className="text-sm text-slate-600">{holiday.date} {holiday.isPaid ? "• Paid" : "• Unpaid"}</p>
                          </div>
                          <button
                            type="button"
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
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Time Off Tracking</h2>
            <p className="text-sm text-gray-500 mt-1">Employee View shows only your own requests.</p>
          </div>
          <span className="shrink-0 text-sm font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            {filteredRequests.length} record{filteredRequests.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl mb-6">
          {isAdminMode && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Employee</label>
              <select
                value={filterEmployeeId}
                onChange={(e) => setFilterEmployeeId(e.target.value)}
                className="text-sm px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-gray-800"
              >
                <option value="">All Employees</option>
                {sortedEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-1 p-1 bg-white border border-slate-200 rounded-lg">
            <button type="button" onClick={() => setFilterMode("all")} className={`px-3 py-1 rounded-md text-sm font-semibold ${filterMode === "all" ? "bg-slate-700 text-white" : "text-slate-500"}`}>
              Show All
            </button>
            <button type="button" onClick={() => setFilterMode("month")} className={`px-3 py-1 rounded-md text-sm font-semibold ${filterMode === "month" ? "bg-slate-700 text-white" : "text-slate-500"}`}>
              By Month
            </button>
          </div>

          {filterMode === "month" && (
            <div className="flex items-center gap-2">
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(Number(e.target.value))}
                className="text-sm px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-gray-800"
              >
                {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(Number(e.target.value))}
                className="text-sm px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-gray-800"
              >
                {[selectedYear - 1, selectedYear, selectedYear + 1].map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {filteredRequests.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <p className="text-sm font-medium">No time-off records match the current filters.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedRequests.map((request) => (
              (() => {
                const canEmployeeDelete =
                  !isAdminMode &&
                  Boolean(currentEmployee) &&
                  request.employeeId === currentEmployee?.id &&
                  request.status === "PENDING" &&
                  isFutureDate(request.startDate);

                return (
              <div key={request.id} className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-lg font-semibold text-gray-900">{request.employeeName}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${STATUS_STYLES[request.status]}`}>{request.status}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {TIME_OFF_LABELS[request.requestType]} • {request.startDate} to {request.endDate}
                      {request.hours ? ` • ${request.hours} hours` : ""}
                    </p>
                    <p className="text-sm text-gray-500">{request.department || ""} • Submitted {request.createdAt.slice(0, 10)}</p>
                    {request.reason ? <p className="text-sm text-gray-700 mt-2">{request.reason}</p> : null}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {isAdminMode ? (
                      <>
                        <button type="button" onClick={() => onUpdateRequest(request.id, { status: "APPROVED", managerNote: managerNotes[request.id] ?? request.managerNote ?? "" })} disabled={request.status === "APPROVED"} className="px-3 py-2 rounded-lg bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 disabled:opacity-50">
                          Approve
                        </button>
                        <button type="button" onClick={() => onUpdateRequest(request.id, { status: "REJECTED", managerNote: managerNotes[request.id] ?? request.managerNote ?? "" })} disabled={request.status === "APPROVED"} className="px-3 py-2 rounded-lg bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 disabled:opacity-50">
                          Reject
                        </button>
                        <button type="button" onClick={() => onDeleteRequest(request.id)} className="px-3 py-2 rounded-lg bg-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-300">
                          Delete
                        </button>
                        <button type="button" onClick={() => setEditingManagerNoteId(request.id)} className="px-3 py-2 rounded-lg bg-indigo-100 text-indigo-700 text-sm font-semibold hover:bg-indigo-200">
                          Note
                        </button>
                      </>
                    ) : canEmployeeDelete ? (
                      <button type="button" onClick={() => onDeleteRequest(request.id)} className="px-3 py-2 rounded-lg bg-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-300">
                        Delete
                      </button>
                    ) : null}
                  </div>
                </div>

                {isAdminMode && editingManagerNoteId === request.id ? (
                  <div className="mt-4 border border-slate-200 rounded-xl bg-white p-3">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Manager Note</label>
                    <textarea
                      rows={2}
                      value={managerNotes[request.id] ?? ""}
                      onChange={(e) => setManagerNotes((prev) => ({ ...prev, [request.id]: e.target.value }))}
                      className="w-full px-4 py-2 border border-slate-200 rounded-lg bg-white text-gray-900"
                    />
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await onUpdateRequest(request.id, { managerNote: managerNotes[request.id] ?? "" });
                          setEditingManagerNoteId(null);
                        }}
                        className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
                      >
                        Save Note
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingManagerNoteId(null)}
                        className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
                );
              })()
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 disabled:opacity-50"
                >
                  ← Previous
                </button>
                <span className="text-sm text-slate-500">Page {currentPage} of {totalPages}</span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 disabled:opacity-50"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}