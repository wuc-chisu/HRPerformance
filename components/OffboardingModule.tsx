"use client";

import { useEffect, useMemo, useState } from "react";
import { Employee } from "@/lib/employees";

interface OffboardingModuleProps {
  employees: Employee[];
  onRecordsChanged?: () => Promise<void> | void;
}

type OffboardingRecordSummary = {
  employeeId: string;
  completionPercent: number;
  separationType: string;
  updatedAt: string;
  lastWorkingDate?: string | null;
  step8?: Record<string, boolean>;
};

type OffboardingEmployee = Employee & {
  personalEmail?: string;
};

function buildTerminationSubject(name: string) {
  return `Notice of Employment Termination - ${name}`;
}

function buildTerminationBody(params: {
  employeeName: string;
  lastWorkingDate: string;
  isTaiwanEmployee: boolean;
}) {
  const { employeeName, lastWorkingDate, isTaiwanEmployee } = params;
  const safeName = employeeName || "Employee";
  const safeLastWorkingDate = lastWorkingDate || "[Last Working Date]";

  if (!isTaiwanEmployee) {
    return [
      `Dear ${safeName},`,
      "",
      "First, we would like to sincerely thank you for your contributions and service to Whitewater University of California over the years. We recognize the efforts and dedication you have shown during your employment, and we appreciate the work you have contributed to the University and our students.",
      "",
      "After careful consideration, we regret to inform you that Whitewater University of California has decided to end your employment.",
      "",
      `Following a review of your performance history, disciplinary records, coaching efforts, and Performance Improvement Plan (PIP), the University has determined that your employment will end effective ${safeLastWorkingDate}.`,
      "",
      "This decision was not made lightly. We recognize that employment relationships evolve over time, and while there have been many positive contributions throughout your tenure, the University has concluded that it is appropriate to move forward in a different direction.",
      "",
      "As part of the transition process, your access to University systems, including Gmail, Google Drive, Moodle, ClickUp, and other internal platforms, has been restricted.",
      "",
      "Should additional information or assistance be required regarding your prior work responsibilities, Human Resources or management may contact you through your personal email address.",
      "",
      "During the notice period, you are not required to perform regular work duties unless specifically requested by management or Human Resources for transition or handover purposes.",
      "",
      "Please reply to this email from your personal email address to confirm receipt of this notice.",
      "",
      "Kindly note that acknowledgment of receipt does not indicate agreement with the contents of this notice and is requested solely for record-keeping purposes.",
      "",
      "In addition, please review, sign, and return the attached Offboarding Acknowledgement Form within five (5) business days of receipt.",
      "",
      "Final salary payments, severance pay (if applicable), accrued leave payments, and other separation-related matters will be communicated separately by Human Resources.",
      "",
      "We sincerely thank you again for your service to the University and wish you success and fulfillment in your future endeavors.",
      "",
      "Attachments:",
      "- Termination Notice",
      "- Offboarding Acknowledgement Form",
      "",
      "Sincerely,",
      "Human Resources",
      "Whitewater University of California",
      "3150 Almaden Expy, Suite 111, San Jose, CA 95118",
    ].join("\n");
  }

  return [
    `Dear ${safeName},`,
    "",
    "First, we would like to sincerely thank you for your contributions and service to Whitewater University of California over the years. We recognize the efforts and dedication you have shown during your employment, and we appreciate the work you have contributed to the University and our students.",
    "首先，我們誠摯感謝您多年來對 Whitewater University of California 的付出與貢獻。我們肯定您在任職期間所投入的努力與心力，並感謝您對學校及學生所做出的貢獻。",
    "",
    "After careful consideration, we regret to inform you that Whitewater University of California has decided to end your employment.",
    "經過審慎評估後，我們很遺憾地通知您，Whitewater University of California 已決定終止與您的聘用關係。",
    "",
    `Following a review of your performance history, disciplinary records, coaching efforts, and Performance Improvement Plan (PIP), the University has determined that your employment will end effective ${safeLastWorkingDate}.`,
    `經審查您的工作績效紀錄、警告紀錄、輔導紀錄及績效改善計畫（PIP）執行情況後，本校決定您的聘用關係將於 ${safeLastWorkingDate} 終止。`,
    "",
    "This decision was not made lightly. We recognize that employment relationships evolve over time, and while there have been many positive contributions throughout your tenure, the University has concluded that it is appropriate to move forward in a different direction.",
    "此決定並非輕率做出。我們理解每段職涯關係都會隨時間而改變，雖然您在任職期間曾有許多正面的貢獻，但經綜合考量後，本校認為現階段以不同方向發展較為適當。",
    "",
    "As part of the transition process, your access to University systems, including Gmail, Google Drive, Moodle, ClickUp, and other internal platforms, has been restricted.",
    "為配合離職及交接程序，您的 Gmail、Google Drive、Moodle、ClickUp 及其他校內系統權限已受到限制。",
    "",
    "Should additional information or assistance be required regarding your prior work responsibilities, Human Resources or management may contact you through your personal email address.",
    "如本校就您過去負責之工作內容、學生案件、專案進度或交接事項需要進一步確認，人力資源部門或主管將透過您的個人電子郵件與您聯繫。",
    "",
    "During the notice period, you are not required to perform regular work duties unless specifically requested by management or Human Resources for transition or handover purposes.",
    "於預告期間內，除主管或人力資源部門因交接需要另行通知外，您無須執行日常工作職責。",
    "",
    "Please reply to this email from your personal email address to confirm receipt of this notice.",
    "請使用您的個人電子郵件回覆本信，確認您已收到本通知。",
    "",
    "Kindly note that acknowledgment of receipt does not indicate agreement with the contents of this notice and is requested solely for record-keeping purposes.",
    "此確認僅作為送達紀錄之用，並不表示您同意本通知內容。",
    "",
    "In addition, please review, sign, and return the attached Offboarding Acknowledgement Form (離職交接確認書) within five (5) business days of receipt.",
    "此外，請於收到本通知後五個工作日內審閱、簽署並回傳附件之《離職交接確認書》。",
    "",
    "Final salary payments, severance pay (if applicable), accrued leave payments, and other separation-related matters will be communicated separately by Human Resources.",
    "最終薪資、資遣費（如適用）、未休假折算金額及其他相關離職給付事項，將由人力資源部門另行通知。",
    "",
    "We sincerely thank you again for your service to the University and wish you success and fulfillment in your future endeavors.",
    "再次感謝您過去對學校的付出，並誠摯祝福您未來一切順利，職涯發展成功。",
    "",
    "附件：",
    "- Termination Notice / 解聘通知書",
    "- Offboarding Acknowledgement Form / 離職交接確認書",
    "",
    "敬祝安好",
    "",
    "Sincerely,",
    "Human Resources",
    "人力資源部",
    "Whitewater University of California",
    "3150 Almaden Expy, Suite 111, San Jose, CA 95118",
  ].join("\n");
}

function buildInternalNotificationBody(params: {
  employeeName: string;
  jobTitle: string;
  department: string;
  employeeType: string;
  lastWorkingDate: string;
  separationType: string;
  personalEmail: string;
}) {
  const { employeeName, jobTitle, department, employeeType, lastWorkingDate, separationType, personalEmail } = params;
  const safeName = employeeName || "[Employee Name]";
  const safeTitle = jobTitle || "[Job Title]";
  const safeDept = department || "[Department]";
  const safeType = employeeType || "[Full-Time / Part-Time / Contractor]";
  const safeLwd = lastWorkingDate || "[Last Working Date]";
  const safeSep = separationType || "[Resignation / Termination / End of Contract]";
  const safePersonalEmail = personalEmail || "[Personal Email Address]";

  return [
    "Dear Team,",
    "",
    `This email serves as notification that ${safeName}, ${safeTitle}, will be separating from Whitewater University of California.`,
    "",
    "Employee Information",
    "",
    `- Employee Name: ${safeName}`,
    `- Position: ${safeTitle}`,
    `- Department: ${safeDept}`,
    `- Employment Type: ${safeType}`,
    `- Last Working Date: ${safeLwd}`,
    `- Separation Type: ${safeSep}`,
    "",
    "Please note that during the transition period, the employee may still be contacted regarding prior work responsibilities, student matters, project status, documentation, or handover-related questions. Any such communication should be directed to the employee's personal email address listed below:",
    "",
    `Personal Email: ${safePersonalEmail}`,
    "",
    "Please complete any applicable offboarding actions for your department.",
    "",
    "Direct Manager",
    "- Complete work handover review.",
    "- Identify outstanding projects or responsibilities.",
    "- Confirm completion of transition documentation.",
    "",
    "IT / System Administrator",
    "- Disable or restrict system access as scheduled.",
    "- Secure University accounts and data.",
    "- Recover company-owned devices and equipment if applicable.",
    "",
    "Payroll / Accounting",
    "- Process final payroll.",
    "- Calculate accrued leave payouts.",
    "- Process severance pay or other separation-related payments if applicable.",
    "",
    "Leadership (if applicable)",
    "- Review and approve any required separation documentation.",
    "",
    "Academic Affairs (if applicable)",
    "- Reassign courses, faculty responsibilities, and academic records as necessary.",
    "",
    "Student Services (if applicable)",
    "- Coordinate any student communications or case transfers as necessary.",
    "",
    "Please direct any questions regarding this offboarding process to Human Resources.",
    "",
    "Thank you for your cooperation.",
    "",
    "Sincerely,",
    "Human Resources",
    "Whitewater University of California",
  ].join("\n");
}

