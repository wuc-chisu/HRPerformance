import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import {
  formatDateForResponse,
  formatDateTimeForResponse,
  parseDateForDatabase,
} from "@/lib/dateUtils";
import { NextResponse } from "next/server";
import {
  REQUIRED_HR_POLICY_SIGNOFFS,
  REQUIRED_ONBOARDING_FORMS,
  REQUIRED_TRAINING_ITEMS,
} from "@/lib/employees";

type OnboardingEmailDraft = {
  key: "it-reminder" | "registrar-reminder" | "new-hire" | "offer-letter" | "taiwan-labor-insurance";
  step: 2 | 3 | 4 | 5 | 6;
  to: string;
  cc?: string;
  subject: string;
  body: string;
  recipientName: string;
  note?: string;
};

type OnboardingPayrollSetup = {
  paypalConfirmed: boolean;
  laborInsuranceAmount: number | null;
  healthInsuranceAmount: number | null;
  laborInsuranceReceiptProvided: boolean;
  healthInsuranceReceiptProvided: boolean;
};

const PAYROLL_META_MARKER = "\n\n[ONBOARDING_META]";

function getDefaultPayrollSetup(): OnboardingPayrollSetup {
  return {
    paypalConfirmed: false,
    laborInsuranceAmount: null,
    healthInsuranceAmount: null,
    laborInsuranceReceiptProvided: false,
    healthInsuranceReceiptProvided: false,
  };
}

function parseOnboardingNotes(raw: string | null | undefined) {
  const source = raw || "";
  const markerIndex = source.indexOf(PAYROLL_META_MARKER);

  if (markerIndex === -1) {
    return {
      notes: source,
      payrollSetup: getDefaultPayrollSetup(),
    };
  }

  const notes = source.slice(0, markerIndex);
  const metaRaw = source.slice(markerIndex + PAYROLL_META_MARKER.length).trim();

  try {
    const parsed = JSON.parse(metaRaw) as { payrollSetup?: OnboardingPayrollSetup };
    return {
      notes,
      payrollSetup: parsed?.payrollSetup || getDefaultPayrollSetup(),
    };
  } catch {
    return {
      notes,
      payrollSetup: getDefaultPayrollSetup(),
    };
  }
}

type RecipientDirectoryEntry = {
  name?: string;
  email?: string;
  personalEmail?: string;
  position?: string;
  joinDate?: Date;
};

function normalizeRoleToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getPreferredRecipientEmail(entry?: RecipientDirectoryEntry | null) {
  const personalEmail = (entry?.personalEmail || "").trim();
  if (personalEmail) return personalEmail;
  return (entry?.email || "").trim();
}

function findMostRecentByPosition(entries: RecipientDirectoryEntry[], positionName: string) {
  const target = normalizeRoleToken(positionName);

  return entries
    .filter((entry) => normalizeRoleToken(entry.position || "") === target)
    .sort((first, second) => {
      const firstTime = first.joinDate ? new Date(first.joinDate).getTime() : 0;
      const secondTime = second.joinDate ? new Date(second.joinDate).getTime() : 0;
      return secondTime - firstTime;
    })[0];
}

function findByExactName(entries: RecipientDirectoryEntry[], fullName: string) {
  const target = fullName.trim().toLowerCase();
  return entries.find((entry) => (entry.name || "").trim().toLowerCase() === target);
}

