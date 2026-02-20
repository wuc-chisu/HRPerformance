"use client";

import { useState } from "react";
import { AssignedTaskDetail } from "@/lib/employees";

interface AssignedTaskManagerProps {
  assignedTasksDetails: AssignedTaskDetail[];
  onUpdate: (details: AssignedTaskDetail[]) => void;
  onClose: () => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-purple-100 border-purple-300 text-purple-800",
  high: "bg-indigo-100 border-indigo-300 text-indigo-800",
  normal: "bg-blue-100 border-blue-300 text-blue-800",
  low: "bg-teal-100 border-teal-300 text-teal-800",
  "no priority": "bg-gray-100 border-gray-300 text-gray-800",
};

export default function AssignedTaskManager({
  assignedTasksDetails,
  onUpdate,
  onClose,
}: AssignedTaskManagerProps) {
  const [details, setDetails] = useState<AssignedTaskDetail[]>(
    assignedTasksDetails
  );
  const [taskCount, setTaskCount] = useState("");
  const [selectedPriority, setSelectedPriority] = useState<
    "urgent" | "high" | "normal" | "low" | "no priority"
  >("normal");
  const [error, setError] = useState("");

  const priorities = ["urgent", "high", "normal", "low", "no priority"] as const;

  const handleAddTask = () => {
    setError("");

    const count = parseInt(taskCount, 10);
    if (!taskCount || count <= 0) {
      setError("Task count must be a positive number");
      return;
    }

    const existing = details.findIndex((d) => d.priority === selectedPriority);
    if (existing >= 0) {
      const updated = [...details];
      updated[existing].count = count;
      setDetails(updated);
    } else {
      setDetails([...details, { count, priority: selectedPriority }]);
    }

    setTaskCount("");
    setSelectedPriority("normal");
  };

  const handleRemoveTask = (priority: string) => {
    setDetails(details.filter((d) => d.priority !== priority));
  };

  const handleSave = () => {
    onUpdate(details);
    onClose();
  };

  const currentTotal = details.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-300 to-indigo-400 px-6 py-4 sticky top-0">
          <h2 className="text-2xl font-bold text-white">Assigned Tasks Details</h2>
          <p className="text-blue-100 text-sm mt-1">Total: {currentTotal} tasks</p>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm font-semibold text-blue-900 mb-2">How to use:</p>
            <ol className="text-sm text-blue-800 space-y-1 ml-2">
              <li>1. Enter the number of tasks</li>
              <li>2. Select the priority level</li>
              <li>3. Click "Add" to add this task group</li>
            </ol>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Number of Tasks
              </label>
              <input
                type="number"
                min="1"
                value={taskCount}
                onChange={(e) => {
                  setTaskCount(e.target.value);
                  setError("");
                }}
                placeholder="Enter number"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Task Priority
              </label>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
              >
                {priorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleAddTask}
              className="w-full bg-blue-300 text-white px-4 py-2 rounded-lg hover:bg-blue-400 transition-colors font-semibold"
            >
              + Add Task
            </button>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {error}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Current Tasks ({details.length})
            </label>
            <div className="space-y-2 bg-gray-50 p-3 rounded-lg max-h-40 overflow-y-auto">
              {details.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">
                  No tasks added yet
                </p>
              ) : (
                details.map((task) => (
                  <div
                    key={task.priority}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      PRIORITY_COLORS[task.priority]
                    }`}
                  >
                    <div>
                      <p className="font-semibold">{task.count}</p>
                      <p className="text-xs capitalize">{task.priority}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveTask(task.priority)}
                      className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

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
