"use client";

import { useState } from "react";
import { employees as initialEmployees, Employee } from "@/lib/employees";
import EmployeeCard from "@/components/EmployeeCard";
import WeeklyRecordsTable from "@/components/WeeklyRecordsTable";
import PerformanceDashboard from "@/components/PerformanceDashboard";
import AddEditEmployee from "@/components/AddEditEmployee";

export default function Home() {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null
  );
  const [activeView, setActiveView] = useState<
    "dashboard" | "employees" | "manage"
  >("dashboard");
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showForm, setShowForm] = useState(false);

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);

  const handleAddEmployee = () => {
    setEditingEmployee(null);
    setShowForm(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setShowForm(true);
  };

  const handleSaveEmployee = (employee: Employee) => {
    if (editingEmployee) {
      // Update existing employee
      setEmployees((prev) =>
        prev.map((e) => (e.id === employee.id ? employee : e))
      );
    } else {
      // Add new employee
      setEmployees((prev) => [...prev, employee]);
    }
    setShowForm(false);
    setEditingEmployee(null);
  };

  const handleDeleteEmployee = (employeeId: string) => {
    if (confirm("Are you sure you want to delete this employee?")) {
      setEmployees((prev) => prev.filter((e) => e.id !== employeeId));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-bold mb-2">HR Performance Review</h1>
          <p className="text-blue-100">
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
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveView("employees")}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              activeView === "employees"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
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
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            }`}
          >
            Manage Employees
          </button>
          {selectedEmployee && (
            <button
              onClick={() => setSelectedEmployeeId(null)}
              className="ml-auto px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
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
              <p className="text-gray-600">
                Click on any employee card to view detailed performance records
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
              <button
                onClick={handleAddEmployee}
                className="bg-green-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-green-700 transition-colors"
              >
                + Add New Employee
              </button>
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
                            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteEmployee(employee.id)}
                            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-colors"
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

        {/* Selected Employee Details */}
        {selectedEmployee && (
          <div className="space-y-6">
            <button
              onClick={() => setSelectedEmployeeId(null)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              ← Back to List
            </button>
            <WeeklyRecordsTable employee={selectedEmployee} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
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
        />
      )}
    </div>
  );
}
