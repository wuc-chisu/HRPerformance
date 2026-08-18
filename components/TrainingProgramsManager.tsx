"use client";

import { useEffect, useMemo, useState } from "react";
import {
  TRAINING_APPLIES_TO_LABELS,
  TRAINING_APPLIES_TO_OPTIONS,
  TRAINING_CATEGORY_LABELS,
  TRAINING_CATEGORY_OPTIONS,
  TRAINING_COMPLETION_METHOD_LABELS,
  TRAINING_COMPLETION_METHOD_OPTIONS,
  TRAINING_METHOD_LABELS,
  TRAINING_METHOD_OPTIONS,
  TRAINING_PROGRAM_STATUS_LABELS,
  TRAINING_PROGRAM_STATUS_OPTIONS,
  TRAINING_RECURRENCE_LABELS,
  TRAINING_RECURRENCE_OPTIONS,
  TRAINING_REQUIREMENT_LABELS,
  TRAINING_REQUIREMENT_TYPE_OPTIONS,
  calculateNextCycleDate,
  deriveRecurrenceInterval,
  type TrainingAppliesTo,
  type TrainingCategory,
  type TrainingCompletionMethod,
  type TrainingIntervalUnit,
  type TrainingMethod,
  type TrainingProgramStatus,
  type TrainingRecurrence,
  type TrainingRequirementType,
} from "@/lib/trainingCompliance";

type TrainingProgramListItem = {
  id: string;
  programCode?: string | null;
  trainingName: string;
  category: TrainingCategory;
  requirementType: TrainingRequirementType;
  appliesTo: TrainingAppliesTo[];
  customGroupName?: string | null;
  startDate: string;
  dueDate: string;
  recurrence: TrainingRecurrence;
  recurrenceIntervalValue?: number | null;
  recurrenceIntervalUnit?: TrainingIntervalUnit | null;
  nextCycleDate?: string | null;
  trainingMethod: TrainingMethod;
  completionMethod: TrainingCompletionMethod;
  examRequired: boolean;
  passingScore?: number | null;
  certificateRequired: boolean;
  status: TrainingProgramStatus;
  canDelete: boolean;
  alerts: {
    dueSoon: number;
    urgent: number;
    overdue: number;
  };
};

type FormState = {
  programCode: string;
  trainingName: string;
  category: TrainingCategory;
  requirementType: TrainingRequirementType;
  appliesTo: TrainingAppliesTo[];
  customGroupName: string;
  startDate: string;
  dueDate: string;
  recurrence: TrainingRecurrence;
  customRecurrenceIntervalValue: string;
  customRecurrenceIntervalUnit: TrainingIntervalUnit;
  trainingMethod: TrainingMethod;
  completionMethod: TrainingCompletionMethod;
  examRequired: boolean;
  passingScore: string;
  certificateRequired: boolean;
  status: TrainingProgramStatus;
};

const DEFAULT_FORM: FormState = {
  programCode: "",
  trainingName: "",
  category: "WUC_REQUIRED_TRAINING",
  requirementType: "REQUIRED",
  appliesTo: ["ALL_EMPLOYEES"],
  customGroupName: "",
  startDate: "",
  dueDate: "",
  recurrence: "ONE_TIME",
  customRecurrenceIntervalValue: "",
  customRecurrenceIntervalUnit: "MONTHS",
  trainingMethod: "WUC_INTERNAL_COURSE",
  completionMethod: "HR_VERIFICATION",
  examRequired: false,
  passingScore: "",
  certificateRequired: true,
  status: "DRAFT",
};

function toDateInput(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "None";
  return toDateInput(value);
}

function getStatusBadgeClass(status: TrainingProgramStatus) {
  switch (status) {
    case "ACTIVE":
      return "border border-emerald-200 bg-emerald-50 text-emerald-700";
    case "INACTIVE":
      return "border border-amber-200 bg-amber-50 text-amber-700";
    case "ARCHIVED":
      return "border border-slate-300 bg-slate-100 text-slate-600";
    default:
      return "border border-sky-200 bg-sky-50 text-sky-700";
  }
}

