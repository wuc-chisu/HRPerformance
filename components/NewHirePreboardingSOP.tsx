"use client";

import { useEffect, useMemo, useState } from "react";
import { Employee } from "@/lib/employees";

interface NewHirePreboardingSOPProps {
  employees: Employee[];
  activeEmployees: Employee[];
  selectedEmployeeId: string | null;
  onSelectEmployee: (employeeId: string | null) => void;
}

type PreboardingStep = {
  key: string;
  title: string;
  description: string;
};

const DEFAULT_STEPS: PreboardingStep[] = [
  {
    key: "offer-letter-sent",
    title: "Step 1 — Offer Letter Sent",
    description:
      "HR prepares and sends the official offer letter to the candidate. Include position title, start date, employment type, work location, probation period, salary, reporting manager, and signature deadline.",
  },
  {
    key: "candidate-accepts-offer",
    title: "Step 2 — Candidate Accepts Offer",
    description:
      "HR confirms the signed offer letter has been received. Save the signed offer letter in the personnel file, update candidate status to 'Offer Accepted', and confirm the start date.",
  },
  {
    key: "notify-it",
    title: "Step 3 — Notify IT Engineer (Yuxian Lim) for Account Setup",
    description:
      "HR sends IT a new hire setup request. IT should prepare WUC Gmail account, Moodle access, Google Workspace / Drive access, and other system access if needed.",
  },
  {
    key: "notify-registrar",
    title: "Step 4 — Notify Registrar (TingYi Tung) for Required Documents",
    description:
      "HR notifies Ting-Yi / Admin to begin new employee documentation collection. Admin collects onboarding forms, identification, resume, diploma/transcript, emergency contact, and other personnel documents according to Staff Onboarding SOP.",
  },
  {
    key: "notify-benefits",
    title: "Step 5 — Notify Benefits / Insurance Contact",
    description:
      "HR notifies Manager, Office of Compliance (Jennifer) to coordinate Labor Insurance and Health Insurance process. Contact the employee, explain the application process, confirm required documents, collect receipt, and confirm reimbursement amount for payroll.",
  },
  {
    key: "hr-onboarding-preparation",
    title: "Step 6 — HR Onboarding Preparation",
    description:
      "HR prepares onboarding materials including Employee Handbook PDF with signature page, HR policies, Progressive Discipline & Performance Warning Policy, ClickUp usage acknowledgement, Moodle training, ClickUp training, orientation certificate requirements, and weekly/monthly performance review introduction.",
  },
  {
    key: "notify-accounting",
    title: "Step 7 — Notify Accountant / Payroll",
    description:
      "After the offer is accepted, HR informs Accountant (Paoying Huang) of the new hire. Send employee name, position, department, start date, salary, payroll method, and signed offer letter. Accounting prepares payroll setup and confirms payment schedule.",
  },
  {
    key: "send-onboarding-email",
    title: "Step 8 — Send Employee Onboarding Email",
    description:
      "This is the email you prepared for the new hire. Includes welcome, Gmail login, Moodle login, payroll information, insurance information, what to expect, and upcoming onboarding emails.",
  },
];

const DEFAULT_FROM = "Human Resource <hr@wuc.edu>";
const DEFAULT_BCC = "yannhuang@wuc.edu,coo@wuc.edu";

const findEmployeeByPattern = (employees: Employee[], pattern: RegExp): Employee | undefined =>
  employees.find((employee) => pattern.test(employee.position || employee.name || ""));

const findEmailByPattern = (employees: Employee[], pattern: RegExp) => {
  const employee = findEmployeeByPattern(employees, pattern);
  return (employee?.personalEmail || employee?.email || "").trim();
};

const findWorkEmailByPattern = (employees: Employee[], pattern: RegExp) => {
  const employee = findEmployeeByPattern(employees, pattern);
  return (employee?.email || "").trim();
};

