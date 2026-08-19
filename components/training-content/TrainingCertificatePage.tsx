"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useCurrentUserContext } from "@/components/CurrentUserContextProvider";

type CertificatePayload = {
  certificate: {
    id: string;
    certificateId: string;
    status: string;
    completionDate: string | null;
    createdAt: string | null;
    employeeName: string;
    employeeCode: string;
    trainingProgramName: string;
    trainingProgramCode: string | null;
    finalScore: number | null;
    requiredPassingScore: number | null;
  };
  employee: {
    id: string;
    employeeId: string;
    name: string;
    email: string;
  };
  trainingProgram: {
    id: string;
    trainingName: string;
    programCode: string | null;
    category: string;
    requirementType: string;
  };
  cycle: {
    id: string;
    sequence: number;
    cycleStartDate: string | null;
    cycleDueDate: string | null;
  };
  assignment: {
    id: string;
    status: string;
    completionDate: string | null;
  };
  completionRecord: {
    id: string;
    completedAt: string | null;
    examScore: number | null;
  } | null;
  finalQuizAttempt: {
    id: string;
    attemptNumber: number;
    scorePercent: number | null;
    passingScoreUsed: number | null;
    submittedAt: string | null;
    passed: boolean | null;
  } | null;
  access: {
    viewedAs: "HR_ADMIN" | "EMPLOYEE";
  };
};

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function TrainingCertificatePage({ certificateId }: { certificateId: string }) {
  const { viewMode, loading: userLoading } = useCurrentUserContext();
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<CertificatePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userLoading) {
      return;
    }

    let active = true;

    const loadCertificate = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/training-certificates/${certificateId}`, {
          headers: {
            "X-View-Mode": viewMode,
          },
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || "Failed to load training certificate.");
        }
        if (active) {
          setPayload(data as CertificatePayload);
        }
      } catch (requestError) {
        if (active) {
          setError(
            requestError instanceof Error ? requestError.message : "Failed to load training certificate."
          );
          setPayload(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadCertificate();

    return () => {
      active = false;
    };
  }, [certificateId, userLoading, viewMode]);

  useEffect(() => {
    if (!payload) {
      return;
    }

    const previousTitle = document.title;
    const safeCourseName = payload.trainingProgram.trainingName.trim() || "Training Certificate";
    const safeEmployeeName = payload.certificate.employeeName.trim();
    document.title = safeEmployeeName
      ? `${safeCourseName} - ${safeEmployeeName} Certificate`
      : `${safeCourseName} Certificate`;

    return () => {
      document.title = previousTitle;
    };
  }, [payload]);

  if (loading || userLoading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading certificate...</div>;
  }

  if (error) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error}</div>;
  }

  if (!payload) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Certificate data is unavailable.</div>;
  }

  return (
    <div className="certificate-print-layout space-y-6 print:space-y-0">
      <style jsx global>{`
        @page {
          size: landscape;
          margin: 8mm;
        }

        @media print {
          html,
          body {
            background: white !important;
          }

          .certificate-print-layout {
            width: 100%;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .certificate-print-card {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <Link href="/" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
            Back to Dashboard
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Training Certificate</h1>
          <p className="mt-1 text-sm text-slate-600">
            Certificate ID: <span className="font-semibold text-slate-900">{payload.certificate.certificateId}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-3 print:hidden">
          <div className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            Viewed as {payload.access.viewedAs === "HR_ADMIN" ? "HR Admin" : "Employee"}
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Print Certificate
          </button>
        </div>
      </div>

      <section className="certificate-print-card overflow-hidden rounded-[2rem] border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-100 p-4 shadow-sm print:rounded-[1.25rem] print:border-slate-300 print:p-0 print:shadow-none">
        <div className="rounded-[1.6rem] border-[5px] border-amber-300 bg-white/95 p-8 text-center print:rounded-[1.1rem] print:border-[4px] print:p-6">
          <div className="flex flex-col items-center gap-4 print:gap-3">
            <div className="flex items-center justify-center">
              <Image
                src="/logo_Round.png"
                alt="WUC logo"
                width={92}
                height={92}
                className="h-20 w-20 object-contain print:h-16 print:w-16"
                priority
              />
            </div>

            <div className="text-sm font-semibold uppercase tracking-[0.45em] text-amber-700 print:text-[11px]">
              Certificate of Completion
            </div>
          </div>

          <div className="mt-6 space-y-4 print:mt-4 print:space-y-3">
            <h2 className="text-5xl font-semibold text-slate-900 [font-family:Georgia,'Times_New_Roman',serif] print:text-[54px]">
              {payload.certificate.employeeName}
            </h2>
            <p className="text-xl text-slate-600 print:text-[22px]">
              Employee ID: {payload.certificate.employeeCode}
            </p>
          </div>

          <div className="mx-auto mt-8 max-w-5xl print:mt-6">
            <p className="text-center text-2xl leading-10 text-slate-700 print:text-[24px] print:leading-[1.45]">
              has successfully completed the required training program
            </p>
            <h3 className="mt-5 text-center text-4xl font-bold leading-tight text-indigo-700 print:mt-4 print:text-[38px]">
              {payload.certificate.trainingProgramName}
            </h3>
          </div>

          <div className="mx-auto mt-10 grid max-w-6xl gap-5 md:grid-cols-3 print:mt-6 print:max-w-none print:grid-cols-3 print:gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-5 text-center print:min-w-0 print:rounded-xl print:p-3">
              <div className="text-sm font-semibold uppercase tracking-wide text-slate-500 print:text-[11px]">Completion Date</div>
              <div className="mt-3 text-2xl font-bold text-slate-900 print:mt-2 print:text-[24px]">{formatDate(payload.certificate.completionDate)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-5 text-center print:min-w-0 print:rounded-xl print:p-3">
              <div className="text-sm font-semibold uppercase tracking-wide text-slate-500 print:text-[11px]">Final Score</div>
              <div className="mt-3 text-2xl font-bold text-slate-900 print:mt-2 print:text-[24px]">{payload.certificate.finalScore ?? "-"}%</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/90 p-5 text-center print:min-w-0 print:rounded-xl print:p-3">
              <div className="text-sm font-semibold uppercase tracking-wide text-slate-500 print:text-[11px]">Required Score</div>
              <div className="mt-3 text-2xl font-bold text-slate-900 print:mt-2 print:text-[24px]">{payload.certificate.requiredPassingScore ?? "-"}%</div>
            </div>
          </div>

          <div className="mt-10 border-t border-slate-200 pt-6 print:mt-6 print:pt-4">
            <div className="grid grid-cols-2 gap-5 md:grid-cols-4 print:grid-cols-4 print:gap-3">
              <div className="rounded-xl bg-white/70 px-4 py-3 text-center">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 print:text-[10px]">Program Code</div>
                <div className="mt-2 text-lg font-semibold text-slate-900 print:mt-1 print:text-[18px]">
                  {payload.certificate.trainingProgramCode || payload.trainingProgram.programCode || "-"}
                </div>
              </div>
              <div className="rounded-xl bg-white/70 px-4 py-3 text-center">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 print:text-[10px]">Cycle</div>
                <div className="mt-2 text-lg font-semibold text-slate-900 print:mt-1 print:text-[18px]">{payload.cycle.sequence}</div>
              </div>
              <div className="rounded-xl bg-white/70 px-4 py-3 text-center">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 print:text-[10px]">Quiz Attempt</div>
                <div className="mt-2 text-lg font-semibold text-slate-900 print:mt-1 print:text-[18px]">{payload.finalQuizAttempt?.attemptNumber ?? "-"}</div>
              </div>
              <div className="rounded-xl bg-white/70 px-4 py-3 text-center">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 print:text-[10px]">Issued</div>
                <div className="mt-2 text-lg font-semibold text-slate-900 print:mt-1 print:text-[18px]">{formatDate(payload.certificate.createdAt)}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2 print:hidden">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Certificate Audit</div>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <div><span className="font-semibold text-slate-900">Certificate ID:</span> {payload.certificate.certificateId}</div>
            <div><span className="font-semibold text-slate-900">Status:</span> {payload.certificate.status}</div>
            <div><span className="font-semibold text-slate-900">Assignment Status:</span> {payload.assignment.status}</div>
            <div><span className="font-semibold text-slate-900">Completion Record:</span> {payload.completionRecord?.id || "-"}</div>
            <div><span className="font-semibold text-slate-900">Quiz Attempt ID:</span> {payload.finalQuizAttempt?.id || "-"}</div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Training Details</div>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <div><span className="font-semibold text-slate-900">Program:</span> {payload.trainingProgram.trainingName}</div>
            <div><span className="font-semibold text-slate-900">Employee:</span> {payload.employee.name} ({payload.employee.email})</div>
            <div><span className="font-semibold text-slate-900">Cycle Window:</span> {formatDate(payload.cycle.cycleStartDate)} to {formatDate(payload.cycle.cycleDueDate)}</div>
            <div><span className="font-semibold text-slate-900">Quiz Submitted:</span> {formatDate(payload.finalQuizAttempt?.submittedAt)}</div>
            <div><span className="font-semibold text-slate-900">Passed:</span> {payload.finalQuizAttempt?.passed ? "Yes" : "No"}</div>
          </div>
        </div>
      </section>
    </div>
  );
}
