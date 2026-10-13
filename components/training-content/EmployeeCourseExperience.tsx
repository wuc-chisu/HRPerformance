"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { EmployeeTrainingCourseDetail } from "@/lib/trainingCourseDetail";

type ModuleItem = EmployeeTrainingCourseDetail["modules"][number];

type ProgressSummary = EmployeeTrainingCourseDetail["progress"];

type FinalExamSummary = EmployeeTrainingCourseDetail["finalExam"];

type ProgressResponse = {
  module: {
    id: string;
    status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
    startedAt: string | null;
    completedAt: string | null;
    lastAccessedAt: string | null;
  };
  progress: ProgressSummary;
  finalExam: FinalExamSummary;
};

const MODULE_TYPE_LABELS: Record<string, string> = {
  VIDEO: "Video",
  READING: "Reading",
  DOCUMENT: "Document",
  EXTERNAL_LINK: "External Link",
  QUIZ: "Quiz",
  OTHER: "Other",
};

const MODULE_STATUS_LABELS: Record<string, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};

const MODULE_STATUS_CLASSNAMES: Record<string, string> = {
  NOT_STARTED: "border-slate-200 bg-slate-100 text-slate-700",
  IN_PROGRESS: "border-sky-200 bg-sky-100 text-sky-700",
  COMPLETED: "border-emerald-200 bg-emerald-100 text-emerald-700",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatPercentage(value: number) {
  return `${Math.max(0, Math.min(100, value))}%`;
}

function isGoogleDriveUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    return parsed.hostname.includes("drive.google.com");
  } catch {
    return false;
  }
}

function resolveGoogleDriveEmbedUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    if (!parsed.hostname.includes("drive.google.com")) {
      return rawUrl;
    }

    const pathMatch = parsed.pathname.match(/\/file\/d\/([^/]+)/);
    if (pathMatch?.[1]) {
      return `https://drive.google.com/file/d/${pathMatch[1]}/preview`;
    }

    const id = parsed.searchParams.get("id");
    if (id) {
      return `https://drive.google.com/file/d/${id}/preview`;
    }

    return rawUrl;
  } catch {
    return rawUrl;
  }
}

