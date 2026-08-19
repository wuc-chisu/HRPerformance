"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useCurrentUserContext } from "@/components/CurrentUserContextProvider";

type EditorMode = "create" | "edit";

type ModuleItem = {
  id: string;
  title: string;
  description?: string | null;
  moduleType: string;
  displayOrder: number;
  isRequired: boolean;
  status: string;
  contentReference?: string | null;
  contentStorageKey?: string | null;
  contentFileName?: string | null;
  contentMimeType?: string | null;
  contentSizeBytes?: number | null;
};

type FormState = {
  title: string;
  description: string;
  moduleType: string;
  videoSource: "GOOGLE_DRIVE" | "EXTERNAL_URL";
  displayOrder: string;
  isRequired: boolean;
  status: string;
  contentReference: string;
};

const DEFAULT_FORM: FormState = {
  title: "",
  description: "",
  moduleType: "VIDEO",
  videoSource: "GOOGLE_DRIVE",
  displayOrder: "1",
  isRequired: true,
  status: "DRAFT",
  contentReference: "",
};

const MAX_UPLOAD_SIZE_BYTES = 250 * 1024 * 1024;

function isStrictHrAdminInAdminView(systemRole: string | undefined, viewMode: "admin" | "employee") {
  return (systemRole || "").trim().toLowerCase() === "hr admin" && viewMode === "admin";
}

function isValidHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function inferVideoSourceFromUrl(url: string): "GOOGLE_DRIVE" | "EXTERNAL_URL" {
  const normalized = url.trim().toLowerCase();
  return normalized.includes("drive.google.com") ? "GOOGLE_DRIVE" : "EXTERNAL_URL";
}

