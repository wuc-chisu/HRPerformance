"use client";

import type { Employee } from "@/lib/employees";
import { REQUIRED_HR_POLICY_SIGNOFFS, REQUIRED_TRAINING_ITEMS } from "@/lib/employees";
import { formatCompactDate } from "@/lib/dateUtils";

type EmployeeTrainingViewProps = {
  employee: Employee;
};

function getFormStatus(forms: Array<{ name: string; status?: string; dateCompleted?: string | null }>, name: string) {
  return forms.find((form) => form.name === name) || null;
}

export default function EmployeeTrainingView({ employee }: EmployeeTrainingViewProps) {
  const onboarding = employee.onboarding;
  const policyForms = onboarding?.step3Forms || [];
  const trainingForms = onboarding?.step4Forms || [];
  const pdRecords = employee.professionalDevelopmentRecords || [];

  const completedTrainingCount = trainingForms.filter((form) => form.status === "Approved").length;
  const trainingProgress = trainingForms.length
    ? Math.round((completedTrainingCount / trainingForms.length) * 100)
    : 0;

  const completedCertificates = trainingForms.filter((form) => form.status === "Approved");

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-900">My Training</h2>
        <p className="mt-2 text-sm text-slate-600">
          Personal training and compliance summary for {employee.name}.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Employee</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{employee.id}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Progress</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{trainingProgress}% complete</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Certificates</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{completedCertificates.length}</div>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Training History</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{pdRecords.length} records</div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900">Required Trainings</h3>
          <div className="mt-4 space-y-3">
            {REQUIRED_TRAINING_ITEMS.map((name) => {
              const form = getFormStatus(trainingForms, name);
              return (
                <div key={name} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">{name}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Status: {form?.status || "Pending"}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
                      {form?.dateCompleted || "Not completed"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900">Policy Acknowledgements</h3>
          <div className="mt-4 space-y-3">
            {REQUIRED_HR_POLICY_SIGNOFFS.map((name) => {
              const form = getFormStatus(policyForms, name);
              return (
                <div key={name} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-slate-900">{name}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Status: {form?.status || "Pending"}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 border border-slate-200">
                      {form?.dateCompleted || "Not completed"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900">My Certificates</h3>
        {completedCertificates.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No completed certificates yet.</p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {completedCertificates.map((certificate) => (
              <div key={certificate.name} className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="font-semibold text-emerald-900">{certificate.name}</p>
                <p className="mt-1 text-sm text-emerald-800">
                  Completed {certificate.dateCompleted || "recently"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900">My Training History</h3>
        {pdRecords.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No training history recorded yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Title</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Date</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {[...pdRecords]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-900">{record.title}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{formatCompactDate(record.date)}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{record.hours}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}