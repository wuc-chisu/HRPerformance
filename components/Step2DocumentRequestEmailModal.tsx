"use client";

import { useMemo, useState } from "react";

interface Step2DocumentRequestEmailModalProps {
  employeeId: string;
  employeeName: string;
  workEmail: string;
  personalEmail: string;
  onClose: () => void;
  onSent: () => void;
}

const EMAIL_SUBJECT = "WUC Onboarding Documents – Action Required";

function buildEmailBody(fullName: string): string {
  return `Hi ${fullName},

As part of your onboarding process, please send the following documents to hr@wuc.edu:

1. Copy of ID — U.S. Passport or Green Card
2. Current Resume
3. Copy of Diploma(s) or Degree Certificate(s)
4. Official Transcript(s)
5. Recent Photo (2 x 3)

Please make sure the documents are clear and complete.

You may reply to this email and attach the requested documents, or send them directly to hr@wuc.edu.

If you have any questions about the required documents, please contact HR at hr@wuc.edu.

Sincerely,

Human Resources
Whitewater University of California
📍 3150 Almaden Expy, Suite 111, San Jose, CA 95118`;
}

export default function Step2DocumentRequestEmailModal({
  employeeId,
  employeeName,
  workEmail,
  personalEmail,
  onClose,
  onSent,
}: Step2DocumentRequestEmailModalProps) {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ error: boolean; message: string } | null>(null);

  const recipients = useMemo(
    () => [...new Set([personalEmail, workEmail].map((entry) => entry.trim()).filter(Boolean))],
    [personalEmail, workEmail]
  );
  const emailBody = useMemo(() => buildEmailBody(employeeName.trim()), [employeeName]);
  const [subject, setSubject] = useState(EMAIL_SUBJECT);
  const [body, setBody] = useState(emailBody);
  const [cc, setCc] = useState("hr@wuc.edu");

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
      formData.append("cc", cc.trim());
      formData.append("subject", subject.trim());
      formData.append("body", body.trim());

      const response = await fetch("/api/email/send", { method: "POST", body: formData });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to send email.");

      const recordResponse = await fetch(`/api/employees/${employeeId}/onboarding-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailType: "documents" }),
      });
      const recordPayload = await recordResponse.json().catch(() => ({}));
      if (!recordResponse.ok) throw new Error(recordPayload.error || "Email sent, but it could not be recorded.");

      setResult({ error: false, message: "Email sent successfully." });
      onSent();
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
          <h5 className="text-lg font-bold text-gray-900">Send Document Request</h5>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-xl"
            aria-label="Close"
          >
            x
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">To</p>
            <p className="text-sm text-gray-900">{recipients.length > 0 ? recipients.join(", ") : "No email on file"}</p>
          </div>
          <div>
            <label htmlFor="document-email-subject" className="text-xs font-semibold text-gray-500 uppercase">Subject</label>
            <input
              id="document-email-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900"
            />
          </div>
          <div>
            <label htmlFor="document-email-cc" className="text-xs font-semibold text-gray-500 uppercase">CC</label>
            <input
              id="document-email-cc"
              value={cc}
              onChange={(event) => setCc(event.target.value)}
              placeholder="hr@wuc.edu, another@example.com"
              className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-900"
            />
          </div>
          <div>
            <label htmlFor="document-email-body" className="text-xs font-semibold text-gray-500 uppercase mb-1">Email Body</label>
            <textarea
              id="document-email-body"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={16}
              className="mt-1 w-full whitespace-pre-wrap text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-lg p-4 font-sans"
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
            className="border border-gray-300 px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void sendEmail()}
            disabled={sending || recipients.length === 0}
            className="bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-cyan-600 disabled:bg-cyan-300"
          >
            {sending ? "Sending..." : "Send Email"}
          </button>
        </div>
      </div>
    </div>
  );
}