async function buildNewHireOnboardingEmailDrafts(payload: {
  employeeName: string;
  employeeEmail: string;
  employeeId: string;
  department: string;
  position: string;
  manager: string;
  startDate: string;
  staffWorkLocation?: string;
  workLocationMode?: "Remote" | "In-Person";
  employeeType?: string;
  probationPeriodStartDate?: string;
  probationPeriodEndDate?: string;
  monthlySalaryDuringProbation?: number;
  monthlySalaryAfterProbation?: number;
}): Promise<OnboardingEmailDraft[]> {
  const recipientDirectory: RecipientDirectoryEntry[] = await (prisma as any).employee.findMany({
    select: {
      name: true,
      email: true,
      personalEmail: true,
      position: true,
      joinDate: true,
    },
  });

  const itEngineerRecipient = findMostRecentByPosition(recipientDirectory, "IT Engineer");
  const registrarRecipient =
    findMostRecentByPosition(recipientDirectory, "Registrar") ||
    findByExactName(recipientDirectory, "TingYi Tung");
  const complianceManagerRecipient = findMostRecentByPosition(
    recipientDirectory,
    "Manager,Office of Compliance"
  );

  const itEmail = getPreferredRecipientEmail(itEngineerRecipient);
  const registrarEmail = getPreferredRecipientEmail(registrarRecipient);
  const complianceManagerEmail = getPreferredRecipientEmail(complianceManagerRecipient);

  const itRecipientName = (itEngineerRecipient?.name || "IT Engineer").trim();
  const registrarRecipientName = (registrarRecipient?.name || "TingYi Tung").trim();
  const complianceRecipientName = (
    complianceManagerRecipient?.name || "Manager, Office of Compliance"
  ).trim();

  const formattedStartDate = /^\d{4}-\d{2}-\d{2}$/.test(payload.startDate)
    ? `${payload.startDate.slice(5, 7)}/${payload.startDate.slice(8, 10)}/${payload.startDate.slice(0, 4)}`
    : payload.startDate;
  const workLocationMode = payload.workLocationMode || "Remote";
  const basedIn = payload.staffWorkLocation || "USA";
  const isTaiwanEmployee = basedIn.toLowerCase().includes("taiwan");

  const itSubject = `Action Required: New Hire Account Setup - ${payload.employeeName} (${payload.employeeId})`;
  const itBody = `Dear ${itRecipientName},

Please create the following accounts for our new hire on their start date.

Employee Name: ${payload.employeeName}

Position: ${payload.position}

Department: ${payload.department}

Start Date: ${formattedStartDate}

Please create:

- WUC Gmail Account
- Moodle account
- Clickup account

Click up had create for you for tracking purpose.

Once the accounts have been created, please send the login credentials and access instructions to the employee and copy HR for our records.

Thank you,
Sincerely,
Human Resources
Whitewater University of California`;

  const registrarSubject = `Action Required: New Hire Document Request - ${payload.employeeName} (${payload.employeeId})`;
  const registrarBody = `Hi ${registrarRecipientName},

${payload.employeeName} has officially joined Whitewater University as our new ${payload.position} and has begun the onboarding process.

Please proceed with the standard Staff Onboarding SOP and coordinate directly with ${payload.employeeName} regarding all required onboarding forms, supporting documents, training requirements, and orientation activities.

A few notes for this onboarding:

- Employee Name: ${payload.employeeName}
- Position: ${payload.position}
- Start Date: ${formattedStartDate}
- Based In: ${basedIn}
- IT is currently preparing the employee's Gmail and Moodle access.

Please:

- Send all required onboarding forms and document requests according to the Staff Onboarding SOP.
- Collect and verify all required onboarding documentation and supporting materials.
- Guide the employee through all required orientation, training, and compliance requirements.
- Ensure all onboarding items are completed and properly documented.
- Coordinate any follow-up actions with the appropriate departments according to the SOP.

Please keep me informed of the onboarding progress and let me know if any documentation or follow-up is needed from HR.

For tracking purposes, please use the assigned ClickUp task:

[ClickUp Link]

This task will remain active for three weeks. Please update the task regularly, record progress, and mark each onboarding milestone as completed.

Thank you for your assistance.
Best regards,
Chi Su
Human Resources
Whitewater University of California`;

  const newHireSubject = `Welcome to WUC: Upcoming Onboarding Process`;
  const newHireBody = isTaiwanEmployee
    ? `Dear ${payload.employeeName},

Welcome to Whitewater University of California, and congratulations on joining us as our new ${payload.position}.

We are excited to have you join our team and would like to provide an overview of the onboarding process to help you prepare for your first few weeks with the University.

Our IT team is currently preparing your WUC Gmail account and Moodle access. On your start date, ${formattedStartDate}, you will receive a separate email containing your login credentials and access instructions.

Payroll Information

- Salary payments are issued on the last business day of each month.
- Payroll will be sent via PayPal unless otherwise arranged with Human Resources.
- Please ensure that your PayPal account information is available and up to date.

Taiwan Labor & Health Insurance (Taiwan-Based Employees Only)

- ${complianceRecipientName} will contact you regarding the Labor Insurance and National Health Insurance enrollment process.
- Once your enrollment is completed, please submit your payment receipt to HR.
- The University will reimburse your first month's approved Labor and Health Insurance contribution with your following month's payroll.
- Future approved reimbursement amounts, along with applicable PayPal transaction fees, will be included in your regular monthly payroll.

Over the next few days, you can expect the following onboarding communications and requirements:

Administrative Documentation

- Ting-Yi will contact you regarding the onboarding forms and supporting documents required for employment.
- Please complete and return all requested forms and documentation in a timely manner.

HR Onboarding

- Review and sign your Offer Letter.
- Review and acknowledge receipt of the Employee Handbook.
- Review and sign all required University policies, agreements, and compliance documents.

System Access & Training

- Activate your WUC Gmail account.
- Activate your Moodle account.
- Accept your ClickUp invitation and set up your account.
- Complete the Moodle Getting Started Training Video, which provides an introduction to accessing Moodle, navigating the platform, and completing assigned training and learning activities.
- Complete any additional training assignments that may be required for your position.

As part of your onboarding, you will also be required to complete the University's Orientation Certification requirements.

We are delighted to welcome you to Whitewater University of California and look forward to working with you.

Sincerely,
Chi Su
Human Resources
Whitewater University of California`
    : `Dear ${payload.employeeName},

Welcome to Whitewater University of California, and congratulations on joining us as our new ${payload.position}.

We are excited to have you join our team and would like to provide an overview of the onboarding process to help you prepare for your first few weeks with the University.

Our IT team is currently preparing your WUC Gmail account and Moodle access. On your start date, ${formattedStartDate}, you will receive a separate email containing your login credentials and access instructions.

Payroll Information
- Salary payments are issued on the last business day of each month.
- Your salary will be deposited into your designated bank account.
- Please ensure that all payroll and direct deposit information requested by HR is submitted promptly to avoid payment delays.

Employee Benefits (Full-Time Employees Only)
- HR will contact you regarding health insurance enrollment and benefit options.
- Additional benefit information and enrollment instructions will be provided during the onboarding process.

Over the next few days, you can expect the following onboarding communications and requirements:

Administrative Documentation
- Ting-Yi will contact you regarding the onboarding forms and supporting documents required for employment.
- Please complete and return all requested forms and documentation in a timely manner.

HR Onboarding
- Review and sign your Offer Letter.
- Review and acknowledge receipt of the Employee Handbook.
- Review and sign all required University policies, agreements, and compliance documents.

System Access & Training
- Activate your WUC Gmail account.
- Activate your Moodle account.
- Accept your ClickUp invitation and set up your account.
- Complete the Moodle Getting Started Training Video, which provides an introduction to accessing Moodle, navigating the platform, and completing assigned training and learning activities.
- Complete any additional training assignments that may be required for your position.

As part of your onboarding, you will also be required to complete the University's Orientation Certification requirements.

We are delighted to welcome you to Whitewater University of California and look forward to working with you.

Sincerely,

Chi Su
Human Resources
Whitewater University of California
3150 Almaden Expy, Suite 111, San Jose, CA 95118`;

  const offerLetterSubject = `Welcome: Offer Letter - ${payload.employeeName}`;
  let workLocationDisplay: string = payload.staffWorkLocation !== "USA" ? "Remote" : (payload.workLocationMode || "Remote");
  if (payload.staffWorkLocation === "Taiwan (Remote)") {
    workLocationDisplay = "Taiwan - Remote";
  }
  const employmentType = payload.employeeType?.toLowerCase().includes("contract") ? "Contract" : "Full-Time";
  let probationStartDisplay = payload.startDate;
  let probationEndDisplay = "3 months";
  if (payload.probationPeriodStartDate) {
    const startDate = /^\d{4}-\d{2}-\d{2}$/.test(payload.probationPeriodStartDate)
      ? `${payload.probationPeriodStartDate.slice(5, 7)}/${payload.probationPeriodStartDate.slice(8, 10)}/${payload.probationPeriodStartDate.slice(0, 4)}`
      : payload.probationPeriodStartDate;
    probationStartDisplay = startDate;
  }
  if (payload.probationPeriodEndDate) {
    const endDate = /^\d{4}-\d{2}-\d{2}$/.test(payload.probationPeriodEndDate)
      ? `${payload.probationPeriodEndDate.slice(5, 7)}/${payload.probationPeriodEndDate.slice(8, 10)}/${payload.probationPeriodEndDate.slice(0, 4)}`
      : payload.probationPeriodEndDate;
    probationEndDisplay = endDate;
  }
  const salaryDuringProbation = payload.monthlySalaryDuringProbation ?? 1300;
  const salaryAfterProbation = payload.monthlySalaryAfterProbation ?? 1400;
  const salaryCurrencyCode = "USD";
  const offerLetterBody = `Dear ${payload.employeeName},

Thank you for your interest in joining Whitewater University of California.

We are pleased to extend an offer for the position of ${payload.position}. Attached please find your offer letter for review.

Key Employment Terms

- Start Date: ${payload.startDate}
- Employment Type: ${employmentType}
- Work Location: ${workLocationDisplay}
- Probation Period: 3 months (${probationStartDisplay} to ${probationEndDisplay})
- Monthly Salary During Probation: ${salaryCurrencyCode} ${salaryDuringProbation.toLocaleString()}
- Monthly Salary After Successful Completion of Probation: ${salaryCurrencyCode} ${salaryAfterProbation.toLocaleString()}

Position Highlights

- Flexible work schedule with required overlap hours to support collaboration with the U.S.-based team.
- Opportunity to gain hands-on experience in higher education administration, student services, and AI-assisted workflow development.
- Opportunity to work in a collaborative international environment supporting students, faculty, and university operations.

Please review the attached offer letter and let us know if you have any questions. If you accept the offer, please sign and return the offer letter within seven (7) calendar days of receiving this email.

We are excited about the possibility of having you join our team and look forward to working with you.

Sincerely,

Chi Su
Human Resources
Whitewater University of California
3150 Almaden Expy, Suite 111, San Jose, CA 95118`;

  const drafts: OnboardingEmailDraft[] = [
    {
      key: "it-reminder",
      step: 2,
      to: itEmail || "",
      cc: "HR@wuc.edu",
      subject: itSubject,
      body: itBody,
      recipientName: itRecipientName,
      note: itEmail
        ? undefined
        : "Personal email not found for IT Engineer. Please enter recipient email.",
    },
    {
      key: "registrar-reminder",
      step: 3,
      to: registrarEmail || "",
      cc: "HR@wuc.edu",
      subject: registrarSubject,
      body: registrarBody,
      recipientName: registrarRecipientName,
      note: registrarEmail
        ? undefined
        : "Personal email not found for Registrar. Please enter recipient email.",
    },
    {
      key: "new-hire",
      step: 4,
      to: payload.employeeEmail?.trim() || "",
      cc: "HR@wuc.edu",
      subject: newHireSubject,
      body: newHireBody,
      recipientName: payload.employeeName,
      note: payload.employeeEmail?.trim()
        ? undefined
        : "New hire work email is missing. Please enter recipient email.",
    },
    {
      key: "offer-letter",
      step: 5,
      to: payload.employeeEmail?.trim() || "",
      cc: "HR@wuc.edu",
      subject: offerLetterSubject,
      body: offerLetterBody,
      recipientName: payload.employeeName,
      note: payload.employeeEmail?.trim()
        ? undefined
        : "New hire work email is missing. Please enter recipient email.",
    },
  ];

  if (isTaiwanEmployee) {
    drafts.push({
      key: "taiwan-labor-insurance",
      step: 6,
      to: complianceManagerEmail || "",
      cc: "HR@wuc.edu",
      subject: `Action Required: Taiwan Labor Insurance and National Health Insurance Enrollment - ${payload.employeeName} (${payload.employeeId})`,
      body: `Hi ${complianceRecipientName},

${payload.employeeName} has officially joined Whitewater University as our new ${payload.position} and has begun the onboarding process.

As part of the onboarding requirements for Taiwan-based employees, please contact ${payload.employeeName} directly regarding Labor Insurance and National Health Insurance enrollment.

Employee Information:
- Employee Name: ${payload.employeeName}
- Position: ${payload.position}
- Start Date: ${formattedStartDate}
- Work Location: Taiwan (Remote)

Please assist the employee with the following:

- Explain the Labor Insurance and National Health Insurance enrollment process.
- Collect any information or supporting documents required for enrollment.
- Guide the employee through the enrollment process and answer any related questions.
- Confirm when enrollment has been completed.
- Remind the employee to submit their insurance payment receipt after enrollment.

Please keep HR informed of the enrollment status and notify us once the process has been completed.

For tracking purposes, please use the assigned ClickUp task:
[ClickUp Link]

Thank you for your assistance.

Best regards,

Chi Su
Human Resources
Whitewater University of California
📍 3150 Almaden Expy, Suite 111, San Jose, CA 95118`,
      recipientName: complianceRecipientName,
      note: complianceManagerEmail
        ? undefined
        : "Personal email not found for Manager, Office of Compliance. Please enter recipient email.",
    });
  }

  return drafts;
}

