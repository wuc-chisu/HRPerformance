"use client";

import { useState } from "react";
import { WeeklyRecord } from "@/lib/employees";

interface AddEditWeeklyRecordProps {
  record?: WeeklyRecord;
  onSave: (record: WeeklyRecord) => void;
  onCancel: () => void;
}

export default function AddEditWeeklyRecord({
  record,
  onSave,
  onCancel,
}: AddEditWeeklyRecordProps) {
  const hasAssignedDetails = Boolean(record?.assignedTasksDetails?.length);
  const hasOverdueDetails = Boolean(record?.overdueTasksDetails?.length);

  const [formData, setFormData] = useState({
    startDate: record?.startDate || new Date().toISOString().split("T")[0],
    endDate:
      record?.endDate ||
      new Date(Date.now() + 6 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
    plannedWorkHours: record?.plannedWorkHours || 40,
    actualWorkHours: record?.actualWorkHours || 40,
    assignedTasks: record?.assignedTasks || 0,
    weeklyOverdueTasks: record?.weeklyOverdueTasks || 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.startDate) newErrors.startDate = "Start date is required";
    if (!formData.endDate) newErrors.endDate = "End date is required";

    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      if (startDate >= endDate) {
        newErrors.endDate = "End date must be after start date";
      }
    }

    if (formData.plannedWorkHours < 0)
      newErrors.plannedWorkHours = "Planned hours cannot be negative";
    if (formData.plannedWorkHours > 168)
      newErrors.plannedWorkHours = "Planned hours cannot exceed 168";
    if (formData.actualWorkHours < 0)
      newErrors.actualWorkHours = "Actual hours cannot be negative";
    if (formData.actualWorkHours > 168)
      newErrors.actualWorkHours = "Actual hours cannot exceed 168";
    if (formData.assignedTasks < 0)
      newErrors.assignedTasks = "Assigned tasks cannot be negative";
    if (formData.weeklyOverdueTasks < 0)
      newErrors.weeklyOverdueTasks = "Weekly overdue tasks cannot be negative";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: ["startDate", "endDate"].includes(name)
        ? value
        : Math.max(0, parseInt(value) || 0),
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
        <div className="bg-gradient-to-r from-purple-300 to-pink-300 px-6 py-4 sticky top-0">
          <h2 className="text-2xl font-bold text-white">
            {record ? "Edit Weekly Record" : "Add Weekly Record"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Week Range - Start and End Dates */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Week Range *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Start Date */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition ${
                    errors.startDate
                      ? "border-red-500 bg-red-50"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                />
                {errors.startDate && (
                  <p className="text-red-600 text-sm mt-1">{errors.startDate}</p>
                )}
              </div>

              {/* End Date */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition ${
                    errors.endDate
                      ? "border-red-500 bg-red-50"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                />
                {errors.endDate && (
                  <p className="text-red-600 text-sm mt-1">{errors.endDate}</p>
                )}
              </div>
            </div>
          </div>

          {/* Work Hours - 2 columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Planned Hours */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Planned Work Hours *
              </label>
              <input
                type="number"
                name="plannedWorkHours"
                value={formData.plannedWorkHours}
                onChange={handleChange}
                min="0"
                max="168"
                step="0.5"
                placeholder="e.g., 40"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition ${
                  errors.plannedWorkHours
                    ? "border-red-500 bg-red-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              />
              {errors.plannedWorkHours && (
                <p className="text-red-600 text-sm mt-1">
                  {errors.plannedWorkHours}
                </p>
              )}
            </div>

            {/* Actual Hours */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Actual Work Hours *
              </label>
              <input
                type="number"
                name="actualWorkHours"
                value={formData.actualWorkHours}
                onChange={handleChange}
                min="0"
                max="168"
                step="0.5"
                placeholder="e.g., 40"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition ${
                  errors.actualWorkHours
                    ? "border-red-500 bg-red-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              />
              {errors.actualWorkHours && (
                <p className="text-red-600 text-sm mt-1">
                  {errors.actualWorkHours}
                </p>
              )}
            </div>
          </div>

          {/* Tasks - 2 columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Assigned Tasks */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Assigned Tasks *
              </label>
              <input
                type="number"
                name="assignedTasks"
                value={formData.assignedTasks}
                onChange={handleChange}
                disabled={Boolean(record) && hasAssignedDetails}
                min="0"
                placeholder="e.g., 8"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition ${
                  errors.assignedTasks
                    ? "border-red-500 bg-red-50"
                    : Boolean(record) && hasAssignedDetails
                      ? "border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed"
                      : "border-gray-300 hover:border-gray-400"
                }`}
              />
              {errors.assignedTasks && (
                <p className="text-red-600 text-sm mt-1">
                  {errors.assignedTasks}
                </p>
              )}
              {Boolean(record) && hasAssignedDetails && (
                <p className="text-xs text-gray-500 mt-1">
                  Assigned task details are set. Edit them via the Assigned Task
                  Manager.
                </p>
              )}
            </div>

            {/* Weekly Overdue Tasks */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Weekly Overdue Tasks *
              </label>
              <input
                type="number"
                name="weeklyOverdueTasks"
                value={formData.weeklyOverdueTasks}
                onChange={handleChange}
                disabled={Boolean(record) && hasOverdueDetails}
                min="0"
                placeholder="e.g., 0"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition ${
                  errors.weeklyOverdueTasks
                    ? "border-red-500 bg-red-50"
                    : Boolean(record) && hasOverdueDetails
                      ? "border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed"
                      : "border-gray-300 hover:border-gray-400"
                }`}
              />
              {errors.weeklyOverdueTasks && (
                <p className="text-red-600 text-sm mt-1">
                  {errors.weeklyOverdueTasks}
                </p>
              )}
              {Boolean(record) && hasOverdueDetails && (
                <p className="text-xs text-gray-500 mt-1">
                  Overdue task details are set. Edit them via the Overdue Task
                  Manager.
                </p>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-4 pt-4 border-t">
            <button
              type="submit"
              className="flex-1 bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
            >
              {record ? "Update Record" : "Add Record"}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
