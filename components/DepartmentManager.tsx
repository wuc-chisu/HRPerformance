"use client";

import { useState } from "react";

interface DepartmentManagerProps {
  departments: string[];
  onUpdate: (departments: string[]) => void;
  onClose: () => void;
}

export default function DepartmentManager({
  departments,
  onUpdate,
  onClose,
}: DepartmentManagerProps) {
  const [deptList, setDeptList] = useState<string[]>(departments);
  const [newDepartment, setNewDepartment] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAddDepartment = () => {
    const newErrors: Record<string, string> = {};

    if (!newDepartment.trim()) {
      newErrors.newDepartment = "Department name is required";
    } else if (deptList.includes(newDepartment.trim())) {
      newErrors.newDepartment = "Department already exists";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setDeptList([...deptList, newDepartment.trim()]);
    setNewDepartment("");
    setErrors({});
  };

  const handleRemoveDepartment = (index: number) => {
    const updatedList = deptList.filter((_, i) => i !== index);
    setDeptList(updatedList);
  };

  const handleEditDepartment = (index: number, newValue: string) => {
    const updatedList = [...deptList];
    updatedList[index] = newValue;
    setDeptList(updatedList);
  };

  const handleSave = () => {
    if (deptList.length === 0) {
      setErrors({ general: "At least one department must exist" });
      return;
    }
    onUpdate(deptList);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleAddDepartment();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-purple-300 to-purple-400 px-6 py-4 sticky top-0">
          <h2 className="text-2xl font-bold text-white">Manage Departments</h2>
        </div>

        <div className="p-6 space-y-6">
          {/* Add New Department */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">
              Add New Department
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newDepartment}
                onChange={(e) => {
                  setNewDepartment(e.target.value);
                  if (errors.newDepartment) {
                    setErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.newDepartment;
                      return newErrors;
                    });
                  }
                }}
                onKeyPress={handleKeyPress}
                placeholder="Enter department name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
              />
              <button
                onClick={handleAddDepartment}
                className="bg-purple-300 text-white px-4 py-2 rounded-lg hover:bg-purple-400 transition-colors font-semibold"
              >
                Add
              </button>
            </div>
            {errors.newDepartment && (
              <p className="text-sm text-red-600">{errors.newDepartment}</p>
            )}
          </div>

          {/* Departments List */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">
              Current Departments ({deptList.length})
            </label>
            <div className="space-y-2 bg-gray-50 p-4 rounded-lg max-h-64 overflow-y-auto">
              {deptList.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">
                  No departments added yet
                </p>
              ) : (
                deptList.map((dept, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-white p-3 rounded-lg border border-gray-200 hover:border-purple-300 transition-colors"
                  >
                    <input
                      type="text"
                      value={dept}
                      onChange={(e) => handleEditDepartment(index, e.target.value)}
                      className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-300"
                    />
                    <button
                      onClick={() => handleRemoveDepartment(index)}
                      className="bg-red-300 text-white px-3 py-1 rounded hover:bg-red-400 transition-colors text-sm font-semibold"
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {errors.general && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              {errors.general}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleSave}
              className="flex-1 bg-green-300 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-400 transition-colors"
            >
              Save Changes
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
