"use client";

import { useEffect, useMemo, useState } from "react";
import { Employee } from "@/lib/employees";

interface NewHirePreboardingSOPProps {
  employees: Employee[];
  activeEmployees: Employee[];
  eligibleEmployees: Employee[];
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
    key: "notify-accounting",
    title: "Step 6 — Notify Accountant / Payroll",
    description:
      "After the offer is accepted, HR informs Accountant (Paoying Huang) of the new hire. Send employee name, position, department, start date, salary, payroll method, and signed offer letter. Accounting prepares payroll setup and confirms payment schedule.",
  },
  {
    key: "send-onboarding-email",
    title: "Step 7 — Send Employee Onboarding Email",
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

const formatEmploymentType = (employee: Employee | null) => {
  if (!employee) return "Full time";
  const type = employee.employeeType || "Full time";
  const location = employee.staffWorkLocation || "US";
  return `${type} (${location})`;
};

const formatEmploymentTypeLabel = (employee: Employee | null) => {
  if (!employee?.employeeType) return "Full-Time";
  return employee.employeeType.toLowerCase().includes("part") ? "Part-Time" : "Full-Time";
};

const formatWorkLocationLabel = (employee: Employee | null) => {
  if (!employee?.staffWorkLocation) return "Onsite";
  const normalized = employee.staffWorkLocation.toLowerCase();
  if (normalized.includes("taiwan")) return "Remote – Taiwan";
  if (normalized.includes("us") || normalized.includes("usa") || normalized.includes("u.s.")) return "Remote – U.S.";
  return "Onsite";
};

const formatCurrency = (value: number | null | undefined) => {
  if (value == null) return "[salary data missing]";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
};

const getStepEmailTemplate = (
  stepKey: string,
  employee: Employee | null,
  employees: Employee[],
  activeEmployees: Employee[]
) => {
  const candidate = employee?.name || "Candidate";
  const position = employee?.position || "[position]";
  const department = employee?.department || "[department]";
  const startDate = employee?.joinDate || "[date]";
  const employmentType = formatEmploymentType(employee);
  const probationPeriod = "3 months";
  const monthlyDuringProbation = formatCurrency(employee?.monthlySalaryDuringProbation ?? null);
  const monthlyAfterProbation = formatCurrency(employee?.monthlySalaryAfterProbation ?? null);
  const itEngineerName =
    findEmployeeByPattern(employees, /it engineer|information technology|yuxian lim/i)?.name ||
    "IT Engineer";
  const registrarName =
    findEmployeeByPattern(activeEmployees, /registrar|tingyi tung/i)?.name || "Registrar";

  switch (stepKey) {
    case "offer-letter-sent":
      return `Dear ${candidate},\n\nThank you for your interest in joining Whitewater University of California.\n\nWe are pleased to extend an offer for the position of ${position}. Attached please find your offer letter for review.\n\nKey Employment Terms\n\n- Start Date: ${startDate}\n- Employment Type: ${employmentType}\n- Probation Period: ${probationPeriod}\n- Monthly Salary During Probation: ${monthlyDuringProbation}\n- Monthly Salary After Successful Completion of Probation: ${monthlyAfterProbation}\n\nPosition Highlights\n- Leave blank for me to fill out\n\nPlease review the attached offer letter and let us know if you have any questions. If you accept the offer, please sign and return the offer letter within seven (7) calendar days of receiving this email.\n\nWe are excited about the possibility of having you join our team and look forward to working with you.\n\nSincerely,\nChi Su\nHuman Resources\nWhitewater University of California`;
    case "notify-it":
      return `Dear ${itEngineerName},\n\nPlease create the following accounts for our new hire on their start date.\n\nEmployee Name: ${candidate}\nPosition: ${position}\nDepartment: ${department}\nStart Date: ${startDate}\n\nPlease create:\n- WUC Gmail Account\n- Moodle account\n- Clickup account\n\nClick up had create for you for tracking purpose.\nClick up Link\n\nOnce the accounts have been created, please send the login credentials and access instructions to the employee and copy HR for our records.\n\nThank you,\nSincerely,\nHuman Resources\nWhitewater University of California`;
    case "notify-registrar":
      return `Dear ${findEmployeeByPattern(activeEmployees, /registrar|tingyi tung/i)?.name || "Registrar"},\n\nI am pleased to inform you that ${candidate} has accepted our offer of employment and will be joining Whitewater University of California as ${position}, with a start date of ${startDate}.\n\nPlease begin the academic onboarding process and coordinate the following onboarding requirements with the new employee.\n\nStep 1 – Prepare Required Onboarding Documents\nPlease provide the employee with the required onboarding documents and materials.\n\nStep 2 – Required Training\nPlease ensure the employee completes the following required training:\n\n1. Annual FERPA Training and Certificate\n2. Annual Employee Training and Assessment\n3. Professional Development (PD/CEU) Training\n4. New Employee Orientation Assessment\n\nStep 3 – Required Reading and Acknowledgements\n\nPlease provide the following documents for review and acknowledgment:\n\n- School Catalog (Review and Sign)\n- Employee Handbook (Review and Sign)\n\nOnce the employee has completed all required academic onboarding items, please notify HR so we can update the employee’s onboarding status and personnel records.\n\nPlease let me know if you require any additional information.\n\nThank you for your assistance.\n\nBest regards,\nChi Su\nHuman Resources\nWhitewater University of California`;
    case "notify-benefits":
      return `Dear ${findEmployeeByPattern(employees, /manager,office of compliance|ziyun fu|jennifer/i)?.name || "Manager, Office of Compliance"},\n\nI am pleased to inform you that ${candidate} has accepted our offer of employment and will be joining Whitewater University of California as ${position}, with a start date of ${startDate}.\n\nAs part of the onboarding process for our Taiwan-based remote employee, please contact the employee directly regarding the Labor Insurance (勞工保險) and National Health Insurance (全民健康保險) enrollment process.\n\nPlease assist with the following:\n\n- Explain the Labor Insurance and National Health Insurance application process.\n- Advise the employee regarding any required forms or supporting documentation.\n- Confirm the monthly insurance contribution amount once enrollment is completed.\n- Request the employee to provide the payment receipt for the first month’s Labor and Health Insurance contributions.\n- Inform HR of the confirmed monthly reimbursement amount once available.\n\nAs communicated to the employee, Whitewater University will reimburse the employee’s Labor and Health Insurance contributions. The first month’s reimbursement will be included with the following month’s salary after receipt of the payment documentation. Going forward, the approved monthly reimbursement amount, along with applicable PayPal transaction fees, will be included in the employee’s regular monthly payroll.\n\nPlease let me know once the enrollment process has been completed or if any additional assistance is required.\n\nThank you for your support.\n\nBest regards,\nChi Su\nHuman Resources\nWhitewater University of California`;
    case "notify-accounting":
      return `Dear Accounting Team,\n\nI am pleased to inform you that ${candidate} has accepted our offer of employment and will be joining Whitewater University of California.\n\nPlease establish the employee’s payroll record and prepare payroll processing based on the information below.\n\nEmployee Information\n\n- Employee Name: ${candidate}\n- Position: ${position}\n- Department: ${department}\n- Employment Type: ${formatEmploymentTypeLabel(employee)}\n- Work Location: ${formatWorkLocationLabel(employee)}\n- Start Date: ${startDate}\n\nCompensation Information\n\n- Probationary Salary: ${monthlyDuringProbation}\n- Post-Probation Salary: ${monthlyAfterProbation}\n- Payroll Method: PayPal / Direct Deposit\n- Payroll Frequency: Monthly\n- Payroll Date: Last business day of each month\n\nSupporting Documents\n\nThe signed Offer Letter is attached for your reference and payroll records.\n\nFor Taiwan-based remote employees, please include the approved monthly Labor Insurance and National Health Insurance reimbursement, along with applicable PayPal transaction fee reimbursement, once HR confirms the reimbursement amount.\n\nPlease let HR know if any additional information is required to complete the employee’s payroll setup.\n\nThank you for your assistance.\n\nBest regards,\nChi Su\nHuman Resources\nWhitewater University of California`;
    case "send-onboarding-email":
      return `Dear ${candidate},\n\nWelcome to Whitewater University of California, and congratulations on joining our team as ${position}.\n\nWe are excited to have you join us and would like to provide an overview of your onboarding process to help you prepare for your first few weeks with the University.\n\nSystem Access\n\nOur IT team will provide your system access credentials separately. Please follow the instructions provided to activate your accounts.\n\nYour system access may include:\n\n- WUC Gmail\n- Moodle\n- ClickUp\n- Google Workspace and Shared Drive (if applicable)\n- Other systems required for your position\n\nPlease activate your accounts as soon as you receive your login credentials and notify us if you encounter any access issues.\n\nPayroll Information\n\n- Salary payments are issued on the last business day of each month.\n- Salary will be paid via Direct Deposit / PayPal.\n- Please ensure all payroll information requested by HR is submitted promptly to avoid payment delays.\n\nEmployee Benefits\n\nHR will contact you regarding any applicable employee benefits and enrollment procedures.\n\nFor eligible employees, additional information regarding insurance, reimbursements, and benefit programs will be provided during the onboarding process.\n\nAdministrative Documentation\n\nOur Administrative Office will contact you regarding the required onboarding forms and supporting documentation.\n\nPlease complete and return all requested forms in a timely manner.\n\nHR Onboarding\n\nDuring your onboarding, HR will guide you through the following:\n\n- Review and sign your Offer Letter (if not already completed)\n- Review and sign the Employee Handbook\n- Review and acknowledge University policies and required agreements\n- Introduction to University policies and procedures\n- Overview of weekly check-ins and monthly performance reviews\n\nSystem Training\n\nAs part of your onboarding, you will be asked to complete the following:\n\n- Activate your WUC Gmail account\n- Activate your Moodle account\n- Accept your ClickUp invitation and complete your account setup\n- Complete the Moodle Getting Started Training\n- Complete ClickUp Training\n- Complete any additional position-specific training assigned by your supervisor\n\nOrientation Certification Requirements\n\nAll new employees are required to complete the University’s Orientation Certification program, which includes:\n\n1. Completion of the New Employee Orientation\n2. Review of the Employee Handbook\n3. Review of the School Catalog\n4. Completion of required compliance and orientation training\n5. Completion of the Orientation Assessment (minimum passing score: 70%)\n\nUpon successful completion, an Orientation Certificate will be issued and added to your personnel file.\n\nIf you have any questions during your onboarding process, please do not hesitate to contact the Human Resources Department.\n\nOnce again, welcome to Whitewater University of California. We are excited to have you on our team and look forward to supporting your success.\n\nSincerely,\nChi Su\nHuman Resources\nWhitewater University of California\n3150 Almaden Expy, Suite 111\nSan Jose, CA 95118`;
    default:
      return "";
  }
};

const getStepEmailSubject = (stepKey: string, employee: Employee | null) => {
  switch (stepKey) {
    case "offer-letter-sent":
      return employee ? `Official Offer Letter and Next Steps - ${employee.name}` : "Official Offer Letter and Next Steps";
    case "notify-it":
      return employee
        ? `Action Required: New Hire Account Setup - ${employee.name} (${employee.id})`
        : "Action Required: New Hire Account Setup";
    case "notify-registrar":
      return employee ? `Action Required: Academic Onboarding Preparation – ${employee.name}` : "Action Required: Academic Onboarding Preparation";
    case "notify-benefits":
      return employee
        ? `Action Required: Labor & Health Insurance Coordination – ${employee.name}`
        : "Action Required: Labor & Health Insurance Coordination";
    case "notify-accounting":
      return employee
        ? `Action Required: New Employee Payroll Setup – ${employee.name}`
        : "Action Required: New Employee Payroll Setup";
    case "send-onboarding-email":
      return "Welcome to WUC: Upcoming Onboarding Process";
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
      return findWorkEmailByPattern(activeEmployees, /manager,office of compliance|ziyun fu|jennifer/i) || "";
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
  eligibleEmployees,
  selectedEmployeeId,
  onSelectEmployee,
}: NewHirePreboardingSOPProps) {
  const selectedEmployee = useMemo(
    () => eligibleEmployees.find((employee) => employee.id === selectedEmployeeId) || null,
    [eligibleEmployees, selectedEmployeeId]
  );

  const defaultStepEmailDrafts = useMemo(
    () =>
      Object.fromEntries(
        DEFAULT_STEPS.map((step) => [
          step.key,
          getStepEmailTemplate(step.key, selectedEmployee, employees, activeEmployees),
        ])
      ),
    [selectedEmployee, employees, activeEmployees]
  );

  const defaultBcc = useMemo(() => {
    const ceoEmail = findEmailByPattern(employees, /ceo|chief executive|president/i);
    const cooVpEmail = findEmailByPattern(employees, /coo|chief operating|vp|vice president/i);
    return [ceoEmail, cooVpEmail].filter(Boolean).join(",");
  }, [employees]);

  const defaultCompletedSteps = useMemo(
    () => Object.fromEntries(DEFAULT_STEPS.map((step) => [step.key, false])),
    []
  );

  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>(defaultCompletedSteps);
  const [savedCompleted, setSavedCompleted] = useState(false);
  const [expandedSteps, setExpandedSteps] = useState<Record<string, boolean>>(
    Object.fromEntries(DEFAULT_STEPS.map((step) => [step.key, false]))
  );
  const [saveStatusMessage, setSaveStatusMessage] = useState<string | null>(null);
  const [isSavingSteps, setIsSavingSteps] = useState(false);
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
  const defaultStepEmailSubjects = useMemo(
    () =>
      Object.fromEntries(
        DEFAULT_STEPS.map((step) => [step.key, getStepEmailSubject(step.key, selectedEmployee)])
      ),
    [selectedEmployee]
  );
  const [stepEmailTos, setStepEmailTos] = useState<Record<string, string>>(defaultStepEmailTos);
  const [stepEmailSubjects, setStepEmailSubjects] = useState<Record<string, string>>(defaultStepEmailSubjects);
  const [attachedFileNames, setAttachedFileNames] = useState<Record<string, string | null>>(
    Object.fromEntries(DEFAULT_STEPS.map((step) => [step.key, null]))
  );

  useEffect(() => {
    if (!selectedEmployeeId) {
      setCompletedSteps(defaultCompletedSteps);
      return;
    }

    const fetchSavedSteps = async () => {
      try {
        const response = await fetch(
          `/api/employees/${encodeURIComponent(selectedEmployeeId)}/preboarding`
        );
        if (!response.ok) {
          // attempt localStorage fallback
          try {
            const local = window.localStorage.getItem(`newHirePreboardingSteps:${selectedEmployeeId}`);
            if (local) {
              const parsed = JSON.parse(local);
              const stepValues: Record<string, boolean> = {};
              DEFAULT_STEPS.forEach((s) => {
                stepValues[s.key] = Boolean(parsed[s.key]);
              });
              setCompletedSteps((prev) => ({ ...prev, ...stepValues }));
              const completedFlagLocal = Boolean(parsed.completed);
              setSavedCompleted(completedFlagLocal);
              if (completedFlagLocal) {
                setExpandedSteps(Object.fromEntries(DEFAULT_STEPS.map((step) => [step.key, false])));
              }
              return;
            }
          } catch {
            // ignore
          }
          setCompletedSteps(defaultCompletedSteps);
          return;
        }

        const data = await response.json();
        if (data?.preboardingSteps && typeof data.preboardingSteps === "object") {
          const saved = data.preboardingSteps as Record<string, unknown>;
          // extract step booleans
          const stepValues: Record<string, boolean> = {};
          DEFAULT_STEPS.forEach((s) => {
            stepValues[s.key] = Boolean(saved[s.key]);
          });
          setCompletedSteps((prev) => ({ ...prev, ...stepValues }));
          // honor persisted completed flag
          const completedFlag = Boolean(saved.completed);
          setSavedCompleted(completedFlag);
          if (completedFlag) {
            setExpandedSteps(Object.fromEntries(DEFAULT_STEPS.map((step) => [step.key, false])));
          }
        } else {
          setCompletedSteps(defaultCompletedSteps);
        }
      } catch {
        // network error -> try local storage fallback
        try {
          const local = window.localStorage.getItem(`newHirePreboardingSteps:${selectedEmployeeId}`);
          if (local) {
            const parsed = JSON.parse(local);
            const stepValues: Record<string, boolean> = {};
            DEFAULT_STEPS.forEach((s) => {
              stepValues[s.key] = Boolean(parsed[s.key]);
            });
            setCompletedSteps((prev) => ({ ...prev, ...stepValues }));
            const completedFlagLocal = Boolean(parsed.completed);
            setSavedCompleted(completedFlagLocal);
            if (completedFlagLocal) {
              setExpandedSteps(Object.fromEntries(DEFAULT_STEPS.map((step) => [step.key, false])));
            }
            return;
          }
        } catch {
          // ignore
        }
        setCompletedSteps(defaultCompletedSteps);
      }
    };

    fetchSavedSteps();
  }, [selectedEmployeeId, defaultCompletedSteps]);

  useEffect(() => {
    setExpandedSteps(Object.fromEntries(DEFAULT_STEPS.map((step) => [step.key, false])));
  }, [selectedEmployeeId]);

  const saveStepsToDatabase = async (steps: Record<string, boolean>) => {
    if (!selectedEmployeeId) {
      setSaveStatusMessage("No employee selected. Please choose an employee before saving.");
      window.setTimeout(() => setSaveStatusMessage(null), 3000);
      return false;
    }

    setIsSavingSteps(true);
    setSaveStatusMessage("Saving progress to database...");
    try {
      const completedFlag = visibleSteps.length > 0 && visibleSteps.every((s) => Boolean(steps[s.key]));
      const payload = { completedSteps: { ...steps, completed: completedFlag } };

      const response = await fetch(
        `/api/employees/${encodeURIComponent(selectedEmployeeId)}/preboarding`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        // fallback to localStorage only when DB save fails, but do not mark the checklist as saved.
        try {
          window.localStorage.setItem(
            `newHirePreboardingSteps:${selectedEmployeeId}`,
            JSON.stringify(payload.completedSteps)
          );
          setSaveStatusMessage(
            "Database save failed. Progress preserved locally as a draft until database access is restored."
          );
          window.setTimeout(() => setSaveStatusMessage(null), 5000);
        } catch {
          setSaveStatusMessage(result?.error || "Unable to save progress.");
        }
        return false;
      }
      window.localStorage.removeItem(`newHirePreboardingSteps:${selectedEmployeeId}`);
      setSavedCompleted(completedFlag);
      if (completedFlag) {
        setExpandedSteps(Object.fromEntries(DEFAULT_STEPS.map((step) => [step.key, false])));
      }
      setSaveStatusMessage("Progress saved successfully to database.");
      window.setTimeout(() => setSaveStatusMessage(null), 3000);
      return true;
    } catch (err) {
      // network / unexpected error -> fallback to localStorage only as emergency backup
      try {
        const completedFlag = visibleSteps.length > 0 && visibleSteps.every((s) => Boolean(steps[s.key]));
        const payload = { ...steps, completed: completedFlag };
        window.localStorage.setItem(
          `newHirePreboardingSteps:${selectedEmployeeId}`,
          JSON.stringify(payload)
        );
        if (completedFlag) {
          setExpandedSteps(Object.fromEntries(DEFAULT_STEPS.map((step) => [step.key, false])));
        }
        setSaveStatusMessage(
          "Unable to save to database. Progress preserved locally as a draft until database access is restored."
        );
      } catch {
        setSaveStatusMessage("Unable to save progress.");
      }
      return false;
    } finally {
      setIsSavingSteps(false);
    }
  };

  const handleSaveSteps = async () => {
    await saveStepsToDatabase(completedSteps);
  };
  
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

  useEffect(() => {
    setStepEmailSubjects(defaultStepEmailSubjects);
  }, [defaultStepEmailSubjects]);

  const visibleSteps = DEFAULT_STEPS;
  const completedCount = Object.entries(completedSteps).filter(
    ([key, value]) => value && visibleSteps.some((step) => step.key === key)
  ).length;

  const handleToggleStep = (key: string) => {
    setCompletedSteps((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      // mark as unsaved when user changes any step
      setSavedCompleted(false);
      return next;
    });
  };

  const employeeOptions = useMemo(
    () =>
      eligibleEmployees
        .slice()
        .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: "base" }))
        .map((employee) => ({ id: employee.id, label: `${employee.name} (${employee.id})` })),
    [eligibleEmployees]
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
              7-step New Hire Preboarding Checklist
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
              <option value="">Choose a new hire within 30 days and no preboarding record...</option>
              {employeeOptions.length === 0 ? (
                <option value="" disabled>
                  No new hire candidates available
                </option>
              ) : (
                employeeOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {selectedEmployee ? (
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
                <li>✓ Step 7 has the onboarding email template ready to copy.</li>
                <li>✓ You can switch employees at any time without losing the page state.</li>
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-slate-700">
                Selected employee: <span className="font-semibold">{selectedEmployee.name}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={isSavingSteps || !selectedEmployeeId}
                  onClick={handleSaveSteps}
                  className="rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {isSavingSteps ? "Saving..." : "Save Progress"}
                </button>
              </div>
            </div>
            {saveStatusMessage && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                {saveStatusMessage}
              </div>
            )}
            {savedCompleted && (
              <div className="rounded-2xl border border-emerald-500 bg-emerald-50 p-4 text-sm text-emerald-800">
                Preboarding completed — all steps completed and saved.
              </div>
            )}
            {visibleSteps.map((step) => (
              <details
                key={step.key}
                className={`group rounded-3xl border shadow-sm ${
                  (savedCompleted || (completedCount === visibleSteps.length && visibleSteps.length > 0))
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-200 bg-white"
                }`}
                open={expandedSteps[step.key]}
                onToggle={(event) => {
                  const detailsElement = event.currentTarget as HTMLDetailsElement | null;
                  setExpandedSteps((prev) => ({
                    ...prev,
                    [step.key]: detailsElement?.open ?? false,
                  }));
                }}
              >
              <summary className="flex items-start justify-between gap-4 cursor-pointer p-6">
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-transform duration-200 ${
                      expandedSteps[step.key] ? "rotate-90" : ""
                    }`}
                    aria-hidden="true"
                  >
                    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7 6L13 10L7 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                    <p className="mt-2 text-sm text-slate-600">{step.description}</p>
                  </div>
                </div>
                <label className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={completedSteps[step.key]}
                    onChange={(event) => {
                      event.stopPropagation();
                      handleToggleStep(step.key);
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  {completedSteps[step.key] ? "Done" : "Pending"}
                </label>
              </summary>
              {[
                "offer-letter-sent",
                "notify-it",
                "notify-registrar",
                "notify-benefits",
                "notify-accounting",
                "send-onboarding-email",
              ].includes(step.key) && (
                <div className="space-y-4 border-t border-slate-200 bg-slate-50 p-6">
                  <label className="block text-sm font-semibold text-slate-700">
                    {step.key === "offer-letter-sent" ? "Offer Letter Email Ready to Send" : step.key === "send-onboarding-email" ? "Onboarding Email Ready to Send" : "Email Ready to Send"}
                  </label>
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">Subject</label>
                    <input
                      type="text"
                      value={stepEmailSubjects[step.key] || ""}
                      onChange={(event) =>
                        setStepEmailSubjects((prev) => ({
                          ...prev,
                          [step.key]: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                    />
                  </div>
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
                          stepEmailSubjects[step.key] || getStepEmailSubject(step.key, selectedEmployee),
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
            </details>
          ))}
        </div>
        </div>
      ) : null}
    </div>
  );
}
