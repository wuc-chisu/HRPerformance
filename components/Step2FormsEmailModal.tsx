"use client";

import { useMemo, useState } from "react";

type WorkerType = "Employee" | "Faculty" | "Contractor";
type WorkLocation = "US" | "Taiwan";

type Step2FormTemplate = {
  id: string;
  title: string;
  googleDriveUrl: string;
  displayOrder: number;
  isActive: boolean;
  appliesTo: WorkerType[];
  appliesToLocation: WorkLocation[];
};

interface Step2FormsEmailModalProps {
  employeeName: string;
  workEmail: string;
  personalEmail: string;
  workerType: WorkerType;
  workLocation: WorkLocation;
  forms: Step2FormTemplate[];
  onClose: () => void;
}

function getFirstName(fullName: string): string {
  const trimmed = fullName.trim();
  return trimmed ? trimmed.split(/\s+/)[0] : "there";
}

function buildEmailBody(firstName: string, forms: Step2FormTemplate[], workerType: WorkerType): string {
  const formList = forms
    .map((form, index) => `${index + 1}. ${form.title} – ${workerType}\n   ${form.googleDriveUrl}`)
    .join("\n\n");

  return `Hi ${firstName},

Welcome to WUC.

As part of your onboarding process, please complete the following required forms:

${formList}

Please complete all required forms and send the completed documents back to:

hr@wuc.edu

If you have any questions or have difficulty accessing any of the forms, please contact HR at hr@wuc.edu.

Sincerely,

Human Resources
Whitewater University of California
📍 3150 Almaden Expy, Suite 111, San Jose, CA 95118`;
}

const EMAIL_SUBJECT = "WUC Onboarding Forms – Action Required";

export default function Step2FormsEmailModal({
  employeeName,
  workEmail,
  personalEmail,
  workerType,
  workLocation,
  forms,
  onClose,
}: Step2FormsEmailModalProps) {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ error: boolean; message: string } | null>(null);

  const recipients = useMemo(
    () => [...new Set([personalEmail, workEmail].map((entry) => entry.trim()).filter(Boolean))],
    [personalEmail, workEmail]
  );

  const firstName = useMemo(() => getFirstName(employeeName), [employeeName]);
  // Re-filter defensively so the email only ever lists forms active for this person's exact worker type and location.
  const applicableForms = useMemo(
    () =>
      forms.filter(
        (form) =>
          form.isActive &&
          form.appliesTo.includes(workerType) &&
          form.appliesToLocation.includes(workLocation)
      ),
    [forms, workerType, workLocation]
  );
  const emailBody = useMemo(
    () => buildEmailBody(firstName, applicableForms, workerType),
    [firstName, applicableForms, workerType]
  );

  const sendEmail = async () => {
    if (recipients.length === 0) {
      setResult({ error: true, message: "This employee does not have a personal or work email address on file." });
      return;
    }

    setSending(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("to", recipients.join(", "));
      formData.append("subject", EMAIL_SUBJECT);
      formData.append("body", emailBody);

      const response = await fetch("/api/email/send", { method: "POST", body: formData });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to send email.");

      setResult({ error: false, message: "Email sent successfully." });
    } catch (error) {
      setResult({ error: true, message: error instanceof Error ? error.message : "Failed to send email." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-5">
          <h5 className="text-lg font-bold text-gray-900">Send Forms Request</h5>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-xl"
            aria-label="Close"
          >
            x
          </button>
        </div>

        <div className="mb-4 flex gap-6">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Worker Type</p>
            <p className="text-sm text-gray-900">{workerType}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Location</p>
            <p className="text-sm text-gray-900">{workLocation}</p>
          </div>
        </div>

        {applicableForms.length === 0 ? (
          <p className="text-sm text-gray-600">
            There are no active forms assigned to this person&apos;s worker type ({workerType}) and location ({workLocation}) in Sub-step 1.
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">To</p>
              <p className="text-sm text-gray-900">{recipients.length > 0 ? recipients.join(", ") : "No email on file"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Subject</p>
              <p className="text-sm text-gray-900">{EMAIL_SUBJECT}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Email Body</p>
              <pre className="whitespace-pre-wrap text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg p-4 font-sans">
                {emailBody}
              </pre>
            </div>
          </div>
        )}

        {result && (
          <p className={`mt-4 text-sm font-medium ${result.error ? "text-red-600" : "text-emerald-600"}`}>
            {result.message}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="border border-gray-300 px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void sendEmail()}
            disabled={sending || applicableForms.length === 0 || recipients.length === 0}
            className="bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-cyan-600 disabled:bg-cyan-300"
          >
            {sending ? "Sending..." : "Send Email"}
          </button>
        </div>
      </div>
    </div>
  );
}