const defaultStep1 = {
  receivedManagerRequest: false,
  emailedItDisable: false,
  sentTerminationNotice: false,
  sentOffboardingAcknowledgement: false,
  receivedResignationNotice: false,
  sentResignationAcceptance: false,
  requestedConfirmationOfReceipt: false,
  savedEmailDeliveryRecord: false,
};

const defaultStep2 = {
  notifyDirectManager: false,
  notifyIT: false,
  notifyPayroll: false,
  notifyLeadership: false,
  notifiedAcademicAffairs: false,
  notifiedStudentServices: false,
};

const defaultStep3 = {
  disableGmail: false,
  disableGoogleDrive: false,
  disableGoogleAdmin: false,
  disableMoodle: false,
  disableGoogleClassroom: false,
  disableClickUp: false,
  disableVpnRemoteAccess: false,
  disableOtherSystems: false,
  disableEmailLogin: false,
};

const defaultStep4 = {
  returnLaptopCharger: false,
  returnIdBadge: false,
  returnKeys: false,
  returnOfficeEquipment: false,
  returnDocuments: false,
  signedPropertyChecklist: false,
};

const defaultStep5 = {
  reassignClickUpTasks: false,
  documentIncompleteWork: false,
  continuityConfirmed: false,
};

const defaultStep6 = {
  confidentialityAcknowledged: false,
  noDataRetentionAcknowledged: false,
  propertyReturnAcknowledged: false,
  studentDataProtectionAcknowledged: false,
  signedOrRefusalDocumented: false,
};

const defaultStep7 = {
  finalSalaryCalculated: false,
  ptoVacationPayoutCalculated: false,
  expenseReimbursementProcessed: false,
  severanceSeparationPaymentCalculated: false,
  accountantPayrollNotified: false,
  paymentDateConfirmed: false,
  finalCompensationIssued: false,
};

const defaultStep8 = {
  uploadTerminationNotice: false,
  uploadOffboardingAcknowledgement: false,
  resignationLetter: false,
  resignationAcceptanceLetter: false,
  propertyReturnChecklistUs: false,
  accessSuspensionConfirmation: false,
  finalCompensationWorksheet: false,
  uploadManagerRecommendationReport: false,
  uploadPerformanceReports: false,
  uploadWrittenWarnings: false,
  uploadPipDocumentation: false,
  employeeFilesArchived: false,
  offboardingCaseCompleted: false,
};

function matchesHRRole(employee: Employee) {
  const dept = employee.department || "";
  const position = employee.position || "";
  return /hr|human resources/i.test(dept) || /hr|human resources/i.test(position);
}

function matchesITRole(employee: Employee) {
  const dept = employee.department || "";
  return /information technology/i.test(dept);
}

