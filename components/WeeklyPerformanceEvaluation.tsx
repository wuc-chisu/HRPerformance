"use client";

import { useEffect, useRef, useState } from "react";
import { WeeklyRecord } from "@/lib/employees";
import { formatDateInPacific } from "@/lib/dateUtils";
import {
  calculateWeeklyPerformanceScore,
  getPerformanceRating,
  getPerformanceColor,
  getPerformanceBgColor,
} from "@/lib/performanceScoring";

interface WeeklyPerformanceEvaluationProps {
  record: WeeklyRecord;
  employeeName?: string;
  employeeId?: string;
  workAuthorizationStatus?: string;
}

function getTaskPriorityBreakdown(record: WeeklyRecord): {
  highPriorityTasks: number;
  totalAssignedTasks: number;
  failureRate: number;
  urgentOverdue: number;
  highOverdue: number;
} {
  const assignedDetails = record.assignedTasksDetails || [];
  const weeklyOverdueDetails = record.overdueTasksDetails || [];
  const totalAssignedTasks = record.assignedTasks;

  // Count only urgent and high priority tasks
  const assignedUrgent = assignedDetails.find(
    (detail) => detail.priority === "urgent"
  )?.count || 0;
  const assignedHigh = assignedDetails.find(
    (detail) => detail.priority === "high"
  )?.count || 0;
  const highPriorityTasks = assignedUrgent + assignedHigh;

  // Calculate failure rate based on weighted overdue high-priority tasks
  const hiAssignedW = assignedUrgent * 3 + assignedHigh * 2;
  
  const weeklyOverdueUrgent = weeklyOverdueDetails.find(
    (detail) => detail.priority === "urgent"
  )?.count || 0;
  const weeklyOverdueHigh = weeklyOverdueDetails.find(
    (detail) => detail.priority === "high"
  )?.count || 0;
  
  if (hiAssignedW === 0) {
    // No high-priority tasks assigned
    return { highPriorityTasks: 0, totalAssignedTasks, failureRate: 0, urgentOverdue: 0, highOverdue: 0 };
  }

  const hiOverdueW = weeklyOverdueUrgent * 3 + weeklyOverdueHigh * 2;
  const failureRate = hiOverdueW / hiAssignedW;

  return { highPriorityTasks, totalAssignedTasks, failureRate, urgentOverdue: weeklyOverdueUrgent, highOverdue: weeklyOverdueHigh };
}

function getTaskCompletionBreakdown(record: WeeklyRecord): {
  totalWeighted: number;
  incompleteWeighted: number;
  completedWeighted: number;
  completionRate: number;
} {
  const priorityWeights: Record<string, number> = {
    urgent: 3,
    high: 2,
    normal: 1,
    "no priority": 0.5,
  };

  const assignedDetails = record.assignedTasksDetails || [];
  const overdueDetails = record.overdueTasksDetails || [];

  const totalWeighted = assignedDetails.reduce((sum, detail) => {
    const weight = priorityWeights[detail.priority] || 0;
    return sum + detail.count * weight;
  }, 0);

  const incompleteWeighted = overdueDetails.reduce((sum, detail) => {
    const weight = priorityWeights[detail.priority] || 0;
    return sum + detail.count * weight;
  }, 0);

  const completedWeighted = totalWeighted - incompleteWeighted;
  const completionRate =
    totalWeighted > 0 ? (completedWeighted / totalWeighted) * 100 : 100;

  return {
    totalWeighted,
    incompleteWeighted,
    completedWeighted,
    completionRate,
  };
}

