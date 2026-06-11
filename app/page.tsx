"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Employee,
  HolidayRecord,
  OnboardingStep1Update,
  OnboardingStep2Update,
  OnboardingStep3Update,
  OnboardingStep4Update,
  OnboardingStep5Update,
  OnboardingStep6Update,
  ProfessionalDevelopmentRecord,
  TimeOffRequest,
  TimeOffStatus,
  TimeOffType,
} from "@/lib/employees";
import { formatCompactDate, formatShortDate, parseDateInPacific } from "@/lib/dateUtils";
import EmployeeCard from "@/components/EmployeeCard";
import WeeklyRecordsTable from "@/components/WeeklyRecordsTable";
import PerformanceDashboard from "@/components/PerformanceDashboard";
import AddEditEmployee from "@/components/AddEditEmployee";
import AddEditWeeklyRecord from "@/components/AddEditWeeklyRecord";
import DepartmentManager from "@/components/DepartmentManager";
import MonthlyPerformanceReport from "@/components/MonthlyPerformanceReport";
import IncidentTrackingTable from "@/components/IncidentTrackingTable";
import OnboardingModule from "@/components/OnboardingModule";
import OffboardingModule from "@/components/OffboardingModule";
import ProfessionalDevelopmentManager from "@/components/ProfessionalDevelopmentManager";
import TimeOffManager from "@/components/TimeOffManager";

type OnboardingEmailDraft = {
  key: "it-reminder" | "registrar-reminder" | "new-hire" | "offer-letter" | "taiwan-labor-insurance";
  step: 2 | 3 | 4 | 5 | 6;
  to: string;
  cc?: string;
  subject: string;
  body: string;
  recipientName: string;
  note?: string;
  sent?: boolean;
  sending?: boolean;
  statusMessage?: string;
  offerLetterFile?: File | null;
};

