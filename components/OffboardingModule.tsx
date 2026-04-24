"use client";

import { useEffect, useMemo, useState } from "react";
import { Employee } from "@/lib/employees";

interface OffboardingModuleProps {
  employees: Employee[];
  onRecordsChanged?: () => Promise<void> | void;
}

type OffboardingRecordSummary = {
  employeeId: string;
  completionPercent: number;
  separationType: string;
  updatedAt: string;
  lastWorkingDate?: string | null;
  step8?: Record<string, boolean>;
};

const defaultStep1 = {
  receivedNotice: false,
  confirmedLastWorkingDate: false,
  preparedExitAgreement: false,
  preparedFinalPayrollCalculation: false,
};

const defaultStep2 = {
  notifyDirectManager: false,
  notifyIT: false,
  notifyPayroll: false,
  notifyLeadership: false,
};

const defaultStep3 = {
  disableGmail: false,
  disableGoogleDrive: false,
  disableGoogleAdmin: false,
  disableMoodle: false,
  disableGoogleClassroom: false,
  disableClickUp: false,
  disableVpnRemoteAccess: false,
  disableOtherSystems: false,
  transferDriveOwnership: false,
  disableEmailLogin: false,
};

const defaultStep4 = {
  returnLaptopCharger: false,
  returnIdBadge: false,
  returnKeys: false,
  returnOfficeEquipment: false,
  returnDocuments: false,
  signedPropertyChecklist: false,
};

const defaultStep5 = {
  reassignClickUpTasks: false,
  documentIncompleteWork: false,
  continuityConfirmed: false,
};

const defaultStep6 = {
  signedConfidentialityObligations: false,
  signedPropertyReturnClause: false,
  signedNoDataRetentionClause: false,
};

const defaultStep7 = {
  finalWagesIssued: false,
  accruedCompensationIncluded: false,
};

const defaultStep8 = {
  retainedExitAgreement: false,
  retainedPropertyChecklist: false,
  retainedAccessTerminationConfirmation: false,
  retainedPerformanceWarningRecords: false,
};

function matchesHRRole(employee: Employee) {
  const dept = employee.department || "";
  const position = employee.position || "";
  return /hr|human resources/i.test(dept) || /hr|human resources/i.test(position);
}

function matchesITRole(employee: Employee) {
  const dept = employee.department || "";
  return /information technology/i.test(dept);
}

