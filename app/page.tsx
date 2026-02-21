"use client";

import { useState, useEffect } from "react";
import { Employee } from "@/lib/employees";
import { formatCompactDate, formatShortDate } from "@/lib/dateUtils";
import EmployeeCard from "@/components/EmployeeCard";
import WeeklyRecordsTable from "@/components/WeeklyRecordsTable";
import PerformanceDashboard from "@/components/PerformanceDashboard";
import AddEditEmployee from "@/components/AddEditEmployee";
import AddEditWeeklyRecord from "@/components/AddEditWeeklyRecord";
import DepartmentManager from "@/components/DepartmentManager";

export default function Home() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null
  );
  const [activeView, setActiveView] = useState<
    "dashboard" | "employees" | "manage" | "manage-performance"
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

  // Generate available years (current year ± 5 years)
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from(
    { length: 11 },
    (_, i) => currentYear - 5 + i
  );

  // Load employees from API on mount
  useEffect(() => {
    fetchEmployees();
  }, []);

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

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);

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
        const response = await fetch(`/api/employees/${employee.id}`, {
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
          department: employee.department,
          position: employee.position,
          joinDate: employee.joinDate,
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
      }
      setShowWeeklyRecordForm(false);
      setEditingWeeklyRecord(null);
    } catch (error) {
      console.error("Error saving weekly record:", error);
      console.error(
        "Weekly record save failed:",
        error instanceof Error ? error.message : String(error)
      );
    }
  };

  // Get all unique week ranges from all employees
  const getAllWeekRanges = () => {
    const weekRanges = new Set<string>();
    employees.forEach((emp) => {
      emp.weeklyRecords.forEach((record) => {
        weekRanges.add(`${record.startDate}|${record.endDate}`);
      });
    });
    return Array.from(weekRanges)
      .sort((a, b) => new Date(b.split("|")[0]).getTime() - new Date(a.split("|")[0]).getTime())
      .map((range) => {
        const [start, end] = range.split("|");
        return { start, end, range };
      });
  };

  // Filter week ranges by year and month
  const getFilteredWeekRanges = () => {
    return getAllWeekRanges().filter((week) => {
      const startDate = new Date(week.start);
      return (
        startDate.getFullYear() === selectedYear &&
        startDate.getMonth() === selectedMonth
      );
    });
  };

  // Get filtered week ranges for display
  const filteredWeekRanges = getFilteredWeekRanges();

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
            Dashboard
          </button>
          <button
            onClick={() => setActiveView("employees")}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              activeView === "employees"
                ? "bg-blue-300 text-white shadow-md"
                : "bg-blue-100 text-gray-700 border border-blue-200 hover:bg-blue-50"
            }`}
          >
            Employees
          </button>
          <button
            onClick={() => {
              setActiveView("manage");
              setSelectedEmployeeId(null);
            }}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              activeView === "manage"
                ? "bg-blue-300 text-white shadow-md"
                : "bg-blue-100 text-gray-700 border border-blue-200 hover:bg-blue-50"
            }`}
          >
            Manage Employees
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
            Manage Performance
          </button>
        </div>

        {/* Dashboard View */}
        {activeView === "dashboard" && (
          <PerformanceDashboard employees={employees} />
        )}

        {/* Employees View */}
        {activeView === "employees" && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                All Employees
              </h2>
              <p className="text-gray-600 mb-4">
                Click on any card to view detailed performance records or view weekly reports in the Manage Performance tab
              </p>
            </div>

            {/* Employee Cards */}
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Employee Profiles
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {employees.map((employee) => (
                <EmployeeCard
                  key={employee.id}
                  employee={employee}
                  onSelect={setSelectedEmployeeId}
                  onViewPerformance={(employeeId: string) => {
                    setSelectedEmployeeForPerformance(employeeId);
                    setActiveView("manage-performance");
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
                        Department
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
                    {employees.map((employee) => (
                      <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {employee.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {employee.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {employee.department}
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

              {employees.length === 0 && (
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
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Manage Employee Performance
              </h2>

              {/* Year and Month Selectors */}
              <div className="mb-6">
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
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
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
                      onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
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
                    {filteredWeekRanges.map((week, idx) => (
                      <button
                        key={idx}
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
              <div className="mb-6">
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
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* If employee selected, show their performance management */}
              {selectedEmployeeForPerformance &&
                employees.find((e) => e.id === selectedEmployeeForPerformance) && (
                  <div className="space-y-6">
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {
                          employees.find(
                            (e) => e.id === selectedEmployeeForPerformance
                          )?.name
                        }
                        's Weekly Performance Records
                      </h3>
                      <p className="text-sm text-gray-600">
                        Add or edit weekly performance data for this employee
                      </p>
                    </div>

                    {employees.find((e) => e.id === selectedEmployeeForPerformance) && (
                      <WeeklyRecordsTable
                        employee={
                          employees.find(
                            (e) => e.id === selectedEmployeeForPerformance
                          )!
                        }
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
                  </div>
                )}
            </div>
          </div>
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
        />
      )}

      {/* Add/Edit Weekly Record Modal */}
      {showWeeklyRecordForm && (
        <AddEditWeeklyRecord
          record={editingWeeklyRecord?.record || undefined}
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
