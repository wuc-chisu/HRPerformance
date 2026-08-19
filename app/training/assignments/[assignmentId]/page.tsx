import Link from "next/link";
import { notFound } from "next/navigation";

import EmployeeCourseExperience from "@/components/training-content/EmployeeCourseExperience";
import { getEmployeeTrainingCourseDetail } from "@/lib/trainingCourseDetail";
import {
  TRAINING_CATEGORY_LABELS,
  TRAINING_COMPLETION_METHOD_LABELS,
  TRAINING_METHOD_LABELS,
  TRAINING_PROGRAM_STATUS_LABELS,
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

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
              Back to Dashboard
            </Link>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">{detail.trainingProgram.name}</h1>
            <p className="mt-1 text-sm text-slate-600">
              {TRAINING_CATEGORY_LABELS[detail.trainingProgram.category as keyof typeof TRAINING_CATEGORY_LABELS]} / {" "}
              {TRAINING_REQUIREMENT_LABELS[detail.trainingProgram.requirementType as keyof typeof TRAINING_REQUIREMENT_LABELS]}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current Employee Status</div>
            <div
              className={`mt-2 inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${ASSIGNMENT_STATUS_CLASSNAMES[detail.assignment.calculatedStatus]}`}
            >
              {detail.assignment.calculatedStatus.replace("_", " ")}
            </div>
          </div>
        </div>

        <section className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Course Header</div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500">Start Date</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{formatDate(detail.assignment.cycle.startDate)}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500">Due Date</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{formatDate(detail.assignment.dueDate)}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500">Training Status</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">
                      {TRAINING_PROGRAM_STATUS_LABELS[detail.trainingProgram.status as keyof typeof TRAINING_PROGRAM_STATUS_LABELS]}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500">Assignment Status</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">{detail.assignment.status.replaceAll("_", " ")}</div>
                  </div>
                  {detail.assignment.completionDate ? (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-500">Completion Date</div>
                      <div className="mt-1 text-sm font-semibold text-slate-900">{formatDate(detail.assignment.completionDate)}</div>
                    </div>
                  ) : null}
                  <div>
                    <div className="text-xs uppercase tracking-wide text-slate-500">Current Cycle</div>
                    <div className="mt-1 text-sm font-semibold text-slate-900">Cycle {detail.assignment.cycle.sequence}</div>
                  </div>
                </div>
            </div>
          </div>

          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Course Overview</div>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <div>
                  <span className="font-semibold text-slate-900">Training Method:</span>{" "}
                  {TRAINING_METHOD_LABELS[detail.trainingProgram.trainingMethod as keyof typeof TRAINING_METHOD_LABELS]}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Completion Method:</span>{" "}
                  {TRAINING_COMPLETION_METHOD_LABELS[detail.trainingProgram.completionMethod as keyof typeof TRAINING_COMPLETION_METHOD_LABELS]}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Exam Required:</span>{" "}
                  {detail.trainingProgram.examRequired ? "Yes" : "No"}
                </div>
                {detail.trainingProgram.examRequired && detail.trainingProgram.passingScore != null ? (
                  <div>
                    <span className="font-semibold text-slate-900">Passing Score:</span>{" "}
                    {detail.trainingProgram.passingScore}%
                  </div>
                ) : null}
                <div>
                  <span className="font-semibold text-slate-900">Certificate Required:</span>{" "}
                  {detail.trainingProgram.certificateRequired ? "Yes" : "No"}
                </div>
                {detail.trainingProgram.certificateRequired ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-700">
                    A certificate can be made available after successful course completion.
                  </div>
                ) : null}
                {detail.trainingProgram.description ? (
                  <div>
                    <div className="font-semibold text-slate-900">Course Description</div>
                    <p className="mt-1 leading-6 text-slate-600">{detail.trainingProgram.description}</p>
                  </div>
                ) : null}
              </div>
            </section>
          </aside>
        </section>

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