export default function OffboardingModule({ employees, onRecordsChanged }: OffboardingModuleProps) {
  const sortedEmployees = useMemo(
    () =>
      [...employees].sort((a, b) =>
        a.id.localeCompare(b.id, undefined, {
          numeric: true,
          sensitivity: "base",
        })
      ),
    [employees]
  );

  const hrCandidates = useMemo(
    () => sortedEmployees.filter(matchesHRRole),
    [sortedEmployees]
  );

  const itCandidates = useMemo(
    () => sortedEmployees.filter(matchesITRole),
    [sortedEmployees]
  );

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [newOffboardEmployeeId, setNewOffboardEmployeeId] = useState<string>("");
  const [offboardingRecords, setOffboardingRecords] = useState<OffboardingRecordSummary[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [hrResponsible, setHrResponsible] = useState<string>("");
  const [itResponsible, setItResponsible] = useState<string>("");
  const [separationType, setSeparationType] = useState<"Resignation" | "Termination">("Resignation");
  const [noticeDate, setNoticeDate] = useState<string>("");
  const [lastWorkingDate, setLastWorkingDate] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [saveNotice, setSaveNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [confirmingOffboard, setConfirmingOffboard] = useState(false);
  const [deletingEmployeeId, setDeletingEmployeeId] = useState<string | null>(null);

  const [step1, setStep1] = useState(defaultStep1);

  const [step2, setStep2] = useState(defaultStep2);

  const [step3, setStep3] = useState(defaultStep3);

  const [step4, setStep4] = useState(defaultStep4);

  const [step5, setStep5] = useState(defaultStep5);

  const [step6, setStep6] = useState(defaultStep6);

  const [step7, setStep7] = useState(defaultStep7);

  const [step8, setStep8] = useState(defaultStep8);

  useEffect(() => {
    const loadOffboardingRecords = async () => {
      try {
        setLoadingRecords(true);
        const response = await fetch("/api/offboarding");
        if (!response.ok) throw new Error("Failed to load offboarding records");
        const data = await response.json();
        setOffboardingRecords(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load offboarding records:", error);
      } finally {
        setLoadingRecords(false);
      }
    };

    loadOffboardingRecords();
  }, []);

  const offboardedEmployeeIds = useMemo(
    () => new Set(offboardingRecords.map((record) => record.employeeId)),
    [offboardingRecords]
  );

  const activeEmployees = useMemo(
    () => sortedEmployees.filter((emp) => !offboardedEmployeeIds.has(emp.id)),
    [sortedEmployees, offboardedEmployeeIds]
  );

  useEffect(() => {
    if (activeEmployees.length === 0) {
      setNewOffboardEmployeeId("");
      return;
    }

    if (!newOffboardEmployeeId || !activeEmployees.some((emp) => emp.id === newOffboardEmployeeId)) {
      setNewOffboardEmployeeId(activeEmployees[0].id);
    }
  }, [activeEmployees, newOffboardEmployeeId]);

  useEffect(() => {
    if (!hrResponsible) {
      const firstHr = hrCandidates[0]?.name || sortedEmployees[0]?.name || "";
      setHrResponsible(firstHr);
    }
  }, [hrResponsible, hrCandidates, sortedEmployees]);

  useEffect(() => {
    if (!itResponsible) {
      const firstIt = itCandidates[0]?.name || "";
      setItResponsible(firstIt);
    }
  }, [itResponsible, itCandidates, sortedEmployees]);

  const selectedEmployee =
    sortedEmployees.find((emp) => emp.id === selectedEmployeeId) || null;

  const selectedRecord = useMemo(
    () => offboardingRecords.find((record) => record.employeeId === selectedEmployeeId) || null,
    [offboardingRecords, selectedEmployeeId]
  );

  const isConfirmedOffboard = Boolean(selectedRecord?.step8?.confirmedOffboard);

  const employeeNameById = useMemo(
    () => new Map(sortedEmployees.map((emp) => [emp.id, emp.name])),
    [sortedEmployees]
  );

  const firstHrName = hrCandidates[0]?.name || sortedEmployees[0]?.name || "";
  const firstItName = itCandidates[0]?.name || "";

  const resetForm = () => {
    setSeparationType("Resignation");
    setNoticeDate("");
    setLastWorkingDate("");
    setHrResponsible(firstHrName);
    setItResponsible(firstItName);
    setStep1(defaultStep1);
    setStep2(defaultStep2);
    setStep3(defaultStep3);
    setStep4(defaultStep4);
    setStep5(defaultStep5);
    setStep6(defaultStep6);
    setStep7(defaultStep7);
    setStep8(defaultStep8);
    setLastSavedAt(null);
  };

  useEffect(() => {
    if (!selectedEmployeeId) return;

    const loadRecord = async () => {
      try {
        setLoadingRecord(true);
        setSaveNotice(null);
        const response = await fetch(`/api/offboarding?employeeId=${encodeURIComponent(selectedEmployeeId)}`);
        if (!response.ok) throw new Error("Failed to load offboarding record");

        const record = await response.json();
        if (!record) {
          resetForm();
          return;
        }

        setSeparationType(record.separationType === "Termination" ? "Termination" : "Resignation");
        setNoticeDate(record.noticeDate ? String(record.noticeDate).split("T")[0] : "");
        setLastWorkingDate(record.lastWorkingDate ? String(record.lastWorkingDate).split("T")[0] : "");
        setHrResponsible(record.hrResponsible || firstHrName);
        setItResponsible(record.itResponsible || firstItName);
        setStep1({ ...defaultStep1, ...(record.step1 || {}) });
        setStep2({ ...defaultStep2, ...(record.step2 || {}) });
        setStep3({ ...defaultStep3, ...(record.step3 || {}) });
        setStep4({ ...defaultStep4, ...(record.step4 || {}) });
        setStep5({ ...defaultStep5, ...(record.step5 || {}) });
        setStep6({ ...defaultStep6, ...(record.step6 || {}) });
        setStep7({ ...defaultStep7, ...(record.step7 || {}) });
        setStep8({ ...defaultStep8, ...(record.step8 || {}) });
        setLastSavedAt(record.updatedAt || null);
      } catch (error) {
        console.error("Failed to load offboarding record:", error);
        setSaveNotice({ type: "error", message: "Failed to load offboarding record." });
      } finally {
        setLoadingRecord(false);
      }
    };

    loadRecord();
  }, [selectedEmployeeId, firstHrName, firstItName]);

  const handleSave = async () => {
    if (!selectedEmployeeId) return;

    try {
      setSaving(true);
      setSaveNotice(null);

      const response = await fetch("/api/offboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          separationType,
          noticeDate: noticeDate || null,
          lastWorkingDate: lastWorkingDate || null,
          hrResponsible,
          itResponsible,
          step1,
          step2,
          step3,
          step4,
          step5,
          step6,
          step7,
          step8,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save offboarding record");
      }

      const saved = await response.json();
      setLastSavedAt(saved.updatedAt || null);
      setSaveNotice({ type: "success", message: "Offboarding record saved successfully." });

      const recordsResponse = await fetch("/api/offboarding");
      if (recordsResponse.ok) {
        const data = await recordsResponse.json();
        setOffboardingRecords(Array.isArray(data) ? data : []);
      }

      await onRecordsChanged?.();

      setShowForm(false);
      setSelectedEmployeeId("");
    } catch (error) {
      console.error("Failed to save offboarding record:", error);
      setSaveNotice({ type: "error", message: error instanceof Error ? error.message : "Failed to save offboarding record." });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    if (!selectedEmployeeId) return;

    const formatChecklist = (title: string, data: Record<string, boolean>, labels: Record<string, string>) => {
      const rows = Object.entries(data)
        .map(([key, done]) => `<li><span class="status">${done ? "Done" : "Pending"}</span> ${labels[key] || key}</li>`)
        .join("");
      return `<section><h3>${title}</h3><ul>${rows}</ul></section>`;
    };

    const content = `
      <h1>Offboarding Process Record</h1>
      <p><strong>Employee:</strong> ${selectedEmployee?.name || ""} (${selectedEmployeeId})</p>
      <p><strong>Department:</strong> ${selectedEmployee?.department || "N/A"}</p>
      <p><strong>Direct Manager:</strong> ${selectedEmployee?.manager || "N/A"}</p>
      <p><strong>Separation Type:</strong> ${separationType}</p>
      <p><strong>Notice Date:</strong> ${noticeDate || "N/A"}</p>
      <p><strong>Last Working Date:</strong> ${lastWorkingDate || "N/A"}</p>
      <p><strong>HR Responsible:</strong> ${hrResponsible || "N/A"}</p>
      <p><strong>IT Responsible:</strong> ${itResponsible || "N/A"}</p>
      <p><strong>Completion:</strong> ${completion.completed}/${completion.total} (${completion.percentage}%)</p>
      <p><strong>Exported At:</strong> ${new Date().toLocaleString()}</p>

      ${formatChecklist("Step 1 - Separation Confirmation", step1, {
        receivedNotice: "Receive resignation or termination notice",
        confirmedLastWorkingDate: "Confirm last working date",
        preparedExitAgreement: "Prepare Exit Agreement",
        preparedFinalPayrollCalculation: "Prepare final payroll calculation",
      })}
      ${formatChecklist("Step 2 - Internal Notification", step2, {
        notifyDirectManager: "Notify Direct Manager",
        notifyIT: "Notify IT / System Administrator",
        notifyPayroll: "Notify Payroll",
        notifyLeadership: "Notify Leadership (if applicable)",
      })}
      ${formatChecklist("Step 3 - Access Suspension (CRITICAL)", step3, {
        disableGmail: "Disable Gmail",
        disableGoogleDrive: "Disable Google Drive",
        disableGoogleAdmin: "Disable Google Admin (if applicable)",
        disableMoodle: "Disable Moodle (LMS)",
        disableGoogleClassroom: "Disable Google Classroom",
        disableClickUp: "Disable ClickUp",
        disableVpnRemoteAccess: "Disable VPN / remote access",
        disableOtherSystems: "Disable internal / third-party systems",
        transferDriveOwnership: "Transfer file ownership (Google Drive)",
        disableEmailLogin: "Disable email login access",
      })}
      ${formatChecklist("Step 4 - Company Property Return", step4, {
        returnLaptopCharger: "Collect laptop / charger",
        returnIdBadge: "Collect ID badge",
        returnKeys: "Collect keys",
        returnOfficeEquipment: "Collect office equipment",
        returnDocuments: "Collect documents (physical or digital)",
        signedPropertyChecklist: "Employee signed Property Return Checklist",
      })}
      ${formatChecklist("Step 5 - Work Handover", step5, {
        reassignClickUpTasks: "Reassign ClickUp tasks",
        documentIncompleteWork: "Document incomplete work",
        continuityConfirmed: "Ensure continuity of operations",
      })}
      ${formatChecklist("Step 6 - Exit Agreement Execution", step6, {
        signedConfidentialityObligations: "Signed confidentiality obligations clause",
        signedPropertyReturnClause: "Signed property return clause",
        signedNoDataRetentionClause: "Signed no data retention clause",
      })}
      ${formatChecklist("Step 7 - Final Payroll", step7, {
        finalWagesIssued: "Issue final wages (California compliant)",
        accruedCompensationIncluded: "Include accrued compensation",
      })}
      ${formatChecklist("Step 8 - Documentation & Record Retention", step8, {
        retainedExitAgreement: "Maintain Exit Agreement",
        retainedPropertyChecklist: "Maintain Property Return Checklist",
        retainedAccessTerminationConfirmation: "Maintain access termination confirmation",
        retainedPerformanceWarningRecords: "Maintain performance / warning records",
      })}
    `;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setSaveNotice({ type: "error", message: "Unable to open print window. Please allow pop-ups and try again." });
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${selectedEmployeeId}_offboarding</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
            h1 { margin-bottom: 12px; }
            h3 { margin-top: 22px; margin-bottom: 8px; border-top: 1px solid #e5e7eb; padding-top: 12px; }
            p { margin: 4px 0; }
            ul { margin: 0; padding-left: 20px; }
            li { margin: 4px 0; }
            .status { display: inline-block; min-width: 58px; font-weight: 700; color: #374151; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    setSaveNotice({ type: "success", message: "PDF export started. Choose 'Save as PDF' in the print dialog." });
  };

  const completion = useMemo(() => {
    const checks = [
      ...Object.values(step1),
      ...Object.values(step2),
      ...Object.values(step3),
      ...Object.values(step4),
      ...Object.values(step5),
      ...Object.values(step6),
      ...Object.values(step7),
      ...Object.values(step8),
    ];
    const completed = checks.filter(Boolean).length;
    const total = checks.length;
    return { completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [step1, step2, step3, step4, step5, step6, step7, step8]);

  const handleStartOffboarding = () => {
    if (!newOffboardEmployeeId) return;
    setSelectedEmployeeId(newOffboardEmployeeId);
    setShowForm(true);
    setSaveNotice(null);
  };

  const handleOpenOffboardRecord = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setShowForm(true);
    setSaveNotice(null);
  };

  const handleDeleteOffboardRecord = async (employeeId: string) => {
    const ok = window.confirm("Delete this offboarding record? This cannot be undone.");
    if (!ok) return;

    try {
      setDeletingEmployeeId(employeeId);
      setSaveNotice(null);
      const response = await fetch(`/api/offboarding?employeeId=${encodeURIComponent(employeeId)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete offboarding record");
      }

      setOffboardingRecords((prev) => prev.filter((record) => record.employeeId !== employeeId));

      if (selectedEmployeeId === employeeId) {
        setShowForm(false);
        setSelectedEmployeeId("");
      }

      await onRecordsChanged?.();
      setSaveNotice({ type: "success", message: "Offboarding record deleted." });
    } catch (error) {
      console.error("Failed to delete offboarding record:", error);
      setSaveNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to delete offboarding record.",
      });
    } finally {
      setDeletingEmployeeId(null);
    }
  };

  const handleConfirmOffboard = async () => {
    if (!selectedEmployeeId) return;

    try {
      setConfirmingOffboard(true);
      setSaveNotice(null);

      const response = await fetch("/api/offboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          confirmedOffboard: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to confirm offboarding");
      }

      const recordsResponse = await fetch("/api/offboarding");
      if (recordsResponse.ok) {
        const data = await recordsResponse.json();
        setOffboardingRecords(Array.isArray(data) ? data : []);
      }

      await onRecordsChanged?.();
      setSaveNotice({ type: "success", message: "Employee confirmed off board and disabled from other modules." });
      setShowForm(false);
      setSelectedEmployeeId("");
    } catch (error) {
      console.error("Failed to confirm offboarding:", error);
      setSaveNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to confirm offboarding.",
      });
    } finally {
      setConfirmingOffboard(false);
    }
  };

  const handleBackToList = () => {
    setShowForm(false);
    setSelectedEmployeeId("");
    setSaveNotice(null);
    setLastSavedAt(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-rose-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Offboarding Process</h2>
            <p className="text-sm text-gray-600 mt-1">
              Structured 8-step offboarding checklist to ensure legal compliance, system security, and complete handover.
            </p>
          </div>
          {showForm && (
            <div className="px-4 py-2 rounded-lg bg-rose-50 border border-rose-200">
              <p className="text-sm font-semibold text-rose-700">Completion</p>
              <p className="text-lg font-bold text-rose-800">{completion.completed}/{completion.total} ({completion.percentage}%)</p>
            </div>
          )}
        </div>

        {!showForm && (
          <div className="mt-6 grid grid-cols-1 xl:grid-cols-5 gap-6">
            <div className="xl:col-span-2 rounded-xl border border-cyan-200 bg-cyan-50 p-5">
              <h3 className="text-lg font-bold text-cyan-900">Add Offboard Employee</h3>
              <p className="text-sm text-cyan-800 mt-1">
                Start a new offboarding record for an active employee.
              </p>

              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Active Employee</label>
                <select
                  value={newOffboardEmployeeId}
                  onChange={(e) => setNewOffboardEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-cyan-300 bg-white"
                  disabled={activeEmployees.length === 0}
                >
                  {activeEmployees.length === 0 && (
                    <option value="">No active employee available</option>
                  )}
                  {activeEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.id})
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleStartOffboarding}
                disabled={!newOffboardEmployeeId}
                className="mt-4 w-full px-4 py-2.5 rounded-lg bg-cyan-600 text-white font-semibold hover:bg-cyan-700 disabled:opacity-50"
              >
                Add Offboard Employee
              </button>

              <p className="mt-3 text-xs text-cyan-900/80">
                Default selection always points to an employee without an existing offboarding record.
              </p>
            </div>

            <div className="xl:col-span-3 rounded-xl border border-slate-200 p-5">
              <h3 className="text-lg font-bold text-gray-900">Offboard List</h3>
              <p className="text-sm text-gray-600 mt-1">Saved offboarding records</p>

              {loadingRecords ? (
                <p className="mt-4 text-sm text-gray-500">Loading offboarding records...</p>
              ) : offboardingRecords.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500">No offboarding records yet.</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {offboardingRecords.map((record) => (
                    <div
                      key={record.employeeId}
                      className="rounded-lg border border-slate-200 px-4 py-3"
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {employeeNameById.get(record.employeeId) || record.employeeId} ({record.employeeId})
                          </p>
                          <p className="text-xs text-gray-600">
                            {record.separationType} · Updated {new Date(record.updatedAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {Boolean(record.step8?.confirmedOffboard) && (
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                              Confirmed
                            </span>
                          )}
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-100 text-rose-700">
                            {record.completionPercent}% complete
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenOffboardRecord(record.employeeId)}
                            className="px-3 py-1.5 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 hover:bg-slate-200"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteOffboardRecord(record.employeeId)}
                            disabled={deletingEmployeeId === record.employeeId}
                            className="px-3 py-1.5 rounded-md bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 hover:bg-rose-200 disabled:opacity-50"
                          >
                            {deletingEmployeeId === record.employeeId ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {showForm && (
          <>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedEmployee?.name || "Selected Employee"} ({selectedEmployeeId})
                </h3>
                <p className="text-sm text-gray-600">
                  Direct Manager: <span className="font-semibold text-gray-900">{selectedEmployee?.manager || "Not specified"}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={handleBackToList}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-semibold border border-slate-300 hover:bg-slate-200"
              >
                Back to Offboard List
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Separation Type</label>
                <select
                  value={separationType}
                  onChange={(e) => setSeparationType(e.target.value as "Resignation" | "Termination")}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50"
                >
                  <option value="Resignation">Resignation</option>
                  <option value="Termination">Termination</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Notice Date</label>
                <input
                  type="date"
                  value={noticeDate}
                  onChange={(e) => setNoticeDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Last Working Date</label>
                <input
                  type="date"
                  value={lastWorkingDate}
                  onChange={(e) => setLastWorkingDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving || loadingRecord || !selectedEmployeeId}
                className="px-5 py-2.5 rounded-lg bg-rose-500 text-white font-semibold hover:bg-rose-600 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Offboarding Record"}
              </button>
              <button
                onClick={handleConfirmOffboard}
                disabled={confirmingOffboard || loadingRecord || !selectedEmployeeId || !selectedRecord || isConfirmedOffboard}
                className="px-5 py-2.5 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 disabled:opacity-50"
              >
                {isConfirmedOffboard ? "Confirmed Off Board" : confirmingOffboard ? "Confirming..." : "Confirm Off Board"}
              </button>
              <button
                onClick={handleExport}
                disabled={loadingRecord || !selectedEmployeeId}
                className="px-5 py-2.5 rounded-lg bg-slate-100 text-slate-700 font-semibold border border-slate-300 hover:bg-slate-200 disabled:opacity-50"
              >
                Export PDF
              </button>
              <span className="text-xs text-gray-500">Auto-save is off. Use Save button to persist changes.</span>
            </div>

          </>
        )}

        {saveNotice && (
          <div
            className={`mt-4 px-4 py-3 rounded-lg text-sm font-medium ${
              saveNotice.type === "success"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                : "bg-rose-50 border border-rose-200 text-rose-800"
            }`}
          >
            {saveNotice.message}
          </div>
        )}

        {lastSavedAt && (
          <p className="mt-2 text-xs text-gray-500">
            Last saved: {new Date(lastSavedAt).toLocaleString()}
          </p>
        )}
      </div>

      {showForm && (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-lg font-bold text-gray-900">Step 1 - Separation Confirmation</h3>
          <p className="text-sm text-gray-600 mt-1">Responsible: HR</p>
          <div className="mt-3 mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">HR Responsible</label>
            <select
              value={hrResponsible}
              onChange={(e) => setHrResponsible(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50"
            >
              {(hrCandidates.length > 0 ? hrCandidates : sortedEmployees).map((emp) => (
                <option key={emp.id} value={emp.name}>{emp.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2"><input type="checkbox" checked={step1.receivedNotice} onChange={(e) => setStep1((p) => ({ ...p, receivedNotice: e.target.checked }))} />Receive resignation or termination notice</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step1.confirmedLastWorkingDate} onChange={(e) => setStep1((p) => ({ ...p, confirmedLastWorkingDate: e.target.checked }))} />Confirm last working date</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step1.preparedExitAgreement} onChange={(e) => setStep1((p) => ({ ...p, preparedExitAgreement: e.target.checked }))} />Prepare Exit Agreement</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step1.preparedFinalPayrollCalculation} onChange={(e) => setStep1((p) => ({ ...p, preparedFinalPayrollCalculation: e.target.checked }))} />Prepare final payroll calculation</label>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-lg font-bold text-gray-900">Step 2 - Internal Notification</h3>
          <p className="text-sm text-gray-600 mt-1">Responsible: HR ({hrResponsible || "Not assigned"})</p>
          <div className="space-y-2 mt-4">
            <label className="flex items-center gap-2"><input type="checkbox" checked={step2.notifyDirectManager} onChange={(e) => setStep2((p) => ({ ...p, notifyDirectManager: e.target.checked }))} />Notify Direct Manager</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step2.notifyIT} onChange={(e) => setStep2((p) => ({ ...p, notifyIT: e.target.checked }))} />Notify IT / System Administrator</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step2.notifyPayroll} onChange={(e) => setStep2((p) => ({ ...p, notifyPayroll: e.target.checked }))} />Notify Payroll</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step2.notifyLeadership} onChange={(e) => setStep2((p) => ({ ...p, notifyLeadership: e.target.checked }))} />Notify Leadership (if applicable)</label>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-rose-200 p-5">
          <h3 className="text-lg font-bold text-rose-700">Step 3 - Access Suspension (CRITICAL)</h3>
          <p className="text-sm text-gray-600 mt-1">Responsible: IT + HR</p>
          <p className="text-sm text-rose-700 font-semibold mt-1">All access must be revoked no later than the last working day (within 24 hours).</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">IT Responsible</label>
              <select
                value={itResponsible}
                onChange={(e) => setItResponsible(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50"
                disabled={itCandidates.length === 0}
              >
                {itCandidates.length === 0 && (
                  <option value="">No Information Technology employee found</option>
                )}
                {itCandidates.map((emp) => (
                  <option key={emp.id} value={emp.name}>{emp.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">HR Support</label>
              <div className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-100 text-gray-800">{hrResponsible || "Not assigned"}</div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <label className="flex items-center gap-2"><input type="checkbox" checked={step3.disableGmail} onChange={(e) => setStep3((p) => ({ ...p, disableGmail: e.target.checked }))} />Disable Gmail</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step3.disableGoogleDrive} onChange={(e) => setStep3((p) => ({ ...p, disableGoogleDrive: e.target.checked }))} />Disable Google Drive</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step3.disableGoogleAdmin} onChange={(e) => setStep3((p) => ({ ...p, disableGoogleAdmin: e.target.checked }))} />Disable Google Admin (if applicable)</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step3.disableMoodle} onChange={(e) => setStep3((p) => ({ ...p, disableMoodle: e.target.checked }))} />Disable Moodle (LMS)</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step3.disableGoogleClassroom} onChange={(e) => setStep3((p) => ({ ...p, disableGoogleClassroom: e.target.checked }))} />Disable Google Classroom</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step3.disableClickUp} onChange={(e) => setStep3((p) => ({ ...p, disableClickUp: e.target.checked }))} />Disable ClickUp</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step3.disableVpnRemoteAccess} onChange={(e) => setStep3((p) => ({ ...p, disableVpnRemoteAccess: e.target.checked }))} />Disable VPN / remote access</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step3.disableOtherSystems} onChange={(e) => setStep3((p) => ({ ...p, disableOtherSystems: e.target.checked }))} />Disable internal / third-party systems</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step3.transferDriveOwnership} onChange={(e) => setStep3((p) => ({ ...p, transferDriveOwnership: e.target.checked }))} />Transfer file ownership (Google Drive)</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step3.disableEmailLogin} onChange={(e) => setStep3((p) => ({ ...p, disableEmailLogin: e.target.checked }))} />Disable email login access</label>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-lg font-bold text-gray-900">Step 4 - Company Property Return</h3>
          <p className="text-sm text-gray-600 mt-1">Responsible: HR + Manager</p>
          <div className="space-y-2 mt-4">
            <label className="flex items-center gap-2"><input type="checkbox" checked={step4.returnLaptopCharger} onChange={(e) => setStep4((p) => ({ ...p, returnLaptopCharger: e.target.checked }))} />Collect laptop / charger</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step4.returnIdBadge} onChange={(e) => setStep4((p) => ({ ...p, returnIdBadge: e.target.checked }))} />Collect ID badge</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step4.returnKeys} onChange={(e) => setStep4((p) => ({ ...p, returnKeys: e.target.checked }))} />Collect keys</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step4.returnOfficeEquipment} onChange={(e) => setStep4((p) => ({ ...p, returnOfficeEquipment: e.target.checked }))} />Collect office equipment</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step4.returnDocuments} onChange={(e) => setStep4((p) => ({ ...p, returnDocuments: e.target.checked }))} />Collect documents (physical or digital)</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step4.signedPropertyChecklist} onChange={(e) => setStep4((p) => ({ ...p, signedPropertyChecklist: e.target.checked }))} />Employee signed Property Return Checklist</label>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-lg font-bold text-gray-900">Step 5 - Work Handover</h3>
          <p className="text-sm text-gray-600 mt-1">Responsible: Manager ({selectedEmployee?.manager || "Not assigned"})</p>
          <div className="space-y-2 mt-4">
            <label className="flex items-center gap-2"><input type="checkbox" checked={step5.reassignClickUpTasks} onChange={(e) => setStep5((p) => ({ ...p, reassignClickUpTasks: e.target.checked }))} />Reassign ClickUp tasks</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step5.documentIncompleteWork} onChange={(e) => setStep5((p) => ({ ...p, documentIncompleteWork: e.target.checked }))} />Document incomplete work</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step5.continuityConfirmed} onChange={(e) => setStep5((p) => ({ ...p, continuityConfirmed: e.target.checked }))} />Ensure continuity of operations</label>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-lg font-bold text-gray-900">Step 6 - Exit Agreement Execution</h3>
          <p className="text-sm text-gray-600 mt-1">Responsible: HR ({hrResponsible || "Not assigned"})</p>
          <div className="space-y-2 mt-4">
            <label className="flex items-center gap-2"><input type="checkbox" checked={step6.signedConfidentialityObligations} onChange={(e) => setStep6((p) => ({ ...p, signedConfidentialityObligations: e.target.checked }))} />Signed confidentiality obligations clause</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step6.signedPropertyReturnClause} onChange={(e) => setStep6((p) => ({ ...p, signedPropertyReturnClause: e.target.checked }))} />Signed property return clause</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step6.signedNoDataRetentionClause} onChange={(e) => setStep6((p) => ({ ...p, signedNoDataRetentionClause: e.target.checked }))} />Signed no data retention clause</label>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-lg font-bold text-gray-900">Step 7 - Final Payroll</h3>
          <p className="text-sm text-gray-600 mt-1">Responsible: HR / Payroll</p>
          <div className="space-y-2 mt-4">
            <label className="flex items-center gap-2"><input type="checkbox" checked={step7.finalWagesIssued} onChange={(e) => setStep7((p) => ({ ...p, finalWagesIssued: e.target.checked }))} />Issue final wages (California compliant)</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step7.accruedCompensationIncluded} onChange={(e) => setStep7((p) => ({ ...p, accruedCompensationIncluded: e.target.checked }))} />Include accrued compensation</label>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-lg font-bold text-gray-900">Step 8 - Documentation & Record Retention</h3>
          <p className="text-sm text-gray-600 mt-1">Responsible: HR ({hrResponsible || "Not assigned"})</p>
          <div className="space-y-2 mt-4">
            <label className="flex items-center gap-2"><input type="checkbox" checked={step8.retainedExitAgreement} onChange={(e) => setStep8((p) => ({ ...p, retainedExitAgreement: e.target.checked }))} />Maintain Exit Agreement</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step8.retainedPropertyChecklist} onChange={(e) => setStep8((p) => ({ ...p, retainedPropertyChecklist: e.target.checked }))} />Maintain Property Return Checklist</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step8.retainedAccessTerminationConfirmation} onChange={(e) => setStep8((p) => ({ ...p, retainedAccessTerminationConfirmation: e.target.checked }))} />Maintain access termination confirmation</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step8.retainedPerformanceWarningRecords} onChange={(e) => setStep8((p) => ({ ...p, retainedPerformanceWarningRecords: e.target.checked }))} />Maintain performance / warning records</label>
          </div>
        </section>
      </div>
      )}
    </div>
  );
}