function getStatusActionLabel(status: TrainingProgramStatus) {
  switch (status) {
    case "ACTIVE":
      return "Set Inactive";
    case "INACTIVE":
      return "Set Active";
    case "ARCHIVED":
      return "Restore as Active";
    default:
      return "Activate Program";
  }
}

function mapProgramToForm(program: TrainingProgramListItem): FormState {
  return {
    programCode: program.programCode || "",
    trainingName: program.trainingName,
    category: program.category,
    requirementType: program.requirementType,
    appliesTo: program.appliesTo,
    customGroupName: program.customGroupName || "",
    startDate: toDateInput(program.startDate),
    dueDate: toDateInput(program.dueDate),
    recurrence: program.recurrence,
    customRecurrenceIntervalValue:
      program.recurrence === "CUSTOM" && program.recurrenceIntervalValue
        ? String(program.recurrenceIntervalValue)
        : "",
    customRecurrenceIntervalUnit:
      program.recurrence === "CUSTOM" && program.recurrenceIntervalUnit
        ? program.recurrenceIntervalUnit
        : "MONTHS",
    trainingMethod: program.trainingMethod,
    completionMethod: program.completionMethod,
    examRequired: program.examRequired,
    passingScore: program.passingScore == null ? "" : String(program.passingScore),
    certificateRequired: program.certificateRequired,
    status: program.status,
  };
}

