"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Employee,
  HolidayRecord,
  OnboardingStep1Update,
  OnboardingStep2Update,
  OnboardingStep3Update,
  OnboardingStep4Update,
  TaskDetail,
  TimeOffRequest,
  TimeOffStatus,
  TimeOffType,
  WeeklyRecord,
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
import NewHirePreboardingSOP from "@/components/NewHirePreboardingSOP";
import EmployeeTrainingAssignmentsView from "@/components/EmployeeTrainingAssignmentsView";
import MyEmployeeCard from "@/components/MyEmployeeCard";
import TrainingProgramsManager from "@/components/TrainingProgramsManager";
import TimeOffManager from "../components/TimeOffManager";
import { useCurrentUserContext } from "@/components/CurrentUserContextProvider";
import {
  getAllowedViewsForRole,
  isHrAdmin,
  isExecutive,
  isEmployee,
  isManager,
  isSelfOrDirectReport,
} from "@/lib/rbac";

type OffboardingRecord = {
  employeeId?: string;
  step8?: {
    confirmedOffboard?: boolean;
  };
};

type AppView =
  | "my-employee-card"
  | "dashboard"
  | "employees"
  | "offboard-employees"
  | "manage"
  | "manage-performance"
  | "employee-lifecycle"
  | "onboarding"
  | "offboarding"
  | "preboarding"
  | "professional-development"
  | "incident-tracking"
  | "time-off";

type TopNavigationColor = "blue" | "purple" | "red" | "amber" | "emerald" | "teal";

const TOP_NAVIGATION_COLORS: Record<TopNavigationColor, { active: string; inactive: string }> = {
  blue: {
    active: "border-blue-700 bg-blue-600",
    inactive: "border-blue-200 bg-blue-100 hover:border-blue-300 hover:bg-blue-200",
  },
  purple: {
    active: "border-purple-700 bg-purple-600",
    inactive: "border-purple-200 bg-purple-100 hover:border-purple-300 hover:bg-purple-200",
  },
  red: {
    active: "border-red-700 bg-red-600",
    inactive: "border-red-200 bg-red-100 hover:border-red-300 hover:bg-red-200",
  },
  amber: {
    active: "border-amber-700 bg-amber-600",
    inactive: "border-amber-200 bg-amber-100 hover:border-amber-300 hover:bg-amber-200",
  },
  emerald: {
    active: "border-emerald-700 bg-emerald-600",
    inactive: "border-emerald-200 bg-emerald-100 hover:border-emerald-300 hover:bg-emerald-200",
  },
  teal: {
    active: "border-teal-700 bg-teal-600",
    inactive: "border-teal-200 bg-teal-100 hover:border-teal-300 hover:bg-teal-200",
  },
};

function getTopNavigationTabClass(isActive: boolean, color: TopNavigationColor) {
  return [
    "relative rounded-lg border-2 px-6 py-2 font-bold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2",
    isActive
      ? `-translate-y-0.5 text-white shadow-md after:absolute after:bottom-0 after:left-1/4 after:h-0.5 after:w-1/2 after:rounded-full after:bg-white/80 after:content-[''] ${TOP_NAVIGATION_COLORS[color].active}`
      : `text-gray-700 hover:shadow-sm ${TOP_NAVIGATION_COLORS[color].inactive}`,
  ].join(" ");
}