export default function OffboardingModule({ employees, onRecordsChanged }: OffboardingModuleProps) {
  const sortedEmployees = useMemo(
    () =>
      [...employees].sort((a, b) =>
        a.id.localeCompare(b.id, undefined, {
          numeric: true,
          sensitivity: "base",
        })
      ),
    [employees]
  );

  const hrCandidates = useMemo(
    () => sortedEmployees.filter(matchesHRRole),
    [sortedEmployees]
  );

  const itCandidates = useMemo(
    () => sortedEmployees.filter(matchesITRole),
    [sortedEmployees]
  );

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [newOffboardEmployeeId, setNewOffboardEmployeeId] = useState<string>("");
  const [offboardingRecords, setOffboardingRecords] = useState<OffboardingRecordSummary[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [hrResponsible, setHrResponsible] = useState<string>("");
  const [itResponsible, setItResponsible] = useState<string>("");
  const [separationType, setSeparationType] = useState<"Resignation" | "Termination">("Resignation");
  const [leaveType, setLeaveType] = useState<"Active working notice" | "Garden leave" | "Immediate separation">("Active working notice");
  const [noticeDate, setNoticeDate] = useState<string>("");
  const [lastWorkingDate, setLastWorkingDate] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [saveNotice, setSaveNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [confirmingOffboard, setConfirmingOffboard] = useState(false);
  const [deletingEmployeeId, setDeletingEmployeeId] = useState<string | null>(null);
  const [terminationEmailTo, setTerminationEmailTo] = useState("");
  const [terminationEmailSubject, setTerminationEmailSubject] = useState("");
  const [terminationEmailBody, setTerminationEmailBody] = useState("");
  const [terminationEmailAttachments, setTerminationEmailAttachments] = useState<File[]>([]);
  const [terminationEmailBcc, setTerminationEmailBcc] = useState("");
  const [sendingTerminationEmail, setSendingTerminationEmail] = useState(false);
  const [terminationEmailNotice, setTerminationEmailNotice] = useState<string | null>(null);
  const [step1EmailOpen, setStep1EmailOpen] = useState(false);

  const [step2EmailOpen, setStep2EmailOpen] = useState(false);
  const [step2EmailTo, setStep2EmailTo] = useState("");
  const [step2EmailSubject, setStep2EmailSubject] = useState("");
  const [step2EmailBody, setStep2EmailBody] = useState("");
  const [step2EmailBcc, setStep2EmailBcc] = useState("");
  const [sendingStep2Email, setSendingStep2Email] = useState(false);
  const [step2EmailNotice, setStep2EmailNotice] = useState<string | null>(null);

  const [step1, setStep1] = useState(defaultStep1);

  const [step2, setStep2] = useState(defaultStep2);

  const [step3, setStep3] = useState(defaultStep3);

  const [step4, setStep4] = useState(defaultStep4);

  const [step5, setStep5] = useState(defaultStep5);

  const [step6, setStep6] = useState(defaultStep6);

  const [step7, setStep7] = useState(defaultStep7);

  const [step8, setStep8] = useState(defaultStep8);

  useEffect(() => {
    const loadOffboardingRecords = async () => {
      try {
        setLoadingRecords(true);
        const response = await fetch("/api/offboarding");
        if (!response.ok) throw new Error("Failed to load offboarding records");
        const data = await response.json();
        setOffboardingRecords(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load offboarding records:", error);
      } finally {
        setLoadingRecords(false);
      }
    };

    loadOffboardingRecords();
  }, []);

  const offboardedEmployeeIds = useMemo(
    () => new Set(offboardingRecords.map((record) => record.employeeId)),
    [offboardingRecords]
  );

  const activeEmployees = useMemo(
    () => sortedEmployees.filter((emp) => !offboardedEmployeeIds.has(emp.id)),
    [sortedEmployees, offboardedEmployeeIds]
  );

  useEffect(() => {
    if (activeEmployees.length === 0) {
      setNewOffboardEmployeeId("");
      return;
    }

    if (!newOffboardEmployeeId || !activeEmployees.some((emp) => emp.id === newOffboardEmployeeId)) {
      setNewOffboardEmployeeId(activeEmployees[0].id);
    }
  }, [activeEmployees, newOffboardEmployeeId]);

  useEffect(() => {
    if (!hrResponsible) {
      const firstHr = hrCandidates[0]?.name || sortedEmployees[0]?.name || "";
      setHrResponsible(firstHr);
    }
  }, [hrResponsible, hrCandidates, sortedEmployees]);

  useEffect(() => {
    if (!itResponsible) {
      const firstIt = itCandidates[0]?.name || "";
      setItResponsible(firstIt);
    }
  }, [itResponsible, itCandidates, sortedEmployees]);

  const selectedEmployee =
    sortedEmployees.find((emp) => emp.id === selectedEmployeeId) || null;

  const selectedRecord = useMemo(
    () => offboardingRecords.find((record) => record.employeeId === selectedEmployeeId) || null,
    [offboardingRecords, selectedEmployeeId]
  );

  const isConfirmedOffboard = Boolean(selectedRecord?.step8?.confirmedOffboard);

  const employeeNameById = useMemo(
    () => new Map(sortedEmployees.map((emp) => [emp.id, emp.name])),
    [sortedEmployees]
  );

  const firstHrName = hrCandidates[0]?.name || sortedEmployees[0]?.name || "";
  const firstItName = itCandidates[0]?.name || "";

  const ceoEmail = useMemo(() => {
    const ceo = sortedEmployees.find((emp) => /ceo|chief executive|president/i.test(emp.position || ""));
    return (ceo as OffboardingEmployee | undefined)?.personalEmail || ceo?.email || "";
  }, [sortedEmployees]);

  const cooVpEmail = useMemo(() => {
    const coo = sortedEmployees.find((emp) => /coo|chief operating|vp|vice president/i.test(emp.position || ""));
    return (coo as OffboardingEmployee | undefined)?.personalEmail || coo?.email || "";
  }, [sortedEmployees]);

  const registrarEmail = useMemo(() => {
    const r = sortedEmployees.find((emp) => /registrar/i.test(emp.position || ""));
    return (r as OffboardingEmployee | undefined)?.personalEmail || r?.email || "";
  }, [sortedEmployees]);

  const complianceEmail = useMemo(() => {
    const c = sortedEmployees.find((emp) => /compliance/i.test(emp.position || ""));
    return (c as OffboardingEmployee | undefined)?.personalEmail || c?.email || "";
  }, [sortedEmployees]);

  const itEngineerEmail = useMemo(() => {
    const it = sortedEmployees.find((emp) => /it engineer|information technology/i.test(emp.position || emp.department || ""));
    return (it as OffboardingEmployee | undefined)?.personalEmail || it?.email || "";
  }, [sortedEmployees]);

  const studentServicesEmail = useMemo(() => {
    const ss = sortedEmployees.find((emp) => /student services|director of student/i.test(emp.position || ""));
    return (ss as OffboardingEmployee | undefined)?.personalEmail || ss?.email || "";
  }, [sortedEmployees]);

  const accountantEmail = useMemo(() => {
    const acc = sortedEmployees.find((emp) => /accountant|accounting/i.test(emp.position || ""));
    return (acc as OffboardingEmployee | undefined)?.personalEmail || acc?.email || "";
  }, [sortedEmployees]);

  const defaultBccEmails = useMemo(
    () => [ceoEmail, cooVpEmail].filter(Boolean).join(", "),
    [ceoEmail, cooVpEmail]
  );

  const step2RecipientEmails = useMemo(
    () =>
      [
        ...sortedEmployees.map((emp) => emp.email),
        registrarEmail,
        complianceEmail,
        itEngineerEmail,
        studentServicesEmail,
        accountantEmail,
      ]
        .filter(Boolean)
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .join(", "),
    [sortedEmployees, registrarEmail, complianceEmail, itEngineerEmail, studentServicesEmail, accountantEmail]
  );

  const resetForm = () => {
    setSeparationType("Resignation");
    setLeaveType("Active working notice");
    setNoticeDate("");
    setLastWorkingDate("");
    setHrResponsible(firstHrName);
    setItResponsible(firstItName);
    setStep1(defaultStep1);
    setStep2(defaultStep2);
    setStep3(defaultStep3);
    setStep4(defaultStep4);
    setStep5(defaultStep5);
    setStep6(defaultStep6);
    setStep7(defaultStep7);
    setStep8(defaultStep8);
    setLastSavedAt(null);
    setTerminationEmailTo("");
    setTerminationEmailSubject("");
    setTerminationEmailBody("");
    setTerminationEmailAttachments([]);
    setTerminationEmailBcc("");
    setTerminationEmailNotice(null);
    setStep1EmailOpen(false);
    setStep2EmailOpen(false);
    setStep2EmailTo("");
    setStep2EmailSubject("");
    setStep2EmailBody("");
    setStep2EmailBcc("");
    setStep2EmailNotice(null);
  };

  useEffect(() => {
    if (!selectedEmployeeId) return;

    const loadRecord = async () => {
      try {
        setLoadingRecord(true);
        setSaveNotice(null);
        const response = await fetch(`/api/offboarding?employeeId=${encodeURIComponent(selectedEmployeeId)}`);
        if (!response.ok) throw new Error("Failed to load offboarding record");

        const record = await response.json();
        if (!record) {
          resetForm();
          return;
        }

        setSeparationType(record.separationType === "Termination" ? "Termination" : "Resignation");
        setLeaveType(
          record.leaveType === "Garden leave" || record.leaveType === "Immediate separation"
            ? record.leaveType
            : "Active working notice"
        );
        setNoticeDate(record.noticeDate ? String(record.noticeDate).split("T")[0] : "");
        setLastWorkingDate(record.lastWorkingDate ? String(record.lastWorkingDate).split("T")[0] : "");
        setHrResponsible(record.hrResponsible || firstHrName);
        setItResponsible(record.itResponsible || firstItName);
        setStep1({ ...defaultStep1, ...(record.step1 || {}) });
        setStep2({ ...defaultStep2, ...(record.step2 || {}) });
        setStep3({ ...defaultStep3, ...(record.step3 || {}) });
        setStep4({ ...defaultStep4, ...(record.step4 || {}) });
        setStep5({ ...defaultStep5, ...(record.step5 || {}) });
        setStep6({ ...defaultStep6, ...(record.step6 || {}) });
        setStep7({ ...defaultStep7, ...(record.step7 || {}) });
        setStep8({ ...defaultStep8, ...(record.step8 || {}) });
        setLastSavedAt(record.updatedAt || null);
      } catch (error) {
        console.error("Failed to load offboarding record:", error);
        setSaveNotice({ type: "error", message: "Failed to load offboarding record." });
      } finally {
        setLoadingRecord(false);
      }
    };

    loadRecord();
  }, [selectedEmployeeId, firstHrName, firstItName]);

  const handleSave = async () => {
    if (!selectedEmployeeId) return;

    try {
      setSaving(true);
      setSaveNotice(null);

      const response = await fetch("/api/offboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          separationType,
          leaveType,
          noticeDate: noticeDate || null,
          lastWorkingDate: lastWorkingDate || null,
          hrResponsible,
          itResponsible,
          step1,
          step2,
          step3,
          step4,
          step5,
          step6,
          step7,
          step8,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.details
            ? `${data.error || "Failed to save offboarding record"}: ${data.details}`
            : data.error || "Failed to save offboarding record"
        );
      }

      const saved = await response.json();
      setLastSavedAt(saved.updatedAt || null);
      setSaveNotice({ type: "success", message: "Offboarding record saved successfully." });

      const recordsResponse = await fetch("/api/offboarding");
      if (recordsResponse.ok) {
        const data = await recordsResponse.json();
        setOffboardingRecords(Array.isArray(data) ? data : []);
      }

      await onRecordsChanged?.();

      setShowForm(false);
      setSelectedEmployeeId("");
    } catch (error) {
      console.error("Failed to save offboarding record:", error);
      setSaveNotice({ type: "error", message: error instanceof Error ? error.message : "Failed to save offboarding record." });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = () => {
    if (!selectedEmployeeId) return;

    const formatChecklist = (title: string, data: Record<string, boolean>, labels: Record<string, string>) => {
      const rows = Object.entries(data)
        .map(([key, done]) => `<li><span class="status">${done ? "Done" : "Pending"}</span> ${labels[key] || key}</li>`)
        .join("");
      return `<section><h3>${title}</h3><ul>${rows}</ul></section>`;
    };

    const content = `
      <h1>Offboarding Process Record</h1>
      <p><strong>Employee:</strong> ${selectedEmployee?.name || ""} (${selectedEmployeeId})</p>
      <p><strong>Department:</strong> ${selectedEmployee?.department || "N/A"}</p>
      <p><strong>Direct Manager:</strong> ${selectedEmployee?.manager || "N/A"}</p>
      <p><strong>Separation Type:</strong> ${separationType}</p>
      <p><strong>Notice Date:</strong> ${noticeDate || "N/A"}</p>
      <p><strong>Last Working Date:</strong> ${lastWorkingDate || "N/A"}</p>
      <p><strong>HR Responsible:</strong> ${hrResponsible || "N/A"}</p>
      <p><strong>IT Responsible:</strong> ${itResponsible || "N/A"}</p>
      <p><strong>Completion:</strong> ${completion.completed}/${completion.total} (${completion.percentage}%)</p>
      <p><strong>Exported At:</strong> ${new Date().toLocaleString()}</p>

      ${formatChecklist("Step 1 - Separation Confirmation", step1, {
        receivedManagerRequest: "Received manager offboarding request with supporting reason",
        emailedItDisable: "Emailed IT to disable employee accounts",
        sentTerminationNotice: "Sent Termination Notice to employee personal email",
        sentOffboardingAcknowledgement: "Sent Offboarding Acknowledgement to employee personal email",
        receivedResignationNotice: "Received employee resignation notice",
        sentResignationAcceptance: "Sent resignation acceptance confirmation",
        requestedConfirmationOfReceipt: "Requested employee confirmation of receipt",
        savedEmailDeliveryRecord: "Saved email delivery record",
      })}
      ${formatChecklist("Step 2 - Internal Notification", step2, {
        notifyDirectManager: "Notify Direct Manager",
        notifyIT: "Notify IT / System Administrator",
        notifyPayroll: "Notify Payroll",
        notifyLeadership: "Notify Leadership (if applicable)",
        notifiedAcademicAffairs: "Notified Academic Affairs (if applicable)",
        notifiedStudentServices: "Notified Student Services (if applicable)",
      })}
      ${formatChecklist("Step 3 - Access Suspension (CRITICAL)", step3, {
        disableGmail: "Disable Gmail",
        disableGoogleDrive: "Disable Google Drives",
        disableGoogleAdmin: "Disable Google Admin (if applicable)",
        disableMoodle: "Disable Moodle",
        disableGoogleClassroom: "Disable Google Classroom",
        disableClickUp: "Disable ClickUp",
        disableVpnRemoteAccess: "Disable VPN / remote access",
        disableOtherSystems: "Disable internal / third-party systems",
        disableEmailLogin: "Disable email login access",
      })}
      ${formatChecklist("Step 4 - Company Property Return", step4, {
        returnLaptopCharger: "Collect laptop / charger",
        returnIdBadge: "Collect ID badge",
        returnKeys: "Collect keys",
        returnOfficeEquipment: "Collect office equipment",
        returnDocuments: "Collect documents (physical or digital)",
        signedPropertyChecklist: "Employee signed Property Return Checklist",
      })}
      ${formatChecklist("Step 5 - Work Handover", step5, {
        reassignClickUpTasks: "Reassign ClickUp tasks",
        documentIncompleteWork: "Document incomplete work",
        continuityConfirmed: "Ensure continuity of operations",
      })}
      ${formatChecklist("Step 6 - Exit Agreement Execution", step6, {
        confidentialityAcknowledged: "Confidentiality obligations acknowledged",
        noDataRetentionAcknowledged: "No data retention clause acknowledged",
        propertyReturnAcknowledged: "Company property return clause acknowledged",
        studentDataProtectionAcknowledged: "Student/institutional data protection acknowledged",
        signedOrRefusalDocumented: "Employee signed, or refusal to sign documented",
      })}
      ${formatChecklist("Step 7 - Final Payroll", step7, {
        finalSalaryCalculated: "Final salary calculated",
        ptoVacationPayoutCalculated: "PTO / Vacation payout calculated (if applicable)",
        expenseReimbursementProcessed: "Expense reimbursement processed (if applicable)",
        severanceSeparationPaymentCalculated: "Severance / Separation Payment calculated (if applicable)",
        accountantPayrollNotified: "Accountant / Payroll notified",
        paymentDateConfirmed: "Payment date confirmed",
        finalCompensationIssued: "Final compensation issued",
      })}
      ${formatChecklist(
        "Step 8 - Documentation & Record Retention",
        step8,
        separationType === "Termination"
          ? {
              uploadManagerRecommendationReport: "Upload Manager Recommendation Report",
              uploadPerformanceReports: "Upload Performance Reports",
              uploadWrittenWarnings: "Upload Written Warnings",
              uploadPipDocumentation: "Upload PIP Documentation",
              employeeFilesArchived: "Employee files archived",
              offboardingCaseCompleted: "Offboarding case completed",
            }
          : {
              uploadTerminationNotice: "Upload Termination Notice",
              uploadOffboardingAcknowledgement: "Upload Offboarding Acknowledgement",
              resignationLetter: "Resignation Letter",
              resignationAcceptanceLetter: "Resignation Acceptance Letter",
              ...(isUSBasedEmployee
                ? { propertyReturnChecklistUs: "Property Return Checklist (US base employee only)" }
                : {}),
              accessSuspensionConfirmation: "Access Suspension Confirmation",
              finalCompensationWorksheet: "Final Compensation Worksheet",
            }
      )}
    `;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setSaveNotice({ type: "error", message: "Unable to open print window. Please allow pop-ups and try again." });
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${selectedEmployeeId}_offboarding</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
            h1 { margin-bottom: 12px; }
            h3 { margin-top: 22px; margin-bottom: 8px; border-top: 1px solid #e5e7eb; padding-top: 12px; }
            p { margin: 4px 0; }
            ul { margin: 0; padding-left: 20px; }
            li { margin: 4px 0; }
            .status { display: inline-block; min-width: 58px; font-weight: 700; color: #374151; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    setSaveNotice({ type: "success", message: "PDF export started. Choose 'Save as PDF' in the print dialog." });
  };

  const isTaiwanEmployee = (selectedEmployee?.staffWorkLocation || "").toLowerCase().includes("taiwan");
  const isUSBasedEmployee = /(^|\b)(us|usa|united states)(\b|$)/i.test(selectedEmployee?.staffWorkLocation || "");
  const selectedEmployeePersonalEmail =
    (selectedEmployee as OffboardingEmployee | null)?.personalEmail || "";

  const noticeDays = noticeDate && lastWorkingDate
    ? Math.floor((new Date(lastWorkingDate).getTime() - new Date(noticeDate).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const taiwanNoticeTooShort = isTaiwanEmployee && noticeDays !== null && noticeDays < 30;

  useEffect(() => {
    if (!selectedEmployeeId || !showForm || separationType !== "Termination") {
      return;
    }

    const targetTo = selectedEmployeePersonalEmail || selectedEmployee?.email || "";
    const targetSubject = buildTerminationSubject(selectedEmployee?.name || "Employee");
    const targetBody = buildTerminationBody({
      employeeName: selectedEmployee?.name || "Employee",
      lastWorkingDate,
      isTaiwanEmployee,
    });

    if (!terminationEmailTo) setTerminationEmailTo(targetTo);
    if (!terminationEmailSubject) setTerminationEmailSubject(targetSubject);
    if (!terminationEmailBody) setTerminationEmailBody(targetBody);
  }, [
    selectedEmployeeId,
    showForm,
    separationType,
    selectedEmployeePersonalEmail,
    selectedEmployee?.email,
    selectedEmployee?.name,
    lastWorkingDate,
    isTaiwanEmployee,
    terminationEmailTo,
    terminationEmailSubject,
    terminationEmailBody,
  ]);

  const handleLoadTerminationTemplate = () => {
    setTerminationEmailTo(selectedEmployeePersonalEmail || selectedEmployee?.email || "");
    setTerminationEmailBcc(defaultBccEmails);
    setTerminationEmailSubject(buildTerminationSubject(selectedEmployee?.name || "Employee"));
    setTerminationEmailBody(
      buildTerminationBody({
        employeeName: selectedEmployee?.name || "Employee",
        lastWorkingDate,
        isTaiwanEmployee,
      })
    );
    setTerminationEmailNotice(null);
    setStep1EmailOpen(true);
  };

  const handleLoadStep2Template = () => {
    setStep2EmailTo(step2RecipientEmails);
    setStep2EmailBcc(defaultBccEmails);
    setStep2EmailSubject(
      `Internal Notification: ${selectedEmployee?.name || "Employee"} Separation — ${lastWorkingDate || "TBD"}`
    );
    setStep2EmailBody(
      buildInternalNotificationBody({
        employeeName: selectedEmployee?.name || "",
        jobTitle: selectedEmployee?.position || "",
        department: selectedEmployee?.department || "",
        employeeType: selectedEmployee?.employeeType || "Full time",
        lastWorkingDate,
        separationType,
        personalEmail: selectedEmployeePersonalEmail || selectedEmployee?.email || "",
      })
    );
    setStep2EmailNotice(null);
    setStep2EmailOpen(true);
  };

  const handleSendStep2Email = async () => {
    if (!step2EmailTo.trim()) {
      setStep2EmailNotice("Recipient email is required.");
      return;
    }
    if (!step2EmailSubject.trim() || !step2EmailBody.trim()) {
      setStep2EmailNotice("Subject and body are required.");
      return;
    }

    try {
      setSendingStep2Email(true);
      setStep2EmailNotice(null);

      const formData = new FormData();
      formData.append("to", step2EmailTo.trim());
      formData.append("subject", step2EmailSubject.trim());
      formData.append("body", step2EmailBody.trim());
      if (step2EmailBcc.trim()) formData.append("bcc", step2EmailBcc.trim());

      const response = await fetch("/api/email/send", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send internal notification email");
      }

      setStep2((prev) => ({
        ...prev,
        notifyDirectManager: true,
        notifyIT: true,
        notifyPayroll: true,
        notifyLeadership: true,
        notifiedAcademicAffairs: true,
        notifiedStudentServices: true,
      }));
      setStep2EmailNotice("Internal notification email sent successfully.");
    } catch (error) {
      setStep2EmailNotice(error instanceof Error ? error.message : "Failed to send internal notification email.");
    } finally {
      setSendingStep2Email(false);
    }
  };

  const handleAttachmentChange = (files: FileList | null) => {
    const selectedFiles = Array.from(files || []).slice(0, 2);
    setTerminationEmailAttachments(selectedFiles);
    if (selectedFiles.length < (files?.length || 0)) {
      setTerminationEmailNotice("Only 2 attachments are allowed. First two files were selected.");
    } else {
      setTerminationEmailNotice(null);
    }
  };

  const handleSendTerminationEmail = async () => {
    if (separationType !== "Termination") {
      setTerminationEmailNotice("Termination email can only be sent when Separation Type is Termination.");
      return;
    }

    if (!terminationEmailTo.trim()) {
      setTerminationEmailNotice("Recipient email is required.");
      return;
    }

    if (!terminationEmailSubject.trim() || !terminationEmailBody.trim()) {
      setTerminationEmailNotice("Subject and body are required.");
      return;
    }

    try {
      setSendingTerminationEmail(true);
      setTerminationEmailNotice(null);

      const formData = new FormData();
      formData.append("to", terminationEmailTo.trim());
      formData.append("subject", terminationEmailSubject.trim());
      formData.append("body", terminationEmailBody.trim());
      formData.append("cc", "HR@wuc.edu");
      terminationEmailAttachments.forEach((file) => formData.append("attachments", file));

      const response = await fetch("/api/email/send", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send termination email");
      }

      setStep1((prev) => ({
        ...prev,
        sentTerminationNotice: true,
        sentOffboardingAcknowledgement: true,
        savedEmailDeliveryRecord: true,
      }));
      setTerminationEmailNotice("Termination email sent successfully.");
    } catch (error) {
      setTerminationEmailNotice(error instanceof Error ? error.message : "Failed to send termination email.");
    } finally {
      setSendingTerminationEmail(false);
    }
  };

  const completion = useMemo(() => {
    const step1Relevant = [
      step1.receivedManagerRequest,
      step1.emailedItDisable,
      ...(separationType === "Termination"
        ? [step1.sentTerminationNotice, step1.sentOffboardingAcknowledgement]
        : [step1.receivedResignationNotice, step1.sentResignationAcceptance]),
      step1.requestedConfirmationOfReceipt,
      step1.savedEmailDeliveryRecord,
    ];
    const step8Relevant =
      separationType === "Termination"
        ? [
            step8.uploadManagerRecommendationReport,
            step8.uploadPerformanceReports,
            step8.uploadWrittenWarnings,
            step8.uploadPipDocumentation,
            step8.employeeFilesArchived,
            step8.offboardingCaseCompleted,
          ]
        : [
            step8.uploadTerminationNotice,
            step8.uploadOffboardingAcknowledgement,
            step8.resignationLetter,
            step8.resignationAcceptanceLetter,
            ...(isUSBasedEmployee ? [step8.propertyReturnChecklistUs] : []),
            step8.accessSuspensionConfirmation,
            step8.finalCompensationWorksheet,
          ];

    const checks = [
      ...step1Relevant,
      ...Object.values(step2),
      ...Object.values(step3),
      ...Object.values(step4),
      ...Object.values(step5),
      ...Object.values(step6),
      ...Object.values(step7),
      ...step8Relevant,
    ];
    const completed = checks.filter(Boolean).length;
    const total = checks.length;
    return { completed, total, percentage: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [
    step1,
    step2,
    step3,
    step4,
    step5,
    step6,
    step7,
    step8,
    separationType,
    isUSBasedEmployee,
  ]);

  const handleStartOffboarding = () => {
    if (!newOffboardEmployeeId) return;
    setSelectedEmployeeId(newOffboardEmployeeId);
    setShowForm(true);
    setSaveNotice(null);
  };

  const handleOpenOffboardRecord = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    setShowForm(true);
    setSaveNotice(null);
  };

  const handleDeleteOffboardRecord = async (employeeId: string) => {
    const ok = window.confirm("Delete this offboarding record? This cannot be undone.");
    if (!ok) return;

    try {
      setDeletingEmployeeId(employeeId);
      setSaveNotice(null);
      const response = await fetch(`/api/offboarding?employeeId=${encodeURIComponent(employeeId)}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete offboarding record");
      }

      setOffboardingRecords((prev) => prev.filter((record) => record.employeeId !== employeeId));

      if (selectedEmployeeId === employeeId) {
        setShowForm(false);
        setSelectedEmployeeId("");
      }

      await onRecordsChanged?.();
      setSaveNotice({ type: "success", message: "Offboarding record deleted." });
    } catch (error) {
      console.error("Failed to delete offboarding record:", error);
      setSaveNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to delete offboarding record.",
      });
    } finally {
      setDeletingEmployeeId(null);
    }
  };

  const handleConfirmOffboard = async () => {
    if (!selectedEmployeeId) return;

    try {
      setConfirmingOffboard(true);
      setSaveNotice(null);

      const response = await fetch("/api/offboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          confirmedOffboard: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to confirm offboarding");
      }

      const recordsResponse = await fetch("/api/offboarding");
      if (recordsResponse.ok) {
        const data = await recordsResponse.json();
        setOffboardingRecords(Array.isArray(data) ? data : []);
      }

      await onRecordsChanged?.();
      setSaveNotice({ type: "success", message: "Employee confirmed off board and disabled from other modules." });
      setShowForm(false);
      setSelectedEmployeeId("");
    } catch (error) {
      console.error("Failed to confirm offboarding:", error);
      setSaveNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Failed to confirm offboarding.",
      });
    } finally {
      setConfirmingOffboard(false);
    }
  };

  const handleBackToList = () => {
    setShowForm(false);
    setSelectedEmployeeId("");
    setSaveNotice(null);
    setLastSavedAt(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-rose-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Offboarding Process</h2>
            <p className="text-sm text-gray-600 mt-1">
              Structured 8-step offboarding checklist to ensure legal compliance, system security, and complete handover.
            </p>
          </div>
          {showForm && (
            <div className="px-4 py-2 rounded-lg bg-rose-50 border border-rose-200">
              <p className="text-sm font-semibold text-rose-700">Completion</p>
              <p className="text-lg font-bold text-rose-800">{completion.completed}/{completion.total} ({completion.percentage}%)</p>
            </div>
          )}
        </div>

        {!showForm && (
          <div className="mt-6 grid grid-cols-1 xl:grid-cols-5 gap-6">
            <div className="xl:col-span-2 rounded-xl border border-cyan-200 bg-cyan-50 p-5">
              <h3 className="text-lg font-bold text-cyan-900">Add Offboard Employee</h3>
              <p className="text-sm text-cyan-800 mt-1">
                Start a new offboarding record for an active employee.
              </p>

              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Active Employee</label>
                <select
                  value={newOffboardEmployeeId}
                  onChange={(e) => setNewOffboardEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-cyan-300 bg-white"
                  disabled={activeEmployees.length === 0}
                >
                  {activeEmployees.length === 0 && (
                    <option value="">No active employee available</option>
                  )}
                  {activeEmployees.map((emp) => {
                    const region = (emp.staffWorkLocation || "").toLowerCase().includes("taiwan") ? "Taiwan" : "US";
                    return (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.id}) — {region}
                      </option>
                    );
                  })}
                </select>
              </div>

              <button
                onClick={handleStartOffboarding}
                disabled={!newOffboardEmployeeId}
                className="mt-4 w-full px-4 py-2.5 rounded-lg bg-cyan-600 text-white font-semibold hover:bg-cyan-700 disabled:opacity-50"
              >
                Add Offboard Employee
              </button>

              <p className="mt-3 text-xs text-cyan-900/80">
                Default selection always points to an employee without an existing offboarding record.
              </p>
            </div>

            <div className="xl:col-span-3 rounded-xl border border-slate-200 p-5">
              <h3 className="text-lg font-bold text-gray-900">Offboard List</h3>
              <p className="text-sm text-gray-600 mt-1">Saved offboarding records</p>

              {loadingRecords ? (
                <p className="mt-4 text-sm text-gray-500">Loading offboarding records...</p>
              ) : offboardingRecords.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500">No offboarding records yet.</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {offboardingRecords.map((record) => (
                    <div
                      key={record.employeeId}
                      className="rounded-lg border border-slate-200 px-4 py-3"
                    >
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {employeeNameById.get(record.employeeId) || record.employeeId} ({record.employeeId})
                          </p>
                          <p className="text-xs text-gray-600">
                            {record.separationType} · Updated {new Date(record.updatedAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {Boolean(record.step8?.confirmedOffboard) && (
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                              Confirmed
                            </span>
                          )}
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-100 text-rose-700">
                            {record.completionPercent}% complete
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenOffboardRecord(record.employeeId)}
                            className="px-3 py-1.5 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300 hover:bg-slate-200"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteOffboardRecord(record.employeeId)}
                            disabled={deletingEmployeeId === record.employeeId}
                            className="px-3 py-1.5 rounded-md bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 hover:bg-rose-200 disabled:opacity-50"
                          >
                            {deletingEmployeeId === record.employeeId ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {showForm && (
          <>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  {selectedEmployee?.name || "Selected Employee"} ({selectedEmployeeId})
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    isTaiwanEmployee
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-700"
                  }`}>
                    {isTaiwanEmployee ? "Taiwan" : "US"}
                  </span>
                </h3>
                <p className="text-sm text-gray-600">
                  Direct Manager: <span className="font-semibold text-gray-900">{selectedEmployee?.manager || "Not specified"}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={handleBackToList}
                className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 font-semibold border border-slate-300 hover:bg-slate-200"
              >
                Back to Offboard List
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Separation Type</label>
                <select
                  value={separationType}
                  onChange={(e) => setSeparationType(e.target.value as "Resignation" | "Termination")}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50"
                >
                  <option value="Resignation">Resignation</option>
                  <option value="Termination">Termination</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Offboarding Process Type</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value as "Active working notice" | "Garden leave" | "Immediate separation")}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50"
                >
                  <option value="Active working notice">Active working notice</option>
                  <option value="Garden leave">Garden leave</option>
                  <option value="Immediate separation">Immediate separation</option>
                </select>
              </div>
            </div>

            {isTaiwanEmployee && (
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                <p className="text-sm font-semibold text-blue-800">
                  🇹🇼 Taiwan Labor Law — Notice Period Requirement
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  By Taiwan law, existing Taiwan employee must have at least 30 days notice period.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Notice Date</label>
                <input
                  type="date"
                  value={noticeDate}
                  onChange={(e) => setNoticeDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Last Working Date</label>
                <input
                  type="date"
                  value={lastWorkingDate}
                  onChange={(e) => setLastWorkingDate(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border bg-white ${
                    taiwanNoticeTooShort ? "border-red-400" : "border-slate-300"
                  }`}
                />
              </div>
            </div>

            {taiwanNoticeTooShort && (
              <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2">
                <p className="text-sm font-semibold text-red-700">
                  ⚠️ Notice period is only {noticeDays} day{noticeDays === 1 ? "" : "s"} — Taiwan law requires at least 30 days.
                </p>
              </div>
            )}

            {isTaiwanEmployee && noticeDate && lastWorkingDate && !taiwanNoticeTooShort && noticeDays !== null && (
              <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2">
                <p className="text-sm text-emerald-700">
                  ✓ Notice period is {noticeDays} day{noticeDays === 1 ? "" : "s"} — meets Taiwan 30-day requirement.
                </p>
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving || loadingRecord || !selectedEmployeeId}
                className="px-5 py-2.5 rounded-lg bg-rose-500 text-white font-semibold hover:bg-rose-600 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Offboarding Record"}
              </button>
              <button
                onClick={handleConfirmOffboard}
                disabled={confirmingOffboard || loadingRecord || !selectedEmployeeId || !selectedRecord || isConfirmedOffboard}
                className="px-5 py-2.5 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 disabled:opacity-50"
              >
                {isConfirmedOffboard ? "Confirmed Off Board" : confirmingOffboard ? "Confirming..." : "Confirm Off Board"}
              </button>
              <button
                onClick={handleExport}
                disabled={loadingRecord || !selectedEmployeeId}
                className="px-5 py-2.5 rounded-lg bg-slate-100 text-slate-700 font-semibold border border-slate-300 hover:bg-slate-200 disabled:opacity-50"
              >
                Export PDF
              </button>
              <span className="text-xs text-gray-500">Auto-save is off. Use Save button to persist changes.</span>
            </div>

          </>
        )}

        {saveNotice && (
          <div
            className={`mt-4 px-4 py-3 rounded-lg text-sm font-medium ${
              saveNotice.type === "success"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                : "bg-rose-50 border border-rose-200 text-rose-800"
            }`}
          >
            {saveNotice.message}
          </div>
        )}

        {lastSavedAt && (
          <p className="mt-2 text-xs text-gray-500">
            Last saved: {new Date(lastSavedAt).toLocaleString()}
          </p>
        )}
      </div>

      {showForm && (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-lg font-bold text-gray-900">Step 1 – Separation Confirmation</h3>
          <p className="text-sm text-gray-600 mt-1">Responsible: HR</p>
          <div className="mt-3 mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">HR Responsible</label>
            <select
              value={hrResponsible}
              onChange={(e) => setHrResponsible(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50"
            >
              {(hrCandidates.length > 0 ? hrCandidates : sortedEmployees).map((emp) => (
                <option key={emp.id} value={emp.name}>{emp.name}</option>
              ))}
            </select>
          </div>

          {/* Checklist */}
          <div className="mt-4 space-y-5">
            <div>
              <h4 className="text-sm font-bold text-gray-700 mb-2">Checklist</h4>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={step1.receivedManagerRequest} onChange={(e) => setStep1((p) => ({ ...p, receivedManagerRequest: e.target.checked }))} />
                  Received manager offboarding request with supporting reason
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={step1.emailedItDisable} onChange={(e) => setStep1((p) => ({ ...p, emailedItDisable: e.target.checked }))} />
                  Emailed IT to disable employee accounts
                </label>
              </div>
            </div>

            {separationType === "Termination" && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-3">
                <h4 className="text-sm font-bold text-rose-800 mb-2">If Separation Type = Termination</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-rose-900">
                    <input type="checkbox" checked={step1.sentTerminationNotice} onChange={(e) => setStep1((p) => ({ ...p, sentTerminationNotice: e.target.checked }))} />
                    Sent Termination Notice to employee personal email
                  </label>
                  <label className="flex items-center gap-2 text-sm text-rose-900">
                    <input type="checkbox" checked={step1.sentOffboardingAcknowledgement} onChange={(e) => setStep1((p) => ({ ...p, sentOffboardingAcknowledgement: e.target.checked }))} />
                    Sent Offboarding Acknowledgement to employee personal email
                  </label>
                </div>

                <div className="mt-4 rounded-lg border border-rose-300 bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3">
                    <p className="text-sm font-semibold text-rose-800">Send Termination Notice Email</p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleLoadTerminationTemplate}
                        className="px-3 py-1.5 rounded-md text-xs font-semibold bg-rose-100 text-rose-700 border border-rose-200 hover:bg-rose-200"
                      >
                        Load Template
                      </button>
                      <button
                        type="button"
                        onClick={() => setStep1EmailOpen((prev) => !prev)}
                        className="px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
                      >
                        {step1EmailOpen ? "▲ Collapse" : "▼ Expand"}
                      </button>
                    </div>
                  </div>

                  {step1EmailOpen && (
                    <div className="border-t border-rose-200 p-3 space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">To (Offboard Employee)</label>
                        <input
                          type="email"
                          value={terminationEmailTo}
                          onChange={(e) => setTerminationEmailTo(e.target.value)}
                          placeholder="employee personal email"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">BCC (CEO &amp; COO/VP)</label>
                        <input
                          type="text"
                          value={terminationEmailBcc}
                          onChange={(e) => setTerminationEmailBcc(e.target.value)}
                          placeholder="ceo@wuc.edu, coo@wuc.edu"
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                        />
                        <p className="mt-1 text-xs text-gray-500">Comma-separated. Auto-filled from CEO/COO in employee list when available.</p>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Subject</label>
                        <input
                          type="text"
                          value={terminationEmailSubject}
                          onChange={(e) => setTerminationEmailSubject(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Body</label>
                        <textarea
                          value={terminationEmailBody}
                          onChange={(e) => setTerminationEmailBody(e.target.value)}
                          rows={12}
                          className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-mono"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Taiwan employee: bilingual EN+中文 content. US employee: English only.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Attachments (Max 2 files)</label>
                        <input
                          type="file"
                          multiple
                          onChange={(e) => handleAttachmentChange(e.target.files)}
                          className="block w-full text-sm text-gray-700"
                        />
                        {terminationEmailAttachments.length > 0 && (
                          <ul className="mt-2 text-xs text-gray-600 list-disc pl-5">
                            {terminationEmailAttachments.map((file, index) => (
                              <li key={`${file.name}-${index}`}>{file.name}</li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {terminationEmailNotice && (
                        <p className={`text-xs font-medium ${terminationEmailNotice.includes("success") ? "text-emerald-700" : "text-rose-700"}`}>
                          {terminationEmailNotice}
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={handleSendTerminationEmail}
                        disabled={sendingTerminationEmail}
                        className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-60"
                      >
                        {sendingTerminationEmail ? "Sending..." : "Send Termination Notice Email"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {separationType === "Resignation" && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                <h4 className="text-sm font-bold text-amber-800 mb-2">If Separation Type = Resignation</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-amber-900">
                    <input type="checkbox" checked={step1.receivedResignationNotice} onChange={(e) => setStep1((p) => ({ ...p, receivedResignationNotice: e.target.checked }))} />
                    Received employee resignation notice
                  </label>
                  <label className="flex items-center gap-2 text-sm text-amber-900">
                    <input type="checkbox" checked={step1.sentResignationAcceptance} onChange={(e) => setStep1((p) => ({ ...p, sentResignationAcceptance: e.target.checked }))} />
                    Sent resignation acceptance confirmation
                  </label>
                </div>
              </div>
            )}

            <div>
              <h4 className="text-sm font-bold text-gray-700 mb-2">Additional Actions</h4>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={step1.requestedConfirmationOfReceipt} onChange={(e) => setStep1((p) => ({ ...p, requestedConfirmationOfReceipt: e.target.checked }))} />
                  Requested employee confirmation of receipt
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={step1.savedEmailDeliveryRecord} onChange={(e) => setStep1((p) => ({ ...p, savedEmailDeliveryRecord: e.target.checked }))} />
                  Saved email delivery record
                </label>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-lg font-bold text-gray-900">Step 2 - Internal Notification</h3>
          <p className="text-sm text-gray-600 mt-1">Responsible: HR ({hrResponsible || "Not assigned"})</p>
          <div className="space-y-2 mt-4">
            <label className="flex items-center gap-2"><input type="checkbox" checked={step2.notifyDirectManager} onChange={(e) => setStep2((p) => ({ ...p, notifyDirectManager: e.target.checked }))} />Notify Direct Manager</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step2.notifyIT} onChange={(e) => setStep2((p) => ({ ...p, notifyIT: e.target.checked }))} />Notify IT / System Administrator</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step2.notifyPayroll} onChange={(e) => setStep2((p) => ({ ...p, notifyPayroll: e.target.checked }))} />Notify Payroll</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step2.notifyLeadership} onChange={(e) => setStep2((p) => ({ ...p, notifyLeadership: e.target.checked }))} />Notify Leadership (if applicable)</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step2.notifiedAcademicAffairs} onChange={(e) => setStep2((p) => ({ ...p, notifiedAcademicAffairs: e.target.checked }))} />Notified Academic Affairs (if applicable)</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step2.notifiedStudentServices} onChange={(e) => setStep2((p) => ({ ...p, notifiedStudentServices: e.target.checked }))} />Notified Student Services (if applicable)</label>
          </div>

          {/* Step 2 internal notification email */}
          <div className="mt-5 rounded-lg border border-slate-300 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 p-3">
              <p className="text-sm font-semibold text-gray-800">Send Internal Notification Email</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadStep2Template}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
                >
                  Load Template
                </button>
                <button
                  type="button"
                  onClick={() => setStep2EmailOpen((prev) => !prev)}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
                >
                  {step2EmailOpen ? "▲ Collapse" : "▼ Expand"}
                </button>
              </div>
            </div>

            {step2EmailOpen && (
              <div className="border-t border-slate-200 p-3 space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">To (All Employees)</label>
                  <textarea
                    value={step2EmailTo}
                    onChange={(e) => setStep2EmailTo(e.target.value)}
                    rows={3}
                    placeholder="employee1@wuc.edu, employee2@wuc.edu, ..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-mono"
                  />
                  <p className="mt-1 text-xs text-gray-500">Auto-filled with all employees + CEO, COO/VP, Registrar, Compliance Manager, IT Engineer, Director of Student Services, and Accountant. Edit as needed.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">BCC (CEO &amp; COO/VP)</label>
                  <input
                    type="text"
                    value={step2EmailBcc}
                    onChange={(e) => setStep2EmailBcc(e.target.value)}
                    placeholder="ceo@wuc.edu, coo@wuc.edu"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">Comma-separated. Auto-filled from CEO/COO in employee list when available.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Subject</label>
                  <input
                    type="text"
                    value={step2EmailSubject}
                    onChange={(e) => setStep2EmailSubject(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Body</label>
                  <textarea
                    value={step2EmailBody}
                    onChange={(e) => setStep2EmailBody(e.target.value)}
                    rows={16}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm font-mono"
                  />
                </div>

                {step2EmailNotice && (
                  <p className={`text-xs font-medium ${step2EmailNotice.includes("success") ? "text-emerald-700" : "text-rose-700"}`}>
                    {step2EmailNotice}
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleSendStep2Email}
                  disabled={sendingStep2Email}
                  className="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60"
                >
                  {sendingStep2Email ? "Sending..." : "Send Internal Notification Email"}
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="bg-white rounded-xl border border-rose-200 p-5">
          <h3 className="text-lg font-bold text-rose-700">Step 3 - Access Suspension (CRITICAL)</h3>
          <p className="text-sm text-gray-600 mt-1">Responsible: IT</p>
          <p className="text-sm text-rose-700 font-semibold mt-1">All access must be revoked no later than the last working day (within 24 hours).</p>
          <div className="mt-3 mb-4 max-w-sm">
            <label className="block text-sm font-semibold text-gray-700 mb-2">IT Responsible</label>
            <select
              value={itResponsible}
              onChange={(e) => setItResponsible(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-slate-50"
              disabled={itCandidates.length === 0}
            >
              {itCandidates.length === 0 && (
                <option value="">No Information Technology employee found</option>
              )}
              {itCandidates.map((emp) => (
                <option key={emp.id} value={emp.name}>{emp.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <label className="flex items-center gap-2"><input type="checkbox" checked={step3.disableGmail} onChange={(e) => setStep3((p) => ({ ...p, disableGmail: e.target.checked }))} />Disable Gmail</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step3.disableGoogleDrive} onChange={(e) => setStep3((p) => ({ ...p, disableGoogleDrive: e.target.checked }))} />Disable Google Drives</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step3.disableGoogleAdmin} onChange={(e) => setStep3((p) => ({ ...p, disableGoogleAdmin: e.target.checked }))} />Disable Google Admin (if applicable)</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step3.disableMoodle} onChange={(e) => setStep3((p) => ({ ...p, disableMoodle: e.target.checked }))} />Disable Moodle</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step3.disableGoogleClassroom} onChange={(e) => setStep3((p) => ({ ...p, disableGoogleClassroom: e.target.checked }))} />Disable Google Classroom</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step3.disableClickUp} onChange={(e) => setStep3((p) => ({ ...p, disableClickUp: e.target.checked }))} />Disable ClickUp</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step3.disableVpnRemoteAccess} onChange={(e) => setStep3((p) => ({ ...p, disableVpnRemoteAccess: e.target.checked }))} />Disable VPN / remote access</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step3.disableOtherSystems} onChange={(e) => setStep3((p) => ({ ...p, disableOtherSystems: e.target.checked }))} />Disable internal / third-party systems</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step3.disableEmailLogin} onChange={(e) => setStep3((p) => ({ ...p, disableEmailLogin: e.target.checked }))} />Disable email login access</label>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-lg font-bold text-gray-900">Step 4 - Company Property Return</h3>
          {isTaiwanEmployee && (
            <div className="mt-3 mb-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
              <p className="text-xs font-semibold text-blue-700">🇹🇼 Remote Taiwan employee — physical property return not applicable. This step is disabled.</p>
            </div>
          )}
          <div className={`space-y-2 mt-4 ${isTaiwanEmployee ? "opacity-40 pointer-events-none select-none" : ""}`}>
            <p className="text-sm text-gray-600 mb-2">Responsible: HR + Manager</p>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step4.returnLaptopCharger} onChange={(e) => setStep4((p) => ({ ...p, returnLaptopCharger: e.target.checked }))} disabled={isTaiwanEmployee} />Collect laptop / charger</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step4.returnIdBadge} onChange={(e) => setStep4((p) => ({ ...p, returnIdBadge: e.target.checked }))} disabled={isTaiwanEmployee} />Collect ID badge</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step4.returnKeys} onChange={(e) => setStep4((p) => ({ ...p, returnKeys: e.target.checked }))} disabled={isTaiwanEmployee} />Collect keys</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step4.returnOfficeEquipment} onChange={(e) => setStep4((p) => ({ ...p, returnOfficeEquipment: e.target.checked }))} disabled={isTaiwanEmployee} />Collect office equipment</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step4.returnDocuments} onChange={(e) => setStep4((p) => ({ ...p, returnDocuments: e.target.checked }))} disabled={isTaiwanEmployee} />Collect documents (physical or digital)</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step4.signedPropertyChecklist} onChange={(e) => setStep4((p) => ({ ...p, signedPropertyChecklist: e.target.checked }))} disabled={isTaiwanEmployee} />Employee signed Property Return Checklist</label>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-lg font-bold text-gray-900">Step 5 - Work Handover</h3>
          <p className="text-sm text-gray-600 mt-1">Responsible: Manager ({selectedEmployee?.manager || "Not assigned"})</p>
          <div className="space-y-2 mt-4">
            <label className="flex items-center gap-2"><input type="checkbox" checked={step5.reassignClickUpTasks} onChange={(e) => setStep5((p) => ({ ...p, reassignClickUpTasks: e.target.checked }))} />Reassign ClickUp tasks</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step5.documentIncompleteWork} onChange={(e) => setStep5((p) => ({ ...p, documentIncompleteWork: e.target.checked }))} />Document incomplete work</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step5.continuityConfirmed} onChange={(e) => setStep5((p) => ({ ...p, continuityConfirmed: e.target.checked }))} />Ensure continuity of operations</label>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-lg font-bold text-gray-900">Step 6 - Exit Agreement Execution</h3>
          <p className="text-sm text-gray-600 mt-1">Responsible: HR ({hrResponsible || "Not assigned"})</p>
          <div className="space-y-2 mt-4">
            <label className="flex items-center gap-2"><input type="checkbox" checked={step6.confidentialityAcknowledged} onChange={(e) => setStep6((p) => ({ ...p, confidentialityAcknowledged: e.target.checked }))} />Confidentiality obligations acknowledged</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step6.noDataRetentionAcknowledged} onChange={(e) => setStep6((p) => ({ ...p, noDataRetentionAcknowledged: e.target.checked }))} />No data retention clause acknowledged</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step6.propertyReturnAcknowledged} onChange={(e) => setStep6((p) => ({ ...p, propertyReturnAcknowledged: e.target.checked }))} />Company property return clause acknowledged</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step6.studentDataProtectionAcknowledged} onChange={(e) => setStep6((p) => ({ ...p, studentDataProtectionAcknowledged: e.target.checked }))} />Student/institutional data protection acknowledged</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step6.signedOrRefusalDocumented} onChange={(e) => setStep6((p) => ({ ...p, signedOrRefusalDocumented: e.target.checked }))} />Employee signed, or refusal to sign documented</label>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-lg font-bold text-gray-900">Step 7 - Final Payroll</h3>
          <p className="text-sm text-gray-600 mt-1">Responsible: HR / Payroll</p>
          <div className="space-y-2 mt-4">
            <label className="flex items-center gap-2"><input type="checkbox" checked={step7.finalSalaryCalculated} onChange={(e) => setStep7((p) => ({ ...p, finalSalaryCalculated: e.target.checked }))} />Final salary calculated</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step7.ptoVacationPayoutCalculated} onChange={(e) => setStep7((p) => ({ ...p, ptoVacationPayoutCalculated: e.target.checked }))} />PTO / Vacation payout calculated (if applicable)</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step7.expenseReimbursementProcessed} onChange={(e) => setStep7((p) => ({ ...p, expenseReimbursementProcessed: e.target.checked }))} />Expense reimbursement processed (if applicable)</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step7.severanceSeparationPaymentCalculated} onChange={(e) => setStep7((p) => ({ ...p, severanceSeparationPaymentCalculated: e.target.checked }))} />Severance / Separation Payment calculated (if applicable)</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step7.accountantPayrollNotified} onChange={(e) => setStep7((p) => ({ ...p, accountantPayrollNotified: e.target.checked }))} />Accountant / Payroll notified</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step7.paymentDateConfirmed} onChange={(e) => setStep7((p) => ({ ...p, paymentDateConfirmed: e.target.checked }))} />Payment date confirmed</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={step7.finalCompensationIssued} onChange={(e) => setStep7((p) => ({ ...p, finalCompensationIssued: e.target.checked }))} />Final compensation issued</label>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-lg font-bold text-gray-900">Step 8 - Documentation & Record Retention</h3>
          <p className="text-sm text-gray-600 mt-1">Responsible: HR ({hrResponsible || "Not assigned"})</p>
          <div className="space-y-2 mt-4">
            {separationType === "Termination" ? (
              <>
                <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(step8.uploadManagerRecommendationReport)} onChange={(e) => setStep8((p) => ({ ...p, uploadManagerRecommendationReport: e.target.checked }))} />Upload Manager Recommendation Report</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(step8.uploadPerformanceReports)} onChange={(e) => setStep8((p) => ({ ...p, uploadPerformanceReports: e.target.checked }))} />Upload Performance Reports</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(step8.uploadWrittenWarnings)} onChange={(e) => setStep8((p) => ({ ...p, uploadWrittenWarnings: e.target.checked }))} />Upload Written Warnings</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(step8.uploadPipDocumentation)} onChange={(e) => setStep8((p) => ({ ...p, uploadPipDocumentation: e.target.checked }))} />Upload PIP Documentation</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(step8.employeeFilesArchived)} onChange={(e) => setStep8((p) => ({ ...p, employeeFilesArchived: e.target.checked }))} />Employee files archived</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(step8.offboardingCaseCompleted)} onChange={(e) => setStep8((p) => ({ ...p, offboardingCaseCompleted: e.target.checked }))} />Offboarding case completed</label>
              </>
            ) : (
              <>
                <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(step8.uploadTerminationNotice)} onChange={(e) => setStep8((p) => ({ ...p, uploadTerminationNotice: e.target.checked }))} />Upload Termination Notice</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(step8.uploadOffboardingAcknowledgement)} onChange={(e) => setStep8((p) => ({ ...p, uploadOffboardingAcknowledgement: e.target.checked }))} />Upload Offboarding Acknowledgement</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(step8.resignationLetter)} onChange={(e) => setStep8((p) => ({ ...p, resignationLetter: e.target.checked }))} />Resignation Letter</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(step8.resignationAcceptanceLetter)} onChange={(e) => setStep8((p) => ({ ...p, resignationAcceptanceLetter: e.target.checked }))} />Resignation Acceptance Letter</label>
                {isUSBasedEmployee && (
                  <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(step8.propertyReturnChecklistUs)} onChange={(e) => setStep8((p) => ({ ...p, propertyReturnChecklistUs: e.target.checked }))} />Property Return Checklist (US base employee only)</label>
                )}
                <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(step8.accessSuspensionConfirmation)} onChange={(e) => setStep8((p) => ({ ...p, accessSuspensionConfirmation: e.target.checked }))} />Access Suspension Confirmation</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={Boolean(step8.finalCompensationWorksheet)} onChange={(e) => setStep8((p) => ({ ...p, finalCompensationWorksheet: e.target.checked }))} />Final Compensation Worksheet</label>
              </>
            )}
          </div>
        </section>
      </div>
      )}
    </div>
  );
}