export default function Home() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [offboardingRecords, setOffboardingRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null
  );
  const [activeView, setActiveView] = useState<
    "dashboard" | "employees" | "manage" | "manage-performance" | "onboarding" | "offboarding" | "professional-development" | "incident-tracking" | "time-off"
  >("dashboard");
  const [selectedEmployeeForPerformance, setSelectedEmployeeForPerformance] =
    useState<string | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showWeeklyRecordForm, setShowWeeklyRecordForm] = useState(false);
  const [editingWeeklyRecord, setEditingWeeklyRecord] = useState<{
    record: any;
    index: number;
  } | null>(null);
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<string | null>(
    null
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth()
  );
  const [showDepartmentManager, setShowDepartmentManager] = useState(false);
  const [departments, setDepartments] = useState<string[]>([
    "Engineering",
    "Product",
    "Design",
    "Marketing",
    "HR",
    "Finance",
    "Operations",
  ]);
  const [performanceView, setPerformanceView] = useState<"weekly" | "monthly">("weekly");
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  const [holidays, setHolidays] = useState<HolidayRecord[]>([]);
  const [weeklyRecordNotice, setWeeklyRecordNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [dbInfo, setDbInfo] = useState<{
    database: string;
    user: string;
    server: string;
    port: number | null;
  } | null>(null);
  const [showOnboardingEmailPage, setShowOnboardingEmailPage] = useState(false);
  const [onboardingEmailDrafts, setOnboardingEmailDrafts] = useState<OnboardingEmailDraft[]>([]);
  const [onboardingStep, setOnboardingStep] = useState<"banner" | "emails" | "complete" | "done">("banner");
  const [onboardingNewHireName, setOnboardingNewHireName] = useState("");
  const [onboardingCompleteChecked, setOnboardingCompleteChecked] = useState(false);
  const [onboardingCompletedIds, setOnboardingCompletedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("onboardingCompletedIds");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });
  const isSavingEmployeeRef = useRef(false);

  // Generate available years (current year ± 5 years)
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from(
    { length: 11 },
    (_, i) => currentYear - 5 + i
  );

  // Load employees and departments from API on mount
  useEffect(() => {
    fetchEmployees();
    fetchOffboardingRecords();
    fetchDepartments();
    fetchTimeOffRequests();
    fetchHolidays(selectedYear);
    fetchDbInfo();
  }, []);

  useEffect(() => {
    fetchHolidays(selectedYear);
  }, [selectedYear]);

  useEffect(() => {
    const eric = employees.find(
      (employee) => employee.name.trim().toLowerCase() === "eric hsu"
    );

    if (!eric) return;

    setOnboardingCompletedIds((previous) => {
      if (!previous.has(eric.id)) {
        return previous;
      }

      const next = new Set(previous);
      next.delete(eric.id);
      try {
        localStorage.setItem("onboardingCompletedIds", JSON.stringify([...next]));
      } catch {
        // Keep UI behavior even if localStorage is unavailable.
      }
      return next;
    });
  }, [employees]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/employees");
      if (!response.ok) throw new Error("Failed to fetch employees");
      const data = await response.json();
      const normalizedEmployees = Array.isArray(data)
        ? data.map((employee: any) => ({
            ...employee,
            weeklyRecords: Array.isArray(employee?.weeklyRecords)
              ? employee.weeklyRecords
              : [],
            professionalDevelopmentRecords: Array.isArray(
              employee?.professionalDevelopmentRecords
            )
              ? employee.professionalDevelopmentRecords
              : [],
          }))
        : [];
      setEmployees(normalizedEmployees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      alert("Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch("/api/departments");
      if (!response.ok) throw new Error("Failed to fetch departments");
      const data = await response.json();
      setDepartments(data.map((dept: any) => dept.name));
    } catch (error) {
      console.error("Error fetching departments:", error);
      // Keep the default departments if fetch fails
    }
  };

  const fetchOffboardingRecords = async () => {
    try {
      const response = await fetch("/api/offboarding");
      if (!response.ok) throw new Error("Failed to fetch offboarding records");
      const data = await response.json();
      setOffboardingRecords(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching offboarding records:", error);
    }
  };

  const fetchTimeOffRequests = async () => {
    try {
      const response = await fetch("/api/time-off");
      if (!response.ok) throw new Error("Failed to fetch time-off requests");
      const data = await response.json();
      setTimeOffRequests(data);
    } catch (error) {
      console.error("Error fetching time-off requests:", error);
    }
  };

  const fetchHolidays = async (year: number) => {
    try {
      const response = await fetch(`/api/holidays?year=${year}`);
      if (!response.ok) throw new Error("Failed to fetch holidays");
      const data = await response.json();
      setHolidays(data);
    } catch (error) {
      console.error("Error fetching holidays:", error);
    }
  };

  const fetchDbInfo = async () => {
    try {
      const response = await fetch("/api/system/db-info");
      if (!response.ok) return;
      const data = await response.json();
      if (data?.ok) {
        setDbInfo({
          database: data.database,
          user: data.user,
          server: data.server,
          port: data.port,
        });
      }
    } catch {
      // Keep UI running even if db info endpoint fails.
    }
  };

  const confirmedOffboardEmployeeIds = useMemo(() => {
    return new Set(
      offboardingRecords
        .filter((record) => Boolean(record?.step8?.confirmedOffboard))
        .map((record) => record.employeeId)
    );
  }, [offboardingRecords]);

  const activeEmployees = useMemo(
    () => employees.filter((employee) => !confirmedOffboardEmployeeIds.has(employee.id)),
    [employees, confirmedOffboardEmployeeIds]
  );

  const activeEmployeeIds = useMemo(
    () => new Set(activeEmployees.map((employee) => employee.id)),
    [activeEmployees]
  );

  const activeTimeOffRequests = useMemo(
    () => timeOffRequests.filter((request) => activeEmployeeIds.has(request.employeeId)),
    [timeOffRequests, activeEmployeeIds]
  );

  const selectedEmployee = activeEmployees.find((e) => e.id === selectedEmployeeId);

  useEffect(() => {
    if (selectedEmployeeId && !activeEmployeeIds.has(selectedEmployeeId)) {
      setSelectedEmployeeId(null);
    }
  }, [selectedEmployeeId, activeEmployeeIds]);

  useEffect(() => {
    if (selectedEmployeeForPerformance && !activeEmployeeIds.has(selectedEmployeeForPerformance)) {
      setSelectedEmployeeForPerformance(null);
    }
  }, [selectedEmployeeForPerformance, activeEmployeeIds]);

  const handleAddEmployee = () => {
    setEditingEmployee(null);
    setShowForm(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setShowForm(true);
  };

  const handleSaveEmployee = async (employee: Employee) => {
    if (isSavingEmployeeRef.current) {
      return;
    }

    try {
      isSavingEmployeeRef.current = true;
      if (editingEmployee) {
        // Update existing employee
        const response = await fetch(`/api/employees/${editingEmployee.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(employee),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.details || "Failed to update employee");
        }
      } else {
        // Add new employee - transform id to employeeId for API
        const employeeData = {
          employeeId: employee.id,
          name: employee.name,
          email: employee.email,
          personalEmail: employee.personalEmail,
          department: employee.department,
          manager: employee.manager,
          position: employee.position,
          joinDate: employee.joinDate,
          workAuthorizationStatus: employee.workAuthorizationStatus,
          staffWorkLocation: employee.staffWorkLocation,
          employeeType: employee.employeeType,
          contractWorkHours: employee.contractWorkHours,
          officeSchedule: employee.officeSchedule,
          overallOverdueTasks: employee.overallOverdueTasks,
          probationPeriodStartDate: employee.probationPeriodStartDate,
          probationPeriodEndDate: employee.probationPeriodEndDate,
          monthlySalaryDuringProbation: employee.monthlySalaryDuringProbation,
          monthlySalaryAfterProbation: employee.monthlySalaryAfterProbation,
        };
        const response = await fetch("/api/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(employeeData),
        });
        const createdPayload = await response.json().catch(() => ({}));

        if (response.ok && createdPayload?.alreadyExists) {
          const existingEmployeeRecord: Employee = {
            id: createdPayload.id,
            name: createdPayload.name,
            email: createdPayload.email,
            personalEmail: createdPayload.personalEmail || "",
            department: createdPayload.department,
            manager: createdPayload.manager,
            position: createdPayload.position,
            joinDate: createdPayload.joinDate,
            workAuthorizationStatus: createdPayload.workAuthorizationStatus,
            staffWorkLocation: createdPayload.staffWorkLocation,
            employeeType: createdPayload.employeeType,
            contractWorkHours: createdPayload.contractWorkHours,
            officeSchedule: createdPayload.officeSchedule,
            overallOverdueTasks: createdPayload.overallOverdueTasks,
            onboarding: createdPayload.onboarding,
            professionalDevelopmentRecords: createdPayload.professionalDevelopmentRecords || [],
            weeklyRecords: createdPayload.weeklyRecords || [],
            timeOffRequests: createdPayload.timeOffRequests || [],
          };

          await fetchEmployees();
          setEditingEmployee(existingEmployeeRecord);
          setShowForm(true);
          setActiveView("manage");
          alert(`Employee ${existingEmployeeRecord.id} already existed. The record is now open for editing.`);
          return;
        }

        if (!response.ok) {
          if (
            response.status === 409 &&
            (createdPayload.details || "").toLowerCase().includes("employee id already exists")
          ) {
            await fetchEmployees();
            const checkResponse = await fetch("/api/employees");
            const checkPayload = await checkResponse.json().catch(() => []);
            const targetEmployeeId = String(employee.id || "").trim();
            const exists = Array.isArray(checkPayload)
              ? checkPayload.some((entry: any) => entry?.id === targetEmployeeId)
              : false;

            if (exists) {
              const existing = Array.isArray(checkPayload)
                ? checkPayload.find((entry: any) => entry?.id === targetEmployeeId)
                : null;

              if (existing) {
                setEditingEmployee(existing);
                setShowForm(true);
                setActiveView("manage");
                alert(`Employee ${targetEmployeeId} already exists. The record is now open for editing.`);
                return;
              }
            }
          }

          throw new Error(
            createdPayload.details || createdPayload.error || "Failed to create employee"
          );
        }

        const drafts = Array.isArray(createdPayload?.onboardingEmailDrafts)
          ? createdPayload.onboardingEmailDrafts.map((draft: OnboardingEmailDraft) => ({
              ...draft,
              sent: false,
              sending: false,
              statusMessage: "",
            }))
          : [];

        if (drafts.length > 0) {
          setOnboardingEmailDrafts(drafts);
          setOnboardingNewHireName(createdPayload.name || "");
          setOnboardingStep("banner");
          setOnboardingCompleteChecked(false);
          setShowOnboardingEmailPage(true);
        }
      }
      await fetchEmployees();
      if (editingEmployee && editingEmployee.id !== employee.id) {
        if (selectedEmployeeId === editingEmployee.id) {
          setSelectedEmployeeId(employee.id);
        }
        if (selectedEmployeeForPerformance === editingEmployee.id) {
          setSelectedEmployeeForPerformance(employee.id);
        }
      }
      setShowForm(false);
      setEditingEmployee(null);
    } catch (error) {
      console.error("Error saving employee:", error);
      alert(`Failed to save employee: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      isSavingEmployeeRef.current = false;
    }
  };

  const buildEmailDraftsForEmployee = (emp: Employee): OnboardingEmailDraft[] => {
    const normalizeRoleToken = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
    const getPreferredRecipientEmail = (entry?: Employee) =>
      (entry?.personalEmail || "").trim() || (entry?.email || "").trim();
    const findMostRecentEmployeeByPosition = (positionName: string) => {
      const target = normalizeRoleToken(positionName);

      return [...employees]
        .filter((entry) => normalizeRoleToken(entry.position || "") === target)
        .sort((first, second) => {
          const firstTime = first.joinDate ? new Date(first.joinDate).getTime() : 0;
          const secondTime = second.joinDate ? new Date(second.joinDate).getTime() : 0;
          return secondTime - firstTime;
        })[0];
    };

    const findByName = (fullName: string) => {
      const target = fullName.trim().toLowerCase();
      return employees.find((entry) => entry.name.trim().toLowerCase() === target);
    };

    const itEngineerEmployee = findMostRecentEmployeeByPosition("IT Engineer");
    const registrarEmployee =
      findMostRecentEmployeeByPosition("Registrar") ||
      findByName("TingYi Tung");
    const complianceManagerEmployee = findMostRecentEmployeeByPosition(
      "Manager,Office of Compliance"
    );

    const itEmail = getPreferredRecipientEmail(itEngineerEmployee);
    const registrarEmail = getPreferredRecipientEmail(registrarEmployee);
    const complianceManagerEmail = getPreferredRecipientEmail(complianceManagerEmployee);

    const itRecipientName = (itEngineerEmployee?.name || "IT Engineer").trim();
    const registrarRecipientName = (registrarEmployee?.name || "TingYi Tung").trim();
    const complianceRecipientName = (
      complianceManagerEmployee?.name || "Manager, Office of Compliance"
    ).trim();
    const formattedStartDate = /^\d{4}-\d{2}-\d{2}$/.test(emp.joinDate)
      ? `${emp.joinDate.slice(5, 7)}/${emp.joinDate.slice(8, 10)}/${emp.joinDate.slice(0, 4)}`
      : emp.joinDate;
    const workLocationMode =
      emp.officeSchedule && Array.isArray(emp.officeSchedule.days) && emp.officeSchedule.days.length > 0
        ? "In-Person"
        : "Remote";
    const basedIn = emp.staffWorkLocation || "USA";
    const isTaiwanEmployee = basedIn.toLowerCase().includes("taiwan");
    const drafts: OnboardingEmailDraft[] = [
      {
        key: "it-reminder",
        step: 2,
        to: itEmail,
        cc: "HR@wuc.edu",
        subject: `Action Required: New Hire Account Setup - ${emp.name} (${emp.id})`,
        body: `Dear ${itRecipientName},\n\nPlease create the following accounts for our new hire on their start date.\n\nEmployee Name: ${emp.name}\n\nPosition: ${emp.position}\n\nDepartment: ${emp.department}\n\nStart Date: ${formattedStartDate}\n\nPlease create:\n\n- WUC Gmail Account\n- Moodle account\n- Clickup account\n\nClick up had create for you for tracking purpose.\n\nOnce the accounts have been created, please send the login credentials and access instructions to the employee and copy HR for our records.\n\nThank you.\nSincerely,\nHuman Resources\nWhitewater University of California`,
        recipientName: itRecipientName,
        note: itEmail
          ? undefined
          : "Personal email not found for IT Engineer. Please enter recipient email.",
        sent: false,
        sending: false,
        statusMessage: "",
        offerLetterFile: null,
      },
      {
        key: "registrar-reminder",
        step: 3,
        to: registrarEmail,
        cc: "HR@wuc.edu",
        subject: `Action Required: New Hire Document Request - ${emp.name} (${emp.id})`,
        body: `Hi ${registrarRecipientName},\n\n${emp.name} has officially joined Whitewater University as our new ${emp.position} and has begun the onboarding process.\n\nPlease proceed with the standard Staff Onboarding SOP and coordinate directly with ${emp.name} regarding all required onboarding forms, supporting documents, training requirements, and orientation activities.\n\nA few notes for this onboarding:\n\n- Employee Name: ${emp.name}\n- Position: ${emp.position}\n- Start Date: ${formattedStartDate}\n- Based In: ${basedIn}\n- IT is currently preparing the employee's Gmail and Moodle access.\n\nPlease:\n\n- Send all required onboarding forms and document requests according to the Staff Onboarding SOP.\n- Collect and verify all required onboarding documentation and supporting materials.\n- Guide the employee through all required orientation, training, and compliance requirements.\n- Ensure all onboarding items are completed and properly documented.\n- Coordinate any follow-up actions with the appropriate departments according to the SOP.\n\nPlease keep me informed of the onboarding progress and let me know if any documentation or follow-up is needed from HR.\n\nFor tracking purposes, please use the assigned ClickUp task:\n\n[ClickUp Link]\n\nThis task will remain active for three weeks. Please update the task regularly, record progress, and mark each onboarding milestone as completed.\n\nThank you for your assistance.\nBest regards,\nChi Su\nHuman Resources\nWhitewater University of California`,
        recipientName: registrarRecipientName,
        note: registrarEmail
          ? undefined
          : "Personal email not found for Registrar. Please enter recipient email.",
        sent: false,
        sending: false,
        statusMessage: "",
        offerLetterFile: null,
      },
      {
        key: "new-hire",
        step: 5,
        to: emp.email || "",
        cc: "HR@wuc.edu",
        subject: "Welcome to WUC: Upcoming Onboarding Process",
        body: basedIn.toLowerCase().includes("taiwan")
          ? `Dear ${emp.name},\n\nWelcome to Whitewater University of California, and congratulations on joining us as our new ${emp.position}.\n\nWe are excited to have you join our team and would like to provide an overview of the onboarding process to help you prepare for your first few weeks with the University.\n\nOur IT team is currently preparing your WUC Gmail account and Moodle access. On your start date, ${formattedStartDate}, you will receive a separate email containing your login credentials and access instructions.\n\nPayroll Information\n\n- Salary payments are issued on the last business day of each month.\n- Payroll will be sent via PayPal unless otherwise arranged with Human Resources.\n- Please ensure that your PayPal account information is available and up to date.\n\nTaiwan Labor & Health Insurance (Taiwan-Based Employees Only)\n\n- ${complianceRecipientName} will contact you regarding the Labor Insurance and National Health Insurance enrollment process.\n- Once your enrollment is completed, please submit your payment receipt to HR.\n- The University will reimburse your first month's approved Labor and Health Insurance contribution with your following month's payroll.\n- Future approved reimbursement amounts, along with applicable PayPal transaction fees, will be included in your regular monthly payroll.\n\nOver the next few days, you can expect the following onboarding communications and requirements:\n\nAdministrative Documentation\n\n- Ting-Yi will contact you regarding the onboarding forms and supporting documents required for employment.\n- Please complete and return all requested forms and documentation in a timely manner.\n\nHR Onboarding\n\n- Review and sign your Offer Letter.\n- Review and acknowledge receipt of the Employee Handbook.\n- Review and sign all required University policies, agreements, and compliance documents.\n\nSystem Access & Training\n\n- Activate your WUC Gmail account.\n- Activate your Moodle account.\n- Accept your ClickUp invitation and set up your account.\n- Complete the Moodle Getting Started Training Video, which provides an introduction to accessing Moodle, navigating the platform, and completing assigned training and learning activities.\n- Complete any additional training assignments that may be required for your position.\n\nAs part of your onboarding, you will also be required to complete the University's Orientation Certification requirements.\n\nWe are delighted to welcome you to Whitewater University of California and look forward to working with you.\n\nSincerely,\nChi Su\nHuman Resources\nWhitewater University of California`
          : `Dear ${emp.name},\n\nWelcome to Whitewater University of California, and congratulations on joining us as our new ${emp.position}.\n\nWe are excited to have you join our team and would like to provide an overview of the onboarding process to help you prepare for your first few weeks with the University.\n\nOur IT team is currently preparing your WUC Gmail account and Moodle access. On your start date, ${formattedStartDate}, you will receive a separate email containing your login credentials and access instructions.\n\nPayroll Information\n- Salary payments are issued on the last business day of each month.\n- Your salary will be deposited into your designated bank account.\n- Please ensure that all payroll and direct deposit information requested by HR is submitted promptly to avoid payment delays.\n\nEmployee Benefits (Full-Time Employees Only)\n- HR will contact you regarding health insurance enrollment and benefit options.\n- Additional benefit information and enrollment instructions will be provided during the onboarding process.\n\nOver the next few days, you can expect the following onboarding communications and requirements:\n\nAdministrative Documentation\n- Ting-Yi will contact you regarding the onboarding forms and supporting documents required for employment.\n- Please complete and return all requested forms and documentation in a timely manner.\n\nHR Onboarding\n- Review and sign your Offer Letter.\n- Review and acknowledge receipt of the Employee Handbook.\n- Review and sign all required University policies, agreements, and compliance documents.\n\nSystem Access & Training\n- Activate your WUC Gmail account.\n- Activate your Moodle account.\n- Accept your ClickUp invitation and set up your account.\n- Complete the Moodle Getting Started Training Video, which provides an introduction to accessing Moodle, navigating the platform, and completing assigned training and learning activities.\n- Complete any additional training assignments that may be required for your position.\n\nAs part of your onboarding, you will also be required to complete the University's Orientation Certification requirements.\n\nWe are delighted to welcome you to Whitewater University of California and look forward to working with you.\n\nSincerely,\n\nChi Su\nHuman Resources\nWhitewater University of California\n3150 Almaden Expy, Suite 111, San Jose, CA 95118`,
        recipientName: emp.name,
        note: emp.email ? undefined : "New hire work email is missing. Please enter recipient email.",
        sent: false,
        sending: false,
        statusMessage: "",
        offerLetterFile: null,
      },
      {
        key: "offer-letter",
        step: 4,
        to: emp.email || "",
        cc: "HR@wuc.edu",
        subject: `Welcome: Offer Letter - ${emp.name}`,
        body: (() => {
          let workLocationDisplay = emp.staffWorkLocation !== "USA" ? "Remote" : (workLocationMode || "Remote");
          if (emp.staffWorkLocation === "Taiwan (Remote)") {
            workLocationDisplay = "Taiwan - Remote";
          }
          let probationStartDisplay = formattedStartDate;
          let probationEndDisplay = "3 months";
          if (emp.probationPeriodStartDate) {
            const startDate = /^\d{4}-\d{2}-\d{2}$/.test(emp.probationPeriodStartDate)
              ? `${emp.probationPeriodStartDate.slice(5, 7)}/${emp.probationPeriodStartDate.slice(8, 10)}/${emp.probationPeriodStartDate.slice(0, 4)}`
              : emp.probationPeriodStartDate;
            probationStartDisplay = startDate;
          }
          if (emp.probationPeriodEndDate) {
            const endDate = /^\d{4}-\d{2}-\d{2}$/.test(emp.probationPeriodEndDate)
              ? `${emp.probationPeriodEndDate.slice(5, 7)}/${emp.probationPeriodEndDate.slice(8, 10)}/${emp.probationPeriodEndDate.slice(0, 4)}`
              : emp.probationPeriodEndDate;
            probationEndDisplay = endDate;
          }
          const salaryCurrencyCode = "USD";
          return `Dear ${emp.name},\n\nThank you for your interest in joining Whitewater University of California.\n\nWe are pleased to extend an offer for the position of ${emp.position}. Attached please find your offer letter for review.\n\nKey Employment Terms\n\n- Start Date: ${formattedStartDate}\n- Employment Type: ${emp.employeeType?.toLowerCase().includes("contract") ? "Contract" : "Full-Time"}\n- Work Location: ${workLocationDisplay}\n- Probation Period: 3 months (${probationStartDisplay} to ${probationEndDisplay})\n- Monthly Salary During Probation: ${salaryCurrencyCode} ${(emp.monthlySalaryDuringProbation ?? 1300).toLocaleString()}\n- Monthly Salary After Successful Completion of Probation: ${salaryCurrencyCode} ${(emp.monthlySalaryAfterProbation ?? 1400).toLocaleString()}\n\nPosition Highlights\n\n- Flexible work schedule with required overlap hours to support collaboration with the U.S.-based team.\n- Opportunity to gain hands-on experience in higher education administration, student services, and AI-assisted workflow development.\n- Opportunity to work in a collaborative international environment supporting students, faculty, and university operations.\n\nPlease review the attached offer letter and let us know if you have any questions. If you accept the offer, please sign and return the offer letter within seven (7) calendar days of receiving this email.\n\nWe are excited about the possibility of having you join our team and look forward to working with you.\n\nSincerely,\n\nChi Su\nHuman Resources\nWhitewater University of California\n3150 Almaden Expy, Suite 111, San Jose, CA 95118`;
        })(),
        recipientName: emp.name,
        note: emp.email ? undefined : "New hire work email is missing. Please enter recipient email.",
        sent: false,
        sending: false,
        statusMessage: "",
        offerLetterFile: null,
      },
    ];

    if (isTaiwanEmployee) {
      drafts.push({
        key: "taiwan-labor-insurance",
        step: 6,
        to: complianceManagerEmail,
        cc: "HR@wuc.edu",
        subject: `Action Required: Taiwan Labor Insurance and National Health Insurance Enrollment - ${emp.name} (${emp.id})`,
        body: `Hi ${complianceRecipientName},\n\n${emp.name} has officially joined Whitewater University as our new ${emp.position} and has begun the onboarding process.\n\nAs part of the onboarding requirements for Taiwan-based employees, please contact ${emp.name} directly regarding Labor Insurance and National Health Insurance enrollment.\n\nEmployee Information:\n- Employee Name: ${emp.name}\n- Position: ${emp.position}\n- Start Date: ${formattedStartDate}\n- Work Location: Taiwan (Remote)\n\nPlease assist the employee with the following:\n\n- Explain the Labor Insurance and National Health Insurance enrollment process.\n- Collect any information or supporting documents required for enrollment.\n- Guide the employee through the enrollment process and answer any related questions.\n- Confirm when enrollment has been completed.\n- Remind the employee to submit their insurance payment receipt after enrollment.\n\nPlease keep HR informed of the enrollment status and notify us once the process has been completed.\n\nFor tracking purposes, please use the assigned ClickUp task:\n[ClickUp Link]\n\nThank you for your assistance.\n\nBest regards,\n\nChi Su  \nHuman Resources  \nWhitewater University of California  \n📍 3150 Almaden Expy, Suite 111, San Jose, CA 95118`,
        recipientName: complianceRecipientName,
        note: complianceManagerEmail
          ? undefined
          : "Personal email not found for Manager, Office of Compliance. Please enter recipient email.",
        sent: false,
        sending: false,
        statusMessage: "",
        offerLetterFile: null,
      });
    }

    return drafts;
  };

  const handleStartOnboardingForEmployee = (emp: Employee) => {
    setOnboardingEmailDrafts(buildEmailDraftsForEmployee(emp));
    setOnboardingNewHireName(emp.name);
    setOnboardingStep("banner");
    setOnboardingCompleteChecked(false);
    setShowOnboardingEmailPage(true);
  };

  const updateOnboardingEmailDraft = (
    key: OnboardingEmailDraft["key"],
    field: "to" | "subject" | "body",
    value: string
  ) => {
    setOnboardingEmailDrafts((previous) =>
      previous.map((draft) =>
        draft.key === key
          ? {
              ...draft,
              [field]: value,
            }
          : draft
      )
    );
  };

  const handleSendOnboardingEmailDraft = async (key: OnboardingEmailDraft["key"]) => {
    const draft = onboardingEmailDrafts.find((entry) => entry.key === key);
    if (!draft) return;

    if (!draft.to.trim()) {
      setOnboardingEmailDrafts((previous) =>
        previous.map((entry) =>
          entry.key === key
            ? {
                ...entry,
                statusMessage: "Recipient email is required.",
              }
            : entry
        )
      );
      return;
    }

    setOnboardingEmailDrafts((previous) =>
      previous.map((entry) =>
        entry.key === key
          ? {
              ...entry,
              sending: true,
              statusMessage: "",
            }
          : entry
      )
    );

    try {
      const formData = new FormData();
      formData.append("to", draft.to);
      formData.append("cc", draft.cc?.trim() || "HR@wuc.edu");
      formData.append("subject", draft.subject);
      formData.append("body", draft.body);

      // Append file if offer letter
      if (draft.key === "offer-letter" && draft.offerLetterFile) {
        formData.append("attachment", draft.offerLetterFile);
      }

      const response = await fetch("/api/email/send", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to send email");
      }

      setOnboardingEmailDrafts((previous) =>
        previous.map((entry) =>
          entry.key === key
            ? {
                ...entry,
                sent: true,
                sending: false,
                statusMessage: "Email sent successfully.",
              }
            : entry
        )
      );
    } catch (error) {
      setOnboardingEmailDrafts((previous) =>
        previous.map((entry) =>
          entry.key === key
            ? {
                ...entry,
                sent: false,
                sending: false,
                statusMessage:
                  error instanceof Error ? error.message : "Failed to send email.",
              }
            : entry
        )
      );
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (confirm("Are you sure you want to delete this employee?")) {
      try {
        const response = await fetch(`/api/employees/${employeeId}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error("Failed to delete employee");
        await fetchEmployees();
      } catch (error) {
        console.error("Error deleting employee:", error);
        alert("Failed to delete employee");
      }
    }
  };

  const handleCreateTimeOffRequest = async (payload: {
    employeeId: string;
    requestType: TimeOffType;
    startDate: string;
    endDate: string;
    hours?: number | null;
    reason?: string;
  }) => {
    const response = await fetch("/api/time-off", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to create time-off request");
    }

    await fetchTimeOffRequests();
  };

  const handleUpdateTimeOffRequest = async (
    id: string,
    payload: { status?: TimeOffStatus; managerNote?: string }
  ) => {
    const response = await fetch(`/api/time-off/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to update time-off request");
    }

    await fetchTimeOffRequests();
  };

  const handleDeleteTimeOffRequest = async (id: string) => {
    const response = await fetch(`/api/time-off/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to delete time-off request");
    }
    await fetchTimeOffRequests();
  };

  const handleCreateHoliday = async (payload: {
    name: string;
    date: string;
    workLocation: "USA" | "Taiwan";
    isPaid: boolean;
    notes?: string;
  }) => {
    const response = await fetch("/api/holidays", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to create holiday");
    }

    await fetchHolidays(selectedYear);
  };

  const handleDeleteHoliday = async (id: string) => {
    const response = await fetch(`/api/holidays/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to delete holiday");
    }
    await fetchHolidays(selectedYear);
  };

  const handleSaveOnboardingStep1 = async (
    employeeId: string,
    payload: OnboardingStep1Update
  ) => {
    const response = await fetch(`/api/employees/${employeeId}/onboarding`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step: 1,
        payload: {
          checklistAssigned: payload.checklistAssigned,
          systemAccess: payload.systemAccess,
          updatedBy: payload.updatedBy,
          notes: payload.notes || "",
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || "Failed to update onboarding");
    }

    await fetchEmployees();
  };

  const handleSaveOnboardingStep2 = async (
    employeeId: string,
    payload: OnboardingStep2Update
  ) => {
    const response = await fetch(`/api/employees/${employeeId}/onboarding`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step: 2,
        payload: {
          forms: payload.forms,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || "Failed to update forms");
    }

    await fetchEmployees();
  };

  const handleSaveOnboardingStep3 = async (
    employeeId: string,
    payload: OnboardingStep3Update
  ) => {
    const response = await fetch(`/api/employees/${employeeId}/onboarding`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step: 3,
        payload: {
          forms: payload.forms,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || "Failed to update HR policy sign-off");
    }

    await fetchEmployees();
  };

  const handleSaveOnboardingStep4 = async (
    employeeId: string,
    payload: OnboardingStep4Update
  ) => {
    const response = await fetch(`/api/employees/${employeeId}/onboarding`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step: 4,
        payload: {
          forms: payload.forms,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || "Failed to update trainings");
    }

    await fetchEmployees();
  };

  const handleSaveOnboardingStep5 = async (
    employeeId: string,
    payload: OnboardingStep5Update
  ) => {
    const response = await fetch(`/api/employees/${employeeId}/onboarding`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step: 5,
        payload,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || "Failed to update payroll setup");
    }

    await fetchEmployees();
  };

  const handleSaveOnboardingStep6 = async (
    employeeId: string,
    payload: OnboardingStep6Update
  ) => {
    const response = await fetch(`/api/employees/${employeeId}/onboarding`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        step: 6,
        payload,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || "Failed to update activation status");
    }

    await fetchEmployees();
  };

  const handleSaveProfessionalDevelopment = async (
    employeeId: string,
    records: ProfessionalDevelopmentRecord[]
  ) => {
    const employee = employees.find((entry) => entry.id === employeeId);
    if (!employee) {
      throw new Error("Employee not found");
    }

    const response = await fetch(`/api/employees/${employeeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...employee,
        professionalDevelopmentRecords: records,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.details ||
          errorData.error ||
          "Failed to update professional development records"
      );
    }

    await fetchEmployees();
  };

  const handleAddWeeklyRecord = () => {
    setEditingWeeklyRecord(null);
    setShowWeeklyRecordForm(true);
  };

  const handleEditWeeklyRecord = (record: any, index: number) => {
    setEditingWeeklyRecord({ record, index });
    setShowWeeklyRecordForm(true);
  };

  const handleDeleteWeeklyRecord = async (index: number) => {
    if (confirm("Are you sure you want to delete this weekly record?")) {
      if (selectedEmployee && selectedEmployee.weeklyRecords[index]) {
        const record = selectedEmployee.weeklyRecords[index];
        const recordId = record.recordId;

        if (!recordId) {
          alert("Unable to delete record: Record ID not found");
          return;
        }

        try {
          const response = await fetch(`/api/weekly-records/${recordId}`, {
            method: "DELETE",
          });

          if (!response.ok) {
            throw new Error("Failed to delete record");
          }

          await fetchEmployees();
          setWeeklyRecordNotice({
            type: "success",
            message: "Weekly record deleted from database.",
          });
        } catch (error) {
          console.error("Error deleting weekly record:", error);
          alert("Failed to delete record");
          setWeeklyRecordNotice({
            type: "error",
            message: "Failed to delete weekly record from database.",
          });
        }
      }
    }
  };

  const handleUpdateOverdueTasks = async (recordId: string, details: any[]) => {
    try {
      const record = selectedEmployee?.weeklyRecords.find(
        (r) => r.recordId === recordId
      );

      if (!record) {
        alert("Unable to update overdue tasks: Record not found");
        return;
      }

      const totalOverdue = (details || []).reduce(
        (sum: number, detail: any) => sum + (detail?.count || 0),
        0
      );

      const response = await fetch(`/api/weekly-records/${recordId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...record,
          overdueTasksDetails: details,
          weeklyOverdueTasks: totalOverdue,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update overdue tasks");
      }

      await fetchEmployees();
    } catch (error) {
      console.error("Error updating overdue tasks:", error);
      alert("Failed to update overdue tasks");
    }
  };

  const handleUpdateAssignedTasks = async (recordId: string, details: any[]) => {
    try {
      const record = selectedEmployee?.weeklyRecords.find(
        (r) => r.recordId === recordId
      );

      if (!record) {
        alert("Unable to update assigned tasks: Record not found");
        return;
      }

      const totalAssigned = (details || []).reduce(
        (sum: number, detail: any) => sum + (detail?.count || 0),
        0
      );

      const response = await fetch(`/api/weekly-records/${recordId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...record,
          assignedTasksDetails: details,
          assignedTasks: totalAssigned,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update assigned tasks");
      }

      await fetchEmployees();
    } catch (error) {
      console.error("Error updating assigned tasks:", error);
      alert("Failed to update assigned tasks");
    }
  };

  const handleUpdateAllOverdueTasks = async (recordId: string, details: any[]) => {
    try {
      const record = selectedEmployee?.weeklyRecords.find(
        (r) => r.recordId === recordId
      );

      if (!record) {
        alert("Unable to update all overdue tasks: Record not found");
        return;
      }

      const totalAllOverdue = (details || []).reduce(
        (sum: number, detail: any) => sum + (detail?.count || 0),
        0
      );

      const response = await fetch(`/api/weekly-records/${recordId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...record,
          allOverdueTasks: totalAllOverdue,
          allOverdueTasksDetails: details,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.details
          ? `${errorData.error || "Failed to update all overdue tasks"}: ${errorData.details}`
          : errorData.error || "Failed to update all overdue tasks";
        throw new Error(message);
      }

      await fetchEmployees();
    } catch (error) {
      console.error("Error updating all overdue tasks:", error);
      console.error(
        "All overdue tasks update failed:",
        error instanceof Error ? error.message : String(error)
      );
    }
  };

  const handleSaveWeeklyRecordUpdates = async (
    recordId: string,
    updates: any
  ) => {
    const record = selectedEmployee?.weeklyRecords.find(
      (r) => r.recordId === recordId
    );

    if (!record) {
      throw new Error("Unable to save weekly record updates: Record not found");
    }

    const mergedPayload: Record<string, unknown> = {
      ...record,
      ...updates,
    };

    // Save Details to DB is primarily for staged task-detail edits.
    // If managerComment is not part of staged updates, avoid sending a stale value.
    if (!Object.prototype.hasOwnProperty.call(updates, "managerComment")) {
      delete mergedPayload.managerComment;
    }

    console.log("📤 [PUT] Weekly Record Update");
    console.log("   Record ID:", recordId);
    console.log("   Updates received:", updates);
    console.log("   Merged payload:", mergedPayload);
    console.log("   Task details to save:");
    console.log("     - assignedTasksDetails:", mergedPayload.assignedTasksDetails);
    console.log("     - overdueTasksDetails:", mergedPayload.overdueTasksDetails);
    console.log("     - allOverdueTasksDetails:", mergedPayload.allOverdueTasksDetails);
    console.log("   managerComment included:", "managerComment" in mergedPayload);

    const response = await fetch(`/api/weekly-records/${recordId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mergedPayload),
    });

    console.log("📨 Response status:", response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ Backend error:", errorData);
      const message = errorData.details
        ? `${errorData.error || "Failed to save weekly record updates"}: ${errorData.details}`
        : errorData.error || "Failed to save weekly record updates";
      throw new Error(message);
    }

    const responseData = await response.json();
    console.log("✅ Response data:", responseData);

    await fetchEmployees();
    setWeeklyRecordNotice({
      type: "success",
      message: `Saved ${record.startDate} to ${record.endDate} to database.`,
    });
  };

  const handleSaveWeeklyRecord = async (
    record: any,
    setApiError?: (message: string) => void
  ) => {
    try {
      if (selectedEmployee) {
        let focusStartDate: string | undefined;
        let focusEndDate: string | undefined;

        if (editingWeeklyRecord) {
          const existingRecord =
            selectedEmployee.weeklyRecords[editingWeeklyRecord.index];
          const recordId = existingRecord?.recordId || record.recordId;

          if (!recordId) {
            const message = "Unable to update record: Record ID not found";
            if (setApiError) {
              setApiError(message);
            } else {
              alert(message);
            }
            return;
          }

          const mergedRecord = {
            ...existingRecord,
            ...record,
            assignedTasksDetails:
              record.assignedTasksDetails ??
              existingRecord?.assignedTasksDetails ??
              [],
            overdueTasksDetails:
              record.overdueTasksDetails ??
              existingRecord?.overdueTasksDetails ??
              [],
            allOverdueTasks:
              record.allOverdueTasks ?? existingRecord?.allOverdueTasks ?? 0,
            allOverdueTasksDetails:
              record.allOverdueTasksDetails ??
              existingRecord?.allOverdueTasksDetails ??
              [],
            managerComment:
              record.managerComment ?? existingRecord?.managerComment ?? "",
          };

          focusStartDate = mergedRecord.startDate;
          focusEndDate = mergedRecord.endDate;

          const response = await fetch(`/api/weekly-records/${recordId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...mergedRecord,
              recordId,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const message = errorData.details
              ? `${errorData.error || "Failed to update weekly record"}: ${errorData.details}`
              : errorData.error || "Failed to update weekly record";
            if (setApiError) {
              setApiError(message);
              return;
            }
            throw new Error(message);
          }

          await fetchEmployees();
          setWeeklyRecordNotice({
            type: "success",
            message: `Saved ${focusStartDate} to ${focusEndDate} to database.`,
          });
        } else {
          // Add new record
          focusStartDate = record.startDate;
          focusEndDate = record.endDate;

          const response = await fetch("/api/weekly-records", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              employeeId: selectedEmployee.id,
              ...record,
            }),
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const message = errorData.details
              ? `${errorData.error || "Failed to create weekly record"}: ${errorData.details}`
              : errorData.error || "Failed to create weekly record";
            if (setApiError) {
              setApiError(message);
              return;
            }
            throw new Error(message);
          }
          await fetchEmployees();
          setWeeklyRecordNotice({
            type: "success",
            message: `Saved ${focusStartDate} to ${focusEndDate} to database.`,
          });
        }

        if (focusStartDate && focusEndDate) {
          const focusDate = parseDateInPacific(focusStartDate);
          setSelectedYear(focusDate.getFullYear());
          setSelectedMonth(focusDate.getMonth());
          setSelectedWeekFilter(`${focusStartDate}|${focusEndDate}`);
        } else {
          setSelectedWeekFilter(null);
        }

        setActiveView("manage-performance");
        setSelectedEmployeeForPerformance(selectedEmployee.id);
        setSelectedEmployeeId(selectedEmployee.id);
      }
      setShowWeeklyRecordForm(false);
      setEditingWeeklyRecord(null);
    } catch (error) {
      console.error("Error saving weekly record:", error);
      const message =
        error instanceof Error ? error.message : "Failed to save weekly record";
      if (setApiError) {
        setApiError(message);
      } else {
        alert(message);
      }
      setWeeklyRecordNotice({
        type: "error",
        message,
      });
    }
  };

  // Get all unique week ranges from all employees
  const getAllWeekRanges = () => {
    const weekRangesByStart = new Map<string, { start: string; end: string; score: number }>();
    activeEmployees.forEach((emp) => {
      emp.weeklyRecords.forEach((record) => {
        const startDate = parseDateInPacific(record.startDate);
        const endDate = parseDateInPacific(record.endDate);
        const diffInDays = Math.round(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Weekly records should normally be ~6 days from start to end (7-day span)
        const score = Math.abs(diffInDays - 6);
        const existing = weekRangesByStart.get(record.startDate);

        if (!existing || score < existing.score) {
          weekRangesByStart.set(record.startDate, {
            start: record.startDate,
            end: record.endDate,
            score,
          });
        }
      });
    });

    return Array.from(weekRangesByStart.values())
      .sort(
        (a, b) =>
          parseDateInPacific(b.start).getTime() -
          parseDateInPacific(a.start).getTime()
      )
      .map(({ start, end }) => ({
        start,
        end,
        range: `${start}|${end}`,
      }));
  };

  // Filter week ranges by year and month
  const getFilteredWeekRanges = () => {
    return getAllWeekRanges().filter((week) => {
      const startDate = parseDateInPacific(week.start);
      return (
        startDate.getFullYear() === selectedYear &&
        startDate.getMonth() === selectedMonth
      );
    });
  };

  // Get filtered week ranges for display
  const allWeekRanges = getAllWeekRanges();
  const latestWeekRange = allWeekRanges[0] || null;
  const filteredWeekRanges = getFilteredWeekRanges();
  const uniqueFilteredWeekRanges = filteredWeekRanges.filter(
    (week, index, arr) => arr.findIndex((item) => item.range === week.range) === index
  );

  const showLatestRecords = () => {
    if (!latestWeekRange) {
      setSelectedWeekFilter(null);
      return;
    }

    const latestStart = parseDateInPacific(latestWeekRange.start);
    setSelectedYear(latestStart.getFullYear());
    setSelectedMonth(latestStart.getMonth());
    setSelectedWeekFilter(null);
  };

  useEffect(() => {
    if (
      selectedWeekFilter &&
      !uniqueFilteredWeekRanges.some((week) => week.range === selectedWeekFilter)
    ) {
      setSelectedWeekFilter(null);
    }
  }, [selectedWeekFilter, uniqueFilteredWeekRanges]);

  // Get employee data for selected week
  const getEmployeeWeekData = (employee: Employee, range: string) => {
    const [start, end] = range.split("|");
    return employee.weeklyRecords.find(
      (r) => r.startDate === start && r.endDate === end
    );
  };

  const hasTaiwanStep6 = onboardingEmailDrafts.some((draft) => draft.step === 6);
  const flowChartSteps = [
    { key: "setup", label: "Step 1: Setup" },
    { key: "it", label: "Step 2: IT Setup" },
    { key: "registrar", label: "Step 3: Registrar" },
    { key: "offer", label: "Step 4: Offer Letter" },
    { key: "welcome", label: "Step 5: Welcome" },
    ...(hasTaiwanStep6 ? [{ key: "compliance", label: "Step 6: Compliance" }] : []),
  ];
  const flowChartStepIndices = flowChartSteps.reduce<Record<string, number>>(
    (acc, step, index) => {
      acc[step.key] = index;
      return acc;
    },
    {}
  );
  const flowChartCurrentIndex =
    onboardingStep === "banner" ? 0 : onboardingStep === "emails" ? 1 : flowChartSteps.length;
  const onboardingEmailRangeLabel = hasTaiwanStep6 ? "Steps 2 - 6" : "Steps 2 - 5";
  const onboardingEmailCount = hasTaiwanStep6 ? 5 : 4;

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-linear-to-r from-blue-300 to-purple-300 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-bold mb-2">HR Performance Review</h1>
          <p className="text-white opacity-90">
            Monitor employee performance, tasks, and work hours
          </p>
          {dbInfo && (
            <p className="mt-3 inline-block rounded-md bg-white/20 px-3 py-1 text-xs text-white">
              DB: {dbInfo.database} @ {dbInfo.server}
              {dbInfo.port ? `:${dbInfo.port}` : ""} (user: {dbInfo.user})
            </p>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {weeklyRecordNotice && (
          <div
            className={`mb-6 rounded-lg border px-4 py-3 flex items-center justify-between ${
              weeklyRecordNotice.type === "success"
                ? "bg-green-50 border-green-200 text-green-900"
                : "bg-red-50 border-red-200 text-red-900"
            }`}
          >
            <span className="text-sm font-medium">{weeklyRecordNotice.message}</span>
            <button
              onClick={() => setWeeklyRecordNotice(null)}
              className="text-sm font-semibold opacity-80 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex gap-4 mb-8 flex-wrap">
          <button
            onClick={() => {
              setActiveView("dashboard");
              setSelectedEmployeeId(null);
            }}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              activeView === "dashboard"
                ? "bg-blue-300 text-white shadow-md"
                : "bg-blue-100 text-gray-700 border border-blue-200 hover:bg-blue-50"
            }`}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => setActiveView("employees")}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              activeView === "employees" || activeView === "manage"
                ? "bg-blue-300 text-white shadow-md"
                : "bg-blue-100 text-gray-700 border border-blue-200 hover:bg-blue-50"
            }`}
          >
            👥 Employee
          </button>
          <button
            onClick={() => {
              setActiveView("manage-performance");
              setSelectedEmployeeId(null);
            }}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              activeView === "manage-performance"
                ? "bg-purple-300 text-white shadow-md"
                : "bg-purple-100 text-gray-700 border border-purple-200 hover:bg-purple-50"
            }`}
          >
            📈 Performance
          </button>
          <button
            onClick={() => {
              setActiveView("incident-tracking");
              setSelectedEmployeeId(null);
            }}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              activeView === "incident-tracking"
                ? "bg-red-300 text-white shadow-md"
                : "bg-red-100 text-gray-700 border border-red-200 hover:bg-red-50"
            }`}
          >
            ⚠️ Mistakes & Warnings
          </button>
          <button
            onClick={() => {
              setActiveView("professional-development");
              setSelectedEmployeeId(null);
            }}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              activeView === "professional-development"
                ? "bg-amber-400 text-white shadow-md"
                : "bg-amber-100 text-gray-700 border border-amber-200 hover:bg-amber-50"
            }`}
          >
            🎓 Professional Development
          </button>
          <button
            onClick={() => {
              setActiveView("time-off");
              setSelectedEmployeeId(null);
            }}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              activeView === "time-off"
                ? "bg-emerald-400 text-white shadow-md"
                : "bg-emerald-100 text-gray-700 border border-emerald-200 hover:bg-emerald-50"
            }`}
          >
            🗓️ Time Off & Holidays
          </button>
        </div>

        {(activeView === "employees" || activeView === "manage") && (
          <div className="mb-8 rounded-xl border border-blue-200 bg-white/90 shadow-sm p-3 sm:p-4">
            <div className="text-xs font-semibold tracking-wide text-blue-700 uppercase mb-3">
              Employee Sub-Menu
            </div>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => {
                  setActiveView("employees");
                  setSelectedEmployeeId(null);
                }}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  activeView === "employees"
                    ? "bg-blue-500 text-white shadow"
                    : "bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100"
                }`}
              >
                Employee Cards
              </button>
              <button
                onClick={() => {
                  setActiveView("manage");
                  setSelectedEmployeeId(null);
                }}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  activeView === "manage"
                    ? "bg-indigo-500 text-white shadow"
                    : "bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100"
                }`}
              >
                Employee Management
              </button>
            </div>
          </div>
        )}

        {/* Dashboard View */}
        {activeView === "dashboard" && (
          <PerformanceDashboard employees={activeEmployees} />
        )}

        {/* Employees View */}
        {activeView === "employees" && (
          <div>
            <div className="mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  All Employees
                </h2>
                <p className="text-gray-600 mb-4">
                  Click on any card to view employee details and office schedule information
                </p>
              </div>
            </div>

            {/* Employee Cards */}
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Employee Profiles
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...activeEmployees]
                .sort((a, b) =>
                  a.id.localeCompare(b.id, undefined, {
                    numeric: true,
                    sensitivity: "base",
                  })
                )
                .map((employee) => (
                <EmployeeCard
                  key={employee.id}
                  employee={employee}
                  onSelect={(employeeId: string) => {
                    setSelectedEmployeeId(employeeId);
                    const selected = activeEmployees.find((item) => item.id === employeeId);
                    if (selected) {
                      handleEditEmployee(selected);
                    }
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Manage Employees View */}
        {activeView === "manage" && (
          <div>
            <div className="mb-6 flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Employee Management
                </h2>
                <p className="text-gray-600">
                  Add, edit, or delete employees from your organization
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleAddEmployee}
                  className="bg-green-300 text-white font-semibold py-2 px-6 rounded-lg hover:bg-green-400 transition-colors"
                >
                  + Add New Employee
                </button>
                <button
                  onClick={() => {
                    setActiveView("onboarding");
                    setSelectedEmployeeId(null);
                  }}
                  className="bg-cyan-400 text-white font-semibold py-2 px-6 rounded-lg hover:bg-cyan-500 transition-colors"
                >
                  🧭 Onboarding
                </button>
                <button
                  onClick={() => {
                    setActiveView("offboarding");
                    setSelectedEmployeeId(null);
                  }}
                  className="bg-rose-400 text-white font-semibold py-2 px-6 rounded-lg hover:bg-rose-500 transition-colors"
                >
                  🚪 Off-boarding
                </button>
                <button
                  onClick={() => setShowDepartmentManager(true)}
                  className="bg-purple-300 text-white font-semibold py-2 px-6 rounded-lg hover:bg-purple-400 transition-colors"
                >
                  ⚙️ Manage Departments
                </button>
              </div>
            </div>

            {/* Employees Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Manager
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Position
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Hire Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {activeEmployees.map((employee) => (
                      <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {employee.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employee.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {employee.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {employee.department}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {employee.manager}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {employee.position}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatCompactDate(employee.joinDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2 flex flex-wrap gap-1">
                          <button
                            onClick={() => handleEditEmployee(employee)}
                            className="bg-blue-300 text-white px-3 py-1 rounded hover:bg-blue-400 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteEmployee(employee.id)}
                            className="bg-red-300 text-white px-3 py-1 rounded hover:bg-red-400 transition-colors"
                          >
                            Delete
                          </button>
                          {!onboardingCompletedIds.has(employee.id) && (
                            <button
                              onClick={() => handleStartOnboardingForEmployee(employee)}
                              className="bg-emerald-500 text-white px-3 py-1 rounded hover:bg-emerald-600 transition-colors text-xs font-semibold whitespace-nowrap"
                            >
                              🧭 Onboarding Emails
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {activeEmployees.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-600 text-lg">
                    No employees found. Add one to get started!
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Manage Performance View */}
        {activeView === "manage-performance" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6 print:shadow-none">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 print:hidden">
                Manage Employee Performance
              </h2>

              {/* Year and Month Selectors */}
              <div className="mb-6 print:hidden">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Select Year, Month, and Week
                </h3>
                <div className="flex gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Year
                    </label>
                    <select
                      value={selectedYear}
                      onChange={(e) => {
                        setSelectedYear(parseInt(e.target.value));
                        setSelectedWeekFilter(null);
                      }}
                      className="px-4 py-2 border border-blue-300 rounded-lg bg-blue-50 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-300"
                    >
                      {availableYears.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Month
                    </label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => {
                        setSelectedMonth(parseInt(e.target.value));
                        setSelectedWeekFilter(null);
                      }}
                      className="px-4 py-2 border border-blue-300 rounded-lg bg-blue-50 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-300"
                    >
                      {[
                        "January",
                        "February",
                        "March",
                        "April",
                        "May",
                        "June",
                        "July",
                        "August",
                        "September",
                        "October",
                        "November",
                        "December",
                      ].map((month, idx) => (
                        <option key={idx} value={idx}>
                          {month}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={showLatestRecords}
                      className="px-4 py-2 rounded-lg font-semibold bg-emerald-400 text-white hover:bg-emerald-500 transition-colors"
                    >
                      Show Latest Records
                    </button>
                  </div>
                </div>

                {uniqueFilteredWeekRanges.length === 0 && latestWeekRange && (
                  <p className="text-sm text-amber-700 mb-4">
                    No records for the selected month. Click "Show Latest Records" to jump to the newest saved week.
                  </p>
                )}

                {/* Week Selector */}
                <div className="mb-6 overflow-x-auto pb-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Week
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedWeekFilter(null)}
                      className={`whitespace-nowrap px-4 py-2 rounded-lg font-semibold transition-all ${
                        selectedWeekFilter === null
                          ? "bg-purple-300 text-white shadow-md"
                          : "bg-purple-100 text-gray-700 border border-purple-200 hover:bg-purple-50"
                      }`}
                    >
                      All
                    </button>
                    {uniqueFilteredWeekRanges.map((week) => (
                      <button
                        key={week.range}
                        onClick={() => setSelectedWeekFilter(week.range)}
                        className={`whitespace-nowrap px-4 py-2 rounded-lg font-semibold transition-all ${
                          selectedWeekFilter === week.range
                            ? "bg-purple-300 text-white shadow-md"
                            : "bg-purple-100 text-gray-700 border border-purple-200 hover:bg-purple-50"
                        }`}
                      >
                        {formatShortDate(week.start)} - {formatShortDate(week.end)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Employee Selector */}
              <div className="mb-6 print:hidden">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Employee
                </label>
                <select
                  value={selectedEmployeeForPerformance || ""}
                  onChange={(e) => {
                    setSelectedEmployeeForPerformance(e.target.value);
                    setSelectedEmployeeId(e.target.value || null);
                  }}
                  className="w-full px-4 py-2 border border-blue-300 rounded-lg bg-blue-50 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="">Choose an employee...</option>
                  {[...activeEmployees]
                    .sort((a, b) =>
                      a.id.localeCompare(b.id, undefined, {
                        numeric: true,
                        sensitivity: "base",
                      })
                    )
                    .map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* If employee selected, show their performance management */}
              {selectedEmployeeForPerformance &&
                activeEmployees.find((e) => e.id === selectedEmployeeForPerformance) && (
                  <div className="space-y-6">
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200 print:hidden">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {
                              activeEmployees.find(
                                (e) => e.id === selectedEmployeeForPerformance
                              )?.name
                            }
                            's {performanceView === "weekly" ? "Weekly Performance Records" : "Monthly Performance Report"}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {performanceView === "weekly" 
                              ? "Add or edit weekly performance data for this employee"
                              : "View monthly performance summary and trends"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setPerformanceView("weekly")}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                              performanceView === "weekly"
                                ? "bg-purple-600 text-white shadow-md"
                                : "bg-white text-gray-700 border border-purple-300 hover:bg-purple-50"
                            }`}
                          >
                            Weekly Records
                          </button>
                          <button
                            onClick={() => setPerformanceView("monthly")}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                              performanceView === "monthly"
                                ? "bg-purple-600 text-white shadow-md"
                                : "bg-white text-gray-700 border border-purple-300 hover:bg-purple-50"
                            }`}
                          >
                            Monthly Report
                          </button>
                        </div>
                      </div>
                    </div>

                    {performanceView === "weekly" && activeEmployees.find((e) => e.id === selectedEmployeeForPerformance) && (
                      <WeeklyRecordsTable
                        employee={
                          activeEmployees.find(
                            (e) => e.id === selectedEmployeeForPerformance
                          )!
                        }
                        timeOffRequests={activeTimeOffRequests.filter(
                          (request) => request.employeeId === selectedEmployeeForPerformance
                        )}
                        holidays={holidays}
                        selectedYear={selectedYear}
                        selectedMonth={selectedMonth}
                        selectedWeekRange={selectedWeekFilter}
                        onAddRecord={() => {
                          setSelectedEmployeeId(selectedEmployeeForPerformance);
                          handleAddWeeklyRecord();
                        }}
                        onEditRecord={handleEditWeeklyRecord}
                        onDeleteRecord={handleDeleteWeeklyRecord}
                        onUpdateOverdueTasks={handleUpdateOverdueTasks}
                        onUpdateAssignedTasks={handleUpdateAssignedTasks}
                        onUpdateAllOverdueTasks={handleUpdateAllOverdueTasks}
                        onSaveRecord={handleSaveWeeklyRecordUpdates}
                      />
                    )}

                    {performanceView === "monthly" && activeEmployees.find((e) => e.id === selectedEmployeeForPerformance) && (
                      <MonthlyPerformanceReport
                        employee={
                          activeEmployees.find(
                            (e) => e.id === selectedEmployeeForPerformance
                          )!
                        }
                        year={selectedYear}
                        month={selectedMonth}
                      />
                    )}
                  </div>
                )}
            </div>
          </div>
        )}

        {activeView === "onboarding" && (
          <OnboardingModule
            employees={employees}
            onSaveStep1={handleSaveOnboardingStep1}
            onSaveStep2={handleSaveOnboardingStep2}
            onSaveStep3={handleSaveOnboardingStep3}
            onSaveStep4={handleSaveOnboardingStep4}
            onSaveStep5={handleSaveOnboardingStep5}
            onSaveStep6={handleSaveOnboardingStep6}
          />
        )}

        {activeView === "offboarding" && (
          <OffboardingModule employees={employees} onRecordsChanged={fetchOffboardingRecords} />
        )}

        {activeView === "professional-development" && (
          <ProfessionalDevelopmentManager
            employees={activeEmployees}
            onSaveRecords={handleSaveProfessionalDevelopment}
          />
        )}

        {activeView === "incident-tracking" && (
          <IncidentTrackingTable employees={activeEmployees} />
        )}

        {activeView === "time-off" && (
          <TimeOffManager
            employees={activeEmployees}
            requests={activeTimeOffRequests}
            holidays={holidays}
            selectedYear={selectedYear}
            onCreateRequest={handleCreateTimeOffRequest}
            onUpdateRequest={handleUpdateTimeOffRequest}
            onDeleteRequest={handleDeleteTimeOffRequest}
            onCreateHoliday={handleCreateHoliday}
            onDeleteHoliday={handleDeleteHoliday}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-blue-50 border-t border-blue-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-gray-600">
            HR Performance Review System • Latest Next.js • Running on Port 3001
          </p>
        </div>
      </footer>

      {/* Add/Edit Employee Modal */}
      {showForm && (
        <AddEditEmployee
          employee={editingEmployee || undefined}
          onSave={handleSaveEmployee}
          onCancel={() => {
            setShowForm(false);
            setEditingEmployee(null);
          }}
          departments={departments}
          employees={activeEmployees}
        />
      )}

      {showOnboardingEmailPage && onboardingStep !== "done" && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[70]">
          <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">

            {/* Step indicator */}
            <div className="px-6 pt-5 pb-3">
              <div className="flex items-center gap-1 overflow-x-auto pb-2">
                {flowChartSteps.map((step, i) => {
                  const stepIndex = flowChartStepIndices[step.key];
                  const isActive = flowChartCurrentIndex === stepIndex;
                  const isCompleted = flowChartCurrentIndex > stepIndex;
                  
                  return (
                    <div key={step.key} className="flex items-center gap-1">
                      <div className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                        isActive
                          ? "bg-emerald-500 text-white"
                          : isCompleted
                          ? "bg-emerald-200 text-emerald-800"
                          : "bg-gray-200 text-gray-500"
                      }`}>{step.label}</div>
                      {i < flowChartSteps.length - 1 && <div className="w-6 h-0.5 bg-gray-300" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── STEP 1: Banner ── */}
            {onboardingStep === "banner" && (
              <div className="px-6 pb-8 pt-4 text-center">
                <div className="text-5xl mb-4">🎉</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {onboardingNewHireName} has been added!
                </h3>
                <p className="text-gray-600 mb-6">
                  The employee record was created. Continue to send {onboardingEmailCount} onboarding emails for {onboardingEmailRangeLabel}.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setOnboardingStep("emails")}
                    className="px-6 py-3 bg-emerald-500 text-white font-semibold rounded-lg hover:bg-emerald-600"
                  >
                    Continue to Onboarding Process →
                  </button>
                  <button
                    onClick={() => { setShowOnboardingEmailPage(false); setOnboardingStep("banner"); }}
                    className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300"
                  >
                    Skip for Now
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 2: Emails ── */}
            {onboardingStep === "emails" && (
              <>
                <div className="px-6 py-3 border-b bg-emerald-50">
                  <h3 className="text-lg font-bold text-gray-900">Onboarding Emails — {onboardingEmailRangeLabel}</h3>
                  <p className="text-sm text-gray-600 mt-0.5">Edit each email then send. You can send in any order.</p>
                </div>
                <div className="p-6 space-y-6">
                  {onboardingEmailDrafts.sort((a, b) => a.step - b.step).map((draft) => (
                    <div key={draft.key} className={`border rounded-lg p-4 ${
                      draft.sent ? "border-emerald-300 bg-emerald-50" : "border-gray-200 bg-gray-50"
                    }`}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          draft.sent ? "bg-emerald-500 text-white" : "bg-blue-100 text-blue-700"
                        }`}>{draft.sent ? "✓" : draft.step}</span>
                        <p className="text-sm font-semibold text-gray-900">
                          Step {draft.step}: {draft.recipientName}
                        </p>
                        {draft.sent && <span className="ml-auto text-xs text-emerald-700 font-semibold">✓ Sent</span>}
                      </div>

                      <div className="mb-3">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">To</label>
                        <input type="email" value={draft.to}
                          onChange={(e) => updateOnboardingEmailDraft(draft.key, "to", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="recipient@domain.com" />
                      </div>
                      <div className="mb-3">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">CC</label>
                        <input
                          type="email"
                          value={draft.cc || "HR@wuc.edu"}
                          onChange={(e) =>
                            setOnboardingEmailDrafts((previous) =>
                              previous.map((entry) =>
                                entry.key === draft.key
                                  ? {
                                      ...entry,
                                      cc: e.target.value,
                                    }
                                  : entry
                              )
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder="HR@wuc.edu"
                        />
                      </div>
                      <div className="mb-3">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Subject</label>
                        <input type="text" value={draft.subject}
                          onChange={(e) => updateOnboardingEmailDraft(draft.key, "subject", e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Body</label>
                        <textarea value={draft.body}
                          onChange={(e) => updateOnboardingEmailDraft(draft.key, "body", e.target.value)}
                          rows={8} className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm" />
                      </div>

                      {draft.key === "offer-letter" && (
                        <div className="mt-4 p-4 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50">
                          <p className="text-sm font-semibold text-blue-900 mb-2">Step 4 Required Action: Attach Offer Letter File</p>
                          <p className="text-xs text-blue-800 mb-3">Use the button below to select the file before clicking Send.</p>

                          <input
                            id={`offer-letter-file-${draft.key}`}
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              setOnboardingEmailDrafts((previous) =>
                                previous.map((entry) =>
                                  entry.key === draft.key
                                    ? { ...entry, offerLetterFile: file }
                                    : entry
                                )
                              );
                            }}
                            className="hidden"
                          />

                          <label
                            htmlFor={`offer-letter-file-${draft.key}`}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 cursor-pointer"
                          >
                            {draft.offerLetterFile ? "Replace Offer Letter File" : "Upload Offer Letter File"}
                          </label>

                          {draft.offerLetterFile ? (
                            <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
                              <p className="text-xs text-emerald-700 font-medium">✓ Attached: {draft.offerLetterFile.name}</p>
                            </div>
                          ) : (
                            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                              <p className="text-xs text-amber-700 font-medium">No file attached yet.</p>
                            </div>
                          )}

                          <p className="mt-2 text-xs text-gray-500">Accepted file types: PDF, DOC, DOCX.</p>
                        </div>
                      )}

                      {draft.note && <p className="mt-2 text-xs text-amber-700">{draft.note}</p>}
                      {draft.statusMessage && (
                        <p className={`mt-2 text-xs font-medium ${
                          draft.sent ? "text-emerald-700" : "text-red-700"
                        }`}>{draft.statusMessage}</p>
                      )}

                      <div className="mt-3 flex items-center justify-between gap-3">
                        {draft.key === "offer-letter" && !draft.offerLetterFile && (
                          <p className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                            Attach offer letter file first.
                          </p>
                        )}
                        <button
                          onClick={() => handleSendOnboardingEmailDraft(draft.key)}
                          disabled={
                            draft.sending ||
                            (draft.key === "offer-letter" && !draft.offerLetterFile)
                          }
                          className={`px-4 py-2 rounded text-white text-sm font-semibold ${
                            draft.sent
                              ? "bg-gray-400 hover:bg-gray-500"
                              : "bg-blue-600 hover:bg-blue-700"
                          } disabled:opacity-60`}
                        >
                          {draft.sending
                            ? "Sending..."
                            : draft.sent
                              ? "✓ Sent • Resend"
                              : draft.key === "offer-letter"
                                ? "Send Step 4 Email (with attachment)"
                                : `Send Step ${draft.step} Email`}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-6 py-4 border-t flex justify-between items-center">
                  <button onClick={() => setOnboardingStep("banner")}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm">← Back</button>
                  <button
                    onClick={() => setOnboardingStep("complete")}
                    className="px-6 py-2 bg-emerald-500 text-white font-semibold rounded-lg hover:bg-emerald-600 text-sm"
                  >
                    Continue to Confirm →
                  </button>
                </div>
              </>
            )}

            {/* ── STEP 3: Completion checkoff ── */}
            {onboardingStep === "complete" && (
              <div className="px-6 py-8">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Onboarding Initiated</h3>
                <p className="text-gray-600 mb-6">Review what was completed and check off to finish.</p>

                <div className="space-y-3 mb-8">
                  {onboardingEmailDrafts.sort((a, b) => a.step - b.step).map((draft) => (
                    <div key={draft.key} className={`flex items-center gap-3 rounded-lg border px-4 py-3 ${
                      draft.sent ? "border-emerald-300 bg-emerald-50" : "border-amber-200 bg-amber-50"
                    }`}>
                      <span className={`text-lg ${draft.sent ? "text-emerald-600" : "text-amber-500"}`}>
                        {draft.sent ? "✅" : "⚠️"}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Step {draft.step}: {draft.recipientName}</p>
                        <p className="text-xs text-gray-500">{draft.sent ? "Email sent" : "Email not sent yet"}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onboardingCompleteChecked}
                    onChange={(e) => setOnboardingCompleteChecked(e.target.checked)}
                    className="mt-0.5 w-5 h-5 rounded"
                  />
                  <span className="text-sm font-semibold text-gray-800">
                    I confirm the onboarding process for {onboardingNewHireName} has been initiated.
                  </span>
                </label>

                <div className="mt-8 flex justify-between items-center">
                  <button onClick={() => setOnboardingStep("emails")}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900 text-sm">← Back to Emails</button>
                  <button
                    disabled={!onboardingCompleteChecked}
                    onClick={() => {
                      setOnboardingStep("done");
                      setShowOnboardingEmailPage(false);
                      setOnboardingEmailDrafts([]);
                      const employeeForOnboarding = [...activeEmployees, ...employees].find(
                        (e) => e.name === onboardingNewHireName
                      );
                      if (employeeForOnboarding) {
                        const next = new Set(onboardingCompletedIds);
                        next.add(employeeForOnboarding.id);
                        setOnboardingCompletedIds(next);
                        try { localStorage.setItem("onboardingCompletedIds", JSON.stringify([...next])); } catch {}
                      }
                    }}
                    className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ✓ Mark Onboarding Complete
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Add/Edit Weekly Record Modal */}
      {showWeeklyRecordForm && (
        <AddEditWeeklyRecord
          record={editingWeeklyRecord?.record || undefined}
          employeeType={selectedEmployee?.employeeType}
          contractWorkHours={selectedEmployee?.contractWorkHours}
          onSave={handleSaveWeeklyRecord}
          onCancel={() => {
            setShowWeeklyRecordForm(false);
            setEditingWeeklyRecord(null);
          }}
        />
      )}

      {/* Department Manager Modal */}
      {showDepartmentManager && (
        <DepartmentManager
          departments={departments}
          onUpdate={setDepartments}
          onClose={() => setShowDepartmentManager(false)}
        />
      )}
    </div>
  );
}
