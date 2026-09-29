"use client";

import { useMemo, useState } from "react";

type WorkLocation = "US" | "Taiwan";

interface PayrollSetupEmailModalProps {
  employeeId: string;
  employeeName: string;
  jobTitle: string;
  startDate: string;
  monthlySalary?: number | null;
  workLocation: WorkLocation;
  accountingEmail: string;
  onClose: () => void;
  onSent: () => void;
}

function formatSalary(value?: number | null): string {
  return value == null
    ? "[Salary, if available]"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function buildEmailBody(
  employeeName: string,
  jobTitle: string,
  startDate: string,
  monthlySalary?: number | null
): string {
  return `Hi Accounting Team,

Please set up monthly payroll payment for the following employee:

Employee Name: ${employeeName}
Position: ${jobTitle || "[Job Title]"}
Start Date: ${startDate || "[Start Date]"}
Monthly Salary: ${formatSalary(monthlySalary)}

Attached for your reference are:

1. Hiring / Offer Letter
2. Employee Payment Authorization Form

Please use the payment information provided in the Employee Payment Authorization Form for the employee's monthly payroll payment.

Please let HR know if any additional information or documentation is needed.

Thank you,

HR
Whitewater University of California
hr@wuc.edu`;
}

export default function PayrollSetupEmailModal({
  employeeId,
  employeeName,
  jobTitle,
  startDate,
  monthlySalary,
  workLocation,
  accountingEmail,
  onClose,
  onSent,
}: PayrollSetupEmailModalProps) {
  const authorizationName = workLocation === "Taiwan"
    ? "PayPal Payment Authorization Form"
    : "Check Payment Authorization Form";
  const [to, setTo] = useState(accountingEmail);
  const [cc, setCc] = useState("yuguo@wuc.edu, hr@wuc.edu");
  const [subject, setSubject] = useState(`Payroll Setup Information - ${employeeName}`);
  const [body, setBody] = useState(() => buildEmailBody(employeeName, jobTitle, startDate, monthlySalary));
  const [offerLetter, setOfferLetter] = useState<File | null>(null);
  const [authorizationForm, setAuthorizationForm] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ error: boolean; message: string } | null>(null);

  const missingAttachments = useMemo(
    () => [
      !offerLetter ? "Hiring / Offer Letter" : null,
      !authorizationForm ? authorizationName : null,
    ].filter((name): name is string => Boolean(name)),
    [authorizationForm, authorizationName, offerLetter]
  );

  const sendEmail = async () => {
    if (!to.trim() || !subject.trim() || !body.trim()) {
      setResult({ error: true, message: "To, subject, and email body are required." });
      return;
    }
    if (missingAttachments.length > 0) {
      setResult({
        error: true,
        message: `Complete or upload the following document${missingAttachments.length === 1 ? "" : "s"}: ${missingAttachments.join(", ")}.`,
      });
      return;
    }

    setSending(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("to", to.trim());
      formData.append("cc", cc.trim());
      formData.append("subject", subject.trim());
      formData.append("body", body.trim());
      formData.append("attachments", offerLetter as File);
      formData.append("attachments", authorizationForm as File);

      const response = await fetch("/api/email/send", { method: "POST", body: formData });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to send payroll email.");

      const recordResponse = await fetch(`/api/employees/${encodeURIComponent(employeeId)}/onboarding-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailType: "payroll" }),
      });
      const recordPayload = await recordResponse.json().catch(() => ({}));
      if (!recordResponse.ok) throw new Error(recordPayload.error || "Email sent, but it could not be recorded.");

      setResult({ error: false, message: "Payroll email sent successfully." });
      onSent();
      onClose();
    } catch (error) {
      setResult({ error: true, message: error instanceof Error ? error.message : "Failed to send payroll email." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h5 className="text-lg font-bold text-gray-900">Send Payroll Setup Email to Accountant</h5>
          <button type="button" onClick={onClose} className="text-xl text-gray-500 hover:text-gray-800" aria-label="Close">x</button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="payroll-email-to" className="text-xs font-semibold uppercase text-gray-500">To</label>
            <input id="payroll-email-to" value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
          </div>
          <div>
            <label htmlFor="payroll-email-cc" className="text-xs font-semibold uppercase text-gray-500">CC</label>
            <input id="payroll-email-cc" value={cc} onChange={(event) => setCc(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
          </div>
          <div>
            <label htmlFor="payroll-email-subject" className="text-xs font-semibold uppercase text-gray-500">Subject</label>
            <input id="payroll-email-subject" value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900" />
          </div>
          <div>
            <label htmlFor="payroll-email-body" className="mb-1 text-xs font-semibold uppercase text-gray-500">Email Body</label>
            <textarea id="payroll-email-body" value={body} onChange={(event) => setBody(event.target.value)} rows={18} className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 p-4 font-sans text-sm text-gray-800" />
          </div>
          <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-4">
            <p className="text-sm font-semibold text-gray-900">Required attachments</p>
            <div className="mt-3 space-y-3">
              <div>
                <label htmlFor="payroll-offer-letter" className="block text-xs font-semibold text-gray-600">Hiring / Offer Letter</label>
                <input id="payroll-offer-letter" type="file" onChange={(event) => setOfferLetter(event.target.files?.[0] || null)} className="mt-1 block w-full text-sm text-gray-700" />
                <p className="mt-1 text-xs text-gray-600">{offerLetter ? offerLetter.name : "Missing: upload the hiring / offer letter."}</p>
              </div>
              <div>
                <label htmlFor="payroll-authorization-form" className="block text-xs font-semibold text-gray-600">{authorizationName}</label>
                <input id="payroll-authorization-form" type="file" onChange={(event) => setAuthorizationForm(event.target.files?.[0] || null)} className="mt-1 block w-full text-sm text-gray-700" />
                <p className="mt-1 text-xs text-gray-600">{authorizationForm ? authorizationForm.name : `Missing: upload the ${authorizationName}.`}</p>
              </div>
            </div>
          </div>
        </div>

        {result && <p className={`mt-4 text-sm font-medium ${result.error ? "text-red-600" : "text-emerald-600"}`}>{result.message}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={() => void sendEmail()} disabled={sending} className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600 disabled:bg-cyan-300">{sending ? "Sending..." : "Send"}</button>
        </div>
      </div>
    </div>
  );
}
