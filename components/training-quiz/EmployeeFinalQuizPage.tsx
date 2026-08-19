"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type QuizQuestion = {
  id: string;
  displayOrder: number;
  question: string;
  choices: Array<{
    value: "A" | "B" | "C" | "D";
    label: string;
  }>;
};

type QuizPayload = {
  assignment: {
    id: string;
    status: string;
    completionDate: string | null;
  };
  trainingProgram: {
    id: string;
    trainingName: string;
    passingScore: number | null;
    examRequired: boolean;
    certificateRequired: boolean;
  };
  cycle: {
    id: string;
    sequence: number;
    startDate: string;
    dueDate: string;
  };
  finalExam: {
    unlocked: boolean;
    inProgressAttemptId: string | null;
    attemptNumber: number | null;
    alreadyPassed: boolean;
    latestResult: {
      id: string;
      attemptNumber: number;
      scorePercent: number | null;
      passingScoreUsed: number | null;
      passed: boolean | null;
      startedAt: string;
      submittedAt: string | null;
    } | null;
    history: Array<{
      id: string;
      attemptNumber: number;
      scorePercent: number | null;
      passingScoreUsed: number | null;
      passed: boolean | null;
      startedAt: string;
      submittedAt: string | null;
      gradedAt: string | null;
    }>;
    certificateId: string | null;
  };
  questions: QuizQuestion[];
};

type SubmissionResult = {
  result: {
    attemptId: string;
    attemptNumber: number;
    scorePercent: number | null;
    passingScoreUsed: number | null;
    passed: boolean | null;
    startedAt: string;
    submittedAt: string | null;
    completionDate: string | null;
    certificateId: string | null;
  };
  message: string;
};

