"use client";

import { useState, useEffect, useMemo } from "react";
import { Employee, HolidayRecord, OnboardingStep1Update, OnboardingStep2Update, TimeOffRequest, TimeOffStatus, TimeOffType } from "@/lib/employees";
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
import TimeOffManager from "@/components/TimeOffManager";

export default function Home() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [offboardingRecords, setOffboardingRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null
  );
  const [activeView, setActiveView] = useState<
    "dashboard" | "employees" | "manage" | "manage-performance" | "onboarding" | "offboarding" | "incident-tracking" | "time-off"
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
  }, []);

  useEffect(() => {
    fetchHolidays(selectedYear);
  }, [selectedYear]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/employees");
      if (!response.ok) throw new Error("Failed to fetch employees");
      const data = await response.json();
      setEmployees(data);
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
          throw new Error(errorData.details || "Failed to update employee");
        }
      } else {
        // Add new employee - transform id to employeeId for API
        const employeeData = {
          employeeId: employee.id,
          name: employee.name,
          email: employee.email,
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
        };
        const response = await fetch("/api/employees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(employeeData),
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to create employee");
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
          step3Completed: currentOnboarding?.step3Completed || false,
          step4Completed: currentOnboarding?.step4Completed || false,
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
    const step2Completed = payload.forms.every((form) => form.status === "Approved");

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
          step4Completed: currentOnboarding?.step4Completed || false,
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

          // Refetch employees to get the updated data - stay on same employee
          await fetchEmployees();
        } catch (error) {
          console.error("Error deleting weekly record:", error);
          alert("Failed to delete record");
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
  const handleSaveWeeklyRecord = async (record: any) => {
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
            const message = errorData.details
              ? `${errorData.error || "Failed to update weekly record"}: ${errorData.details}`
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

  // Get employee data for selected week
  const getEmployeeWeekData = (employee: Employee, range: string) => {
    const [start, end] = range.split("|");
    return employee.weeklyRecords.find(
      (r) => r.startDate === start && r.endDate === end
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-300 to-purple-300 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-bold mb-2">HR Performance Review</h1>
          <p className="text-white opacity-90">
            Monitor employee performance, tasks, and work hours
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2 flex">
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
          />
        )}

        {activeView === "offboarding" && (
          <OffboardingModule employees={employees} onRecordsChanged={fetchOffboardingRecords} />
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
