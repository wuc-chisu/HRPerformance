import Link from "next/link";
import { notFound } from "next/navigation";

import EmployeeCourseExperience from "@/components/training-content/EmployeeCourseExperience";
import { getEmployeeTrainingCourseDetail } from "@/lib/trainingCourseDetail";
import {
  TRAINING_CATEGORY_LABELS,
  TRAINING_REQUIREMENT_LABELS,
} from "@/lib/trainingCompliance";

const ASSIGNMENT_STATUS_CLASSNAMES: Record<string, string> = {
  UPCOMING: "border-sky-200 bg-sky-100 text-sky-700",
  DUE_SOON: "border-amber-200 bg-amber-100 text-amber-700",
  URGENT: "border-orange-200 bg-orange-100 text-orange-700",
  OVERDUE: "border-rose-200 bg-rose-100 text-rose-700",
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

export default async function EmployeeTrainingAssignmentDetailPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;
  const detail = await getEmployeeTrainingCourseDetail(assignmentId);

  if (!detail) {
    notFound();
  }

  const { trainingProgram, assignment, progress, finalExam, certificate } = detail;
  const quizStatus = !finalExam.visible
    ? "Not required"
    : finalExam.alreadyPassed
      ? "Passed"
      : finalExam.unlocked
        ? "Available"
        : "Locked";
  const quizBadge: Record<string, string> = {
    Passed: "border-emerald-200 bg-emerald-100 text-emerald-700",
    Available: "border-indigo-200 bg-indigo-100 text-indigo-700",
    Locked: "border-slate-300 bg-slate-200 text-slate-600",
    "Not required": "border-slate-200 bg-slate-100 text-slate-500",
  };
  const showCertificate = certificate.available || trainingProgram.certificateRequired;

  return (
    <main className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
      <header className="bg-linear-to-r from-blue-300 to-purple-300 text-white shadow-lg">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm hover:bg-white"
          >
            <span aria-hidden="true">←</span> Back to Dashboard
          </Link>
          <h1 className="mt-5 text-3xl font-bold sm:text-4xl">{trainingProgram.name}</h1>
          <p className="mt-1 text-sm text-white/90">
            {TRAINING_CATEGORY_LABELS[trainingProgram.category as keyof typeof TRAINING_CATEGORY_LABELS]} ·{" "}
            {TRAINING_REQUIREMENT_LABELS[trainingProgram.requirementType as keyof typeof TRAINING_REQUIREMENT_LABELS]}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Due Date</div>
            <div className="mt-2 text-lg font-bold text-slate-900">{formatDate(assignment.dueDate)}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Progress</div>
            <div className="mt-2 text-lg font-bold text-slate-900">{Math.round(progress.percentage)}%</div>
            <div className="text-xs text-slate-500">
              {progress.completedRequiredModules} of {progress.totalRequiredModules} modules
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</div>
            <span
              className={`mt-2 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${ASSIGNMENT_STATUS_CLASSNAMES[assignment.calculatedStatus]}`}
            >
              {assignment.calculatedStatus.replace("_", " ")}
            </span>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Passing Score</div>
            <div className="mt-2 text-lg font-bold text-slate-900">
              {trainingProgram.examRequired && trainingProgram.passingScore != null ? `${trainingProgram.passingScore}%` : "N/A"}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quiz</div>
            <span className={`mt-2 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${quizBadge[quizStatus]}`}>
              {quizStatus}
            </span>
          </div>
        </section>

        {showCertificate ? (
          <section className="flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl shadow-sm">🏅</div>
            <div className="flex-1">
              <div className="font-bold text-slate-900">Certificate</div>
              <div className="text-sm text-emerald-800">
                {certificate.available
                  ? "Your certificate is ready."
                  : "Awarded after you complete the course successfully."}
              </div>
            </div>
            {certificate.available && certificate.certificateId ? (
              <Link
                href={`/training/certificates/${certificate.certificateId}`}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                View Certificate
              </Link>
            ) : null}
          </section>
        ) : null}

        {trainingProgram.description ? (
          <p className="line-clamp-3 text-sm leading-6 text-slate-600">{trainingProgram.description}</p>
        ) : null}

        <EmployeeCourseExperience
          assignmentId={detail.assignment.id}
          initialModules={detail.modules}
          initialProgress={detail.progress}
          initialFinalExam={detail.finalExam}
        />
      </div>
    </main>
  );
}