function getPastDueTaskBreakdown(record: WeeklyRecord): {
  overdueWeighted: number;
  assignedWeighted: number;
  weightedOverdueRatio: number;
  scoreBand: string;
} {
  const overdueWeights: Record<string, number> = {
    urgent: 4,
    high: 3,
    normal: 2,
    "no priority": 2,
  };

  const assignedWeights: Record<string, number> = {
    urgent: 3,
    high: 2,
    normal: 1,
    "no priority": 0.5,
  };

  const allOverdueDetails = record.allOverdueTasksDetails || [];
  const assignedDetails = record.assignedTasksDetails || [];

  const overdueWeighted = allOverdueDetails.reduce((sum, detail) => {
    const weight = overdueWeights[detail.priority] || 0;
    return sum + detail.count * weight;
  }, 0);

  const assignedWeighted = assignedDetails.reduce((sum, detail) => {
    const weight = assignedWeights[detail.priority] || 0;
    return sum + detail.count * weight;
  }, 0);

  const weightedOverdueRatio =
    overdueWeighted === 0 && assignedWeighted === 0
      ? 0
      : (overdueWeighted / (overdueWeighted + assignedWeighted)) * 100;

  let scoreBand = "0%";
  if (weightedOverdueRatio > 75) scoreBand = ">75%";
  else if (weightedOverdueRatio > 60) scoreBand = "61-75%";
  else if (weightedOverdueRatio > 40) scoreBand = "41-60%";
  else if (weightedOverdueRatio > 25) scoreBand = "26-40%";
  else if (weightedOverdueRatio > 10) scoreBand = "11-25%";
  else if (weightedOverdueRatio > 0) scoreBand = "1-10%";

  return {
    overdueWeighted,
    assignedWeighted,
    weightedOverdueRatio,
    scoreBand,
  };
}