export default function TrainingProgramsManager({ viewMode }: { viewMode: "admin" | "employee" }) {
  const [programs, setPrograms] = useState<TrainingProgramListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingProgram, setViewingProgram] = useState<TrainingProgramListItem | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [filters, setFilters] = useState({
    category: "",
    requirementType: "",
    appliesTo: "",
    status: "",
  });

  const nextCyclePreview = useMemo(() => {
    if (!form.startDate) return "None";

    const start = new Date(form.startDate);
    const interval = deriveRecurrenceInterval(
      form.recurrence,
      form.recurrence === "CUSTOM" ? Number(form.customRecurrenceIntervalValue || "0") : null,
      form.recurrence === "CUSTOM" ? form.customRecurrenceIntervalUnit : null
    );

    const next = calculateNextCycleDate(start, form.recurrence, interval.value, interval.unit);
    return next ? toDateInput(next.toISOString()) : "None";
  }, [form.startDate, form.recurrence, form.customRecurrenceIntervalValue, form.customRecurrenceIntervalUnit]);

  const fetchPrograms = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.category) params.set("category", filters.category);
      if (filters.requirementType) params.set("requirementType", filters.requirementType);
      if (filters.appliesTo) params.set("appliesTo", filters.appliesTo);
      if (filters.status) params.set("status", filters.status);

      const response = await fetch(`/api/training-programs?${params.toString()}`, {
        headers: {
          "X-View-Mode": viewMode,
        },
      });

      const rawBody = await response.text();
      let payload: any = {};
      if (rawBody) {
        try {
          payload = JSON.parse(rawBody);
        } catch {
          payload = {};
        }
      }
      if (!response.ok) {
        throw new Error(payload.details || payload.error || rawBody || "Failed to load training programs");
      }

      setPrograms(payload as TrainingProgramListItem[]);
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to load training programs",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setNotice(null);
    void fetchPrograms();
  }, [viewMode, filters.category, filters.requirementType, filters.appliesTo, filters.status]);

  const resetForm = () => {
    setForm(DEFAULT_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const openCreate = () => {
    setNotice(null);
    setForm(DEFAULT_FORM);
    setEditingId(null);
    setShowForm(true);
    setViewingProgram(null);
  };

  const openEdit = (program: TrainingProgramListItem) => {
    setNotice(null);
    setForm(mapProgramToForm(program));
    setEditingId(program.id);
    setShowForm(true);
    setViewingProgram(null);
  };

  const openView = (program: TrainingProgramListItem) => {
    setViewingProgram(program);
    setShowForm(false);
  };

  const onToggleAppliesTo = (value: TrainingAppliesTo) => {
    setForm((prev) => {
      const has = prev.appliesTo.includes(value);
      const next = has ? prev.appliesTo.filter((item) => item !== value) : [...prev.appliesTo, value];

      if (value === "ALL_EMPLOYEES" && !has) {
        return { ...prev, appliesTo: ["ALL_EMPLOYEES"] };
      }

      if (value !== "ALL_EMPLOYEES" && !has) {
        return { ...prev, appliesTo: next.filter((item) => item !== "ALL_EMPLOYEES") };
      }

      return { ...prev, appliesTo: next.length ? next : ["ALL_EMPLOYEES"] };
    });
  };

  const saveProgram = async () => {
    if (!form.trainingName.trim() || !form.startDate || !form.dueDate || form.appliesTo.length === 0) {
      setNotice({ type: "error", message: "Please complete all required fields." });
      return;
    }

    if (new Date(form.dueDate) < new Date(form.startDate)) {
      setNotice({ type: "error", message: "Due Date cannot be earlier than Start Date." });
      return;
    }

    if (form.examRequired) {
      const score = Number(form.passingScore);
      if (!Number.isFinite(score) || score < 0 || score > 100) {
        setNotice({ type: "error", message: "Passing Score must be between 0 and 100." });
        return;
      }
    }

    if (form.recurrence === "CUSTOM") {
      const intervalValue = Number(form.customRecurrenceIntervalValue);
      if (!Number.isFinite(intervalValue) || intervalValue <= 0) {
        setNotice({ type: "error", message: "Custom recurrence interval must be greater than 0." });
        return;
      }
    }

    setSaving(true);
    try {
      const response = await fetch(editingId ? `/api/training-programs/${editingId}` : "/api/training-programs", {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          "X-View-Mode": viewMode,
        },
        body: JSON.stringify({
          programCode: form.programCode.trim() || null,
          trainingName: form.trainingName.trim(),
          category: form.category,
          requirementType: form.requirementType,
          appliesTo: form.appliesTo,
          customGroupName: form.customGroupName.trim() || null,
          startDate: form.startDate,
          dueDate: form.dueDate,
          recurrence: form.recurrence,
          customRecurrenceIntervalValue:
            form.recurrence === "CUSTOM" ? Number(form.customRecurrenceIntervalValue) : null,
          customRecurrenceIntervalUnit: form.recurrence === "CUSTOM" ? form.customRecurrenceIntervalUnit : null,
          trainingMethod: form.trainingMethod,
          completionMethod: form.completionMethod,
          examRequired: form.examRequired,
          passingScore: form.examRequired ? Number(form.passingScore) : null,
          certificateRequired: form.certificateRequired,
          status: form.status,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Failed to save training program");
      }

      setNotice({ type: "success", message: "Training program saved successfully." });
      setShowForm(false);
      setEditingId(null);
      setForm(DEFAULT_FORM);
      await fetchPrograms();
    } catch (error) {
      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to save training program",
      });
    } finally {
      setSaving(false);
    }
  };

  const updateProgramStatus = async (program: TrainingProgramListItem, status: TrainingProgramStatus) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/training-programs/${program.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-View-Mode": viewMode,
        },
        body: JSON.stringify({
          ...mapProgramToForm(program),
          status,
          customRecurrenceIntervalValue:
            program.recurrence === "CUSTOM" && program.recurrenceIntervalValue
              ? String(program.recurrenceIntervalValue)
              : "",
          customRecurrenceIntervalUnit:
            program.recurrence === "CUSTOM" && program.recurrenceIntervalUnit
              ? program.recurrenceIntervalUnit
              : "MONTHS",
          startDate: toDateInput(program.startDate),
          dueDate: toDateInput(program.dueDate),
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to update status");
      await fetchPrograms();
      setNotice({ type: "success", message: `Training program set to ${TRAINING_PROGRAM_STATUS_LABELS[status]}.` });
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "Failed to update status" });
    } finally {
      setSaving(false);
    }
  };

  const archiveProgram = async (program: TrainingProgramListItem) => {
    await updateProgramStatus(program, "ARCHIVED");
  };

  const deleteProgram = async (program: TrainingProgramListItem) => {
    if (!program.canDelete) {
      setNotice({ type: "error", message: "Program has historical records. Archive it instead of deleting." });
      return;
    }

    if (!window.confirm("Are you sure you want to permanently delete this Training Program?")) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/training-programs/${program.id}`, {
        method: "DELETE",
        headers: {
          "X-View-Mode": viewMode,
        },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to delete training program");
      setNotice({ type: "success", message: "Training program deleted." });
      await fetchPrograms();
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "Failed to delete training program" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Training Programs</h2>
            <p className="mt-1 text-sm text-slate-600">
              Manage training programs, cycles, assignment eligibility, and compliance status foundations.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            + Add Training Program
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <select
            value={filters.category}
            onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All Categories</option>
            {TRAINING_CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>{TRAINING_CATEGORY_LABELS[option]}</option>
            ))}
          </select>

          <select
            value={filters.requirementType}
            onChange={(e) => setFilters((prev) => ({ ...prev, requirementType: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All Requirement Types</option>
            {TRAINING_REQUIREMENT_TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>{TRAINING_REQUIREMENT_LABELS[option]}</option>
            ))}
          </select>

          <select
            value={filters.appliesTo}
            onChange={(e) => setFilters((prev) => ({ ...prev, appliesTo: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All Applies To</option>
            {TRAINING_APPLIES_TO_OPTIONS.map((option) => (
              <option key={option} value={option}>{TRAINING_APPLIES_TO_LABELS[option]}</option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All Status</option>
            {TRAINING_PROGRAM_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>{TRAINING_PROGRAM_STATUS_LABELS[option]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
            Status badges show the current state. Action buttons say the state the program will change to.
          </div>
          <table className="w-full min-w-300">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Training Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Requirement Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Applies To</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Start Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Due Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Recurrence</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Next Cycle Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Training Method</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-sm text-slate-500">Loading training programs...</td>
                </tr>
              ) : programs.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-sm text-slate-500">
                    No training programs found.
                    {notice?.type === "error" ? <div className="mt-2 text-rose-600">{notice.message}</div> : null}
                  </td>
                </tr>
              ) : (
                programs.map((program) => (
                  <tr key={program.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-900 font-semibold">{program.trainingName}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{TRAINING_CATEGORY_LABELS[program.category]}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{TRAINING_REQUIREMENT_LABELS[program.requirementType]}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {program.appliesTo.map((item) => TRAINING_APPLIES_TO_LABELS[item]).join(", ")}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{formatDate(program.startDate)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{formatDate(program.dueDate)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{TRAINING_RECURRENCE_LABELS[program.recurrence]}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{formatDate(program.nextCycleDate)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{TRAINING_METHOD_LABELS[program.trainingMethod]}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(program.status)}`}>
                        {TRAINING_PROGRAM_STATUS_LABELS[program.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => openView(program)} className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200">View</button>
                        <button type="button" onClick={() => openEdit(program)} className="rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-200">Edit</button>
                        <button
                          type="button"
                          onClick={() => updateProgramStatus(program, program.status === "ACTIVE" ? "INACTIVE" : "ACTIVE")}
                          disabled={saving}
                          className={`rounded px-2 py-1 text-xs font-semibold ${program.status === "ACTIVE" ? "bg-amber-100 text-amber-700 hover:bg-amber-200" : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"}`}
                        >
                          {getStatusActionLabel(program.status)}
                        </button>
                        {program.status !== "ARCHIVED" && (
                          <button type="button" onClick={() => archiveProgram(program)} disabled={saving} className="rounded bg-indigo-100 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-200">Archive</button>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteProgram(program)}
                          disabled={!program.canDelete || saving}
                          className="rounded bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-200 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {notice && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {notice.message}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/30 px-4 py-8 overflow-y-auto">
          <div className="mx-auto w-full max-w-4xl rounded-2xl bg-white shadow-xl">
            <div className="border-b border-slate-200 p-5 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">{editingId ? "Edit Training Program" : "Add Training Program"}</h3>
              <button type="button" onClick={resetForm} className="text-slate-500 hover:text-slate-700">Close</button>
            </div>

            <div className="space-y-6 p-5">
              <section className="space-y-4">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Basic Information</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Program Code</label>
                    <input
                      value={form.programCode}
                      onChange={(e) => setForm((prev) => ({ ...prev, programCode: e.target.value.toUpperCase() }))}
                      placeholder="Optional unique code"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Training Name</label>
                    <input value={form.trainingName} onChange={(e) => setForm((prev) => ({ ...prev, trainingName: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Category</label>
                    <select value={form.category} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value as TrainingCategory }))} className="w-full rounded-lg border border-slate-300 px-3 py-2">
                      {TRAINING_CATEGORY_OPTIONS.map((option) => (
                        <option key={option} value={option}>{TRAINING_CATEGORY_LABELS[option]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Requirement Type</label>
                    <select value={form.requirementType} onChange={(e) => setForm((prev) => ({ ...prev, requirementType: e.target.value as TrainingRequirementType }))} className="w-full rounded-lg border border-slate-300 px-3 py-2">
                      {TRAINING_REQUIREMENT_TYPE_OPTIONS.map((option) => (
                        <option key={option} value={option}>{TRAINING_REQUIREMENT_LABELS[option]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Applies To</label>
                    <div className="rounded-lg border border-slate-300 p-2 max-h-36 overflow-y-auto">
                      {TRAINING_APPLIES_TO_OPTIONS.map((option) => (
                        <label key={option} className="flex items-center gap-2 py-1 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={form.appliesTo.includes(option)}
                            onChange={() => onToggleAppliesTo(option)}
                          />
                          {TRAINING_APPLIES_TO_LABELS[option]}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {form.appliesTo.includes("CUSTOM_GROUP") && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Custom Group</label>
                    <input
                      value={form.customGroupName}
                      onChange={(e) => setForm((prev) => ({ ...prev, customGroupName: e.target.value }))}
                      placeholder="Enter comma-separated employee IDs or names"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </div>
                )}
              </section>

              <section className="space-y-4">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Schedule & Recurrence</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Start Date</label>
                    <input type="date" value={form.startDate} onChange={(e) => setForm((prev) => ({ ...prev, startDate: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Due Date</label>
                    <input type="date" value={form.dueDate} onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Recurrence</label>
                    <select value={form.recurrence} onChange={(e) => setForm((prev) => ({ ...prev, recurrence: e.target.value as TrainingRecurrence }))} className="w-full rounded-lg border border-slate-300 px-3 py-2">
                      {TRAINING_RECURRENCE_OPTIONS.map((option) => (
                        <option key={option} value={option}>{TRAINING_RECURRENCE_LABELS[option]}</option>
                      ))}
                    </select>
                  </div>

                  {form.recurrence === "CUSTOM" && (
                    <>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Interval Number</label>
                        <input
                          type="number"
                          min={1}
                          value={form.customRecurrenceIntervalValue}
                          onChange={(e) => setForm((prev) => ({ ...prev, customRecurrenceIntervalValue: e.target.value }))}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Interval Unit</label>
                        <select
                          value={form.customRecurrenceIntervalUnit}
                          onChange={(e) => setForm((prev) => ({ ...prev, customRecurrenceIntervalUnit: e.target.value as TrainingIntervalUnit }))}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        >
                          <option value="DAYS">Days</option>
                          <option value="MONTHS">Months</option>
                          <option value="YEARS">Years</option>
                        </select>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Next Cycle Date</label>
                    <input readOnly value={nextCyclePreview} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700" />
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Completion Requirements</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Training Method</label>
                    <select value={form.trainingMethod} onChange={(e) => setForm((prev) => ({ ...prev, trainingMethod: e.target.value as TrainingMethod }))} className="w-full rounded-lg border border-slate-300 px-3 py-2">
                      {TRAINING_METHOD_OPTIONS.map((option) => (
                        <option key={option} value={option}>{TRAINING_METHOD_LABELS[option]}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Completion Method</label>
                    <select value={form.completionMethod} onChange={(e) => setForm((prev) => ({ ...prev, completionMethod: e.target.value as TrainingCompletionMethod }))} className="w-full rounded-lg border border-slate-300 px-3 py-2">
                      {TRAINING_COMPLETION_METHOD_OPTIONS.map((option) => (
                        <option key={option} value={option}>{TRAINING_COMPLETION_METHOD_LABELS[option]}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.examRequired}
                        onChange={(e) => setForm((prev) => ({ ...prev, examRequired: e.target.checked }))}
                      />
                      Exam Required
                    </label>
                    {form.examRequired && (
                      <input
                        type="number"
                        min={0}
                        max={100}
                        placeholder="Passing Score (0-100)"
                        value={form.passingScore}
                        onChange={(e) => setForm((prev) => ({ ...prev, passingScore: e.target.value }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    )}
                  </div>

                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.certificateRequired}
                      onChange={(e) => setForm((prev) => ({ ...prev, certificateRequired: e.target.checked }))}
                    />
                    Certificate Required
                  </label>
                </div>
              </section>

              <section className="space-y-4">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Administration</h4>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
                  <select value={form.status} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as TrainingProgramStatus }))} className="w-full md:w-72 rounded-lg border border-slate-300 px-3 py-2">
                    {TRAINING_PROGRAM_STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option}>{TRAINING_PROGRAM_STATUS_LABELS[option]}</option>
                    ))}
                  </select>
                </div>
              </section>
            </div>

            <div className="border-t border-slate-200 p-5 flex items-center justify-end gap-3">
              <button type="button" onClick={resetForm} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Cancel</button>
              <button type="button" onClick={saveProgram} disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                {saving ? "Saving..." : "Save Training Program"}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingProgram && (
        <div className="fixed inset-0 z-40 bg-black/20 p-4">
          <div className="mx-auto max-w-2xl rounded-2xl bg-white shadow-xl border border-slate-200">
            <div className="border-b border-slate-200 p-5 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Training Program Details</h3>
              <button type="button" onClick={() => setViewingProgram(null)} className="text-slate-500 hover:text-slate-700">Close</button>
            </div>
            <div className="p-5 space-y-3 text-sm text-slate-700">
              <p><span className="font-semibold text-slate-900">Training Name:</span> {viewingProgram.trainingName}</p>
              <p><span className="font-semibold text-slate-900">Program Code:</span> {viewingProgram.programCode || "None"}</p>
              <p><span className="font-semibold text-slate-900">Category:</span> {TRAINING_CATEGORY_LABELS[viewingProgram.category]}</p>
              <p><span className="font-semibold text-slate-900">Requirement Type:</span> {TRAINING_REQUIREMENT_LABELS[viewingProgram.requirementType]}</p>
              <p><span className="font-semibold text-slate-900">Applies To:</span> {viewingProgram.appliesTo.map((item) => TRAINING_APPLIES_TO_LABELS[item]).join(", ")}</p>
              <p><span className="font-semibold text-slate-900">Start Date:</span> {formatDate(viewingProgram.startDate)}</p>
              <p><span className="font-semibold text-slate-900">Due Date:</span> {formatDate(viewingProgram.dueDate)}</p>
              <p><span className="font-semibold text-slate-900">Recurrence:</span> {TRAINING_RECURRENCE_LABELS[viewingProgram.recurrence]}</p>
              <p><span className="font-semibold text-slate-900">Next Cycle Date:</span> {formatDate(viewingProgram.nextCycleDate)}</p>
              <p><span className="font-semibold text-slate-900">Training Method:</span> {TRAINING_METHOD_LABELS[viewingProgram.trainingMethod]}</p>
              <p><span className="font-semibold text-slate-900">Completion Method:</span> {TRAINING_COMPLETION_METHOD_LABELS[viewingProgram.completionMethod]}</p>
              <p><span className="font-semibold text-slate-900">Exam Required:</span> {viewingProgram.examRequired ? "Yes" : "No"}</p>
              {viewingProgram.examRequired && (
                <p><span className="font-semibold text-slate-900">Passing Score:</span> {viewingProgram.passingScore ?? "N/A"}</p>
              )}
              <p><span className="font-semibold text-slate-900">Certificate Required:</span> {viewingProgram.certificateRequired ? "Yes" : "No"}</p>
              <p><span className="font-semibold text-slate-900">Status:</span> {TRAINING_PROGRAM_STATUS_LABELS[viewingProgram.status]}</p>
              <p><span className="font-semibold text-slate-900">Alerts:</span> Due Soon {viewingProgram.alerts.dueSoon}, Urgent {viewingProgram.alerts.urgent}, Overdue {viewingProgram.alerts.overdue}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