type ResultModalState =
  | {
      status: "passed" | "failed";
      result: SubmissionResult["result"];
    }
  | null;

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default function EmployeeFinalQuizPage({ assignmentId }: { assignmentId: string }) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [payload, setPayload] = useState<QuizPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, "A" | "B" | "C" | "D">>({});
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [resultModal, setResultModal] = useState<ResultModalState>(null);

  const unansweredCount = useMemo(
    () => (payload?.questions || []).filter((question) => !answers[question.id]).length,
    [answers, payload?.questions]
  );

  const loadQuiz = async (options?: {
    resetAnswers?: boolean;
    clearResult?: boolean;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/training-assignments/${assignmentId}/quiz`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to load final quiz.");
      }
      setPayload(data as QuizPayload);
      if (options?.clearResult) {
        setResult(null);
      }
      if (options?.resetAnswers) {
        setAnswers({});
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to load final quiz.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadQuiz({ resetAnswers: true, clearResult: true });
  }, [assignmentId]);

  const submitQuiz = async () => {
    if (!payload) return;

    if (payload.questions.length === 0) {
      setError("No active quiz questions are configured for this training program.");
      return;
    }

    if (unansweredCount > 0) {
      setError("Answer every quiz question before submitting.");
      return;
    }

    if (!payload.finalExam.inProgressAttemptId) {
      setError("Quiz attempt is not ready yet. Please reload the page.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/training-assignments/${assignmentId}/quiz`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          attemptId: payload.finalExam.inProgressAttemptId,
          answers: payload.questions.map((question) => ({
            questionId: question.id,
            selectedAnswer: answers[question.id],
          })),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to submit quiz.");
      }
      const submissionResult = data as SubmissionResult;
      setResult(submissionResult);
      setResultModal({
        status: submissionResult.result.passed ? "passed" : "failed",
        result: submissionResult.result,
      });
      await loadQuiz({
        resetAnswers: submissionResult.result.passed === true,
      });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to submit quiz.");
    } finally {
      setSubmitting(false);
    }
  };

  const startRetake = async () => {
    setResultModal(null);
    await loadQuiz({
      resetAnswers: true,
      clearResult: true,
    });
  };

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading final quiz...</div>;
  }

  if (error) {
    return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error}</div>;
  }

  if (!payload) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Quiz data is unavailable.</div>;
  }

  const latestResult = result?.result || payload.finalExam.latestResult;
  const latestPassed = latestResult?.passed === true || payload.finalExam.alreadyPassed;
  const certificateId = result?.result.certificateId || payload.finalExam.certificateId;
  const modalPassingScore =
    resultModal?.result.passingScoreUsed ?? payload.trainingProgram.passingScore ?? null;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link href={`/training/assignments/${assignmentId}`} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
          Back to Course
        </Link>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">{payload.trainingProgram.trainingName}</h1>
        <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
          <span>Attempt Number: <span className="font-semibold text-slate-900">{payload.finalExam.attemptNumber ?? latestResult?.attemptNumber ?? "-"}</span></span>
          <span>Passing Score: <span className="font-semibold text-slate-900">{payload.trainingProgram.passingScore ?? "-"}</span>%</span>
          <span>Cycle: <span className="font-semibold text-slate-900">{payload.cycle.sequence}</span></span>
        </div>
      </div>

      {!payload.finalExam.unlocked ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <div className="text-lg font-bold">Final Quiz - Locked</div>
          <p className="mt-2 text-sm">Complete all required course modules to unlock the quiz.</p>
        </div>
      ) : latestPassed && latestResult ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900">
          <div className="text-2xl font-bold">Congratulations - You Passed</div>
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div>Final Score: <span className="font-semibold">{latestResult.scorePercent ?? "-"}%</span></div>
            <div>Required Passing Score: <span className="font-semibold">{latestResult.passingScoreUsed ?? payload.trainingProgram.passingScore ?? "-"}%</span></div>
            <div>Attempt Number: <span className="font-semibold">{latestResult.attemptNumber}</span></div>
            <div>Completion Date: <span className="font-semibold">{formatDate(result?.result.completionDate || payload.assignment.completionDate)}</span></div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {certificateId ? (
              <Link
                href={`/training/certificates/${certificateId}`}
                className="inline-flex rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
              >
                View Certificate
              </Link>
            ) : null}
            <Link
              href={`/training/assignments/${assignmentId}`}
              className="inline-flex rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              Return to Course
            </Link>
          </div>
        </div>
      ) : (
        <>
          {latestResult && latestResult.passed === false ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
              <div className="text-lg font-bold">You have not yet reached the required passing score.</div>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                <div>Score: <span className="font-semibold">{latestResult.scorePercent ?? "-"}%</span></div>
                <div>Required: <span className="font-semibold">{latestResult.passingScoreUsed ?? payload.trainingProgram.passingScore ?? "-"}%</span></div>
                <div>Attempt Number: <span className="font-semibold">{latestResult.attemptNumber}</span></div>
              </div>
              <button
                type="button"
                onClick={() => void loadQuiz()}
                className="mt-4 inline-flex rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800"
              >
                Retake Quiz
              </button>
            </div>
          ) : null}

          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            {payload.questions.map((question) => (
              <section key={question.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Question {question.displayOrder}
                </div>
                <h2 className="mt-2 text-lg font-bold text-slate-900">{question.question}</h2>
                <div className="mt-4 grid gap-3">
                  {question.choices.map((choice) => (
                    <label key={choice.value} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 hover:border-indigo-300">
                      <input
                        type="radio"
                        name={`question-${question.id}`}
                        value={choice.value}
                        checked={answers[question.id] === choice.value}
                        onChange={() => setAnswers((prev) => ({ ...prev, [question.id]: choice.value }))}
                        className="mt-1"
                      />
                      <span>
                        <span className="font-semibold text-slate-900">{choice.value}.</span> {choice.label}
                      </span>
                    </label>
                  ))}
                </div>
              </section>
            ))}

            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-600">
                {unansweredCount > 0 ? `${unansweredCount} unanswered question${unansweredCount === 1 ? "" : "s"} remaining.` : "All questions answered."}
              </div>
              <button
                type="button"
                onClick={() => void submitQuiz()}
                disabled={submitting}
                className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Quiz"}
              </button>
            </div>
          </div>
        </>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Attempt History</div>
        {payload.finalExam.history.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No submitted attempts yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {payload.finalExam.history
              .filter((attempt) => attempt.submittedAt)
              .map((attempt) => (
                <div key={attempt.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <div className="font-semibold text-slate-900">
                    Attempt {attempt.attemptNumber} - {attempt.scorePercent ?? "-"}% - {attempt.passed ? "Passed" : "Failed"}
                  </div>
                  <div className="mt-1 text-slate-600">
                    Required Passing Score: {attempt.passingScoreUsed ?? payload.trainingProgram.passingScore ?? "-"}% · Submitted {formatDate(attempt.submittedAt)}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {resultModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div
            className={`w-full max-w-2xl rounded-3xl border bg-white p-6 shadow-2xl ${
              resultModal.status === "passed" ? "border-emerald-200" : "border-rose-200"
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="final-quiz-result-title"
          >
            <div className="flex items-start gap-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl ${
                  resultModal.status === "passed"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-rose-100 text-rose-700"
                }`}
                aria-hidden="true"
              >
                {resultModal.status === "passed" ? "✓" : "!"}
              </div>
              <div className="flex-1">
                <h2 id="final-quiz-result-title" className="text-2xl font-bold text-slate-900">
                  {resultModal.status === "passed" ? "Training Completed" : "Attempt Not Passed"}
                </h2>
                <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 sm:grid-cols-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your Score</div>
                    <div className="mt-1 text-lg font-bold text-slate-900">{resultModal.result.scorePercent ?? "-"}%</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Passing Score</div>
                    <div className="mt-1 text-lg font-bold text-slate-900">{modalPassingScore ?? "-"}%</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Attempt</div>
                    <div className="mt-1 text-lg font-bold text-slate-900">#{resultModal.result.attemptNumber}</div>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-slate-600">
                  {resultModal.status === "passed"
                    ? "Congratulations! You have successfully passed the final quiz and completed this training."
                    : "You have not yet reached the required passing score. Please review the training material if needed and try the quiz again. You may retake the quiz until you pass."}
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  {resultModal.status === "passed" ? (
                    <>
                      {resultModal.result.certificateId ? (
                        <Link
                          href={`/training/certificates/${resultModal.result.certificateId}`}
                          className="inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                        >
                          View Certificate
                        </Link>
                      ) : null}
                      <Link
                        href={`/training/assignments/${assignmentId}`}
                        className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Back to Training
                      </Link>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => void startRetake()}
                        className="inline-flex rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
                      >
                        Retake Quiz
                      </button>
                      <Link
                        href={`/training/assignments/${assignmentId}`}
                        className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Back to Course
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