const getStepEmailTemplate = (stepKey: string, employeeName: string | undefined) => {
  const candidate = employeeName ? employeeName : "Candidate";
  switch (stepKey) {
    case "offer-letter-sent":
      return `Hi ${candidate},\n\nWe are pleased to offer you the position. Please review the attached official offer letter and confirm the following details:\n\n- Position title\n- Start date\n- Employment type\n- Work location\n- Probation period\n- Salary\n- Reporting manager\n- Signature deadline\n\nIf you agree to the terms, please sign and return the offer letter by the deadline listed above.\n\nBest regards,\nHuman Resource`;
    case "notify-it":
      return `Hi Yuxian Lim,\n\nPlease prepare the following account setup for the new hire:\n\n- WUC Gmail account\n- Moodle access\n- Google Workspace / Drive access\n- Other system access if needed\n\nConfirm when the accounts are ready.\n\nBest regards,\nHuman Resource`;
    case "notify-registrar":
      return `Hi TingYi Tung,\n\nPlease begin new employee documentation collection for the incoming hire. Collect the required onboarding forms, identification, resume, diploma/transcript, emergency contact information, and other personnel documents according to Staff Onboarding SOP.\n\nBest regards,\nHuman Resource`;
    case "notify-benefits":
      return `Hi Jennifer,\n\nPlease coordinate Labor Insurance and Health Insurance for the new Taiwan remote employee.\n\nPlease:\n- Contact the employee\n- Explain the application process\n- Confirm required documents\n- Collect receipt\n- Confirm reimbursement amount for payroll\n\nBest regards,\nHuman Resource`;
    case "notify-accounting":
      return `Hi Paoying Huang,\n\nThe offer has been accepted for the new hire. Please prepare payroll setup and confirm the payment schedule. Send the following details to accounting:\n\n- Employee name\n- Position\n- Department\n- Start date\n- Salary\n- Payroll method\n- Signed offer letter\n\nBest regards,\nHuman Resource`;
    case "send-onboarding-email":
      return `Hi ${candidate},\n\nWelcome to the team! We are excited to have you join us. This email includes your onboarding details and next steps:\n\n- Welcome\n- Gmail login\n- Moodle login\n- Payroll information\n- Insurance information\n- What to expect\n- Upcoming onboarding emails\n\nPlease reach out if you have any questions before your start date.\n\nBest regards,\nHuman Resource`;
    default:
      return "";
  }
};

const getStepEmailSubject = (stepKey: string) => {
  switch (stepKey) {
    case "offer-letter-sent":
      return "Official Offer Letter and Next Steps";
    case "notify-it":
      return "New Hire Account Setup Request";
    case "notify-registrar":
      return "New Hire Documentation Collection";
    case "notify-benefits":
      return "Labor and Health Insurance Coordination for New Hire";
    case "notify-accounting":
      return "New Hire Payroll Setup Request";
    case "send-onboarding-email":
      return "Welcome to the Team and Onboarding Information";
    default:
      return "";
  }
};

const getStepEmailTo = (
  stepKey: string,
  employees: Employee[],
  activeEmployees: Employee[],
  employee: Employee | null
) => {
  switch (stepKey) {
    case "offer-letter-sent":
    case "send-onboarding-email":
      return employee?.email || "";
    case "notify-it":
      return findWorkEmailByPattern(employees, /it engineer|information technology|yuxian lim/i) || "";
    case "notify-registrar":
      return findWorkEmailByPattern(activeEmployees, /registrar|tingyi tung/i) || "";
    case "notify-benefits":
      return findEmailByPattern(employees, /compliance|benefits|jennifer/i) || "";
    case "notify-accounting":
      return findEmailByPattern(employees, /accountant|accounting|paoying huang/i) || "";
    default:
      return "";
  }
};

const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

const sendEmailRequest = async (
  to: string,
  subject: string,
  body: string,
  from: string,
  bcc: string,
  attachments: File[] = []
) => {
  const formData = new FormData();
  formData.append("to", to);
  formData.append("subject", subject);
  formData.append("body", body);
  if (from) {
    formData.append("from", from);
  }
  if (bcc) {
    formData.append("bcc", bcc);
  }
  attachments.forEach((file) => formData.append("attachments", file));

  const response = await fetch("/api/email/send", {
    method: "POST",
    body: formData,
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result?.error || "Failed to send email");
  }

  return result;
};