export default function Home() {
  const {
    loading: currentUserLoading,
    accessDenied,
    error: currentUserError,
    employeeContext,
    viewMode,
    isEmployeeView,
    effectiveRole,
  } = useCurrentUserContext();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [offboardingRecords, setOffboardingRecords] = useState<OffboardingRecord[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null
  );
  const [activeView, setActiveView] = useState<AppView>("my-employee-card");
  const [selectedEmployeeForPerformance, setSelectedEmployeeForPerformance] =
    useState<string | null>(null);
  const [lastCreatedEmployeeId, setLastCreatedEmployeeId] = useState<string | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isReadOnlyEmployee, setIsReadOnlyEmployee] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showWeeklyRecordForm, setShowWeeklyRecordForm] = useState(false);
  const [editingWeeklyRecord, setEditingWeeklyRecord] = useState<{
    record: WeeklyRecord;
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
  const [selectedOffboardEmployeeId, setSelectedOffboardEmployeeId] = useState<string | null>(null);
  const isSavingEmployeeRef = useRef(false);

  // Generate available years (current year ± 5 years)
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from(
    { length: 11 },
    (_, i) => currentYear - 5 + i
  );

  // Load employees and departments from API on mount, and refetch holiday data when the selected year changes.
  useEffect(() => {
    if (currentUserLoading) {
      return;
    }

    fetchEmployees();
    if (employeeContext && (isHrAdmin(employeeContext.systemRole) || isExecutive(employeeContext.systemRole))) {
      fetchOffboardingRecords();
    } else {
      setOffboardingRecords([]);
    }
    fetchDepartments();
    fetchTimeOffRequests();
    fetchHolidays(selectedYear);
  }, [currentUserLoading, employeeContext, selectedYear]);

  const fetchEmployees = async () => {
    try {
      const response = await fetch("/api/employees");
      if (response.status === 401 || response.status === 403) {
        return [] as Employee[];
      }
      if (!response.ok) throw new Error("Failed to fetch employees");
      const data = await response.json();
      setEmployees(data);
      return data as Employee[];
    } catch (error) {
      console.error("Error fetching employees:", error);
      return [] as Employee[];
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch("/api/departments");
      if (response.status === 401 || response.status === 403) {
        return;
      }
      if (!response.ok) throw new Error("Failed to fetch departments");
      const data = await response.json();
      setDepartments(data.map((dept: { name: string }) => dept.name));
    } catch (error) {
      console.error("Error fetching departments:", error);
      // Keep the default departments if fetch fails
    }
  };

  const fetchOffboardingRecords = async () => {
    try {
      const response = await fetch("/api/offboarding");
      if (response.status === 401 || response.status === 403) {
        setOffboardingRecords([]);
        return;
      }
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message = typeof payload.error === "string" ? payload.error : "Failed to fetch offboarding records";
        throw new Error(message);
      }
      const data = await response.json();
      setOffboardingRecords(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching offboarding records:", error);
    }
  };

  const fetchTimeOffRequests = async () => {
    try {
      const response = await fetch("/api/time-off");

      if (response.status === 401 || response.status === 403) {
        return;
      }

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        const message = typeof payload.error === "string" ? payload.error : "Failed to fetch time-off requests";
        throw new Error(message);
      }

      const data = await response.json();
      setTimeOffRequests(data);
    } catch (error) {
      console.error("Error fetching time-off requests:", error);
    }
  };

  const fetchHolidays = async (year: number) => {
    try {
      const response = await fetch(`/api/holidays?year=${year}`);
      if (response.status === 401 || response.status === 403) {
        return;
      }
      if (!response.ok) throw new Error("Failed to fetch holidays");
      const data = await response.json();
      setHolidays(data);
    } catch (error) {
      console.error("Error fetching holidays:", error);
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

  const offboardEmployees = useMemo(
    () => employees.filter((employee) => confirmedOffboardEmployeeIds.has(employee.id)),
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

  const selectedOffboardEmployee = useMemo(
    () => offboardEmployees.find((employee) => employee.id === selectedOffboardEmployeeId) || null,
    [offboardEmployees, selectedOffboardEmployeeId]
  );

  const currentEmployeeRecord = useMemo(
    () =>
      activeEmployees.find((employee) => employee.id === employeeContext?.employeeId) ||
      employees.find((employee) => employee.id === employeeContext?.employeeId) ||
      null,
    [activeEmployees, employeeContext?.employeeId, employees]
  );

  const employeeRecordsVisibleToViewer = useMemo(() => {
    if (isHrAdmin(effectiveRole) || isExecutive(effectiveRole)) {
      return activeEmployees;
    }

    if (isManager(effectiveRole) && employeeContext) {
      return activeEmployees.filter((employee) => isSelfOrDirectReport(employeeContext, employee));
    }

    return currentEmployeeRecord ? [currentEmployeeRecord] : [];
  }, [activeEmployees, currentEmployeeRecord, effectiveRole, employeeContext]);

  const isEmployeeOnly = employeeContext?.systemRole === "Employee";
  const isEmployeePerspective = isEmployeeOnly || isEmployeeView;
  const performanceEmployeeId = isEmployee(effectiveRole)
    ? currentEmployeeRecord?.id || ""
    : selectedEmployeeForPerformance || "";
  const allowedViews = useMemo(
    () =>
      getAllowedViewsForRole(
        effectiveRole,
        isEmployeePerspective
      ),
    [effectiveRole, isEmployeePerspective]
  );
  const defaultView: AppView = useMemo(() => {
    if (allowedViews.has("my-employee-card")) return "my-employee-card";
    if (allowedViews.has("dashboard")) return "dashboard";
    if (allowedViews.has("employees")) return "employees";
    return "professional-development";
  }, [allowedViews]);

  const setVisibleView = (nextView: AppView) => {
    if (allowedViews.has(nextView)) {
      setActiveView(nextView);
      return;
    }
    setActiveView(defaultView);
  };

  useEffect(() => {
    if (!allowedViews.has(activeView)) {
      setActiveView(defaultView);
    }
  }, [activeView, allowedViews, defaultView]);

  const selectedEmployee = activeEmployees.find((e) => e.id === selectedEmployeeId);

  const preboardingCandidates = useMemo(() => {
    const now = new Date();
    return activeEmployees.filter((employee) => {
      const joinDate = new Date(employee.joinDate);
      if (Number.isNaN(joinDate.getTime())) return false;

      const daysDifference = (now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24);
      const withinThirtyDays = daysDifference >= -30 && daysDifference <= 30;
      const preboardingNotCompleted = !employee.preboardingSteps?.completed;

      return withinThirtyDays && preboardingNotCompleted;
    });
  }, [activeEmployees]);

  useEffect(() => {
    if (selectedEmployeeId && !activeEmployeeIds.has(selectedEmployeeId)) {
      setSelectedEmployeeId(null);
    }
  }, [selectedEmployeeId, activeEmployeeIds]);

  useEffect(() => {
    if (activeView === "preboarding" && selectedEmployeeId && !preboardingCandidates.some((emp) => emp.id === selectedEmployeeId)) {
      setSelectedEmployeeId(null);
    }
  }, [activeView, selectedEmployeeId, preboardingCandidates]);

  useEffect(() => {
    if (selectedEmployeeForPerformance && !activeEmployeeIds.has(selectedEmployeeForPerformance)) {
      setSelectedEmployeeForPerformance(null);
    }
  }, [selectedEmployeeForPerformance, activeEmployeeIds]);

  useEffect(() => {
    if (
      selectedOffboardEmployeeId &&
      !offboardEmployees.some((employee) => employee.id === selectedOffboardEmployeeId)
    ) {
      setSelectedOffboardEmployeeId(null);
    }
  }, [selectedOffboardEmployeeId, offboardEmployees]);

  const handleAddEmployee = () => {
    setEditingEmployee(null);
    setIsReadOnlyEmployee(false);
    setShowForm(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsReadOnlyEmployee(false);
    setShowForm(true);
  };

  const handleViewEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setIsReadOnlyEmployee(true);
    setShowForm(true);
  };

  const handleSaveEmployee = async (
    employee: Employee,
    setApiError?: (message: string) => void
  ) => {
    if (isSavingEmployeeRef.current) {
      return;
    }

    isSavingEmployeeRef.current = true;

    try {
      if (editingEmployee) {
        // Update existing employee
        const response = await fetch(`/api/employees/${editingEmployee.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(employee),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          setApiError?.(
            errorData.details || errorData.error || "Failed to update employee"
          );
          return;
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
          employmentStatus: employee.employmentStatus,
          officeSchedule: employee.officeSchedule,
          probationPeriodStartDate: employee.probationPeriodStartDate,
          probationPeriodEndDate: employee.probationPeriodEndDate,
          monthlySalaryDuringProbation: employee.monthlySalaryDuringProbation,
          monthlySalaryAfterProbation: employee.monthlySalaryAfterProbation,
          overallOverdueTasks: employee.overallOverdueTasks,
        };
        const response = await fetch("/api/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(employeeData),
        });

        const responseData = await response.json().catch(() => ({}));

        if (!response.ok && response.status === 409) {
          setApiError?.(
            responseData.details || responseData.error || "Employee ID already exists"
          );
          return;
        }

        if (!response.ok) {
          setApiError?.(
            responseData.details || responseData.error || "Failed to create employee"
          );
          return;
        }

        setLastCreatedEmployeeId(employee.id);
        setSelectedEmployeeId(employee.id);
        setSelectedEmployeeForPerformance(employee.id);
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
      setApiError?.(
        `Failed to save employee: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      isSavingEmployeeRef.current = false;
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (window.confirm("are you sure?")) {
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
    if (!window.confirm("are you sure?")) {
      return;
    }

    const response = await fetch(`/api/time-off/${id}`, {
      method: "DELETE",
      headers: {
        "X-View-Mode": isEmployeePerspective ? "employee" : "admin",
      },
    });
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
    if (!window.confirm("are you sure?")) {
      return;
    }

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
    const employee = employees.find((entry) => entry.id === employeeId);
    if (!employee) {
      alert("Unable to save onboarding: Employee not found");
      return;
    }

    const currentOnboarding = employee.onboarding;
    const step1Completed =
      payload.systemAccess.gmail &&
      payload.systemAccess.clickup &&
      payload.systemAccess.moodle &&
      payload.systemAccess.googleDrive;

    const response = await fetch(`/api/employees/${employeeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...employee,
        onboarding: {
          checklistAssigned: payload.checklistAssigned,
          enrolled: payload.checklistAssigned,
          step1Completed,
          systemAccess: payload.systemAccess,
          step2Completed: currentOnboarding?.step2Completed || false,
          step2Forms: currentOnboarding?.step2Forms || [],
          step3Completed: currentOnboarding?.step3Completed || false,
          step3Forms: currentOnboarding?.step3Forms || [],
          step4Completed: currentOnboarding?.step4Completed || false,
          step4Forms: currentOnboarding?.step4Forms || [],
          step5Completed: currentOnboarding?.step5Completed || false,
          step6AnnualTracking: currentOnboarding?.step6AnnualTracking || false,
          step2CompletedAt: currentOnboarding?.step2CompletedAt || null,
          step3CompletedAt: currentOnboarding?.step3CompletedAt || null,
          step4CompletedAt: currentOnboarding?.step4CompletedAt || null,
          step5CompletedAt: currentOnboarding?.step5CompletedAt || null,
          step6StartedAt: currentOnboarding?.step6StartedAt || null,
          step6LastReviewAt: currentOnboarding?.step6LastReviewAt || null,
          updatedBy: payload.updatedBy,
          updatedAt: new Date().toISOString(),
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
    const employee = employees.find((entry) => entry.id === employeeId);
    if (!employee) {
      alert("Unable to save forms: Employee not found");
      return;
    }

    const currentOnboarding = employee.onboarding;
    const step2Completed = payload.forms.every((form) => form.status === "Approved" || form.status === "N/A");

    const response = await fetch(`/api/employees/${employeeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...employee,
        onboarding: {
          checklistAssigned: currentOnboarding?.checklistAssigned || false,
          enrolled: currentOnboarding?.checklistAssigned || false,
          step1Completed: currentOnboarding?.step1Completed || false,
          systemAccess: currentOnboarding?.systemAccess || {
            gmail: false,
            clickup: false,
            moodle: false,
            googleDrive: false,
          },
          step2Completed,
          step2Forms: payload.forms,
          step3Completed: currentOnboarding?.step3Completed || false,
          step3Forms: currentOnboarding?.step3Forms || [],
          step4Completed: currentOnboarding?.step4Completed || false,
          step4Forms: currentOnboarding?.step4Forms || [],
          step5Completed: currentOnboarding?.step5Completed || false,
          step6AnnualTracking: currentOnboarding?.step6AnnualTracking || false,
          step2CompletedAt: step2Completed
            ? currentOnboarding?.step2CompletedAt || new Date().toISOString()
            : null,
          step3CompletedAt: currentOnboarding?.step3CompletedAt || null,
          step4CompletedAt: currentOnboarding?.step4CompletedAt || null,
          step5CompletedAt: currentOnboarding?.step5CompletedAt || null,
          step6StartedAt: currentOnboarding?.step6StartedAt || null,
          step6LastReviewAt: currentOnboarding?.step6LastReviewAt || null,
          updatedBy: currentOnboarding?.updatedBy || "HR Manager",
          updatedAt: currentOnboarding?.updatedAt || new Date().toISOString(),
          notes: currentOnboarding?.notes || "",
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
    const employee = employees.find((entry) => entry.id === employeeId);
    if (!employee) {
      alert("Unable to save HR policy sign-off: Employee not found");
      return;
    }

    const currentOnboarding = employee.onboarding;
    const step3Completed = payload.forms.every((form) => form.status === "Approved");

    const response = await fetch(`/api/employees/${employeeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...employee,
        onboarding: {
          checklistAssigned: currentOnboarding?.checklistAssigned || false,
          enrolled: currentOnboarding?.checklistAssigned || false,
          step1Completed: currentOnboarding?.step1Completed || false,
          systemAccess: currentOnboarding?.systemAccess || {
            gmail: false,
            clickup: false,
            moodle: false,
            googleDrive: false,
          },
          step2Completed: currentOnboarding?.step2Completed || false,
          step2Forms: currentOnboarding?.step2Forms || [],
          step3Completed,
          step3Forms: payload.forms,
          step4Completed: currentOnboarding?.step4Completed || false,
          step4Forms: currentOnboarding?.step4Forms || [],
          step5Completed: currentOnboarding?.step5Completed || false,
          step6AnnualTracking: currentOnboarding?.step6AnnualTracking || false,
          step2CompletedAt: currentOnboarding?.step2CompletedAt || null,
          step3CompletedAt: step3Completed
            ? currentOnboarding?.step3CompletedAt || new Date().toISOString()
            : null,
          step4CompletedAt: currentOnboarding?.step4CompletedAt || null,
          step5CompletedAt: currentOnboarding?.step5CompletedAt || null,
          step6StartedAt: currentOnboarding?.step6StartedAt || null,
          step6LastReviewAt: currentOnboarding?.step6LastReviewAt || null,
          updatedBy: currentOnboarding?.updatedBy || "HR Manager",
          updatedAt: currentOnboarding?.updatedAt || new Date().toISOString(),
          notes: currentOnboarding?.notes || "",
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
    const employee = employees.find((entry) => entry.id === employeeId);
    if (!employee) {
      alert("Unable to save trainings: Employee not found");
      return;
    }

    const currentOnboarding = employee.onboarding;
    const step4Completed = payload.forms.every((form) => form.status === "Approved");

    const response = await fetch(`/api/employees/${employeeId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...employee,
        onboarding: {
          checklistAssigned: currentOnboarding?.checklistAssigned || false,
          enrolled: currentOnboarding?.checklistAssigned || false,
          step1Completed: currentOnboarding?.step1Completed || false,
          systemAccess: currentOnboarding?.systemAccess || {
            gmail: false,
            clickup: false,
            moodle: false,
            googleDrive: false,
          },
          step2Completed: currentOnboarding?.step2Completed || false,
          step2Forms: currentOnboarding?.step2Forms || [],
          step3Completed: currentOnboarding?.step3Completed || false,
          step3Forms: currentOnboarding?.step3Forms || [],
          step4Completed,
          step4Forms: payload.forms,
          step5Completed: currentOnboarding?.step5Completed || false,
          step6AnnualTracking: currentOnboarding?.step6AnnualTracking || false,
          step2CompletedAt: currentOnboarding?.step2CompletedAt || null,
          step3CompletedAt: currentOnboarding?.step3CompletedAt || null,
          step4CompletedAt: step4Completed
            ? currentOnboarding?.step4CompletedAt || new Date().toISOString()
            : null,
          step5CompletedAt: currentOnboarding?.step5CompletedAt || null,
          step6StartedAt: currentOnboarding?.step6StartedAt || null,
          step6LastReviewAt: currentOnboarding?.step6LastReviewAt || null,
          updatedBy: currentOnboarding?.updatedBy || "HR Manager",
          updatedAt: currentOnboarding?.updatedAt || new Date().toISOString(),
          notes: currentOnboarding?.notes || "",
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.details || errorData.error || "Failed to update trainings");
    }

    await fetchEmployees();
  };

  const handleAddWeeklyRecord = () => {
    setEditingWeeklyRecord(null);
    setShowWeeklyRecordForm(true);
  };

  const handleEditWeeklyRecord = (record: WeeklyRecord, index: number) => {
    setEditingWeeklyRecord({ record, index });
    setShowWeeklyRecordForm(true);
  };

  const handleDeleteWeeklyRecord = async (index: number) => {
    if (window.confirm("are you sure?")) {
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

          // Refetch employees to get the updated data - stay on same employee
          await fetchEmployees();
        } catch (error) {
          console.error("Error deleting weekly record:", error);
          alert("Failed to delete record");
        }
      }
    }
  };

  const handleUpdateOverdueTasks = async (recordId: string, details: TaskDetail[]) => {
    try {
      const record = selectedEmployee?.weeklyRecords.find(
        (r) => r.recordId === recordId
      );

      if (!record) {
        alert("Unable to update overdue tasks: Record not found");
        return;
      }

      const totalOverdue = (details || []).reduce(
        (sum: number, detail: TaskDetail) => sum + (detail?.count || 0),
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

  const handleUpdateAssignedTasks = async (recordId: string, details: TaskDetail[]) => {
    try {
      const record = selectedEmployee?.weeklyRecords.find(
        (r) => r.recordId === recordId
      );

      if (!record) {
        alert("Unable to update assigned tasks: Record not found");
        return;
      }

      const totalAssigned = (details || []).reduce(
        (sum: number, detail: TaskDetail) => sum + (detail?.count || 0),
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
        const errorData = await response.json().catch(() => ({}));
        const message = errorData.details
          ? `${errorData.error || "Failed to update assigned tasks"}: ${errorData.details}`
          : errorData.error || "Failed to update assigned tasks";
        throw new Error(message);
      }

      await fetchEmployees();
    } catch (error) {
      console.error("Error updating assigned tasks:", error);
      console.error(
        "Assigned tasks update failed:",
        error instanceof Error ? error.message : String(error)
      );
    }
  };
  const handleUpdateAllOverdueTasks = async (recordId: string, details: TaskDetail[]) => {
    try {
      const record = selectedEmployee?.weeklyRecords.find(
        (r) => r.recordId === recordId
      );

      if (!record) {
        alert("Unable to update all overdue tasks: Record not found");
        return;
      }

      const totalAllOverdue = (details || []).reduce(
        (sum: number, detail: TaskDetail) => sum + (detail?.count || 0),
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
  const handleSaveWeeklyRecord = async (record: WeeklyRecord) => {
    try {
      if (selectedEmployee) {
        let focusStartDate: string | undefined;
        let focusEndDate: string | undefined;

        if (editingWeeklyRecord) {
          const existingRecord =
            selectedEmployee.weeklyRecords[editingWeeklyRecord.index];
          const recordId = existingRecord?.recordId || record.recordId;

          if (!recordId) {
            alert("Unable to update record: Record ID not found");
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
            const errorDetails = errorData.details || errorData.message;
            const message = errorDetails
              ? `${errorData.error || "Failed to update weekly record"}: ${errorDetails}`
              : errorData.error || "Failed to update weekly record";
            throw new Error(message);
          }

          await fetchEmployees();
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
            throw new Error(message);
          }
          await fetchEmployees();
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
      alert(message);
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
  const filteredWeekRanges = getFilteredWeekRanges();
  const uniqueFilteredWeekRanges = filteredWeekRanges.filter(
    (week, index, arr) => arr.findIndex((item) => item.range === week.range) === index
  );

  useEffect(() => {
    if (
      selectedWeekFilter &&
      !uniqueFilteredWeekRanges.some((week) => week.range === selectedWeekFilter)
    ) {
      setSelectedWeekFilter(null);
    }
  }, [selectedWeekFilter, uniqueFilteredWeekRanges]);

  useEffect(() => {
    if (isEmployeePerspective) {
      setSelectedEmployeeId(employeeContext?.employeeId || null);
      setSelectedEmployeeForPerformance(employeeContext?.employeeId || null);
    }
  }, [employeeContext?.employeeId, isEmployeePerspective]);

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 px-4 py-16">
        <div className="mx-auto max-w-2xl rounded-3xl border border-rose-200 bg-white p-8 shadow-lg">
          <h1 className="text-3xl font-bold text-rose-700">Access Error</h1>
          <p className="mt-4 text-gray-700">{currentUserError}</p>
          <p className="mt-2 text-sm text-gray-500">
            Your Google account must match an active employee record before the application can load.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-linear-to-r from-blue-300 to-purple-300 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-bold mb-2">HR Management</h1>
          <p className="text-white opacity-90">
            Monitor employee performance, tasks, and work hours
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Navigation Tabs */}
        <div className="flex gap-4 mb-8 flex-wrap">
          {isEmployeePerspective ? (
            <>
              {allowedViews.has("my-employee-card") && (
                <button
                  onClick={() => setVisibleView("my-employee-card")}
                  aria-current={activeView === "my-employee-card" ? "page" : undefined}
                  className={getTopNavigationTabClass(activeView === "my-employee-card", "blue")}
                >
                  👤 My Employee Card
                </button>
              )}
              <button
                onClick={() => setVisibleView("professional-development")}
                aria-current={activeView === "professional-development" ? "page" : undefined}
                className={getTopNavigationTabClass(activeView === "professional-development", "amber")}
              >
                🎓 Training & Compliance
              </button>
              {allowedViews.has("manage-performance") && (
                <button
                  onClick={() => setVisibleView("manage-performance")}
                  aria-current={activeView === "manage-performance" ? "page" : undefined}
                  className={getTopNavigationTabClass(activeView === "manage-performance", "purple")}
                >
                  📈 Performance
                </button>
              )}
              {allowedViews.has("time-off") && (
                <button
                  onClick={() => setVisibleView("time-off")}
                  aria-current={activeView === "time-off" ? "page" : undefined}
                  className={getTopNavigationTabClass(activeView === "time-off", "emerald")}
                >
                  🗓️ Leave & Holidays
                </button>
              )}
            </>
          ) : (
            <>
              {allowedViews.has("my-employee-card") && (
                <button
                  onClick={() => setVisibleView("my-employee-card")}
                  aria-current={activeView === "my-employee-card" ? "page" : undefined}
                  className={getTopNavigationTabClass(activeView === "my-employee-card", "blue")}
                >
                  👤 My Employee Card
                </button>
              )}
              {allowedViews.has("dashboard") && (
                <button
                  onClick={() => {
                    setVisibleView("dashboard");
                    setSelectedEmployeeId(null);
                  }}
                  aria-current={activeView === "dashboard" ? "page" : undefined}
                  className={getTopNavigationTabClass(activeView === "dashboard", "blue")}
                >
                  📊 Dashboard
                </button>
              )}
              {allowedViews.has("employees") && (
                <button
                  onClick={() => setVisibleView("employees")}
                  aria-current={["employees", "manage", "offboard-employees"].includes(activeView) ? "page" : undefined}
                  className={getTopNavigationTabClass(["employees", "manage", "offboard-employees"].includes(activeView), "blue")}
                >
                  👥 Employee
                </button>
              )}
              {allowedViews.has("manage-performance") && (
                <button
                  onClick={() => {
                    setVisibleView("manage-performance");
                    setSelectedEmployeeId(null);
                  }}
                  aria-current={activeView === "manage-performance" ? "page" : undefined}
                  className={getTopNavigationTabClass(activeView === "manage-performance", "purple")}
                >
                  📈 Performance
                </button>
              )}
              {allowedViews.has("incident-tracking") && (
                <button
                  onClick={() => {
                    setVisibleView("incident-tracking");
                    setSelectedEmployeeId(null);
                  }}
                  aria-current={activeView === "incident-tracking" ? "page" : undefined}
                  className={getTopNavigationTabClass(activeView === "incident-tracking", "red")}
                >
                  ⚠️ Corrective Actions
                </button>
              )}
              {allowedViews.has("professional-development") && (
                <button
                  onClick={() => {
                    setVisibleView("professional-development");
                    setSelectedEmployeeId(null);
                  }}
                  aria-current={activeView === "professional-development" ? "page" : undefined}
                  className={getTopNavigationTabClass(activeView === "professional-development", "amber")}
                >
                  🎓 Training & Compliance
                </button>
              )}
              {allowedViews.has("time-off") && (
                <button
                  onClick={() => {
                    setVisibleView("time-off");
                    setSelectedEmployeeId(null);
                  }}
                  aria-current={activeView === "time-off" ? "page" : undefined}
                  className={getTopNavigationTabClass(activeView === "time-off", "emerald")}
                >
                  🗓️ Leave & Holidays
                </button>
              )}
              {allowedViews.has("employee-lifecycle") && (
                <button
                  onClick={() => {
                    setVisibleView("employee-lifecycle");
                    setSelectedEmployeeId(null);
                  }}
                  aria-current={["employee-lifecycle", "preboarding", "onboarding", "offboarding"].includes(activeView) ? "page" : undefined}
                  className={getTopNavigationTabClass(["employee-lifecycle", "preboarding", "onboarding", "offboarding"].includes(activeView), "teal")}
                >
                  👥 Employee Lifecycle
                </button>
              )}
            </>
          )}
        </div>

        {!isEmployeePerspective && (activeView === "employees" || activeView === "manage" || activeView === "offboard-employees") && (
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
                  setActiveView("offboard-employees");
                  setSelectedEmployeeId(null);
                }}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  activeView === "offboard-employees"
                    ? "bg-slate-700 text-white shadow"
                    : "bg-slate-50 text-slate-800 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                Off-board Employees
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

        {!isEmployeePerspective && allowedViews.has("employee-lifecycle") && (activeView === "employee-lifecycle" || activeView === "preboarding" || activeView === "onboarding" || activeView === "offboarding") && (
          <div className="mb-8 rounded-xl border border-teal-200 bg-white/90 shadow-sm p-3 sm:p-4">
            <div className="text-xs font-semibold tracking-wide text-teal-700 uppercase mb-3">
              Employee Lifecycle
            </div>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => {
                  setActiveView("preboarding");
                  setSelectedEmployeeId(null);
                  setLastCreatedEmployeeId(null);
                }}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  activeView === "preboarding"
                    ? "bg-sky-600 text-white shadow"
                    : "bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100"
                }`}
              >
                New Hire Preboarding
              </button>
              <button
                onClick={() => {
                  setActiveView("onboarding");
                  setSelectedEmployeeId(null);
                }}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  activeView === "onboarding"
                    ? "bg-cyan-500 text-white shadow"
                    : "bg-cyan-50 text-cyan-800 border border-cyan-200 hover:bg-cyan-100"
                }`}
              >
                Onboarding
              </button>
              <button
                onClick={() => {
                  setActiveView("offboarding");
                  setSelectedEmployeeId(null);
                }}
                className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                  activeView === "offboarding"
                    ? "bg-rose-500 text-white shadow"
                    : "bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100"
                }`}
              >
                Off-boarding
              </button>
            </div>
          </div>
        )}

        {!isEmployeePerspective && allowedViews.has("employee-lifecycle") && activeView === "employee-lifecycle" && (
          <div className="rounded-xl border border-teal-200 bg-white shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Employee Lifecycle</h2>
            <p className="text-gray-600">
              Select a lifecycle process above to manage preboarding, onboarding, or off-boarding for employees.
            </p>
          </div>
        )}

        {/* Dashboard View */}
        {!isEmployeePerspective && activeView === "dashboard" && (
          <PerformanceDashboard employees={activeEmployees} />
        )}

        {/* Employees View */}
        {!isEmployeePerspective && activeView === "employees" && (
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
              {[...employeeRecordsVisibleToViewer]
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
                  actionLabel={isHrAdmin(effectiveRole) ? "Edit Employee Detail" : "View Employee Detail"}
                  onSelect={(employeeId: string) => {
                    setSelectedEmployeeId(employeeId);
                    const selected = activeEmployees.find((item) => item.id === employeeId);
                    if (selected) {
                      if (isHrAdmin(effectiveRole)) {
                        handleEditEmployee(selected);
                      } else {
                        handleViewEmployee(selected);
                      }
                    }
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {!isEmployeePerspective && activeView === "offboard-employees" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Off-board Employees</h2>
              <p className="text-gray-600">
                Completed off-boarding records are kept here for lookup. These employees are hidden from active dashboards and operational modules.
              </p>
            </div>

            {offboardEmployees.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-600">
                No completed off-board employees yet.
              </div>
            ) : (
              <>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Employee Cards</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...offboardEmployees]
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
                            setSelectedOffboardEmployeeId(employeeId);
                          }}
                        />
                      ))}
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Performance Report Employee
                  </label>
                  <select
                    value={selectedOffboardEmployeeId || ""}
                    onChange={(e) => setSelectedOffboardEmployeeId(e.target.value || null)}
                    className="w-full md:w-md px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-slate-300"
                  >
                    <option value="">Choose an off-board employee...</option>
                    {[...offboardEmployees]
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

                {selectedOffboardEmployee && (
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Performance Reports</h3>
                    <MonthlyPerformanceReport
                      employee={selectedOffboardEmployee}
                      year={selectedYear}
                      month={selectedMonth}
                    />
                  </div>
                )}

                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Mistakes & Warnings</h3>
                  <IncidentTrackingTable employees={offboardEmployees} />
                </div>
              </>
            )}
          </div>
        )}

        {/* Manage Employees View */}
        {!isEmployeePerspective && activeView === "manage" && (
          <div>
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-start">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Employee Management
                </h2>
                <p className="text-gray-600">
                  Add, edit, or delete employees from your organization
                </p>
                {lastCreatedEmployeeId && (
                  <div className="mt-4 rounded-3xl border border-sky-200 bg-sky-50 p-4 text-slate-900 shadow-sm">
                    <p className="font-semibold text-slate-900">
                      New employee {lastCreatedEmployeeId} created successfully.
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      Start the New Hire Preboarding Internal SOP for this employee.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveView("preboarding");
                        setSelectedEmployeeId(lastCreatedEmployeeId);
                        setLastCreatedEmployeeId(null);
                      }}
                      className="mt-3 inline-flex items-center justify-center rounded-2xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 transition-colors"
                    >
                      Start New Hire Preboarding Internal SOP
                    </button>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                {isHrAdmin(employeeContext?.systemRole) && (
                  <>
                    <button
                      onClick={handleAddEmployee}
                      className="bg-green-300 text-white font-semibold py-2 px-6 rounded-lg hover:bg-green-400 transition-colors"
                    >
                      + Add New Employee
                    </button>
                    <button
                      onClick={() => setShowDepartmentManager(true)}
                      className="bg-purple-300 text-white font-semibold py-2 px-6 rounded-lg hover:bg-purple-400 transition-colors"
                    >
                      ⚙️ Manage Departments
                    </button>
                  </>
                )}
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
                    {employeeRecordsVisibleToViewer.map((employee) => (
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2 flex">
                          {isHrAdmin(effectiveRole) ? (
                            <button
                              onClick={() => handleEditEmployee(employee)}
                              className="bg-blue-300 text-white px-3 py-1 rounded hover:bg-blue-400 transition-colors"
                            >
                              Edit
                            </button>
                          ) : (
                            <button
                              onClick={() => handleViewEmployee(employee)}
                              className="bg-slate-200 text-slate-700 px-3 py-1 rounded hover:bg-slate-300 transition-colors"
                            >
                              View
                            </button>
                          )}
                          {isHrAdmin(employeeContext?.systemRole) && (
                            <button
                              onClick={() => handleDeleteEmployee(employee.id)}
                              className="bg-red-300 text-white px-3 py-1 rounded hover:bg-red-400 transition-colors"
                            >
                              Delete
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
        {allowedViews.has("manage-performance") && activeView === "manage-performance" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6 print:shadow-none">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 print:hidden">
                {isHrAdmin(effectiveRole) ? "Manage Employee Performance" : "Employee Performance"}
              </h2>
              {!isHrAdmin(effectiveRole) && (
                <p className="mb-6 text-sm text-slate-600 print:hidden">
                  Performance records are view-only. Only HR Admin can add or edit records.
                </p>
              )}

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
                </div>

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
              {!isEmployee(effectiveRole) && (
              <div className="mb-6 print:hidden">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Employee
                </label>
                <select
                  value={performanceEmployeeId}
                  onChange={(e) => {
                    setSelectedEmployeeForPerformance(e.target.value);
                    setSelectedEmployeeId(e.target.value || null);
                  }}
                  className="w-full px-4 py-2 border border-blue-300 rounded-lg bg-blue-50 text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-300"
                >
                  <option value="">Choose an employee...</option>
                  {[...employeeRecordsVisibleToViewer]
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
              )}

              {/* If employee selected, show their performance management */}
              {performanceEmployeeId &&
                employeeRecordsVisibleToViewer.find((e) => e.id === performanceEmployeeId) && (
                  <div className="space-y-6">
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200 print:hidden">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {`${
                              employeeRecordsVisibleToViewer.find(
                                (e) => e.id === performanceEmployeeId
                              )?.name
                            }'s ${
                              performanceView === "weekly"
                                ? "Weekly Performance Records"
                                : "Monthly Performance Report"
                            }`}
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

                    {(() => {
                      const selectedEmp = employeeRecordsVisibleToViewer.find(
                        (e) => e.id === performanceEmployeeId
                      );
                      const canManagePerf = Boolean(
                        selectedEmp &&
                        isHrAdmin(effectiveRole)
                      );

                      return performanceView === "weekly" && selectedEmp ? (
                        <WeeklyRecordsTable
                          employee={selectedEmp}
                          timeOffRequests={activeTimeOffRequests.filter(
                            (request) => request.employeeId === performanceEmployeeId
                          )}
                          holidays={holidays}
                          selectedYear={selectedYear}
                          selectedMonth={selectedMonth}
                          selectedWeekRange={selectedWeekFilter}
                          onAddRecord={canManagePerf ? () => {
                            setSelectedEmployeeId(selectedEmployeeForPerformance);
                            handleAddWeeklyRecord();
                          } : undefined}
                          onEditRecord={canManagePerf ? handleEditWeeklyRecord : undefined}
                          onDeleteRecord={canManagePerf ? handleDeleteWeeklyRecord : undefined}
                          onUpdateOverdueTasks={canManagePerf ? handleUpdateOverdueTasks : undefined}
                          onUpdateAssignedTasks={canManagePerf ? handleUpdateAssignedTasks : undefined}
                          onUpdateAllOverdueTasks={canManagePerf ? handleUpdateAllOverdueTasks : undefined}
                        />
                      ) : null;
                    })()}

                    {performanceView === "monthly" && employeeRecordsVisibleToViewer.find((e) => e.id === performanceEmployeeId) && (
                      <MonthlyPerformanceReport
                        employee={
                          employeeRecordsVisibleToViewer.find(
                            (e) => e.id === performanceEmployeeId
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

        {!isEmployeePerspective && activeView === "onboarding" && (
          <OnboardingModule
            employees={activeEmployees}
            onSaveStep1={handleSaveOnboardingStep1}
            onSaveStep2={handleSaveOnboardingStep2}
            onSaveStep3={handleSaveOnboardingStep3}
            onSaveStep4={handleSaveOnboardingStep4}
          />
        )}

        {!isEmployeePerspective && activeView === "preboarding" && (
          <NewHirePreboardingSOP
            key={selectedEmployeeId || "preboarding"}
            employees={activeEmployees}
            activeEmployees={activeEmployees}
            eligibleEmployees={preboardingCandidates}
            selectedEmployeeId={selectedEmployeeId}
            onSelectEmployee={(employeeId: string | null) => setSelectedEmployeeId(employeeId)}
          />
        )}

        {!isEmployeePerspective && activeView === "offboarding" && (
          <OffboardingModule employees={employees} onRecordsChanged={fetchOffboardingRecords} />
        )}

        {activeView === "professional-development" && (
          effectiveRole !== "HR Admin" ? (
            <EmployeeTrainingAssignmentsView />
          ) : (
            <div className="space-y-4">
              {employeeContext && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Training & Compliance
                  </div>
                  <div className="mt-1 text-sm text-slate-700">
                    Viewing as <span className="font-semibold text-slate-900">Admin</span>. Course management is available here; assigned training is for employees, managers, and executives.
                  </div>
                </div>
              )}
              <TrainingProgramsManager viewMode={viewMode} />
            </div>
          )
        )}

        {!isEmployeePerspective && activeView === "incident-tracking" && (
          <IncidentTrackingTable employees={employeeRecordsVisibleToViewer} />
        )}

        {activeView === "my-employee-card" && currentEmployeeRecord && (
          <MyEmployeeCard employee={currentEmployeeRecord} />
        )}

        {activeView === "time-off" && (
          <TimeOffManager
            employees={employeeRecordsVisibleToViewer}
            requests={isEmployeePerspective && currentEmployeeRecord ? activeTimeOffRequests.filter((request) => request.employeeId === currentEmployeeRecord.id) : activeTimeOffRequests}
            holidays={holidays}
            selectedYear={selectedYear}
            mode={isEmployeePerspective ? "employee" : "admin"}
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
            setIsReadOnlyEmployee(false);
          }}
          departments={departments}
          employees={activeEmployees}
          canEditSystemRole={isHrAdmin(employeeContext?.systemRole)}
          readOnly={isReadOnlyEmployee}
          hideSalaryFields={isManager(effectiveRole) || isExecutive(effectiveRole)}
        />
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