export default function EmployeeCourseExperience({
  assignmentId,
  initialModules,
  initialProgress,
  initialFinalExam,
}: {
  assignmentId: string;
  initialModules: ModuleItem[];
  initialProgress: ProgressSummary;
  initialFinalExam: FinalExamSummary;
}) {
  const [modules, setModules] = useState<ModuleItem[]>(initialModules);
  const [progress, setProgress] = useState<ProgressSummary>(initialProgress);
  const [finalExam, setFinalExam] = useState<FinalExamSummary>(initialFinalExam);
  const [savingModuleId, setSavingModuleId] = useState<string | null>(null);
  const [activeVideoModule, setActiveVideoModule] = useState<{ title: string; sourceUrl: string; embedUrl: string } | null>(null);
  const [notice, setNotice] = useState<{ type: "error" | "success"; message: string } | null>(null);

  const moduleCountLabel = useMemo(() => `${modules.length} active modules`, [modules.length]);

  const applyProgressResponse = (payload: ProgressResponse) => {
    setModules((prev) =>
      prev.map((module) =>
        module.id === payload.module.id
          ? {
              ...module,
              status: payload.module.status,
              startedAt: payload.module.startedAt,
              completedAt: payload.module.completedAt,
              lastAccessedAt: payload.module.lastAccessedAt,
            }
          : module
      )
    );
    setProgress(payload.progress);
    setFinalExam(payload.finalExam);
  };

  const updateModuleProgress = async (module: ModuleItem, action: "OPEN" | "COMPLETE") => {
    setSavingModuleId(module.id);
    setNotice(null);

    try {
      const response = await fetch(`/api/training-assignments/${assignmentId}/modules/${module.id}/progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      const payload = (await response.json().catch(() => ({}))) as ProgressResponse & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to update module progress.");
      }

      applyProgressResponse(payload);
      setNotice({
        type: "success",
        message: action === "OPEN" ? "Module marked In Progress." : "Module marked Completed.",
      });

      if (action === "OPEN" && module.contentReference) {
        if (module.moduleType === "VIDEO") {
          setActiveVideoModule({
            title: module.title,
            sourceUrl: module.contentReference,
            embedUrl: resolveGoogleDriveEmbedUrl(module.contentReference),
          });
          return;
        }

        window.open(module.contentReference, "_blank", "noopener,noreferrer");
      }
    } catch (requestError) {
      setNotice({
        type: "error",
        message: requestError instanceof Error ? requestError.message : "Failed to update module progress.",
      });
    } finally {
      setSavingModuleId(null);
    }
  };

  return (
    <>
      <section className="rounded-3xl border border-indigo-100 bg-linear-to-r from-blue-50 to-purple-50 p-6 shadow-sm">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Your Progress</div>
            <div className="mt-1 text-lg font-bold text-slate-900">
              {progress.completedRequiredModules} of {progress.totalRequiredModules} completed
            </div>
          </div>
          <div className="text-4xl font-bold text-indigo-700">{formatPercentage(progress.percentage)}</div>
        </div>
        <div className="mt-4 h-5 overflow-hidden rounded-full bg-white shadow-inner">
          <div className="h-full rounded-full bg-linear-to-r from-blue-400 to-indigo-500 transition-all" style={{ width: formatPercentage(progress.percentage) }} />
        </div>
      </section>

      {notice ? (
        <div className={`rounded-xl border p-4 text-sm ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {notice.message}
        </div>
      ) : null}

      {activeVideoModule ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
          <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{activeVideoModule.title}</h3>
                <div className="mt-1 text-xs text-slate-500">Embedded training video</div>
              </div>
              <button
                type="button"
                onClick={() => setActiveVideoModule(null)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <span className="font-bold">Important:</span> This training video is hosted on Google Drive. Please make sure you are signed in to your authorized WUC Google account to view the video. If the video does not load, verify that you are logged in with the correct WUC account.
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-black">
                <iframe
                  title={`Video - ${activeVideoModule.title}`}
                  src={activeVideoModule.embedUrl}
                  className="h-[62vh] w-full"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>

              <div className="text-xs text-slate-600">
                {isGoogleDriveUrl(activeVideoModule.sourceUrl)
                  ? "Google Drive playback is embedded when permissions allow it."
                  : "Video playback depends on the external URL host's embedding policy."}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {finalExam.visible ? (
        <section
          className={`rounded-3xl border p-6 shadow-sm ${
            finalExam.alreadyPassed
              ? "border-emerald-200 bg-emerald-50"
              : finalExam.unlocked
                ? "border-indigo-200 bg-indigo-50"
                : "border-slate-200 bg-slate-100"
          }`}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-slate-900">Final Quiz</h2>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    finalExam.alreadyPassed
                      ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                      : finalExam.unlocked
                        ? "border-indigo-200 bg-indigo-100 text-indigo-700"
                        : "border-slate-300 bg-slate-200 text-slate-600"
                  }`}
                >
                  {finalExam.alreadyPassed ? "✓ Passed" : finalExam.unlocked ? "Available" : "🔒 Locked"}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                {!finalExam.unlocked
                  ? "Complete all required modules to unlock."
                  : finalExam.alreadyPassed
                    ? `Latest score: ${finalExam.latestResult?.scorePercent ?? "-"}%`
                    : finalExam.latestResult?.passed === false
                      ? `Last score: ${finalExam.latestResult.scorePercent ?? "-"}%. You can retake the quiz.`
                      : "You're ready to take the final quiz."}
                {finalExam.passingScore != null ? ` Passing score: ${finalExam.passingScore}%.` : ""}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {finalExam.alreadyPassed ? (
                <>
                  <Link
                    href={`/training/assignments/${assignmentId}/quiz`}
                    className="inline-flex rounded-lg border border-indigo-300 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
                  >
                    Review Results
                  </Link>
                  {finalExam.certificateId ? (
                    <Link
                      href={`/training/certificates/${finalExam.certificateId}`}
                      className="inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                      View Certificate
                    </Link>
                  ) : null}
                </>
              ) : finalExam.unlocked ? (
                <Link
                  href={`/training/assignments/${assignmentId}/quiz`}
                  className="inline-flex rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                >
                  {finalExam.latestResult?.passed === false ? "Retake Quiz" : "Start Quiz"}
                </Link>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Course Content</div>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">Modules</h2>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
            {moduleCountLabel}
          </div>
        </div>

        {modules.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
            No active modules are linked to this training program yet.
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {modules.map((module) => {
              const isSaving = savingModuleId === module.id;
              const canOpen = Boolean(module.contentReference);
              const isCompleted = module.status === "COMPLETED";
              const isInProgress = module.status === "IN_PROGRESS";
              const isNotStarted = module.status === "NOT_STARTED";

              return (
                <article key={module.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-blue-100 to-purple-100 text-lg font-bold text-indigo-700">
                      {module.displayOrder}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">{module.title}</h3>
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${MODULE_STATUS_CLASSNAMES[module.status] || MODULE_STATUS_CLASSNAMES.NOT_STARTED}`}>
                          {MODULE_STATUS_LABELS[module.status] || module.status}
                        </span>
                        {!module.isRequired ? (
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-500">Optional</span>
                        ) : null}
                      </div>
                      {module.description ? <p className="mt-1 line-clamp-2 text-sm text-slate-600">{module.description}</p> : null}
                      <div className="mt-1 text-xs text-slate-500">
                        {MODULE_TYPE_LABELS[module.moduleType] || module.moduleType}
                        {module.completedAt ? ` · Completed ${formatDate(module.completedAt)}` : ""}
                        {!canOpen ? " · No course link available yet" : ""}
                      </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={isSaving || !canOpen}
                        onClick={() => void updateModuleProgress(module, "OPEN")}
                        className={
                          isNotStarted
                            ? "rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                            : "rounded-lg border border-indigo-300 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
                        }
                      >
                        {isInProgress ? "Continue Course" : isCompleted ? "Review" : "Open Course"}
                      </button>

                      {isInProgress ? (
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => void updateModuleProgress(module, "COMPLETE")}
                          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Mark Completed
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