function normalizeProfessionalDevelopmentRecords(records: unknown) {
  if (!Array.isArray(records)) return [];

  return records
    .filter((item) => item && typeof item === "object")
    .map((item: any, index: number) => {
      const title = typeof item.title === "string" ? item.title.trim() : "";
      const hours = Number(item.hours);
      const rawDate = typeof item.date === "string" ? item.date.trim() : "";
      const hasValidDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate);
      const dateString = hasValidDate
        ? formatDateForResponse(parseDateForDatabase(rawDate))
        : "";

      if (!title || !dateString || !Number.isFinite(hours) || hours <= 0) {
        return null;
      }

      return {
        id:
          typeof item.id === "string" && item.id.trim().length > 0
            ? item.id
            : `pd-${index + 1}`,
        title,
        date: dateString,
        hours,
        createdAt:
          typeof item.createdAt === "string" && item.createdAt.trim().length > 0
            ? item.createdAt
            : undefined,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

function buildDefaultStep2Forms(joinDate: Date, completed: boolean) {
  return REQUIRED_ONBOARDING_FORMS.map((name) => ({
    name,
    status: "Pending",
    dateCompleted: null,
    verifiedBy: "HR",
    url: "",
    extraUrls: [],
  }));
}

function getStep2Completed(forms: Array<{ status?: string }>) {
  return forms.length > 0 && forms.every((item) => item.status === "Approved" || item.status === "N/A");
}

function buildDefaultStep3Forms(completed: boolean, completedAt?: Date | null) {
  return REQUIRED_HR_POLICY_SIGNOFFS.map((name) => ({
    name,
    status: completed ? "Approved" : "Pending",
    dateCompleted: completed ? formatDateForResponse(completedAt || new Date()) : null,
    verifiedBy: "HR",
    url: "",
    extraUrls: [],
  }));
}

function getStep3Completed(forms: Array<{ status?: string }>) {
  return forms.length > 0 && forms.every((item) => item.status === "Approved");
}

function buildDefaultStep4Forms(completed: boolean, completedAt?: Date | null) {
  return REQUIRED_TRAINING_ITEMS.map((name) => ({
    name,
    status: completed ? "Approved" : "Pending",
    dateCompleted: completed ? formatDateForResponse(completedAt || new Date()) : null,
    verifiedBy: "HR",
    url: "",
    extraUrls: [],
  }));
}

function getStep4Completed(forms: Array<{ status?: string }>) {
  return forms.length > 0 && forms.every((item) => item.status === "Approved");
}

function normalizeStep2Forms(step2Forms: unknown, joinDate: Date, completed: boolean) {
  if (Array.isArray(step2Forms) && step2Forms.length > 0) {
    const lookup = new Map(
      step2Forms
        .filter((item) => item && typeof item === "object")
        .map((item: any) => [item.name, item])
    );

    return REQUIRED_ONBOARDING_FORMS.map((name) => {
      const item = lookup.get(name);
      return {
        name,
        status:
          item?.status === "Submitted" || item?.status === "Approved" || item?.status === "N/A"
            ? item.status
            : "Pending",
        dateCompleted: item?.dateCompleted || null,
        verifiedBy: item?.verifiedBy || "HR",
        url: typeof item?.url === "string" ? item.url : "",
        extraUrls: Array.isArray(item?.extraUrls)
          ? item.extraUrls.filter((entry: unknown) => typeof entry === "string")
          : [],
      };
    });
  }

  return buildDefaultStep2Forms(joinDate, completed);
}

function normalizeStep3Forms(
  step3Forms: unknown,
  completed: boolean,
  completedAt?: Date | null
) {
  if (Array.isArray(step3Forms) && step3Forms.length > 0) {
    const lookup = new Map(
      step3Forms
        .filter((item) => item && typeof item === "object")
        .map((item: any) => [item.name, item])
    );

    return REQUIRED_HR_POLICY_SIGNOFFS.map((name) => {
      const item = lookup.get(name);
      return {
        name,
        status:
          item?.status === "Submitted" || item?.status === "Approved"
            ? item.status
            : "Pending",
        dateCompleted: item?.dateCompleted || null,
        verifiedBy: "HR",
        url: "",
        extraUrls: [],
      };
    });
  }

  return buildDefaultStep3Forms(completed, completedAt);
}

function normalizeStep4Forms(
  step4Forms: unknown,
  completed: boolean,
  completedAt?: Date | null,
  legacyStep2Forms?: unknown
) {
  if (Array.isArray(step4Forms) && step4Forms.length > 0) {
    const lookup = new Map(
      step4Forms
        .filter((item) => item && typeof item === "object")
        .map((item: any) => [item.name, item])
    );

    return REQUIRED_TRAINING_ITEMS.map((name) => {
      const item = lookup.get(name);
      return {
        name,
        status:
          item?.status === "Submitted" || item?.status === "Approved"
            ? item.status
            : "Pending",
        dateCompleted: item?.dateCompleted || null,
        verifiedBy: item?.verifiedBy || "HR",
        url: typeof item?.url === "string" ? item.url : "",
        extraUrls: Array.isArray(item?.extraUrls)
          ? item.extraUrls.filter((entry: unknown) => typeof entry === "string")
          : [],
      };
    });
  }

  if (Array.isArray(legacyStep2Forms) && legacyStep2Forms.length > 0) {
    const lookup = new Map(
      legacyStep2Forms
        .filter((item) => item && typeof item === "object")
        .map((item: any) => [item.name, item])
    );

    return REQUIRED_TRAINING_ITEMS.map((name) => {
      const item = lookup.get(name);
      return {
        name,
        status:
          item?.status === "Submitted" || item?.status === "Approved"
            ? item.status
            : completed
              ? "Approved"
              : "Pending",
        dateCompleted: item?.dateCompleted || (completed ? formatDateForResponse(completedAt || new Date()) : null),
        verifiedBy: item?.verifiedBy || "HR",
        url: typeof item?.url === "string" ? item.url : "",
        extraUrls: Array.isArray(item?.extraUrls)
          ? item.extraUrls.filter((entry: unknown) => typeof entry === "string")
          : [],
      };
    });
  }

  return buildDefaultStep4Forms(completed, completedAt);
}

function formatOnboarding(emp: any) {
  const step2Forms = normalizeStep2Forms(
    emp.onboardingStep2Forms,
    emp.joinDate,
    Boolean(emp.onboardingStep2Completed)
  );
  const step3Forms = normalizeStep3Forms(
    emp.onboardingStep3Forms,
    Boolean(emp.onboardingStep3Completed),
    emp.onboardingStep3CompletedAt
  );
  const step4Forms = normalizeStep4Forms(
    emp.onboardingStep4Forms,
    Boolean(emp.onboardingStep4Completed),
    emp.onboardingStep4CompletedAt,
    emp.onboardingStep2Forms
  );

  const systemAccess = {
    gmail: Boolean(emp.systemAccessGmail),
    clickup: Boolean(emp.systemAccessClickup),
    moodle: Boolean(emp.systemAccessMoodle),
    googleDrive: Boolean(emp.systemAccessGoogleDrive),
  };
  const onboardingNotes = parseOnboardingNotes(emp.onboardingStep1Notes);

  return {
    checklistAssigned: Boolean(emp.onboardingChecklistAssigned),
    enrolled: Boolean(emp.onboardingChecklistAssigned),
    step1Completed:
      systemAccess.gmail &&
      systemAccess.clickup &&
      systemAccess.moodle &&
      systemAccess.googleDrive,
    systemAccess,
    step2Completed: getStep2Completed(step2Forms),
    step2Forms,
    step3Completed: getStep3Completed(step3Forms),
    step3Forms,
    step4Completed: getStep4Completed(step4Forms),
    step4Forms,
    step5Completed: Boolean(emp.onboardingStep5Completed),
    step5PayrollSetup: onboardingNotes.payrollSetup,
    step6Completed: Boolean(emp.onboardingStep6AnnualTracking || emp.onboardingStep5Completed),
    step6AnnualTracking: Boolean(emp.onboardingStep6AnnualTracking),
    step2CompletedAt: formatDateTimeForResponse(emp.onboardingStep2CompletedAt),
    step3CompletedAt: formatDateTimeForResponse(emp.onboardingStep3CompletedAt),
    step4CompletedAt: formatDateTimeForResponse(emp.onboardingStep4CompletedAt),
    step5CompletedAt: formatDateTimeForResponse(emp.onboardingStep5CompletedAt),
    step6StartedAt: formatDateTimeForResponse(emp.onboardingStep6StartedAt),
    step6LastReviewAt: formatDateTimeForResponse(emp.onboardingStep6LastReviewAt),
    updatedBy: emp.onboardingStep1UpdatedBy || "System",
    updatedAt: formatDateTimeForResponse(emp.onboardingStep1UpdatedAt),
    notes: onboardingNotes.notes,
  };
}

// GET all employees with their weekly records
export async function GET() {
  try {
    const employees = await (prisma as any).employee.findMany({
      include: {
        weeklyRecords: {
          orderBy: {
            startDate: "desc",
          },
        },
      },
    });

    // Transform data to match the frontend format
    const formattedEmployees = employees.map((emp: any) => ({
      id: emp.employeeId,
      name: emp.name,
      email: emp.email,
      personalEmail: emp.personalEmail || "",
      department: emp.department,
      manager: emp.manager,
      position: emp.position,
      joinDate: formatDateForResponse(emp.joinDate),
      workAuthorizationStatus: emp.workAuthorizationStatus,
      staffWorkLocation: emp.staffWorkLocation || "USA",
      employeeType: emp.employeeType || "Full time",
      contractWorkHours: emp.contractWorkHours ?? null,
      officeSchedule: emp.officeSchedule ?? null,
      probationPeriodStartDate: emp.probationPeriodStartDate
        ? formatDateForResponse(emp.probationPeriodStartDate)
        : undefined,
      probationPeriodEndDate: emp.probationPeriodEndDate
        ? formatDateForResponse(emp.probationPeriodEndDate)
        : undefined,
      monthlySalaryDuringProbation: emp.monthlySalaryDuringProbation,
      monthlySalaryAfterProbation: emp.monthlySalaryAfterProbation,
      overallOverdueTasks: emp.overallOverdueTasks,
      professionalDevelopmentRecords: normalizeProfessionalDevelopmentRecords(
        emp.professionalDevelopmentRecords
      ),
      onboarding: formatOnboarding(emp),
      weeklyRecords: emp.weeklyRecords.map((record: any) => ({
        recordId: record.id,
        startDate: formatDateForResponse(record.startDate),
        endDate: formatDateForResponse(record.endDate),
        plannedWorkHours: record.plannedWorkHours,
        actualWorkHours: record.actualWorkHours,
        assignedTasks: record.assignedTasks,
        assignedTasksDetails: (record as any).assignedTasksDetails || [],
        weeklyOverdueTasks: record.weeklyOverdueTasks,
        overdueTasksDetails: (record as any).overdueTasksDetails || [],
        allOverdueTasks: (record as any).allOverdueTasks || 0,
        allOverdueTasksDetails: (record as any).allOverdueTasksDetails || [],
        managerComment: (record as any).managerComment || "",
      })),
    }));

    return NextResponse.json(formattedEmployees);
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    );
  }
}

// POST new employee
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      employeeId,
      name,
      email,
      personalEmail,
      department,
      manager,
      position,
      joinDate,
      workAuthorizationStatus,
      staffWorkLocation,
      employeeType,
      contractWorkHours,
      officeSchedule,
      overallOverdueTasks,
      probationPeriodStartDate,
      probationPeriodEndDate,
      monthlySalaryDuringProbation,
      monthlySalaryAfterProbation,
    } = body;

    const normalizedEmployeeId = String(employeeId || "").trim();
    const normalizedName = String(name || "").trim();
    const normalizedEmail = String(email || "").trim();
    const normalizedDepartment = String(department || "").trim();
    const normalizedPosition = String(position || "").trim();
    const normalizedManager = String(manager || "").trim();
    const normalizedPersonalEmail = String(personalEmail || "").trim();

    if (!normalizedEmployeeId || !normalizedName || !normalizedEmail || !normalizedDepartment || !normalizedPosition || !joinDate) {
      return NextResponse.json(
        { error: "Missing required fields", details: "employeeId, name, email, department, position, and joinDate are required." },
        { status: 400 }
      );
    }

    const existingEmployee = await prisma.employee.findUnique({
      where: { employeeId: normalizedEmployeeId },
      select: {
        employeeId: true,
        name: true,
        email: true,
        personalEmail: true,
        department: true,
        manager: true,
        position: true,
        joinDate: true,
        workAuthorizationStatus: true,
        staffWorkLocation: true,
        employeeType: true,
        contractWorkHours: true,
        officeSchedule: true,
        overallOverdueTasks: true,
        onboardingChecklistAssigned: true,
        systemAccessGmail: true,
        systemAccessClickup: true,
        systemAccessMoodle: true,
        systemAccessGoogleDrive: true,
        onboardingStep2Completed: true,
        onboardingStep2Forms: true,
        onboardingStep3Completed: true,
        onboardingStep3Forms: true,
        onboardingStep4Completed: true,
        onboardingStep4Forms: true,
        onboardingStep5Completed: true,
        professionalDevelopmentRecords: true,
        onboardingStep6AnnualTracking: true,
        onboardingStep1UpdatedBy: true,
        onboardingStep1UpdatedAt: true,
        onboardingStep1Notes: true,
        onboardingStep2CompletedAt: true,
        onboardingStep3CompletedAt: true,
        onboardingStep4CompletedAt: true,
        onboardingStep5CompletedAt: true,
        onboardingStep6StartedAt: true,
        onboardingStep6LastReviewAt: true,
        createdAt: true,
      },
    });

    if (existingEmployee) {
      const sameIdentity =
        (existingEmployee.name || "").trim().toLowerCase() ===
          normalizedName.toLowerCase() &&
        (existingEmployee.email || "").trim().toLowerCase() ===
          normalizedEmail.toLowerCase();

      if (!sameIdentity) {
        return NextResponse.json(
          {
            error: "Failed to create employee",
            details: `Employee ID already exists: ${normalizedEmployeeId} (name: ${existingEmployee.name}, email: ${existingEmployee.email}, createdAt: ${existingEmployee.createdAt.toISOString()}).`,
            submittedEmployeeId: normalizedEmployeeId,
          },
          { status: 409 }
        );
      }

      const existingWithRelations = await prisma.employee.findUnique({
        where: { employeeId: normalizedEmployeeId },
        include: {
          weeklyRecords: true,
        },
      });

      if (!existingWithRelations) {
        return NextResponse.json(
          {
            error: "Failed to create employee",
            details: `Employee ID ${normalizedEmployeeId} exists but could not be loaded. Please retry.`,
            submittedEmployeeId: normalizedEmployeeId,
          },
          { status: 500 }
        );
      }

      const onboardingEmailDrafts = await buildNewHireOnboardingEmailDrafts({
        employeeName: existingWithRelations.name,
        employeeEmail: existingWithRelations.email,
        employeeId: existingWithRelations.employeeId,
        department: existingWithRelations.department,
        position: existingWithRelations.position,
        manager: existingWithRelations.manager,
        startDate: formatDateForResponse(existingWithRelations.joinDate),
        staffWorkLocation: existingWithRelations.staffWorkLocation,
        workLocationMode:
          existingWithRelations.officeSchedule &&
          Array.isArray((existingWithRelations.officeSchedule as any)?.days) &&
          ((existingWithRelations.officeSchedule as any).days as string[]).length > 0
            ? "In-Person"
            : "Remote",
        employeeType: (existingWithRelations as any).employeeType,
        probationPeriodStartDate: (existingWithRelations as any).probationPeriodStartDate ? formatDateForResponse((existingWithRelations as any).probationPeriodStartDate) : undefined,
        probationPeriodEndDate: (existingWithRelations as any).probationPeriodEndDate ? formatDateForResponse((existingWithRelations as any).probationPeriodEndDate) : undefined,
        monthlySalaryDuringProbation: (existingWithRelations as any).monthlySalaryDuringProbation,
        monthlySalaryAfterProbation: (existingWithRelations as any).monthlySalaryAfterProbation,
      });

      return NextResponse.json({
        id: existingWithRelations.employeeId,
        name: existingWithRelations.name,
        email: existingWithRelations.email,
        personalEmail: existingWithRelations.personalEmail || "",
        department: existingWithRelations.department,
        manager: existingWithRelations.manager,
        position: existingWithRelations.position,
        joinDate: formatDateForResponse(existingWithRelations.joinDate),
        workAuthorizationStatus: existingWithRelations.workAuthorizationStatus,
        staffWorkLocation: existingWithRelations.staffWorkLocation || "USA",
        employeeType: (existingWithRelations as any).employeeType || "Full time",
        contractWorkHours: (existingWithRelations as any).contractWorkHours ?? null,
        officeSchedule: (existingWithRelations as any).officeSchedule ?? null,
        overallOverdueTasks: existingWithRelations.overallOverdueTasks,
        professionalDevelopmentRecords: normalizeProfessionalDevelopmentRecords(
          (existingWithRelations as any).professionalDevelopmentRecords
        ),
        onboarding: formatOnboarding(existingWithRelations),
        weeklyRecords: (existingWithRelations.weeklyRecords as any[]).map((record: any) => ({
          recordId: record.id,
          startDate: formatDateForResponse(record.startDate),
          endDate: formatDateForResponse(record.endDate),
          plannedWorkHours: record.plannedWorkHours,
          actualWorkHours: record.actualWorkHours,
          assignedTasks: record.assignedTasks,
          assignedTasksDetails: record.assignedTasksDetails || [],
          weeklyOverdueTasks: record.weeklyOverdueTasks,
          overdueTasksDetails: record.overdueTasksDetails || [],
          allOverdueTasks: record.allOverdueTasks || 0,
          allOverdueTasksDetails: record.allOverdueTasksDetails || [],
          managerComment: record.managerComment || "",
        })),
        onboardingEmailDrafts,
        alreadyExists: true,
      });
    }

    const onboardingEmailDrafts = await buildNewHireOnboardingEmailDrafts({
      employeeName: normalizedName,
      employeeEmail: normalizedEmail,
      employeeId: normalizedEmployeeId,
      department: normalizedDepartment,
      position: normalizedPosition,
      manager: normalizedManager,
      startDate: joinDate,
      staffWorkLocation: staffWorkLocation || "USA",
      workLocationMode:
        officeSchedule &&
        Array.isArray((officeSchedule as any)?.days) &&
        ((officeSchedule as any).days as string[]).length > 0
          ? "In-Person"
          : "Remote",
      employeeType: employeeType || "Full time",
      probationPeriodStartDate: probationPeriodStartDate,
      probationPeriodEndDate: probationPeriodEndDate,
      monthlySalaryDuringProbation: monthlySalaryDuringProbation,
      monthlySalaryAfterProbation: monthlySalaryAfterProbation,
    });

    const employee = await (prisma as any).employee.create({
      data: {
        employeeId: normalizedEmployeeId,
        name: normalizedName,
        email: normalizedEmail,
        personalEmail: normalizedPersonalEmail,
        department: normalizedDepartment,
        manager: normalizedManager,
        position: normalizedPosition,
        joinDate: parseDateForDatabase(joinDate),
        workAuthorizationStatus: workAuthorizationStatus || "Taiwan Resident",
        staffWorkLocation: staffWorkLocation || "USA",
        employeeType: employeeType || "Full time",
        contractWorkHours: employeeType === "Contract" ? (parseInt(contractWorkHours) || null) : null,
        officeSchedule: officeSchedule ?? null,
        probationPeriodStartDate: probationPeriodStartDate ? parseDateForDatabase(probationPeriodStartDate) : null,
        probationPeriodEndDate: probationPeriodEndDate ? parseDateForDatabase(probationPeriodEndDate) : null,
        monthlySalaryDuringProbation:
          monthlySalaryDuringProbation !== undefined && monthlySalaryDuringProbation !== null && monthlySalaryDuringProbation !== ""
            ? Number(monthlySalaryDuringProbation)
            : 1300,
        monthlySalaryAfterProbation:
          monthlySalaryAfterProbation !== undefined && monthlySalaryAfterProbation !== null && monthlySalaryAfterProbation !== ""
            ? Number(monthlySalaryAfterProbation)
            : 1400,
        overallOverdueTasks: overallOverdueTasks || 0,
        onboardingChecklistAssigned: false,
        systemAccessGmail: false,
        systemAccessClickup: false,
        systemAccessMoodle: false,
        systemAccessGoogleDrive: false,
        onboardingStep2Completed: false,
        onboardingStep2Forms: buildDefaultStep2Forms(
          parseDateForDatabase(joinDate),
          false
        ),
        onboardingStep3Completed: false,
        onboardingStep3Forms: buildDefaultStep3Forms(false),
        onboardingStep4Completed: false,
        onboardingStep4Forms: buildDefaultStep4Forms(false),
        onboardingStep5Completed: false,
        professionalDevelopmentRecords: [],
        onboardingStep6AnnualTracking: false,
        onboardingStep1UpdatedBy: "System",
        onboardingStep1UpdatedAt: new Date(),
        onboardingStep1Notes: "New hire onboarding not started.",
      },
      include: {
        weeklyRecords: true,
      },
    });

    return NextResponse.json({
      id: employee.employeeId,
      name: employee.name,
      email: employee.email,
      personalEmail: employee.personalEmail || "",
      department: employee.department,
      manager: employee.manager,
      position: employee.position,
      joinDate: formatDateForResponse(employee.joinDate),
      workAuthorizationStatus: employee.workAuthorizationStatus,
      staffWorkLocation: employee.staffWorkLocation || "USA",
      employeeType: (employee as any).employeeType || "Full time",
      contractWorkHours: (employee as any).contractWorkHours ?? null,
      officeSchedule: (employee as any).officeSchedule ?? null,
      overallOverdueTasks: employee.overallOverdueTasks,
      professionalDevelopmentRecords: [],
      onboarding: formatOnboarding(employee),
      weeklyRecords: [],
      onboardingEmailDrafts,
    });
  } catch (error) {
    console.error("Error creating employee:", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        {
          error: "Failed to create employee",
          details: "Employee ID already exists.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to create employee",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
