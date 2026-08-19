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
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Progress</div>
        <div className="mt-2 text-lg font-bold text-slate-900">
          {progress.completedRequiredModules} of {progress.totalRequiredModules} completed
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: formatPercentage(progress.percentage) }} />
        </div>
        <div className="mt-2 text-sm font-semibold text-indigo-700">{formatPercentage(progress.percentage)}</div>
      </div>

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
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Final Quiz</div>
          <div className="mt-3 text-sm text-slate-700">
            {finalExam.passingScore != null ? (
              <div>
                <span className="font-semibold text-slate-900">Passing Score:</span> {finalExam.passingScore}%
              </div>
            ) : null}
            {!finalExam.unlocked ? (
              <>
                <div className="mt-2 font-semibold text-slate-900">Final Quiz - Locked</div>
                <div className="mt-1 text-slate-600">Complete all required course modules to unlock the quiz.</div>
              </>
            ) : finalExam.alreadyPassed ? (
              <div className="mt-3 space-y-3">
                <div className="inline-flex rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                  Final Quiz Passed
                </div>
                {finalExam.latestResult ? (
                  <div className="text-slate-600">
                    Latest Score: <span className="font-semibold text-slate-900">{finalExam.latestResult.scorePercent ?? "-"}%</span>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/training/assignments/${assignmentId}/quiz`}
                    className="inline-flex rounded-lg border border-indigo-300 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
                  >
                    Review Quiz Results
                  </Link>
                  {finalExam.certificateId ? (
                    <Link
                      href={`/training/certificates/${finalExam.certificateId}`}
                      className="inline-flex rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                    >
                      View Certificate
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {finalExam.latestResult?.passed === false ? (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                    Last score: <span className="font-semibold">{finalExam.latestResult.scorePercent ?? "-"}%</span>. You can retake the quiz.
                  </div>
                ) : null}
                <Link
                  href={`/training/assignments/${assignmentId}/quiz`}
                  className="inline-flex rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 font-semibold text-emerald-700 hover:bg-emerald-100"
                >
                  {finalExam.latestResult?.passed === false ? "Retake Final Quiz" : "Take Final Quiz"}
                </Link>
              </div>
            )}
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
                <article key={module.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                          Module {module.displayOrder}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                          {MODULE_TYPE_LABELS[module.moduleType] || module.moduleType}
                        </span>
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${module.isRequired ? "border-indigo-200 bg-indigo-100 text-indigo-700" : "border-slate-200 bg-white text-slate-600"}`}>
                          {module.isRequired ? "Required" : "Optional"}
                        </span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">{module.title}</h3>
                      {module.description ? <p className="text-sm leading-6 text-slate-600">{module.description}</p> : null}

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={isSaving || !canOpen}
                          onClick={() => void updateModuleProgress(module, "OPEN")}
                          className="rounded-lg border border-indigo-300 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isInProgress ? "Continue Course" : "Open Course"}
                        </button>

                        {isInProgress ? (
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => void updateModuleProgress(module, "COMPLETE")}
                            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Mark Completed
                          </button>
                        ) : null}

                        {isCompleted ? (
                          <span className="inline-flex rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                            ✓ Completed
                          </span>
                        ) : null}

                        {!canOpen ? <span className="text-xs text-slate-500">No course link available yet.</span> : null}
                        {isNotStarted && canOpen ? <span className="text-xs text-slate-500">Opening the course sets status to In Progress.</span> : null}
                      </div>
                    </div>

                    <div className="min-w-52 space-y-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
                      <div>
                        <span className="font-semibold text-slate-900">Module Status:</span>{" "}
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${MODULE_STATUS_CLASSNAMES[module.status] || MODULE_STATUS_CLASSNAMES.NOT_STARTED}`}>
                          {MODULE_STATUS_LABELS[module.status] || module.status}
                        </span>
                      </div>
                      {module.startedAt ? (
                        <div>
                          <span className="font-semibold text-slate-900">Started:</span> {formatDate(module.startedAt)}
                        </div>
                      ) : null}
                      {module.completedAt ? (
                        <div>
                          <span className="font-semibold text-slate-900">Completed:</span> {formatDate(module.completedAt)}
                        </div>
                      ) : null}
                      {module.lastAccessedAt ? (
                        <div>
                          <span className="font-semibold text-slate-900">Last Accessed:</span> {formatDate(module.lastAccessedAt)}
                        </div>
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
