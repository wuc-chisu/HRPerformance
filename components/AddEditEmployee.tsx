"use client";

import { useState } from "react";
import { Employee } from "@/lib/employees";

interface AddEditEmployeeProps {
  employee?: Employee;
  onSave: (employee: Employee) => void;
  onCancel: () => void;
  departments?: string[];
}

export default function AddEditEmployee({
  employee,
  onSave,
  onCancel,
  departments = [
    "Engineering",
    "Product",
    "Design",
    "Marketing",
    "HR",
    "Finance",
    "Operations",
  ],
}: AddEditEmployeeProps) {
  const [formData, setFormData] = useState({
    id: employee?.id || "",
    name: employee?.name || "",
    department: employee?.department || "",
    position: employee?.position || "",
    joinDate: employee?.joinDate || "",
    overallOverdueTasks: employee?.overallOverdueTasks || 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.id.trim()) newErrors.id = "Employee ID is required";
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.department) newErrors.department = "Department is required";
    if (!formData.position.trim()) newErrors.position = "Position/Title is required";
    if (!formData.joinDate) newErrors.joinDate = "Hire date is required";

    // Validate date format
    if (formData.joinDate) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(formData.joinDate)) {
        newErrors.joinDate = "Date must be in YYYY-MM-DD format";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const newEmployee: Employee = {
        ...formData,
        weeklyRecords: employee?.weeklyRecords || [],
      };
      onSave(newEmployee);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "overallOverdueTasks" ? parseInt(value) || 0 : value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-300 to-blue-400 px-6 py-4 sticky top-0">
          <h2 className="text-2xl font-bold text-white">
            {employee ? "Edit Employee" : "Add New Employee"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Employee ID */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Employee ID *
            </label>
            <input
              type="text"
              name="id"
              value={formData.id}
              onChange={handleChange}
              disabled={!!employee}
              placeholder="e.g., EMP-001"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                errors.id
                  ? "border-red-500 bg-red-50"
                  : "border-gray-300 bg-gray-50"
              } ${employee ? "opacity-50 cursor-not-allowed" : ""}`}
            />
            {errors.id && (
              <p className="text-red-600 text-sm mt-1">{errors.id}</p>
            )}
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Employee Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., John Smith"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                errors.name
                  ? "border-red-500 bg-red-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
            />
            {errors.name && (
              <p className="text-red-600 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          {/* Department and Position in 2 columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Department */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Department *
              </label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                  errors.department
                    ? "border-red-500 bg-red-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              {errors.department && (
                <p className="text-red-600 text-sm mt-1">{errors.department}</p>
              )}
            </div>

            {/* Position/Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Position/Title *
              </label>
              <input
                type="text"
                name="position"
                value={formData.position}
                onChange={handleChange}
                placeholder="e.g., Senior Developer"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                  errors.position
                    ? "border-red-500 bg-red-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              />
              {errors.position && (
                <p className="text-red-600 text-sm mt-1">{errors.position}</p>
              )}
            </div>
          </div>

          {/* Hire Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Hire Date *
            </label>
            <input
              type="date"
              name="joinDate"
              value={formData.joinDate}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${
                errors.joinDate
                  ? "border-red-500 bg-red-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
            />
            {errors.joinDate && (
              <p className="text-red-600 text-sm mt-1">{errors.joinDate}</p>
            )}
            <p className="text-gray-500 text-xs mt-1">Format: YYYY-MM-DD</p>
          </div>

          {/* Overall Overdue Tasks */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Overall Overdue Tasks
            </label>
            <input
              type="number"
              name="overallOverdueTasks"
              value={formData.overallOverdueTasks}
              onChange={handleChange}
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            />
            <p className="text-gray-500 text-xs mt-1">
              Number of overdue tasks across all weeks
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex gap-4 pt-4 border-t">
            <button
              type="submit"
              className="flex-1 bg-blue-300 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-400 transition-colors"
            >
              {employee ? "Update Employee" : "Add Employee"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