export default function NewHirePreboardingSOP({
  employees,
  activeEmployees,
  selectedEmployeeId,
  onSelectEmployee,
}: NewHirePreboardingSOPProps) {
  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === selectedEmployeeId) || null,
    [employees, selectedEmployeeId]
  );

  const defaultStepEmailDrafts = useMemo(
    () =>
      Object.fromEntries(
        DEFAULT_STEPS.map((step) => [step.key, getStepEmailTemplate(step.key, selectedEmployee?.name)])
      ),
    [selectedEmployee?.name]
  );

  const defaultBcc = useMemo(() => {
    const ceoEmail = findEmailByPattern(employees, /ceo|chief executive|president/i);
    const cooVpEmail = findEmailByPattern(employees, /coo|chief operating|vp|vice president/i);
    return [ceoEmail, cooVpEmail].filter(Boolean).join(",");
  }, [employees]);

  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>(
    Object.fromEntries(DEFAULT_STEPS.map((step) => [step.key, false]))
  );
  const [stepEmailDrafts, setStepEmailDrafts] = useState<Record<string, string>>(defaultStepEmailDrafts);
  const [stepEmailBccs, setStepEmailBccs] = useState<Record<string, string>>(
    Object.fromEntries(DEFAULT_STEPS.map((step) => [step.key, defaultBcc || DEFAULT_BCC]))
  );
  const defaultStepEmailTos = useMemo(
    () =>
      Object.fromEntries(
        DEFAULT_STEPS.map((step) => [
          step.key,
          getStepEmailTo(step.key, employees, activeEmployees, selectedEmployee),
        ])
      ),
    [employees, activeEmployees, selectedEmployee]
  );
  const [stepEmailTos, setStepEmailTos] = useState<Record<string, string>>(defaultStepEmailTos);
  const [attachedFileNames, setAttachedFileNames] = useState<Record<string, string | null>>(
    Object.fromEntries(DEFAULT_STEPS.map((step) => [step.key, null]))
  );
  const [attachedFiles, setAttachedFiles] = useState<Record<string, File | null>>(
    Object.fromEntries(DEFAULT_STEPS.map((step) => [step.key, null]))
  );
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatusMessage, setEmailStatusMessage] = useState<string | null>(null);

  const handleSendEmail = async (
    to: string,
    subject: string,
    body: string,
    from: string,
    bcc: string,
    attachments: File[] = []
  ) => {
    setEmailStatusMessage(null);

    const trimmedTo = to.trim();
    const trimmedSubject = subject.trim();
    const trimmedBody = body.trim();
    const trimmedFrom = from.trim();
    const trimmedBcc = bcc.trim();

    if (!trimmedTo) {
      setEmailStatusMessage("Recipient (To) is required.");
      return;
    }
    const toAddresses = trimmedTo.split(",").map((address) => address.trim()).filter(Boolean);
    if (toAddresses.length === 0) {
      setEmailStatusMessage("Recipient (To) is required.");
      return;
    }
    if (toAddresses.length > 1) {
      setEmailStatusMessage("Please send to only one recipient at a time.");
      return;
    }
    if (!isValidEmail(toAddresses[0])) {
      setEmailStatusMessage("Please enter a valid recipient email address.");
      return;
    }
    if (!trimmedSubject) {
      setEmailStatusMessage("Subject is required.");
      return;
    }
    if (!trimmedBody) {
      setEmailStatusMessage("Email body is required.");
      return;
    }

    setIsSendingEmail(true);
    try {
      await sendEmailRequest(toAddresses[0], trimmedSubject, trimmedBody, trimmedFrom, trimmedBcc, attachments);
      const bccInfo = trimmedBcc ? ` BCC: ${trimmedBcc}` : "";
      setEmailStatusMessage(`Email sent to ${toAddresses[0]}.${bccInfo}`);
    } catch (error) {
      setEmailStatusMessage(error instanceof Error ? error.message : "Failed to send email.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  useEffect(() => {
    setStepEmailDrafts(defaultStepEmailDrafts);
  }, [defaultStepEmailDrafts]);

  useEffect(() => {
    setStepEmailTos(defaultStepEmailTos);
  }, [defaultStepEmailTos]);

  const showBenefitsStep = selectedEmployee?.staffWorkLocation?.toLowerCase().includes("taiwan");
  const visibleSteps = DEFAULT_STEPS.filter((step) => step.key !== "notify-benefits" || showBenefitsStep);
  const completedCount = Object.entries(completedSteps).filter(
    ([key, value]) => value && visibleSteps.some((step) => step.key === key)
  ).length;

  const handleToggleStep = (key: string) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const employeeOptions = useMemo(
    () =>
      employees
        .slice()
        .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: "base" }))
        .map((employee) => ({ id: employee.id, label: `${employee.name} (${employee.id})` })),
    [employees]
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-sky-700 uppercase tracking-[0.2em]">
              New Hire Preboarding Internal SOP
            </p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">
              8-step New Hire Preboarding Checklist
            </h2>
            <p className="mt-2 text-sm text-slate-600 max-w-2xl">
              Use this workflow to move new employees from offer acceptance to onboarding email delivery.
            </p>
          </div>
          <div className="w-full md:w-auto">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Select New Hire
            </label>
            <select
              value={selectedEmployeeId || ""}
              onChange={(event) => onSelectEmployee(event.target.value || null)}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            >
              <option value="">Choose an employee...</option>
              {employeeOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(18rem,24rem)_1fr]">
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-slate-600">Progress</p>
            <div className="mt-4 h-4 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-sky-500 transition-all"
                style={{ width: `${(completedCount / visibleSteps.length) * 100}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-slate-600">
              {completedCount} of {visibleSteps.length} steps complete
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Quick Notes</h3>
            <ul className="space-y-3 text-sm text-slate-600">
              <li>✓ Track each step manually as you complete it.</li>
              <li>✓ Step 8 has the onboarding email template ready to copy.</li>
              <li>✓ You can switch employees at any time without losing the page state.</li>
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          {visibleSteps.map((step) => (
            <div key={step.key} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                  <p className="mt-2 text-sm text-slate-600">{step.description}</p>
                </div>
                <label className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={completedSteps[step.key]}
                    onChange={() => handleToggleStep(step.key)}
                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  {completedSteps[step.key] ? "Done" : "Pending"}
                </label>
              </div>
              {[
                "offer-letter-sent",
                "notify-it",
                "notify-registrar",
                "notify-benefits",
                "notify-accounting",
                "send-onboarding-email",
              ].includes(step.key) && (
                <div className="mt-6 space-y-4">
                  <label className="block text-sm font-semibold text-slate-700">
                    {step.key === "offer-letter-sent" ? "Offer Letter Email Ready to Send" : step.key === "send-onboarding-email" ? "Onboarding Email Ready to Send" : "Email Ready to Send"}
                  </label>
                  <textarea
                    rows={8}
                    value={stepEmailDrafts[step.key] || ""}
                    onChange={(event) =>
                      setStepEmailDrafts((prev) => ({
                        ...prev,
                        [step.key]: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  />
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">To</label>
                    <input
                      type="text"
                      value={stepEmailTos[step.key] || ""}
                      onChange={(event) =>
                        setStepEmailTos((prev) => ({
                          ...prev,
                          [step.key]: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">BCC</label>
                    <input
                      type="text"
                      value={stepEmailBccs[step.key] || ""}
                      onChange={(event) =>
                        setStepEmailBccs((prev) => ({
                          ...prev,
                          [step.key]: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                    />
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Attach File (optional)
                    </label>
                    <label className="inline-flex w-full cursor-pointer items-center justify-between rounded-2xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm font-medium text-slate-900 hover:border-slate-400 hover:bg-slate-200">
                      <span>
                        {attachedFileNames[step.key]
                          ? attachedFileNames[step.key]
                          : "Choose a file to attach"}
                      </span>
                      <span className="rounded-full bg-sky-600 px-3 py-1 text-xs font-semibold text-white">
                        Browse
                      </span>
                      <input
                        type="file"
                        accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          setAttachedFileNames((prev) => ({
                            ...prev,
                            [step.key]: file ? file.name : null,
                          }));
                          setAttachedFiles((prev) => ({
                            ...prev,
                            [step.key]: file || null,
                          }));
                        }}
                        className="sr-only"
                      />
                    </label>
                    {attachedFileNames[step.key] && (
                      <p className="mt-2 text-sm text-slate-600">
                        Attached file: <span className="font-semibold">{attachedFileNames[step.key]}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={isSendingEmail}
                      onClick={() =>
                        handleSendEmail(
                          stepEmailTos[step.key] || getStepEmailTo(step.key, employees, activeEmployees, selectedEmployee),
                          getStepEmailSubject(step.key),
                          stepEmailDrafts[step.key] || "",
                          "Human Resource <hr@wuc.edu>",
                          stepEmailBccs[step.key] !== undefined
                            ? stepEmailBccs[step.key]
                            : defaultBcc || DEFAULT_BCC,
                          attachedFiles[step.key] ? [attachedFiles[step.key] as File] : []
                        )
                      }
                      className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 transition-colors disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {step.key === "offer-letter-sent"
                        ? "Send Offer Letter Email"
                        : step.key === "send-onboarding-email"
                        ? "Send Onboarding Email"
                        : "Send Email"}
                    </button>
                    {emailStatusMessage && (
                      <p className="text-sm font-medium text-slate-700">{emailStatusMessage}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
