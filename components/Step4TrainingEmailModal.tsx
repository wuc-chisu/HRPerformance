"use client";

import { useState } from "react";

interface Step4TrainingEmailModalProps {
  employeeName: string;
  employeeEmail: string;
  personalEmail: string;
  employmentStatus?: "Employee" | "Faculty";
  onClose: () => void;
}

const EMAIL_SUBJECT = "WUC New Hire Training Requirements – Action Required";

function buildEmailBody(fullName: string, employmentStatus: "Employee" | "Faculty" = "Employee"): string {
  const trimmed = fullName.trim();
  const libraryResources = employmentStatus === "Faculty"
    ? `Library and Learning Resources:
Video:
https://drive.google.com/file/d/1tJloFvufdi7A-Pbt8-Aj_K1wFcf8f0ZW/view?usp=sharing

Booklet:
https://drive.google.com/file/d/1yLlYd3MkjbXdfZ-XwZHWjO3KVKrfDov_/view?usp=drive_link

Distance Education Training & Handbook:
https://drive.google.com/file/d/1yqL3B8g-hP6HIh4DxCfP_h_Upy1nkGWG/view?usp=sharing`
    : "";
  const facultyOrientationExam = employmentStatus === "Faculty"
    ? `Exam 2 – New Faculty, Distance Education & Library Orientation Exam:
https://docs.google.com/forms/d/1zvpVx90FS8pY_deCCe-hgCmbsYe8eBCVJh_trA6sCvc/preview`
    : "";

  return `Hi ${trimmed || "there"},

As part of your WUC onboarding process, please complete the following required training and exams.

1. Annual FERPA Training & Certificate

Training Link:
https://studentprivacy.ed.gov/training/ferpa-101-colleges-universities

Please:
- Register and log in.
- Review the training materials.
- Complete the exam.
- Download your completion certificate.
- Email the certificate to hr@wuc.edu.

2. Annual Employee & Faculty Training and Exam

${libraryResources}

California Acupuncture Board Ethics Training (Faculty Only):
https://drive.google.com/file/d/1wZraNeElho0FS9fOMBPZ5Ha0luE2Drfi/view?usp=drive_link

Emergency Training 2026:
https://docs.google.com/document/d/1TtJnLbls8e3DlmpKCAgtSPR7eRydqO7w/edit?usp=drive_link&ouid=101995486260031776904&rtpof=true&sd=true

WUC Ethics Training Videos 2026:
https://drive.google.com/drive/folders/1jlYUTb_zdkYgty-fN3LF1B8QYyl_55DT?dmr=1&ec=wgc-drive-hero-goto

Annual Training Exam:
https://docs.google.com/forms/d/e/1FAIpQLSdpFEyUN15faacSJMWmwWf9MPCzBcaiX0FACfOHVT6O07t2rQ/viewform

3. Professional Development Training

Training Link:
https://www.coursera.org/learn/ai-security

Please:
- Select “Enroll for Free”.
- Begin the course.
- Take at least 3 screenshots during the training.
- Email the screenshots to hr@wuc.edu.

4. New Hire / Faculty Orientation Exams

Exam 1 – New Faculty Orientation Exam:
https://docs.google.com/forms/d/e/1FAIpQLSeMNF2TCIQDQO0wvxfR2BbQ_zW2qiC-E9tcQwT8os7RTMDbUQ/viewform

Minimum passing score: 70%

${facultyOrientationExam}

Exam 3 – Faculty Pre-Orientation Workshop:
https://forms.gle/Heacup1SvaTM54Mq5

Please send the following to hr@wuc.edu after completion:
- FERPA Training Certificate
- Three Professional Development training screenshots
- After completing all required trainings and exams, please complete this form and send it to HR: https://drive.google.com/file/d/1fRx9wA6_i8DUcsfoNpofTqEK6nSnUMSt/view?usp=sharing

If you have any questions or have difficulty accessing any of the training materials, please contact HR at hr@wuc.edu.

Sincerely,
Chi Su
Human Resources
Whitewater University of California
📍 3150 Almaden Expy, Suite 111, San Jose, CA 95118`;
}

export default function Step4TrainingEmailModal({
  employeeName,
  employeeEmail,
  personalEmail,
  employmentStatus,
  onClose,
}: Step4TrainingEmailModalProps) {
  const [to, setTo] = useState(() =>
    [...new Set([employeeEmail, personalEmail].map((email) => email.trim()).filter(Boolean))].join(", ")
  );
  const [cc, setCc] = useState("hr@wuc.edu");
  const [subject, setSubject] = useState(EMAIL_SUBJECT);
  const [body, setBody] = useState(() => buildEmailBody(employeeName, employmentStatus));
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
        throw new Error(payload.error || "Failed to send training email.");
      }

      setResult({ error: false, message: "Training email sent successfully." });
    } catch (error) {
      setResult({
        error: true,
        message: error instanceof Error ? error.message : "Failed to send training email.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h5 className="text-lg font-bold text-gray-900">Send Training Email</h5>
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
