"use client";

import { useEffect, useMemo, useState } from "react";
import { Employee, ProfessionalDevelopmentRecord } from "@/lib/employees";

interface ProfessionalDevelopmentManagerProps {
  employees: Employee[];
  onSaveRecords: (
    employeeId: string,
    records: ProfessionalDevelopmentRecord[]
  ) => Promise<void>;
}

function buildRecordId() {
  return `pd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ProfessionalDevelopmentManager({
  employees,
  onSaveRecords,
}: ProfessionalDevelopmentManagerProps) {
  const sortedEmployees = useMemo(
    () =>
      [...employees].sort((a, b) =>
        a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: "base" })
      ),
    [employees]
  );

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    sortedEmployees[0]?.id || ""
  );
  const [records, setRecords] = useState<ProfessionalDevelopmentRecord[]>([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [hours, setHours] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!sortedEmployees.length) {
      setSelectedEmployeeId("");
      return;
    }

    if (!selectedEmployeeId || !sortedEmployees.some((employee) => employee.id === selectedEmployeeId)) {
      setSelectedEmployeeId(sortedEmployees[0].id);
    }
  }, [sortedEmployees, selectedEmployeeId]);

  useEffect(() => {
    const employee = sortedEmployees.find((item) => item.id === selectedEmployeeId);
    setRecords(employee?.professionalDevelopmentRecords || []);
    setNotice(null);
  }, [selectedEmployeeId, sortedEmployees]);

  const selectedEmployee = sortedEmployees.find((employee) => employee.id === selectedEmployeeId) || null;

  const sortedRecords = useMemo(
    () =>
      [...records].sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return a.title.localeCompare(b.title);
      }),
    [records]
  );

  const totalHours = useMemo(
    () => records.reduce((total, record) => total + Number(record.hours || 0), 0),
    [records]
  );

  const addRecord = () => {
    const normalizedTitle = title.trim();
    const numericHours = Number(hours);

    if (!normalizedTitle || !date || !Number.isFinite(numericHours) || numericHours <= 0) {
      setNotice({ type: "error", message: "Please enter a title, date, and valid hours greater than 0." });
      return;
    }

    const nextRecord: ProfessionalDevelopmentRecord = {
      id: buildRecordId(),
      title: normalizedTitle,
      date,
      hours: numericHours,
      createdAt: new Date().toISOString(),
    };

    setRecords((prev) => [...prev, nextRecord]);
    setTitle("");
    setDate("");
    setHours("");
    setNotice(null);
  };

  const removeRecord = (recordId: string) => {
    setRecords((prev) => prev.filter((record) => record.id !== recordId));
    setNotice(null);
  };

  const saveRecords = async () => {
    if (!selectedEmployeeId) {
      setNotice({ type: "error", message: "Please select an employee first." });
      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      await onSaveRecords(selectedEmployeeId, records);
      setNotice({ type: "success", message: "Professional development records saved." });
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to save records.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Annual Professional Development</h2>
        <p className="text-gray-600">
          Record PD training title, date, and completed hours for each employee.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Employee</label>
          <select
            value={selectedEmployeeId}
            onChange={(event) => setSelectedEmployeeId(event.target.value)}
            className="w-full md:w-96 px-4 py-2 border border-blue-300 rounded-lg bg-blue-50 text-gray-900"
          >
            {sortedEmployees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name} ({employee.id})
              </option>
            ))}
          </select>
        </div>

        {selectedEmployee && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
            <div className="font-semibold">{selectedEmployee.name} ({selectedEmployee.id})</div>
            <div className="mt-1">Total PD records: {records.length} • Total hours: {totalHours.toFixed(2)}</div>
          </div>
        )}

        <div className="border border-gray-200 rounded-lg p-4 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Add PD Training Record</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Training Title</label>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g., FERPA Refresher"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hours</label>
              <input
                type="number"
                min="0"
                step="0.25"
                value={hours}
                onChange={(event) => setHours(event.target.value)}
                placeholder="e.g., 2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <div>
            <button
              onClick={addRecord}
              type="button"
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Add Record
            </button>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">PD Training History</h3>
          </div>
          {sortedRecords.length === 0 ? (
            <div className="p-6 text-gray-600 text-sm">No professional development records yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Title</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Hours</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-900">{record.title}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{record.date}</td>
                      <td className="px-4 py-2 text-sm text-gray-700">{record.hours}</td>
                      <td className="px-4 py-2 text-sm">
                        <button
                          type="button"
                          onClick={() => removeRecord(record.id)}
                          className="bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200 transition-colors"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {notice && (
          <div
            className={`rounded-lg border px-4 py-3 text-sm ${
              notice.type === "success"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-rose-50 text-rose-700 border-rose-200"
            }`}
          >
            {notice.message}
          </div>
        )}

        <div>
          <button
            onClick={saveRecords}
            type="button"
            disabled={saving || !selectedEmployeeId}
            className="bg-emerald-500 text-white font-semibold px-5 py-2 rounded-lg hover:bg-emerald-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? "Saving..." : "Save Professional Development Records"}
          </button>
        </div>
      </div>
    </div>
  );
}
