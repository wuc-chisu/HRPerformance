"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { useCurrentUserContext } from "@/components/CurrentUserContextProvider";

type QuestionStatus = "DRAFT" | "ACTIVE" | "INACTIVE" | "ARCHIVED";
type CorrectAnswer = "A" | "B" | "C" | "D";

type TrainingProgramSummary = {
  id: string;
  trainingName: string;
  examRequired: boolean;
  passingScore: number | null;
  status: string;
};

type QuestionItem = {
  id: string;
  trainingProgramId: string;
  question: string;
  displayOrder: number;
  status: QuestionStatus;
  answerA: string;
  answerB: string;
  answerC: string;
  answerD: string;
  correctAnswer: CorrectAnswer;
  isActive: boolean;
  answerRecordCount: number;
  canDelete: boolean;
};

type QuizPayload = {
  trainingProgram: TrainingProgramSummary;
  questionCount: number;
  activeQuestionCount: number;
  questions: QuestionItem[];
};

type FormState = {
  question: string;
  displayOrder: string;
  status: QuestionStatus;
  answerA: string;
  answerB: string;
  answerC: string;
  answerD: string;
  correctAnswer: CorrectAnswer;
};

const DEFAULT_FORM: FormState = {
  question: "",
  displayOrder: "",
  status: "ACTIVE",
  answerA: "",
  answerB: "",
  answerC: "",
  answerD: "",
  correctAnswer: "A",
};

const STATUS_LABELS: Record<QuestionStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ARCHIVED: "Archived",
};

function isStrictHrAdminInAdminView(systemRole: string | undefined, viewMode: "admin" | "employee") {
  return (systemRole || "").trim().toLowerCase() === "hr admin" && viewMode === "admin";
}

function mapQuestionToForm(question: QuestionItem): FormState {
  return {
    question: question.question,
    displayOrder: String(question.displayOrder),
    status: question.status,
    answerA: question.answerA,
    answerB: question.answerB,
    answerC: question.answerC,
    answerD: question.answerD,
    correctAnswer: question.correctAnswer,
  };
}