export default function WeeklyPerformanceEvaluation({
  record,
  employeeName = "Employee",
  employeeId,
  workAuthorizationStatus,
}: WeeklyPerformanceEvaluationProps) {
  const [editingComment, setEditingComment] = useState(false);
  const [commentText, setCommentText] = useState(record.managerComment || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateMessage, setGenerateMessage] = useState<string | null>(null);
  const autoGeneratedRef = useRef(false);

  const score = calculateWeeklyPerformanceScore(record);
  const rating = getPerformanceRating(score.totalScore);
  const textColor = getPerformanceColor(score.totalScore);
  const bgColor = getPerformanceBgColor(score.totalScore);
  const warningAdvisory =
    "This week's performance score is below 70%. If the monthly average falls below 70%, it will trigger a formal warning review. Three confirmed warnings may result in reduction of hours or termination. Please take corrective action in ClickUp immediately.";

  const appendWarning = (text: string) => {
    if (score.totalScore >= 70) {
      return text;
    }

    if (text.includes(warningAdvisory)) {
      return text;
    }

    const trimmed = text.trim();
    return trimmed.length > 0
      ? `${trimmed}\n\n${warningAdvisory}`
      : warningAdvisory;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveComment = async (
    overrideComment?: string,
    options?: { silent?: boolean }
  ) => {
    if (!record.recordId) {
      console.error("No recordId found:", record);
      if (!options?.silent) {
        alert("Error: Unable to save comment. Record ID is missing.");
      }
      return;
    }

    const commentToSave =
      overrideComment !== undefined ? overrideComment : commentText;
    const normalizedComment = appendWarning(commentToSave);
    
    setIsSaving(true);
    try {
      const payload = {
        startDate: record.startDate,
        endDate: record.endDate,
        plannedWorkHours: record.plannedWorkHours,
        actualWorkHours: record.actualWorkHours,
        assignedTasks: record.assignedTasks,
        assignedTasksDetails: record.assignedTasksDetails,
        weeklyOverdueTasks: record.weeklyOverdueTasks,
        overdueTasksDetails: record.overdueTasksDetails,
        allOverdueTasks: record.allOverdueTasks,
        allOverdueTasksDetails: record.allOverdueTasksDetails,
        managerComment: normalizedComment,
      };
      
      console.log(`Saving comment for record ${record.recordId}:`, payload);
      
      const response = await fetch(`/api/weekly-records/${record.recordId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);

      const responseText = await response.text();
      console.log("Raw response text:", responseText);

      let responseData: any = {};
      if (responseText) {
        try {
          responseData = JSON.parse(responseText);
          console.log("Parsed JSON response:", responseData);
        } catch (parseError) {
          console.error("Failed to parse as JSON:", parseError);
          console.log("Response was not JSON");
        }
      } else {
        console.error("Response body is empty");
      }

      if (response.ok) {
        setEditingComment(false);
        if (overrideComment !== undefined) {
          setCommentText(normalizedComment);
        }
        if (!options?.silent) {
          alert("Comment saved successfully!");
        }
      } else {
        console.error("Save failed with status:", response.status, responseData);
        const errorMessage =
          responseData?.details ||
          responseData?.message ||
          responseData?.error ||
          `HTTP ${response.status}: ${responseText.substring(0, 100)}`;
        if (!options?.silent) {
          alert(`Failed to save comment: ${errorMessage}`);
        }
      }
    } catch (error) {
      console.error("Error saving comment:", error);
      const errorMsg =
        error instanceof Error ? error.message : String(error);
      console.error("Full error:", error);
      if (!options?.silent) {
        alert(`Error saving comment: ${errorMsg}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setCommentText(record.managerComment || "");
    setEditingComment(false);
  };

  const buildFallbackComment = () => {
    const scoreValue = score.totalScore.toFixed(2);
    const scoreLabel = score.totalScore < 70 ? "below expectation" : rating;
    const workRatio = `${record.actualWorkHours}h/${record.plannedWorkHours}h`;
    const overdueCount = record.weeklyOverdueTasks;
    const allOverdueCount = record.allOverdueTasks ?? 0;
    
    // Check if employee fulfilled work hours requirement
    const workHoursFulfilled = record.actualWorkHours >= record.plannedWorkHours;
    const workHoursStatus = workHoursFulfilled ? "fulfilled" : "failed to fulfill";

    if (score.totalScore < 70) {
      if (workAuthorizationStatus === "H-1B") {
        return (
          `Your total score is ${scoreValue}, which is ${scoreLabel}. ` +
          `You ${workHoursStatus} assigned work hours and recorded ${overdueCount} weekly overdue tasks (all overdue: ${allOverdueCount}). ` +
          `Task priority handling is ${score.taskPriorityHandling.toFixed(2)}/20 and task completion is ${score.taskCompletionRate.toFixed(2)}/25, which are pulling the total score down.\n\n` +
          `Strengths are limited this week; the focus should be on stabilizing execution and reducing overdue work. Past due management is ${score.pastDueTaskManagement.toFixed(2)}/30, which indicates overdue items are accumulating.\n\n` +
          `Act now: 1) Plan the week using priority tiers before work starts, 2) Close all urgent/high items daily and track completions, 3) Review overdue items every morning and clear at least one before starting new tasks.`
        );
      }
      
      return (
        `Your total score is ${scoreValue}, which is ${scoreLabel}. ` +
        `Work hours (${workRatio}) and task results need immediate improvement, and you recorded ${overdueCount} weekly overdue tasks (all overdue: ${allOverdueCount}). ` +
        `Task priority handling is ${score.taskPriorityHandling.toFixed(2)}/20 and task completion is ${score.taskCompletionRate.toFixed(2)}/25, which are pulling the total score down.\n\n` +
        `Strengths are limited this week; the focus should be on stabilizing execution and reducing overdue work. Past due management is ${score.pastDueTaskManagement.toFixed(2)}/30, which indicates overdue items are accumulating.\n\n` +
        `Act now: 1) Plan the week using priority tiers before work starts, 2) Close all urgent/high items daily and track completions, 3) Review overdue items every morning and clear at least one before starting new tasks.`
      );
    }

    if (workAuthorizationStatus === "H-1B") {
      return (
        `Your total score is ${scoreValue} (${scoreLabel}). ` +
        `You ${workHoursStatus} assigned work hours and recorded ${overdueCount} weekly overdue tasks (all overdue: ${allOverdueCount}). ` +
        `Task priority handling is ${score.taskPriorityHandling.toFixed(2)}/20 and task completion is ${score.taskCompletionRate.toFixed(2)}/25.\n\n` +
        `Strengths include steady completion of assigned tasks. ` +
        `Maintaining clear task priorities is helping keep results on track.\n\n` +
        `To improve further, tighten the daily review of pending work, reduce overdue carryover, and maintain focus on high-impact tasks to lift past due management (${score.pastDueTaskManagement.toFixed(2)}/30).`
      );
    }

    return (
      `Your total score is ${scoreValue} (${scoreLabel}). ` +
      `Work hours are ${workRatio} and you recorded ${overdueCount} weekly overdue tasks (all overdue: ${allOverdueCount}). ` +
      `Task priority handling is ${score.taskPriorityHandling.toFixed(2)}/20 and task completion is ${score.taskCompletionRate.toFixed(2)}/25.\n\n` +
      `Strengths include consistent effort toward planned hours and steady completion of assigned tasks. ` +
      `Maintaining clear task priorities is helping keep results on track.\n\n` +
      `To improve further, tighten the daily review of pending work, reduce overdue carryover, and maintain focus on high-impact tasks to lift past due management (${score.pastDueTaskManagement.toFixed(2)}/30).`
    );
  };

  const generateOverallComment = async (options?: { auto?: boolean }) => {
    if (!record.recordId) return;
    if (options?.auto) {
      autoGeneratedRef.current = true;
    }

    setIsGenerating(true);
    setGenerateMessage(null);
    try {
      const response = await fetch("/api/ai/overall-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          record,
          employeeName,
          employeeId,
          workAuthorizationStatus,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorPayload: any = null;
        try {
          errorPayload = JSON.parse(errorText);
        } catch {
          errorPayload = null;
        }
        if (errorPayload?.error === "GEMINI_QUOTA_EXCEEDED" || errorPayload?.error === "GEMINI_SERVICE_UNAVAILABLE") {
          const fallback = appendWarning(buildFallbackComment());
          setCommentText(fallback);
          await handleSaveComment(fallback, { silent: true });
          const message = errorPayload?.error === "GEMINI_QUOTA_EXCEEDED" 
            ? "AI quota reached. A local fallback comment was generated."
            : "AI service temporarily unavailable. A local fallback comment was generated.";
          setGenerateMessage(message);
          return;
        }

        setGenerateMessage("AI generation failed. Please try again later.");
        console.error("AI comment generation failed:", errorText);
        return;
      }

      const data = await response.json();
      const generated = data?.comment?.trim();
      if (!generated) return;

      const normalized = appendWarning(generated);
      setCommentText(normalized);
      await handleSaveComment(normalized, { silent: true });
      setGenerateMessage("AI comment generated successfully.");
    } catch (error) {
      console.error("Error generating overall comment:", error);
      setGenerateMessage("AI generation failed. Please try again later.");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (autoGeneratedRef.current) return;
    if (!record.recordId) return;
    if (record.managerComment && record.managerComment.trim().length > 0) return;
  }, [record, employeeName]);

  const warningIndex = commentText.indexOf(warningAdvisory);
  const displayComment =
    warningIndex >= 0
      ? commentText.slice(0, warningIndex).trimEnd()
      : commentText;

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 1.5cm;
          }
          
          /* Ensure backgrounds print */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          
          /* Prevent page breaks inside cards */
          .print-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          
          /* Hide print button */
          button {
            display: none !important;
          }
        }
      `}</style>
      <div className={`rounded-lg shadow-md p-6 ${bgColor} print:shadow-none`}>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Weekly Performance Evaluation
          </h3>
          <p className="text-sm text-gray-600">
            {employeeName} • Week of{" "}
            {formatDateInPacific(record.startDate, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 print:hidden"
          type="button"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
            />
          </svg>
          Print PDF
        </button>
      </div>

      {/* Total Score Card */}
      <div className="bg-white rounded-lg p-4 mb-6 border-l-4 border-l-blue-500 print:border print:border-gray-300 print-avoid-break">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-600 uppercase">
              Total Score
            </p>
            <p className={`text-4xl font-bold ${textColor}`}>
              {score.totalScore}
            </p>
            <p className={`text-sm font-semibold mt-1 ${textColor}`}>
              {rating}
            </p>
          </div>
          <div className="text-right">
            <div className="w-24 h-24 rounded-full border-4 border-gray-300 flex items-center justify-center">
              <span className={`text-3xl font-bold ${textColor}`}>
                {Math.round(score.totalScore)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="space-y-3 print:space-y-4">
        <h4 className="font-semibold text-gray-900 mb-4">Score Breakdown</h4>

        {/* Work Hours Fulfillment */}
        <div className="bg-white rounded-lg p-4 print:border print:border-gray-300 print-avoid-break">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="font-semibold text-gray-900">Work Hours Fulfillment</p>
              {workAuthorizationStatus !== "H-1B" ? (
                <p className="text-xs text-gray-600 mt-1">
                  25% weight • {record.actualWorkHours}h / {record.plannedWorkHours}h
                </p>
              ) : (
                <p className="text-xs text-gray-600 mt-1">
                  25% weight
                </p>
              )}
            </div>
            <span className="text-lg font-bold text-blue-600">
              {score.workHoursFulfillment.toFixed(2)}/25
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full"
              style={{
                width: `${(score.workHoursFulfillment / 25) * 100}%`,
              }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            max 25 points • formula: min((actual/planned) × 25, 25)
          </p>
        </div>

        {/* Task Priority Handling */}
        <div className="bg-white rounded-lg p-4 print:border print:border-gray-300 print-avoid-break">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="font-semibold text-gray-900">Task Priority Handling</p>
              {(() => {
                const breakdown = getTaskPriorityBreakdown(record);
                return (
                  <p className="text-xs text-gray-600 mt-1">
                    20% weight • {breakdown.urgentOverdue} urgent & {breakdown.highOverdue} high tasks overdue
                  </p>
                );
              })()}
            </div>
            <span className="text-lg font-bold text-green-600">
              {score.taskPriorityHandling.toFixed(2)}/20
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full"
              style={{
                width: `${(score.taskPriorityHandling / 20) * 100}%`,
              }}
            ></div>
          </div>
          {(() => {
            const breakdown = getTaskPriorityBreakdown(record);
            const failurePercentage = (breakdown.failureRate * 100).toFixed(1);
            return (
              <p className="text-xs text-gray-500 mt-2">
                max 20 points • {failurePercentage}% failure rate on urgent/high priority tasks
              </p>
            );
          })()}
        </div>

        {/* Task Completion Rate */}
        <div className="bg-white rounded-lg p-4 print:border print:border-gray-300 print-avoid-break">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="font-semibold text-gray-900">Task Completion Rate</p>
              {(() => {
                const breakdown = getTaskCompletionBreakdown(record);
                return (
                  <p className="text-xs text-gray-600 mt-1">
                    25% weight • {breakdown.completionRate.toFixed(1)}% completion rate
                  </p>
                );
              })()}
            </div>
            <span className="text-lg font-bold text-orange-600">
              {score.taskCompletionRate.toFixed(2)}/25
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-orange-500 h-2 rounded-full"
              style={{
                width: `${(score.taskCompletionRate / 25) * 100}%`,
              }}
            ></div>
          </div>
          {(() => {
            const breakdown = getTaskCompletionBreakdown(record);
            return (
              <div className="text-xs text-gray-500 mt-2 space-y-1">
                <p>
                  Total weighted: {breakdown.totalWeighted.toFixed(1)} | Incomplete: {breakdown.incompleteWeighted.toFixed(1)} | Completed: {breakdown.completedWeighted.toFixed(1)}
                </p>
                <p>
                  max 25 points • {breakdown.completionRate.toFixed(1)}% × 25 = {score.taskCompletionRate.toFixed(2)}
                </p>
              </div>
            );
          })()}
        </div>

        {/* Past Due Task Management */}
        <div className="bg-white rounded-lg p-4 print:border print:border-gray-300 print-avoid-break">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="font-semibold text-gray-900">
                Past Due Task Management
              </p>
              {(() => {
                const breakdown = getPastDueTaskBreakdown(record);
                return (
                  <p className="text-xs text-gray-600 mt-1">
                    30% weight • {breakdown.weightedOverdueRatio.toFixed(1)}% weighted overdue ratio
                  </p>
                );
              })()}
            </div>
            <span className="text-lg font-bold text-purple-600">
              {score.pastDueTaskManagement.toFixed(2)}/30
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-purple-500 h-2 rounded-full"
              style={{
                width: `${(score.pastDueTaskManagement / 30) * 100}%`,
              }}
            ></div>
          </div>
          {(() => {
            const breakdown = getPastDueTaskBreakdown(record);
            const allOverdueDetails = record.allOverdueTasksDetails || [];
            const overdueBreakdown = allOverdueDetails.length
              ? allOverdueDetails
                  .map((detail) => `${detail.count} ${detail.priority}`)
                  .join(", ")
              : "none";
            return (
              <div className="text-xs text-gray-500 mt-2 space-y-1">
                <p>
                  Overdue tasks: {overdueBreakdown}
                </p>
                <p>
                  Overdue weighted: {breakdown.overdueWeighted.toFixed(1)} | Assigned weighted: {breakdown.assignedWeighted.toFixed(1)}
                </p>
                <p>
                  max 30 points • {breakdown.scoreBand} band = {score.pastDueTaskManagement.toFixed(0)} points
                </p>
              </div>
            );
          })()}
        </div>
      </div>

      <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200 print-avoid-break">
        <p className="text-xs font-semibold text-gray-600 mb-3">Priority Weights (Task Completion)</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="font-semibold text-red-600">Urgent:</span>
            <span className="text-gray-600">3 points</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-orange-600">High:</span>
            <span className="text-gray-600">2 points</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-yellow-600">Normal:</span>
            <span className="text-gray-600">1 point</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-gray-600">No Priority:</span>
            <span className="text-gray-600">0.5 points</span>
          </div>
        </div>
      </div>

      <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200 print-avoid-break">
        <p className="text-xs font-semibold text-gray-600 mb-3">Task Priority Handling Scoring Formula</p>
        <div className="text-xs text-gray-600 space-y-2">
          <p><span className="font-semibold">Focuses on:</span> Urgent and High priority tasks only</p>
          <p><span className="font-semibold">Weights:</span> Urgent = 3 points, High = 2 points</p>
          <p><span className="font-semibold">Calculation:</span> Score = 20 × (1 − failure rate)</p>
          <p><span className="font-semibold">Example:</span> 0% failure = 20 pts • 50% failure = 10 pts • 100% failure = 0 pts</p>
        </div>
      </div>

      {/* Past Due Task Management Score Bands */}
      <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200 print-avoid-break">
        <p className="text-xs font-semibold text-gray-600 mb-3">Past Due Task Management Bands</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="font-semibold text-green-600">0%:</span>
            <span className="text-gray-600">30 points</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-green-500">1-10%:</span>
            <span className="text-gray-600">25 points</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-blue-600">11-25%:</span>
            <span className="text-gray-600">20 points</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-yellow-600">26-40%:</span>
            <span className="text-gray-600">15 points</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-orange-600">41-60%:</span>
            <span className="text-gray-600">10 points</span>
          </div>
          <div className="flex justify-between">
            <span className="font-semibold text-red-500">61-75%:</span>
            <span className="text-gray-600">5 points</span>
          </div>
          <div className="flex justify-between col-span-2">
            <span className="font-semibold text-red-600">&gt;75%:</span>
            <span className="text-gray-600">0 points</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2 italic">
          Note: For overdue tasks, "No Priority" counts as 1 point (not 0.5)
        </p>
        <p className="text-xs text-gray-500 mt-2">
          <span className="font-semibold">Calculation:</span> Overdue tasks are weighted by priority (Urgent: 4, High: 3, Normal: 2, No Priority: 2), while assigned tasks use different weights (Urgent: 3, High: 2, Normal: 1, No Priority: 0.5). The weighted overdue ratio is: (overdue weighted) ÷ (overdue weighted + assigned weighted) × 100. The resulting percentage determines which score band applies.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          <span className="font-semibold">Example:</span> 1 urgent + 1 high overdue = 4 + 3 = 7 weighted. If assigned tasks total 21 weighted, ratio = 7 ÷ (7 + 21) = 25% → "11-25%" band → 20 points.
        </p>
      </div>

      {/* Rating Legend */}
      <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200 print-avoid-break">
        <p className="text-xs font-semibold text-gray-600 mb-3">Rating Legend</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="font-semibold text-green-600">90-100</span>
            <p className="text-gray-600">Excellent</p>
          </div>
          <div>
            <span className="font-semibold text-green-500">80-89</span>
            <p className="text-gray-600">Very Good</p>
          </div>
          <div>
            <span className="font-semibold text-blue-600">70-79</span>
            <p className="text-gray-600">Good</p>
          </div>
          <div>
            <span className="font-semibold text-red-600">Below 70</span>
            <p className="text-gray-600">Below Expectation</p>
          </div>
        </div>
      </div>

      {/* Manager Comment */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200 print-avoid-break">
        <div className="flex justify-between items-start mb-2">
          <p className="text-xs font-semibold text-blue-900">Overall Comment</p>
          {!editingComment && (
            <div className="flex gap-3">
              <button
                onClick={() => void generateOverallComment()}
                disabled={isGenerating}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium disabled:text-blue-300"
              >
                {isGenerating ? "Generating..." : (commentText ? "Regenerate" : "Generate Comment")}
              </button>
              <button
                onClick={() => setEditingComment(true)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Edit
              </button>
            </div>
          )}
        </div>
        {isGenerating && (
          <p className="text-xs text-blue-700 mb-2">
            Generating AI comment...
          </p>
        )}
        {generateMessage && (
          <p className="text-xs text-blue-700 mb-2">
            {generateMessage}
          </p>
        )}
        {editingComment ? (
          <div className="space-y-2">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={4}
              placeholder="Add comments about employee performance, achievements, or areas for improvement..."
              className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-vertical"
            />
            <div className="flex gap-2">
              <button
                onClick={() => void handleSaveComment()}
                disabled={isSaving}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={handleCancelEdit}
                className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-800 whitespace-pre-wrap">
              {displayComment || (
                <span className="italic text-gray-500">No comment added yet</span>
              )}
            </p>
            {score.totalScore < 70 && (
              <p className="text-sm font-bold text-red-600">
                {warningAdvisory}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Task Definition Reminder */}
      <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200 print-avoid-break">
        <p className="text-sm font-semibold text-amber-900 mb-2">Task Definition Reminder</p>
        <p className="text-xs text-amber-800 leading-relaxed">
          For the purpose of performance evaluation, tasks recorded in the task management system should represent measurable work deliverables or project-related outputs. Routine operational activities such as checking email or checking ClickUp are part of normal work operations and should not be logged as standalone tasks for performance scoring.
        </p>
      </div>
    </div>
    </>
  );
}
