"use client";

import { useState, useEffect } from "react";
import { Employee } from "@/lib/employees";
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

  const handleSaveWeeklyRecord = async (record: any) => {
    try {
      if (selectedEmployee) {
        if (editingWeeklyRecord) {
          // Update existing record - would need record ID from DB
          // For now, just update locally
          const updatedRecords = [...selectedEmployee.weeklyRecords];
          updatedRecords[editingWeeklyRecord.index] = record;
          updatedRecords.sort(
            (a, b) =>
              new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
          );
          setEmployees((prev) =>
            prev.map((e) => {
              if (e.id === selectedEmployee.id) {
                return {
                  ...e,
                  weeklyRecords: updatedRecords,
                };
              }
              return e;
            })
          );
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
          if (!response.ok) throw new Error("Failed to create weekly record");
          await fetchEmployees();
        }
      }
      setShowWeeklyRecordForm(false);
      setEditingWeeklyRecord(null);
    } catch (error) {
      console.error("Error saving weekly record:", error);
      alert("Failed to save weekly record");
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
          {selectedEmployee && (
            <button
              onClick={() => setSelectedEmployeeId(null)}
              className="ml-auto px-4 py-2 bg-red-300 text-white rounded-lg hover:bg-red-400 transition-colors"
            >
              ✕ Close Details
            </button>
          )}
        </div>

        {/* Dashboard View */}
        {activeView === "dashboard" && !selectedEmployee && (
          <PerformanceDashboard employees={employees} />
        )}

        {/* Employees View */}
        {activeView === "employees" && !selectedEmployee && (
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                All Employees
              </h2>
              <p className="text-gray-600 mb-4">
                Select a year, month, and week to view all employee reports
              </p>

              {/* Year and Month Selectors */}
              <div className="mb-4 flex gap-4">
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
                <div className="flex gap-2">
                  {filteredWeekRanges.map((week, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedWeekFilter(week.range)}
                      className={`whitespace-nowrap px-4 py-2 rounded-lg font-semibold transition-all ${
                        selectedWeekFilter === week.range
                          ? "bg-blue-300 text-white shadow-md"
                          : "bg-blue-100 text-gray-700 border border-blue-200 hover:bg-blue-50"
                      }`}
                    >
                      {new Date(week.start).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      -{" "}
                      {new Date(week.end).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Weekly Report Table if week selected */}
            {selectedWeekFilter && (
              <div className="mb-10 bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-gradient-to-r from-purple-300 to-pink-300 px-6 py-4">
                  <h3 className="text-xl font-bold text-white">
                    Weekly Performance Report
                  </h3>
                  <p className="text-purple-100 text-sm mt-1">
                    {new Date(selectedWeekFilter.split("|")[0]).toLocaleDateString()}{" "}
                    to{" "}
                    {new Date(selectedWeekFilter.split("|")[1]).toLocaleDateString()}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Employee
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Department
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Planned Hrs
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Actual Hrs
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Tasks
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                          Overdue
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {employees.map((emp) => {
                        const weekData = getEmployeeWeekData(emp, selectedWeekFilter);
                        if (!weekData) return null;
                        return (
                          <tr key={emp.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {emp.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {emp.department}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {weekData.plannedWorkHours}h
                            </td>
                            <td
                              className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${
                                weekData.actualWorkHours >=
                                weekData.plannedWorkHours
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {weekData.actualWorkHours}h
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {weekData.assignedTasks}
                            </td>
                            <td
                              className={`px-6 py-4 whitespace-nowrap text-sm font-bold ${
                                weekData.weeklyOverdueTasks === 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {weekData.weeklyOverdueTasks}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Employee Cards */}
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Employee Profiles
              </h3>
              <p className="text-gray-600 mb-4">
                Click on any card to view detailed performance records
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {employees.map((employee) => (
                <EmployeeCard
                  key={employee.id}
                  employee={employee}
                  onSelect={setSelectedEmployeeId}
                />
              ))}
            </div>
          </div>
        )}

        {/* Manage Employees View */}
        {activeView === "manage" && !selectedEmployee && (
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
                        Overdue Tasks
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
                          {new Date(employee.joinDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              employee.overallOverdueTasks > 0
                                ? "bg-red-100 text-red-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {employee.overallOverdueTasks}
                          </span>
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

              {/* Employee Selector */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Employee
                </label>
                <select
                  value={selectedEmployeeForPerformance || ""}
                  onChange={(e) => setSelectedEmployeeForPerformance(e.target.value)}
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

                    {/* Add Record Button */}
                    <button
                      onClick={() => {
                        setSelectedEmployeeId(selectedEmployeeForPerformance);
                        handleAddWeeklyRecord();
                      }}
                      className="px-6 py-2 bg-green-300 text-white rounded-lg hover:bg-green-400 transition-colors font-semibold"
                    >
                      + Add Weekly Record
                    </button>

                    {/* Weekly Records for Selected Employee */}
                    {employees
                      .find((e) => e.id === selectedEmployeeForPerformance)
                      ?.weeklyRecords && (
                      <div className="bg-white rounded-lg shadow-md overflow-hidden">
                        <div className="bg-gradient-to-r from-purple-300 to-pink-300 px-6 py-4">
                          <h4 className="text-lg font-bold text-white">
                            Performance Records
                          </h4>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-100 border-b">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                                  Week Start
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                                  Week End
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                                  Planned Hours
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                                  Actual Hours
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                                  Tasks
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                                  Overdue
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {employees
                                .find((e) => e.id === selectedEmployeeForPerformance)
                                ?.weeklyRecords.map((record, idx) => (
                                  <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                      {new Date(
                                        record.startDate
                                      ).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                      {new Date(record.endDate).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                      {record.plannedWorkHours}h
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                      {record.actualWorkHours}h
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                      {record.assignedTasks}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                      {record.weeklyOverdueTasks}
                                    </td>
                                    <td className="px-6 py-4 text-sm space-x-2">
                                      <button
                                        onClick={() => {
                                          setSelectedEmployeeId(
                                            selectedEmployeeForPerformance
                                          );
                                          handleEditWeeklyRecord(record, idx);
                                        }}
                                        className="px-3 py-1 bg-blue-300 text-white rounded hover:bg-blue-400 transition-colors"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSelectedEmployeeId(
                                            selectedEmployeeForPerformance
                                          );
                                          handleDeleteWeeklyRecord(idx);
                                        }}
                                        className="px-3 py-1 bg-red-300 text-white rounded hover:bg-red-400 transition-colors"
                                      >
                                        Delete
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="bg-blue-50 px-6 py-4 border-t border-blue-200">
                          <p className="text-sm text-gray-600">
                            Total Records: {
                              employees.find(
                                (e) => e.id === selectedEmployeeForPerformance
                              )?.weeklyRecords.length || 0
                            }
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>
        )}

        {/* Selected Employee Details */}
        {selectedEmployee && activeView === "employees" && (
          <div className="space-y-6">
            <button
              onClick={() => setSelectedEmployeeId(null)}
              className="px-4 py-2 bg-purple-200 text-gray-700 rounded-lg hover:bg-purple-300 transition-colors"
            >
              ← Back to List
            </button>
            <WeeklyRecordsTable
              employee={selectedEmployee}
              onAddRecord={handleAddWeeklyRecord}
              onEditRecord={handleEditWeeklyRecord}
              onDeleteRecord={handleDeleteWeeklyRecord}
            />
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
