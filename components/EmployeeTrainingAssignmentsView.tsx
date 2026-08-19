"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCurrentUserContext } from "@/components/CurrentUserContextProvider";
import {
  TRAINING_CATEGORY_LABELS,
  TRAINING_METHOD_LABELS,
  TRAINING_REQUIREMENT_LABELS,
} from "@/lib/trainingCompliance";

type AssignmentRow = {
  id: string;
  trainingProgramName: string;
  category: keyof typeof TRAINING_CATEGORY_LABELS;
  requirementType: keyof typeof TRAINING_REQUIREMENT_LABELS;
  trainingMethod: keyof typeof TRAINING_METHOD_LABELS;
  startDate: string;
  dueDate: string;
  completionDate?: string | null;
  calculatedStatus: "UPCOMING" | "DUE_SOON" | "URGENT" | "OVERDUE" | "COMPLETED";
};

type AssignmentPayload = {
  employeeId: string;
  alerts: {
    dueSoon: number;
    urgent: number;
    overdue: number;
  };
  assignments: AssignmentRow[];
};

function toDateInput(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const STATUS_STYLE: Record<AssignmentRow["calculatedStatus"], string> = {
  UPCOMING: "bg-sky-100 text-sky-700 border-sky-200",
  DUE_SOON: "bg-amber-100 text-amber-700 border-amber-200",
  URGENT: "bg-orange-100 text-orange-700 border-orange-200",
  OVERDUE: "bg-rose-100 text-rose-700 border-rose-200",
  COMPLETED: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export default function EmployeeTrainingAssignmentsView() {
  const { employeeContext, canSwitchView } = useCurrentUserContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<AssignmentPayload | null>(null);

  useEffect(() => {
    const fetchAssignments = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/training-assignments/me");
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || "Failed to load assignments");
        }
        setPayload(data as AssignmentPayload);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Failed to load assignments");
      } finally {
        setLoading(false);
      }
    };

    void fetchAssignments();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-sm text-slate-600">
        Loading training assignments...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm text-sm text-rose-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">Training & Compliance</h2>
        <p className="mt-1 text-sm text-slate-600">My assigned training cycles and due-date status.</p>
        {employeeContext && (
          <p className="mt-2 text-xs text-slate-500">
            Matched employee: <span className="font-semibold text-slate-700">{employeeContext.employeeName}</span>
            {" · "}
            <span className="font-medium">{employeeContext.workEmail}</span>
          </p>
        )}
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            Due Soon: <span className="font-bold">{payload?.alerts.dueSoon || 0}</span>
          </div>
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-700">
            Urgent: <span className="font-bold">{payload?.alerts.urgent || 0}</span>
          </div>
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            Overdue: <span className="font-bold">{payload?.alerts.overdue || 0}</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-220">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Training</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Requirement</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Method</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Start</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Due</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Completed</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Course</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {(payload?.assignments || []).length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-500">
                    <div className="space-y-2">
                      <div>No training assignments were found for this employee yet.</div>
                      {canSwitchView && (
                        <div className="text-xs text-slate-400">
                          If you want to review the full course catalog, switch the top-right `View As` control to `Admin`.
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                payload?.assignments.map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">{assignment.trainingProgramName}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{TRAINING_CATEGORY_LABELS[assignment.category]}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{TRAINING_REQUIREMENT_LABELS[assignment.requirementType]}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{TRAINING_METHOD_LABELS[assignment.trainingMethod]}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{toDateInput(assignment.startDate)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{toDateInput(assignment.dueDate)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{toDateInput(assignment.completionDate || null)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLE[assignment.calculatedStatus]}`}>
                        {assignment.calculatedStatus.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Link
                        href={`/training/assignments/${assignment.id}`}
                        className="inline-flex items-center rounded-lg bg-indigo-100 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-200"
                      >
                        Open Course
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
