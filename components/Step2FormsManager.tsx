"use client";

import { useEffect, useState } from "react";

type WorkerType = "Employee" | "Faculty" | "Contractor";
type WorkLocation = "US" | "Taiwan";
type FormTemplate = {
  id: string;
  title: string;
  googleDriveUrl: string;
  displayOrder: number;
  isActive: boolean;
  appliesTo: WorkerType[];
  appliesToLocation: WorkLocation[];
  section: string;
  detailText: string | null;
  allowNotApplicable: boolean;
  canDelete?: boolean;
};
type FormState = Omit<FormTemplate, "id">;

const DEFAULT_FORM: FormState = {
  title: "",
  googleDriveUrl: "",
  displayOrder: 0,
  isActive: true,
  appliesTo: [],
  appliesToLocation: [],
  section: "Staff forms",
  detailText: null,
  allowNotApplicable: false,
};
const WORKER_TYPES: WorkerType[] = ["Employee", "Faculty", "Contractor"];
const WORK_LOCATIONS: WorkLocation[] = ["US", "Taiwan"];

export default function Step2FormsManager({
  viewMode,
  onBack,
  onChanged,
}: {
  viewMode: "admin" | "employee";
  onBack: () => void;
  onChanged: () => void;
}) {
  const [forms, setForms] = useState<FormTemplate[]>([]);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [notice, setNotice] = useState<{
    error: boolean;
    message: string;
  } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/onboarding-step2-forms");
      if (!response.ok) throw new Error("Failed to load forms.");
      setForms(await response.json());
    } catch (error) {
      setNotice({
        error: true,
        message:
          error instanceof Error ? error.message : "Failed to load forms.",
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    const missing: string[] = [];
    if (!form.title.trim()) missing.push("Form Title");
    if (!form.googleDriveUrl.trim()) missing.push("Google Drive URL");
    if (form.appliesTo.length === 0) missing.push("Applies To (select at least one)");
    if (form.appliesToLocation.length === 0) missing.push("Applies To Location (select at least one)");
    if (!Number.isInteger(Number(form.displayOrder)) || Number(form.displayOrder) < 0) missing.push("Display Order");

    if (missing.length > 0) {
      setNotice({
        error: true,
        message: `Please complete the required field(s): ${missing.join(", ")}.`,
      });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(
        editingId
          ? `/api/onboarding-step2-forms/${editingId}`
          : "/api/onboarding-step2-forms",
        {
          method: editingId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            "X-View-Mode": viewMode,
          },
          body: JSON.stringify({
            ...form,
            title: form.title.trim(),
            googleDriveUrl: form.googleDriveUrl.trim(),
            displayOrder: Number(form.displayOrder),
          }),
        },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(payload.error || "Failed to save form.");
      setForms((current) => {
        const next = editingId
          ? current.map((item) => (item.id === editingId ? payload : item))
          : [...current, payload];
        return next.sort(
          (left, right) =>
            left.displayOrder - right.displayOrder ||
            left.title.localeCompare(right.title),
        );
      });
      setSaveSuccess(true);
      onChanged();
      window.setTimeout(() => {
        setShowForm(false);
        setEditingId(null);
        setForm(DEFAULT_FORM);
        setSaveSuccess(false);
        setNotice({ error: false, message: "Form saved successfully." });
      }, 1000);
    } catch (error) {
      setNotice({
        error: true,
        message:
          error instanceof Error ? error.message : "Failed to save form.",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: FormTemplate) => {
    try {
      const response = await fetch(`/api/onboarding-step2-forms/${item.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-View-Mode": viewMode,
        },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(payload.error || "Failed to update form.");
      setForms((current) =>
        current.map((entry) => (entry.id === item.id ? payload : entry)),
      );
      onChanged();
    } catch (error) {
      setNotice({
        error: true,
        message:
          error instanceof Error ? error.message : "Failed to update form.",
      });
    }
  };

  const deleteForm = async (item: FormTemplate) => {
    let force = false;

    if (!item.canDelete) {
      const typed = window.prompt(
        `"${item.title}" has onboarding history. Employees' past submissions will remain, but this form definition will be permanently removed.\n\nType the form title exactly to confirm deletion:`
      );
      if (typed !== item.title) {
        if (typed !== null) {
          setNotice({ error: true, message: "Title did not match. Delete cancelled." });
        }
        return;
      }
      force = true;
    } else if (!window.confirm(`Permanently delete "${item.title}"? This cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/onboarding-step2-forms/${item.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "X-View-Mode": viewMode },
        body: JSON.stringify({ force }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Failed to delete form.");
      setForms((current) => current.filter((entry) => entry.id !== item.id));
      setNotice({ error: false, message: "Form deleted." });
      onChanged();
    } catch (error) {
      setNotice({
        error: true,
        message: error instanceof Error ? error.message : "Failed to delete form.",
      });
    }
  };

  const toggleAppliesTo = (workerType: WorkerType) =>
    setForm((current) => ({
      ...current,
      appliesTo: current.appliesTo.includes(workerType)
        ? current.appliesTo.filter((entry) => entry !== workerType)
        : [...current.appliesTo, workerType],
    }));
  const toggleAppliesToLocation = (location: WorkLocation) =>
    setForm((current) => ({
      ...current,
      appliesToLocation: current.appliesToLocation.includes(location)
        ? current.appliesToLocation.filter((entry) => entry !== location)
        : [...current.appliesToLocation, location],
    }));
  const openEdit = (item: FormTemplate) => {
    setSaveSuccess(false);
    setNotice(null);
    setEditingId(item.id);
    setForm({
      title: item.title,
      googleDriveUrl: item.googleDriveUrl,
      displayOrder: item.displayOrder,
      isActive: item.isActive,
      appliesTo: item.appliesTo || [],
      appliesToLocation: item.appliesToLocation || [],
      section: item.section,
      detailText: item.detailText,
      allowNotApplicable: item.allowNotApplicable,
    });
    setShowForm(true);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h4 className="text-lg font-bold text-gray-900">
            Step 2 - Forms Management
          </h4>
          <p className="text-sm text-gray-600">
            Configure active onboarding forms without removing employee history.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onBack}
            className="border border-gray-300 px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Back to Onboarding
          </button>
          <button
            type="button"
            onClick={() => {
              setSaveSuccess(false);
              setNotice(null);
              setEditingId(null);
              setForm(DEFAULT_FORM);
              setShowForm(true);
            }}
            className="bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-cyan-600"
          >
            + Add Form
          </button>
        </div>
      </div>
      {notice && (
        <p
          className={`mb-4 text-sm font-medium ${notice.error ? "text-red-600" : "text-emerald-600"}`}
        >
          {notice.message}
        </p>
      )}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-cyan-50 text-left text-gray-700">
            <tr>
              <th className="p-3">Order</th>
              <th className="p-3">Form Title</th>
              <th className="p-3">Applies To</th>
              <th className="p-3">Location</th>
              <th className="p-3">Active</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-5 text-center text-gray-500">
                  Loading forms...
                </td>
              </tr>
            ) : (
              forms.map((item) => (
                <tr key={item.id} className="border-t border-gray-100">
                  <td className="p-3">{item.displayOrder}</td>
                  <td className="p-3 font-medium text-gray-900">
                    {item.title}
                  </td>
                  <td className="p-3">{(item.appliesTo || []).join(", ")}</td>
                  <td className="p-3">{(item.appliesToLocation || []).join(", ")}</td>
                  <td className="p-3">
                    <span
                      className={
                        item.isActive ? "text-emerald-700" : "text-gray-500"
                      }
                    >
                      {item.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="text-cyan-700 font-semibold hover:underline mr-3"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleActive(item)}
                      className="text-gray-700 font-semibold hover:underline mr-3"
                    >
                      {item.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteForm(item)}
                      title={item.canDelete ? undefined : "Has onboarding history; deleting requires typing the form title to confirm."}
                      className="text-red-600 font-semibold hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            {saveSuccess && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-white/95 p-6">
                <div className="text-center">
                  <p className="text-lg font-bold text-emerald-700">Form saved successfully.</p>
                  <p className="mt-2 text-sm text-gray-600">This window will close automatically.</p>
                </div>
              </div>
            )}
            <div className="flex justify-between items-center mb-5">
              <h5 className="text-lg font-bold">
                {editingId ? "Edit Form" : "Add Form"}
              </h5>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-gray-500 hover:text-gray-800 text-xl"
                aria-label="Close"
              >
                x
              </button>
            </div>
            {notice && (
              <p
                className={`mb-4 text-sm font-medium ${notice.error ? "text-red-600" : "text-emerald-600"}`}
              >
                {notice.message}
              </p>
            )}
            <div className="space-y-4">
              <label className="block text-sm font-semibold">
                Form Title <span className="text-red-600">*</span>
                <input
                  value={form.title}
                  onChange={(event) =>
                    setForm({ ...form, title: event.target.value })
                  }
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </label>
              <label className="block text-sm font-semibold">
                Google Drive URL <span className="text-red-600">*</span>
                <input
                  type="url"
                  value={form.googleDriveUrl}
                  onChange={(event) =>
                    setForm({ ...form, googleDriveUrl: event.target.value })
                  }
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </label>
              <div>
                <p className="text-sm font-semibold mb-2">
                  Applies To <span className="text-red-600">*</span>
                </p>
                <div className="flex flex-wrap gap-4">
                  {WORKER_TYPES.map((workerType) => (
                    <label
                      key={workerType}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={form.appliesTo.includes(workerType)}
                        onChange={() => toggleAppliesTo(workerType)}
                      />
                      {workerType}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold mb-2">
                  Applies To Location <span className="text-red-600">*</span>
                </p>
                <div className="flex flex-wrap gap-4">
                  {WORK_LOCATIONS.map((location) => (
                    <label
                      key={location}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={form.appliesToLocation.includes(location)}
                        onChange={() => toggleAppliesToLocation(location)}
                      />
                      {location}
                    </label>
                  ))}
                </div>
              </div>
              <label className="block text-sm font-semibold">
                Display Order <span className="text-red-600">*</span>
                <input
                  type="number"
                  min="0"
                  value={form.displayOrder}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      displayOrder: Number(event.target.value),
                    })
                  }
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </label>
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm({ ...form, isActive: event.target.checked })
                  }
                />
                Active
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="border border-gray-300 px-4 py-2 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving || saveSuccess}
                className="bg-cyan-500 text-white px-4 py-2 rounded-lg font-semibold disabled:bg-cyan-300"
              >
                {saving ? "Saving..." : "Save Form"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
