"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useCurrentUserContext } from "@/components/CurrentUserContextProvider";

type TrainingProgramSummary = {
  id: string;
  trainingName: string;
  programCode?: string | null;
  trainingMethod: string;
  status: string;
};

type ModuleItem = {
  id: string;
  trainingProgramId: string;
  title: string;
  description?: string | null;
  moduleType: string;
  displayOrder: number;
  isRequired: boolean;
  status: string;
  contentReference?: string | null;
  contentFileName?: string | null;
  isActive: boolean;
  canDelete: boolean;
  progressRecordCount: number;
};

type Payload = {
  trainingProgram: TrainingProgramSummary;
  moduleCount: number;
  modules: ModuleItem[];
};

const MODULE_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ARCHIVED: "Archived",
};

function isStrictHrAdminInAdminView(systemRole: string | undefined, viewMode: "admin" | "employee") {
  return (systemRole || "").trim().toLowerCase() === "hr admin" && viewMode === "admin";
}

export default function CourseContentManagerPage({ trainingProgramId }: { trainingProgramId: string }) {
  const { employeeContext, viewMode, loading } = useCurrentUserContext();
  const [data, setData] = useState<Payload | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canManage = isStrictHrAdminInAdminView(employeeContext?.systemRole, viewMode);

  const loadModules = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/training-programs/${trainingProgramId}/modules`, {
        headers: {
          "X-View-Mode": viewMode,
        },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load course content.");
      }
      setData(payload as Payload);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to load course content.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!canManage) return;
    void loadModules();
  }, [canManage, trainingProgramId, viewMode]);

  const visibleModules = useMemo(() => {
    return (data?.modules || []).sort((left, right) => left.displayOrder - right.displayOrder);
  }, [data?.modules]);

  const archiveModule = async (module: ModuleItem) => {
    setBusy(true);
    try {
      const response = await fetch(`/api/training-programs/${trainingProgramId}/modules/${module.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-View-Mode": viewMode,
        },
        body: JSON.stringify({
          title: module.title,
          description: module.description || "",
          moduleType: module.moduleType,
          displayOrder: module.displayOrder,
          isRequired: module.isRequired,
          status: "ARCHIVED",
          contentReference: module.contentReference || "",
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to archive module.");
      await loadModules();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to archive module.");
      setBusy(false);
    }
  };

  const deleteModule = async (module: ModuleItem) => {
    if (!window.confirm("Are you sure you want to permanently delete this module?")) {
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`/api/training-programs/${trainingProgramId}/modules/${module.id}`, {
        method: "DELETE",
        headers: {
          "X-View-Mode": viewMode,
        },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to delete module.");
      await loadModules();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to delete module.");
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading...</div>;
  }

  if (!canManage) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        Course content management is restricted to HR Admin in Admin view.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <Link href="/" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
              {"<- Back to Training Program"}
            </Link>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Course Content</h1>
            <p className="mt-1 text-sm text-slate-700">{data?.trainingProgram.trainingName || "Loading..."}</p>
            <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
              <div>Program Code: <span className="font-semibold text-slate-800">{data?.trainingProgram.programCode || "None"}</span></div>
              <div>Training Method: <span className="font-semibold text-slate-800">{data?.trainingProgram.trainingMethod || "-"}</span></div>
              <div>Status: <span className="font-semibold text-slate-800">{data?.trainingProgram.status || "-"}</span></div>
              <div>Modules: <span className="font-semibold text-slate-800">{data?.moduleCount ?? 0}</span></div>
            </div>
          </div>
          <Link
            href={`/training/programs/${trainingProgramId}/content/new`}
            className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            + Add Module
          </Link>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-220">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Order</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Module Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Required</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Content Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Module Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {busy && !data ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">Loading modules...</td>
                </tr>
              ) : visibleModules.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">No modules configured.</td>
                </tr>
              ) : (
                visibleModules.map((module) => (
                  <tr key={module.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-700">{module.displayOrder}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">{module.title}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{module.moduleType.replaceAll("_", " ")}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{module.isRequired ? "Required" : "Optional"}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {module.contentReference ? (
                        <a href={module.contentReference} target="_blank" rel="noreferrer" className="font-semibold text-indigo-600 hover:text-indigo-700">
                          {module.contentFileName || "Content linked"}
                        </a>
                      ) : (
                        "No content"
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{MODULE_STATUS_LABELS[module.status] || module.status}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/training/programs/${trainingProgramId}/content/${module.id}/edit`} className="rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-200">Edit</Link>
                        {module.status !== "ARCHIVED" ? (
                          <button
                            type="button"
                            onClick={() => void archiveModule(module)}
                            className="rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-200"
                          >
                            Archive
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void deleteModule(module)}
                          disabled={!module.canDelete}
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
    </div>
  );
}