export default function ModuleEditorPage({
  trainingProgramId,
  moduleId,
  mode,
}: {
  trainingProgramId: string;
  moduleId?: string;
  mode: EditorMode;
}) {
  const { employeeContext, viewMode, loading } = useCurrentUserContext();
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [existingModule, setExistingModule] = useState<ModuleItem | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const canManage = isStrictHrAdminInAdminView(employeeContext?.systemRole, viewMode);

  useEffect(() => {
    if (!canManage || mode !== "edit" || !moduleId) {
      return;
    }

    const fetchModule = async () => {
      setSaving(true);
      try {
        const response = await fetch(`/api/training-programs/${trainingProgramId}/modules/${moduleId}`, {
          headers: {
            "X-View-Mode": viewMode,
          },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error || "Failed to load module.");
        }

        const module = payload as ModuleItem;
        setExistingModule(module);
        setForm({
          title: module.title,
          description: module.description || "",
          moduleType: module.moduleType,
          videoSource: inferVideoSourceFromUrl(module.contentReference || ""),
          displayOrder: String(module.displayOrder),
          isRequired: module.isRequired,
          status: module.status,
          contentReference: module.contentReference || "",
        });
      } catch (requestError) {
        setNotice({
          type: "error",
          message: requestError instanceof Error ? requestError.message : "Failed to load module.",
        });
      } finally {
        setSaving(false);
      }
    };

    void fetchModule();
  }, [canManage, mode, moduleId, trainingProgramId, viewMode]);

  const supportsFileUpload = useMemo(() => {
    return form.moduleType === "DOCUMENT";
  }, [form.moduleType]);

  const videoUrlLabel = form.videoSource === "GOOGLE_DRIVE" ? "Google Drive Video URL" : "Video URL";

  const saveModule = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const normalizedVideoUrl = form.contentReference.trim();
      if (form.moduleType === "VIDEO" && form.status === "ACTIVE") {
        if (!normalizedVideoUrl) {
          throw new Error("Active Video modules require a Video URL.");
        }
        if (!isValidHttpUrl(normalizedVideoUrl)) {
          throw new Error("Video URL must be a valid http(s) link.");
        }
      }

      const normalizedExternalLink = form.contentReference.trim();
      const contentReference =
        form.moduleType === "VIDEO"
          ? normalizedVideoUrl || null
          : form.moduleType === "EXTERNAL_LINK"
            ? normalizedExternalLink || null
            : form.moduleType === "DOCUMENT"
              ? existingModule?.contentReference || null
              : null;

      const payload = {
        title: form.title,
        description: form.description,
        moduleType: form.moduleType,
        displayOrder: Number(form.displayOrder),
        isRequired: form.isRequired,
        status: form.status,
        contentReference,
      };

      const response = await fetch(
        mode === "edit" ? `/api/training-programs/${trainingProgramId}/modules/${moduleId}` : `/api/training-programs/${trainingProgramId}/modules`,
        {
          method: mode === "edit" ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            "X-View-Mode": viewMode,
          },
          body: JSON.stringify(payload),
        }
      );

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error || "Failed to save module.");
      }

      setExistingModule((body as ModuleItem) || existingModule);
      setNotice({ type: "success", message: "Module saved successfully." });

      if (mode === "create") {
        window.location.href = `/training/programs/${trainingProgramId}/content/${(body as ModuleItem).id}/edit`;
      }
    } catch (requestError) {
      setNotice({
        type: "error",
        message: requestError instanceof Error ? requestError.message : "Failed to save module.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (file: File | null) => {
    if (!file || !existingModule) return;

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      const mb = Math.floor(MAX_UPLOAD_SIZE_BYTES / (1024 * 1024));
      setNotice({
        type: "error",
        message: `File is too large. Maximum supported upload size is ${mb} MB.`,
      });
      return;
    }

    setUploading(true);
    setNotice(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/training-programs/${trainingProgramId}/modules/${existingModule.id}/upload`, {
        method: "POST",
        headers: {
          "X-View-Mode": viewMode,
        },
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Failed to upload content file.");
      }

      setExistingModule((prev) =>
        prev
          ? {
              ...prev,
              contentReference: payload.contentReference,
              contentStorageKey: payload.contentStorageKey,
              contentFileName: payload.contentFileName,
              contentMimeType: payload.contentMimeType,
              contentSizeBytes: payload.contentSizeBytes,
            }
          : prev
      );

      setForm((prev) => ({
        ...prev,
        contentReference: payload.contentReference || prev.contentReference,
      }));

      setNotice({ type: "success", message: "Content uploaded successfully." });
    } catch (requestError) {
      setNotice({
        type: "error",
        message: requestError instanceof Error ? requestError.message : "Failed to upload content file.",
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading...</div>;
  }

  if (!canManage) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        Course content management is restricted to HR Admin in Admin view.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link href={`/training/programs/${trainingProgramId}/content`} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
          {"<- Back to Course Content"}
        </Link>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">{mode === "edit" ? "Edit Module" : "Add Module"}</h1>
        <p className="mt-1 text-sm text-slate-600">Reusable module setup for WUC internal training courses.</p>
      </div>

      {notice ? (
        <div className={`rounded-xl border p-4 text-sm ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {notice.message}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Module Title</span>
            <input
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Module Type</span>
            <select
              value={form.moduleType}
              onChange={(event) => setForm((prev) => ({ ...prev, moduleType: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="VIDEO">Video</option>
              <option value="READING">Reading</option>
              <option value="DOCUMENT">Document</option>
              <option value="EXTERNAL_LINK">External Link</option>
              <option value="QUIZ">Quiz</option>
              <option value="OTHER">Other</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Display Order</span>
            <input
              type="number"
              min={1}
              value={form.displayOrder}
              onChange={(event) => setForm((prev) => ({ ...prev, displayOrder: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Status</span>
            <select
              value={form.status}
              onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </label>

          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Description</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              className="min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={form.isRequired}
              onChange={(event) => setForm((prev) => ({ ...prev, isRequired: event.target.checked }))}
            />
            Required Module
          </label>

          {form.moduleType === "VIDEO" ? (
            <>
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-slate-700">Video Source</span>
                <select
                  value={form.videoSource}
                  onChange={(event) => setForm((prev) => ({ ...prev, videoSource: event.target.value as "GOOGLE_DRIVE" | "EXTERNAL_URL" }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="GOOGLE_DRIVE">Google Drive</option>
                  <option value="EXTERNAL_URL">External URL</option>
                </select>
              </label>

              <label className="block md:col-span-2">
                <span className="mb-1 block text-sm font-semibold text-slate-700">{videoUrlLabel}</span>
                <input
                  value={form.contentReference}
                  onChange={(event) => setForm((prev) => ({ ...prev, contentReference: event.target.value }))}
                  placeholder={form.videoSource === "GOOGLE_DRIVE" ? "https://drive.google.com/..." : "https://..."}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
                <div className="mt-1 text-xs text-slate-500">Required when Status is Active.</div>
              </label>
            </>
          ) : null}

          {form.moduleType === "EXTERNAL_LINK" ? (
            <label className="block md:col-span-2">
              <span className="mb-1 block text-sm font-semibold text-slate-700">URL</span>
              <input
                value={form.contentReference}
                onChange={(event) => setForm((prev) => ({ ...prev, contentReference: event.target.value }))}
                placeholder="https://..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
          ) : null}

          {supportsFileUpload ? (
            <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-800">Upload Document</div>
              {mode === "create" ? (
                <div className="mt-2 text-xs text-slate-600">Save the module first, then upload content.</div>
              ) : (
                <>
                  <div className="mt-2 text-xs text-slate-600">Maximum file size: 250 MB.</div>
                  <input
                    type="file"
                    className="mt-3 block text-sm"
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null;
                      void handleUpload(file);
                    }}
                    disabled={uploading}
                  />
                  <div className="mt-3 space-y-1 text-xs text-slate-600">
                    <div>Upload Status: {uploading ? "Uploading..." : existingModule?.contentReference ? "Uploaded" : "Not uploaded"}</div>
                    <div>File Name: {existingModule?.contentFileName || "-"}</div>
                    <div>Document Reference: {existingModule?.contentReference || "-"}</div>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Link href={`/training/programs/${trainingProgramId}/content`} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            Cancel
          </Link>
          <button
            type="button"
            onClick={() => void saveModule()}
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Module"}
          </button>
        </div>
      </div>
    </div>
  );
}
