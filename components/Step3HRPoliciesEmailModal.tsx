"use client";

import { useState } from "react";

interface Step3HRPoliciesEmailModalProps {
  employeeName: string;
  employeeEmail: string;
  personalEmail: string;
  onClose: () => void;
}

const EMAIL_SUBJECT = "WUC HR Policies – Review and Acknowledgment Required";

function buildEmailBody(fullName: string): string {
  const trimmed = String(fullName ?? "").trim();
  return `Hi ${trimmed || "there"},

As part of your WUC onboarding process, please complete the following two HR policy requirements within seven (7) days of your hire date.

1. Progressive Discipline & Performance Warning Policy

Please review the policy carefully:

https://drive.google.com/file/d/1i-fc11uN-F3XJHaPwwZTQXxB35SbhtMr/view?usp=drive_link

After reviewing the policy:
- Complete and sign the Employee Acknowledgment section at the end of the document.
- Email the signed copy to hr@wuc.edu.

2. ClickUp Usage Acknowledgment Policy

Before completing the ClickUp Usage Acknowledgment, please review the required ClickUp training materials:
ClickUP Usage Acknowledge: https://drive.google.com/file/d/1DorCQNT5EWzftk5eCoEAmCJ0FIAqvobp/view?usp=drive_link

ClicUp Video Training: https://drive.google.com/drive/folders/1ApohgmOub4eqwv4BBKrwqAhOFPCGkelH?usp=sharing

The training covers:
- Creating tasks
- Tracking time and marking tasks complete
- Setting up recurring tasks
- Managing subtasks
- Organizing, moving, and deleting tasks
- Checking weekly tasks and filters
- Tracking work hours in Timesheets
- Weekly performance reporting

After completing the training:
- Review the ClickUp Usage Acknowledgment Policy.
- Sign the acknowledgment.
- Email the signed acknowledgment back to hr@wuc.edu.

Please return both signed acknowledgments to hr@wuc.edu within seven (7) days of your hire date.

If you have any questions, please contact HR at hr@wuc.edu.

Sincerely,
Chi Su
Human Resources
Whitewater University of California
📍 3150 Almaden Expy, Suite 111, San Jose, CA 95118`;
}

function normalizeEmailValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export default function Step3HRPoliciesEmailModal({
  employeeName,
  employeeEmail,
  personalEmail,
  onClose,
}: Step3HRPoliciesEmailModalProps) {
  const [to, setTo] = useState(() =>
    [...new Set([employeeEmail, personalEmail].map(normalizeEmailValue).filter(Boolean))].join(", ")
  );
  const [cc, setCc] = useState("hr@wuc.edu");
  const [subject, setSubject] = useState(EMAIL_SUBJECT);
  const [body, setBody] = useState(() => buildEmailBody(employeeName));
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ error: boolean; message: string } | null>(null);

  const sendEmail = async () => {
    if (!to.trim() || !subject.trim() || !body.trim()) {
      setResult({ error: true, message: "To, subject, and email body are required." });
      return;
    }

    setSending(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("to", to.trim());
      formData.append("cc", cc.trim());
      formData.append("subject", subject.trim());
      formData.append("body", body);

      const response = await fetch("/api/email/send", { method: "POST", body: formData });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Failed to send HR policies email.");
      }

      setResult({ error: false, message: "Training email sent successfully." });
    } catch (error) {
      setResult({
        error: true,
        message: error instanceof Error ? error.message : "Failed to send HR policies email.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h5 className="text-lg font-bold text-gray-900">Send HR Policies Email</h5>
          <button
            type="button"
            onClick={onClose}
            className="text-xl text-gray-500 hover:text-gray-800"
            aria-label="Close"
          >
            x
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="training-email-to" className="text-xs font-semibold uppercase text-gray-500">To</label>
            <input
              id="training-email-to"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
          </div>
          <div>
            <label htmlFor="training-email-cc" className="text-xs font-semibold uppercase text-gray-500">CC</label>
            <input
              id="training-email-cc"
              value={cc}
              onChange={(event) => setCc(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
          </div>
          <div>
            <label htmlFor="training-email-subject" className="text-xs font-semibold uppercase text-gray-500">Subject</label>
            <input
              id="training-email-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
            />
          </div>
          <div>
            <label htmlFor="training-email-body" className="mb-1 text-xs font-semibold uppercase text-gray-500">Email Body</label>
            <textarea
              id="training-email-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={24}
              className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 p-4 font-sans text-sm text-gray-800"
            />
          </div>
        </div>

        {result && (
          <p className={`mt-4 text-sm font-medium ${result.error ? "text-red-600" : "text-emerald-600"}`}>
            {result.message}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void sendEmail()}
            disabled={sending}
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600 disabled:bg-cyan-300"
          >
            {sending ? "Sending..." : "Send Email"}
          </button>
        </div>
      </div>
    </div>
  );
}