export default function QuizManagerPage({ trainingProgramId }: { trainingProgramId: string }) {
  const { employeeContext, viewMode, loading } = useCurrentUserContext();
  const [data, setData] = useState<QuizPayload | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);

  const canManage = isStrictHrAdminInAdminView(employeeContext?.systemRole, viewMode);

  const sortedQuestions = useMemo(() => {
    return [...(data?.questions || [])].sort((left, right) => left.displayOrder - right.displayOrder);
  }, [data?.questions]);

  const loadQuestions = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/training-programs/${trainingProgramId}/quiz-questions`, {
        headers: {
          "X-View-Mode": viewMode,
        },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Failed to load quiz questions.");
      }
      setData(payload as QuizPayload);
    } catch (requestError) {
      setNotice({
        type: "error",
        message: requestError instanceof Error ? requestError.message : "Failed to load quiz questions.",
      });
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!canManage) return;
    void loadQuestions();
  }, [canManage, trainingProgramId, viewMode]);

  const resetForm = () => {
    setForm(DEFAULT_FORM);
    setEditingQuestionId(null);
  };

  const openEdit = (question: QuestionItem) => {
    setEditingQuestionId(question.id);
    setForm(mapQuestionToForm(question));
  };

  const saveQuestion = async () => {
    if (!form.question.trim() || !form.answerA.trim() || !form.answerB.trim() || !form.answerC.trim() || !form.answerD.trim()) {
      setNotice({ type: "error", message: "Question and all answer choices are required." });
      return;
    }

    const parsedOrder = Number(form.displayOrder);
    if (form.displayOrder && (!Number.isInteger(parsedOrder) || parsedOrder <= 0)) {
      setNotice({ type: "error", message: "Display Order must be a positive integer." });
      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      const response = await fetch(
        editingQuestionId
          ? `/api/training-programs/${trainingProgramId}/quiz-questions/${editingQuestionId}`
          : `/api/training-programs/${trainingProgramId}/quiz-questions`,
        {
          method: editingQuestionId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            "X-View-Mode": viewMode,
          },
          body: JSON.stringify({
            question: form.question,
            displayOrder: form.displayOrder ? Number(form.displayOrder) : undefined,
            status: form.status,
            answerA: form.answerA,
            answerB: form.answerB,
            answerC: form.answerC,
            answerD: form.answerD,
            correctAnswer: form.correctAnswer,
          }),
        }
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Failed to save question.");
      }

      setNotice({ type: "success", message: editingQuestionId ? "Question updated." : "Question added." });
      resetForm();
      await loadQuestions();
    } catch (requestError) {
      setNotice({
        type: "error",
        message: requestError instanceof Error ? requestError.message : "Failed to save question.",
      });
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (question: QuestionItem, status: QuestionStatus) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/training-programs/${trainingProgramId}/quiz-questions/${question.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-View-Mode": viewMode,
        },
        body: JSON.stringify({ status }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Failed to update question status.");
      }
      setNotice({ type: "success", message: `Question set to ${STATUS_LABELS[status]}.` });
      await loadQuestions();
    } catch (requestError) {
      setNotice({
        type: "error",
        message: requestError instanceof Error ? requestError.message : "Failed to update question status.",
      });
    } finally {
      setSaving(false);
    }
  };

  const moveQuestion = async (question: QuestionItem, direction: "up" | "down") => {
    const list = sortedQuestions;
    const currentIndex = list.findIndex((item) => item.id === question.id);
    if (currentIndex < 0) return;

    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= list.length) return;

    const swapTarget = list[swapIndex];
    setSaving(true);

    try {
      const first = await fetch(`/api/training-programs/${trainingProgramId}/quiz-questions/${question.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-View-Mode": viewMode,
        },
        body: JSON.stringify({ displayOrder: swapTarget.displayOrder }),
      });
      const firstBody = await first.json().catch(() => ({}));
      if (!first.ok) {
        throw new Error(firstBody.error || "Failed to reorder question.");
      }

      const second = await fetch(`/api/training-programs/${trainingProgramId}/quiz-questions/${swapTarget.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-View-Mode": viewMode,
        },
        body: JSON.stringify({ displayOrder: question.displayOrder }),
      });
      const secondBody = await second.json().catch(() => ({}));
      if (!second.ok) {
        throw new Error(secondBody.error || "Failed to reorder question.");
      }

      await loadQuestions();
    } catch (requestError) {
      setNotice({
        type: "error",
        message: requestError instanceof Error ? requestError.message : "Failed to reorder question.",
      });
      setSaving(false);
    }
  };

  const deleteQuestion = async (question: QuestionItem) => {
    if (!window.confirm("Are you sure you want to permanently delete this quiz question?")) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/training-programs/${trainingProgramId}/quiz-questions/${question.id}`, {
        method: "DELETE",
        headers: {
          "X-View-Mode": viewMode,
        },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload.error || "Failed to delete question.");
      }
      setNotice({ type: "success", message: "Question deleted." });
      await loadQuestions();
    } catch (requestError) {
      setNotice({
        type: "error",
        message: requestError instanceof Error ? requestError.message : "Failed to delete question.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading...</div>;
  }

  if (!canManage) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        Quiz management is restricted to HR Admin in Admin view.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <Link href="/" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
              {"<- Back to Training Program"}
            </Link>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Manage Quiz</h1>
            <p className="mt-1 text-sm text-slate-700">{data?.trainingProgram.trainingName || "Loading..."}</p>
            <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
              <div>Passing Score: <span className="font-semibold text-slate-800">{data?.trainingProgram.passingScore ?? "N/A"}</span></div>
              <div>Exam Required: <span className="font-semibold text-slate-800">{data?.trainingProgram.examRequired ? "Yes" : "No"}</span></div>
              <div>Questions: <span className="font-semibold text-slate-800">{data?.questionCount ?? 0}</span></div>
              <div>Active Questions: <span className="font-semibold text-slate-800">{data?.activeQuestionCount ?? 0}</span></div>
            </div>
          </div>
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            + Add Question
          </button>
        </div>
      </div>

      {notice ? (
        <div className={`rounded-xl border p-4 text-sm ${notice.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
          {notice.message}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">{editingQuestionId ? "Edit Question" : "New Question"}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Question</span>
            <textarea
              value={form.question}
              onChange={(event) => setForm((prev) => ({ ...prev, question: event.target.value }))}
              className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
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
              onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as QuestionStatus }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="DRAFT">Draft</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Answer A</span>
            <input value={form.answerA} onChange={(event) => setForm((prev) => ({ ...prev, answerA: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Answer B</span>
            <input value={form.answerB} onChange={(event) => setForm((prev) => ({ ...prev, answerB: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Answer C</span>
            <input value={form.answerC} onChange={(event) => setForm((prev) => ({ ...prev, answerC: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Answer D</span>
            <input value={form.answerD} onChange={(event) => setForm((prev) => ({ ...prev, answerD: event.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2" />
          </label>

          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-semibold text-slate-700">Correct Answer</span>
            <select
              value={form.correctAnswer}
              onChange={(event) => setForm((prev) => ({ ...prev, correctAnswer: event.target.value as CorrectAnswer }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
            </select>
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={resetForm}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => void saveQuestion()}
            disabled={saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : editingQuestionId ? "Save Question" : "Add Question"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-220">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Order</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Question</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Correct</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">History</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {busy && !data ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">Loading questions...</td>
                </tr>
              ) : sortedQuestions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">No quiz questions configured.</td>
                </tr>
              ) : (
                sortedQuestions.map((question, index) => (
                  <tr key={question.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-700">{question.displayOrder}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="font-semibold text-slate-900">{question.question}</div>
                      <div className="mt-1 text-xs text-slate-500">A: {question.answerA}</div>
                      <div className="text-xs text-slate-500">B: {question.answerB}</div>
                      <div className="text-xs text-slate-500">C: {question.answerC}</div>
                      <div className="text-xs text-slate-500">D: {question.answerD}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">{STATUS_LABELS[question.status]}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-800">{question.correctAnswer}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{question.answerRecordCount}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => openEdit(question)} className="rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-200">Edit</button>
                        <button
                          type="button"
                          onClick={() => void moveQuestion(question, "up")}
                          disabled={saving || index === 0}
                          className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                        >
                          Up
                        </button>
                        <button
                          type="button"
                          onClick={() => void moveQuestion(question, "down")}
                          disabled={saving || index === sortedQuestions.length - 1}
                          className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
                        >
                          Down
                        </button>
                        {question.status === "ACTIVE" ? (
                          <button type="button" onClick={() => void changeStatus(question, "INACTIVE")} className="rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-200">Deactivate</button>
                        ) : (
                          <button type="button" onClick={() => void changeStatus(question, "ACTIVE")} className="rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-200">Activate</button>
                        )}
                        {question.status !== "ARCHIVED" ? (
                          <button type="button" onClick={() => void changeStatus(question, "ARCHIVED")} className="rounded bg-indigo-100 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-200">Archive</button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void deleteQuestion(question)}
                          disabled={!question.canDelete || saving}
                          className="rounded bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-200 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
