import { ZERO_SCORE_CLICKUP_REMINDER } from "@/lib/zeroScoreReminder";

import { NextResponse } from "next/server";
import { WeeklyRecord } from "@/lib/employees";
import {
  calculateWeeklyPerformanceScore,
  getQualityOfWorkScoringBand,
  getTaskPriorityHandlingBreakdown,
  getPerformanceRating,
} from "@/lib/performanceScoring";

const BELOW_70_WARNING =
  "This week's performance score is below 70%. If the monthly average falls below 70%, it will trigger a formal warning review. Three confirmed warnings may result in reduction of hours or termination. Please take corrective action in ClickUp immediately.";
interface OverallCommentRequest {
  record: WeeklyRecord;
  employeeName?: string;
  employeeId?: string;
  workAuthorizationStatus?: string;
}

function buildWeeklyFallbackComment(params: {
  totalScore: number;
  rating: string;
  record: WeeklyRecord;
  score: {
    scoringVersion: "LEGACY_WORK_HOURS" | "QUALITY_OF_WORK";
    workHoursFulfillment: number;
    qualityOfWork: number;
    taskPriorityHandling: number;
    taskCompletionRate: number;
    pastDueTaskManagement: number;
  };
  lowAreas: string[];
  workAuthorizationStatus?: string;
  taskPriorityDeductionSummary?: string;
  hasTaskPriorityDeduction?: boolean;
  isExcellentPerformance?: boolean;
}) {
  const {
    totalScore,
    rating,
    record,
    score,
    lowAreas,
    workAuthorizationStatus,
    isExcellentPerformance,
  } = params;

  const needsUrgentImprovement = totalScore < 70;

  if (score.scoringVersion === "QUALITY_OF_WORK") {
    const qualityRating = record.averageQualityOfWorkScore;
    const ratingText = qualityRating == null ? "not available" : qualityRating.toFixed(2);
    const qualityBand = getQualityOfWorkScoringBand(qualityRating);
    const bandText = qualityBand
      ? `The ${qualityBand.ratingRange} rating band earns ${qualityBand.points}/25 points. `
      : "No valid Quality of Work rating band is available. ";
    return (
      `Your total score is ${totalScore.toFixed(2)} (${rating}). Your average Quality of Work rating was ${ratingText} out of 5, earning ${score.qualityOfWork.toFixed(2)}/25 points. ${bandText}` +
      `Task priority handling is ${score.taskPriorityHandling.toFixed(2)}/20, task completion is ${score.taskCompletionRate.toFixed(2)}/25, and past due task management is ${score.pastDueTaskManagement.toFixed(2)}/30. ` +
      `Continue strengthening work quality through careful review and consistent standards, while keeping priorities clear, completing assigned tasks on time, and reviewing overdue items daily in ClickUp.`
    );
  }

  const strengthParts: string[] = [];
  if (score.taskPriorityHandling >= 16) {
    strengthParts.push(
      "your task priority handling is strong, showing that you are focusing on high-impact work effectively"
    );
  }
  if (score.taskCompletionRate >= 20) {
    strengthParts.push(
      "your task completion rate is solid, indicating consistent follow-through on assigned deliverables"
    );
  }
  if (score.workHoursFulfillment >= 20) {
    strengthParts.push(
      workAuthorizationStatus === "H-1B"
        ? "you fulfilled assigned work hours and maintained reliable availability for team execution"
        : "you fulfilled work hour expectations and supported steady weekly output"
    );
  }
  if (score.pastDueTaskManagement >= 27) {
    strengthParts.push(
      "your past due task management was excellent with zero overdue items this week"
    );
  }
  if (strengthParts.length === 0) {
    strengthParts.push(
      "you showed positive effort in completing assigned work and maintaining progress during the week"
    );
  }

  if (needsUrgentImprovement) {
    const prioritySummary =
      params.hasTaskPriorityDeduction && params.taskPriorityDeductionSummary
        ? `${params.taskPriorityDeductionSummary} `
        : "";
    const paragraphOne =
      `Your total score is ${totalScore.toFixed(2)} (${rating}), which is below expectation. ` +
      `${workAuthorizationStatus === "H-1B" ? "You failed to fulfill assigned work hours" : "Work hours and task results need immediate correction"}, and you recorded ${record.weeklyOverdueTasks} weekly overdue tasks (all overdue: ${record.allOverdueTasks ?? 0}). ` +
      `Task priority handling is ${score.taskPriorityHandling.toFixed(2)}/20 and task completion is ${score.taskCompletionRate.toFixed(2)}/25, which are pulling the total score down. ${prioritySummary}`;

    const paragraphTwo =
      `Critical areas requiring immediate attention: ${lowAreas.length ? lowAreas.join(", ") : "Work Hours Fulfillment, Task Priority Handling, Task Completion Rate, and Past Due Task Management"}. ` +
      `Your current scores are Work Hours Fulfillment ${score.workHoursFulfillment.toFixed(2)}/25, Task Priority Handling ${score.taskPriorityHandling.toFixed(2)}/20, Task Completion Rate ${score.taskCompletionRate.toFixed(2)}/25, and Past Due Task Management ${score.pastDueTaskManagement.toFixed(2)}/30. ` +
      `Overdue work is accumulating and must be corrected immediately.`;

    const paragraphThree =
      `Corrective actions: 1) Plan the week using priority tiers before work starts, 2) Close all urgent/high items daily and track completions, 3) Review overdue items every morning and clear at least one before starting new tasks. ` +
      `Manage all task updates in ClickUp every day so overdue work does not continue to build.`;

    let urgentFallback = `${paragraphOne}\n\n${paragraphTwo}\n\n${paragraphThree}`;
    if (urgentFallback.length > 1200) {
      urgentFallback = urgentFallback.slice(0, 1199);
      if (!/[.!?]$/.test(urgentFallback)) {
        urgentFallback = `${urgentFallback.trimEnd()}.`;
      }
    }

    return urgentFallback;
  }

  if (isExcellentPerformance) {
    const paragraphOne =
      `You achieved an outstanding total score of ${totalScore.toFixed(2)} (${rating}) this week, reflecting excellent performance across all evaluation categories. ` +
      `${strengthParts.join(". ")}. ` +
      `With zero overdue tasks and strong scores in every area, you demonstrated exceptional discipline and commitment to your responsibilities.`;

    const paragraphTwo =
      `Keep up this excellent standard by continuing to manage your tasks proactively in ClickUp, ensuring all assignments are updated and completed on time each week. ` +
      `Maintain your current daily planning habits, keep all task statuses current, and continue communicating proactively on any blockers before they become overdue. ` +
      `Consistent performance at this level is the benchmark for continued high ratings and reflects positively on your overall monthly evaluation.`;

    let excellentFallback = `${paragraphOne}\n\n${paragraphTwo}`;
    if (excellentFallback.length > 1200) {
      excellentFallback = excellentFallback.slice(0, 1199);
      if (!/[.!?]$/.test(excellentFallback)) {
        excellentFallback = `${excellentFallback.trimEnd()}.`;
      }
    }
    return excellentFallback;
  }

  const lowAreaText = lowAreas.length
    ? lowAreas.join(", ")
    : "Past Due Task Management";
  const strengthText = strengthParts.slice(0, 2).join(". ");
  const paragraphOne =
    `You achieved a total score of ${totalScore.toFixed(2)} (${rating}) this week. ` +
    `${strengthText ? `${strengthText}. ` : ""}` +
    `These results show that you can deliver quality outcomes when you maintain consistent execution and prioritize key tasks.`;
  const paragraphTwo =
    `However, critical areas require immediate attention: ${lowAreaText}. ` +
    `Your current scores are Work Hours Fulfillment ${score.workHoursFulfillment.toFixed(2)}/25, Task Priority Handling ${score.taskPriorityHandling.toFixed(2)}/20, Task Completion Rate ${score.taskCompletionRate.toFixed(2)}/25, and Past Due Task Management ${score.pastDueTaskManagement.toFixed(2)}/30. ` +
    `In particular, you have ${record.allOverdueTasks ?? 0} all overdue tasks and ${record.weeklyOverdueTasks} weekly overdue tasks, which must be corrected right away to avoid continued performance risk.`;

  const paragraphThree =
    `To improve, manage your full workload in ClickUp with a strict daily routine: review all due items at the start of each day, re-prioritize urgent and high-priority tasks first, and close or update task status before end-of-day. ` +
    `Set a weekly target to reduce overdue tasks to zero, break larger items into clear subtasks with deadlines, and document blockers early so support can be provided. ` +
    `Consistent ClickUp planning, timely task completion, and proactive follow-up will raise your category scores and strengthen overall weekly performance.`;

  let fallback = `${paragraphOne}\n\n${paragraphTwo}\n\n${paragraphThree}`;

  if (fallback.length < 800) {
    fallback +=
      " You should also run a mid-week self-check in ClickUp to confirm completion rate, overdue exposure, and priority alignment against expectations.";
  }

  if (fallback.length > 1200) {
    fallback = fallback.slice(0, 1199);
    if (!/[.!?]$/.test(fallback)) {
      fallback = `${fallback.trimEnd()}.`;
    }
  }

  return fallback;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OverallCommentRequest;
    const { record, employeeId, workAuthorizationStatus } = body || {};

    if (!record) {
      return NextResponse.json(
        { error: "Missing record data" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "Gemini is not configured",
          details: "Missing GEMINI_API_KEY",
        },
        { status: 500 }
      );
    }

    const score = calculateWeeklyPerformanceScore(record);
    const rating = getPerformanceRating(score.totalScore);
    if (score.totalScore === 0) {
      return NextResponse.json({
        comment: `${ZERO_SCORE_CLICKUP_REMINDER}\n\n${BELOW_70_WARNING}`,
      });
    }

    const priorityBreakdown = getTaskPriorityHandlingBreakdown(record);

    const assignedDetails = record.assignedTasksDetails || [];
    const overdueDetails = record.overdueTasksDetails || [];
    const allOverdueDetails = record.allOverdueTasksDetails || [];

    const assignedBreakdown = assignedDetails.length
      ? assignedDetails
          .map((detail) => `${detail.priority}: ${detail.count}`)
          .join(", ")
      : "none";
    const overdueBreakdown = overdueDetails.length
      ? overdueDetails
          .map((detail) => `${detail.priority}: ${detail.count}`)
          .join(", ")
      : "none";
    const allOverdueBreakdown = allOverdueDetails.length
      ? allOverdueDetails
          .map((detail) => `${detail.priority}: ${detail.count}`)
          .join(", ")
      : "none";

    const needsUrgentImprovement = score.totalScore < 70;
    const isLegacyScoring = score.scoringVersion === "LEGACY_WORK_HOURS";
    const noWorkHoursEntered = isLegacyScoring && record.actualWorkHours === 0;
    const workHoursThreshold = 17.5;
    const taskPriorityThreshold = 14;
    const taskCompletionThreshold = 17.5;
    const pastDueThreshold = 21;
    const lowAreas: string[] = [];

    if (isLegacyScoring && score.workHoursFulfillment < workHoursThreshold) {
      lowAreas.push("Work Hours Fulfillment");
    }
    const qualityRatingMeetsExpectations =
      (record.averageQualityOfWorkScore ?? 0) >= 2.5;
    if (!isLegacyScoring && !qualityRatingMeetsExpectations) {
      lowAreas.push("Quality of Work");
    }
    if (score.taskPriorityHandling < taskPriorityThreshold) {
      lowAreas.push("Task Priority Handling");
    }
    if (score.taskCompletionRate < taskCompletionThreshold) {
      lowAreas.push("Task Completion Rate");
    }
    if (score.pastDueTaskManagement < pastDueThreshold) {
      lowAreas.push("Past Due Task Management");
    }

    const allOverdueCount = record.allOverdueTasks ?? 0;
    const weeklyOverdueCount = record.weeklyOverdueTasks ?? 0;
    const isExcellentPerformance = lowAreas.length === 0 && allOverdueCount === 0 && weeklyOverdueCount === 0;
    const taskPriorityDeductionSummary =
      priorityBreakdown.totalDeduction > 0
        ? `Task Priority Handling direct deduction = -${priorityBreakdown.totalDeduction} points from ${priorityBreakdown.urgentOverdue} urgent overdue task(s), ${priorityBreakdown.highOverdue} high overdue task(s), ${priorityBreakdown.normalOverdue} normal overdue task(s) (-2 each), and ${priorityBreakdown.noPriorityAssigned} assigned task(s) with no priority.`
        : "Task Priority Handling direct deduction = 0 because there were no urgent overdue tasks, no high overdue tasks, and no assigned tasks with no priority.";
    const hasTaskPriorityDeduction = priorityBreakdown.totalDeduction > 0;
    const noPriorityCommentInstructions =
      priorityBreakdown.noPriorityAssigned > 0
        ? `- CRITICAL: ${priorityBreakdown.noPriorityAssigned} assigned task(s) had No Priority. Explicitly state this exact count and that these tasks reduced the Task Priority Handling score. Explain that No Priority means no work priority was assigned; do not describe the tasks as unimportant.
- Remind the employee constructively that each task is expected to have an appropriate priority and to consistently assign or update priorities in future weeks.`
        : "- There were zero assigned tasks with No Priority. Do not mention No Priority tasks or deductions for missing priorities.";
    const qualityBand = getQualityOfWorkScoringBand(record.averageQualityOfWorkScore);
    const qualityScoringInstructions = isLegacyScoring
      ? ""
      : `- Interpret Quality of Work as a 1-to-5 star rating using these definitions:
  1 star (1.00-1.49), Unsatisfactory: clearly below expectations; significant errors, incompleteness, or substantial correction/rework may be present.
  2 stars (1.50-2.49), Needs Improvement: partially meets expectations but has noticeable quality issues; more guidance, review, or correction may be needed.
  3 stars (2.50-3.49), Meets Expectations: normal expected performance; work is accurate, complete, and meets the expected quality standard. This is not poor or below-expectation quality.
  4 stars (3.50-4.49), Exceeds Expectations: above the normal standard; accurate, complete, well-executed work generally requires little or no correction.
  5 stars (4.50-5.00), Exceptional: significantly above expectations, demonstrating excellent accuracy, completeness, and attention to detail.
- Quality of Work uses fixed rating bands, not proportional scoring: 1.00-1.49 = 0/25; 1.50-2.49 = 10/25; 2.50-3.49 = 15/25; 3.50-4.49 = 20/25; 4.50-5.00 = 25/25.
- State the employee's average rating, name the applicable scoring band, and explain its corresponding points. Do not imply scores increase proportionally within a band.
- Treat ratings of 3.00 as meeting expectations, not as a low/negative category. Describe ratings around 3 neutrally or positively; ratings above 3 can be described as increasingly strong, while ratings below 3 may receive professional, constructive guidance.
- Do not exaggerate performance based on small decimal differences. Consider Quality of Work together with the other weekly categories when describing overall performance.`;
    const qualityCategoryStatus = isLegacyScoring
      ? ""
      : `Quality of Work=${qualityRatingMeetsExpectations ? "OK" : "LOW"}`;
    const minimumCommentLength =
      score.totalScore >= 90 ? 180 : score.totalScore >= 80 ? 300 : score.totalScore >= 70 ? 450 : 650;
    const maximumCommentLength = 1200;

    const promptBase = `You are a professional HR performance evaluation assistant.

Goal:
Write a focused and practical weekly performance comment based ONLY on the metrics provided.

Requirements:
- Aim for ${minimumCommentLength} to ${maximumCommentLength} characters (including spaces); follow the score-tier guidance below and do not pad with repetition.
- Address the employee directly using "You" / "Your".
- Do NOT include the employee ID or invent facts.
- Maintain a professional, supportive, direct, and constructive tone.
- Focus on the most impactful evidence; do not repeat every report number.
- End with a complete sentence.
${score.totalScore >= 90 ? `- Score 90–100: Keep the comment concise and positive in 1–2 short paragraphs. Highlight strong performance and what went well, then encourage the employee to maintain the same standard. Do not add unnecessary detail or invent improvement areas.` : score.totalScore >= 80 ? `- Score 80–89: Use 1–2 short paragraphs of balanced positive feedback. Mention strong areas, any small deductions that matter, and one or two practical reminders for improvement.` : score.totalScore >= 70 ? `- Score 70–79: Use 2–3 short paragraphs. Explain what went well, identify the categories that reduced the score, clarify the main issues using available evidence, and give practical suggestions for improving next week's score.` : `- Score below 70: Use 2–4 short paragraphs and provide significantly more detail. Clearly state that overall performance was below the expected level. Identify the specific categories that reduced the score and explain why points were lost using supplied scores, category status, and deduction details. Prioritize the most impactful issues and cite relevant available numbers, such as Quality of Work rating/band, No Priority count and deduction, urgent/high overdue counts, task completion score, assigned tasks, and weekly overdue/incomplete tasks. Do not repeat every report number.
- Give 2–4 specific, practical recommendations tied to the identified issues, then end with a constructive next-step recommendation for the following week. Explain deductions before recommendations. Acknowledge supported strengths where relevant; a 3-star Quality of Work rating means Meets Expectations and is not poor performance.
- If overdue tasks exist, explain the relevant overdue impact. If priority deductions exist, state their amount and exact causes. Do not minimize significant problems or use harsh/emotional language.
- For scores below 70, explicitly address every category marked LOW by its exact name and give concrete actions for the most important issues. Explain category deductions only with causes supported by the supplied data.
- If Task Priority Handling is discussed, accurately explain the direct deduction reason from the supplied summary. An assigned task with No Priority had no work priority set and caused a deduction; do not call it unimportant.
- If using Quality of Work, apply the supplied 1-to-5-star definitions and scoring bands. In particular, 3 stars means Meets Expectations, not poor performance. If using legacy scoring, do not apply Quality of Work guidance.
- Do not invent a past-due ratio, completion count, or other metric not supplied. When relevant, use the actual assigned and weekly overdue task counts.
- For scores below 70, recommend managing task updates in ClickUp when relevant to the identified task issues.`}
${noPriorityCommentInstructions}
${noWorkHoursEntered ? "- CRITICAL: If actual work hours is 0, you MUST include this exact note in the first paragraph: 'IMPORTANT: You must enter and track your work hours in the time tracking system. Failure to record work hours will result in performance evaluation issues and may affect your employment status.'" : ""}
${isLegacyScoring && workAuthorizationStatus === "H-1B" ? "- IMPORTANT: For work hours, do NOT mention specific hours (like '8h / 40h'). Instead, just say whether the employee 'fulfilled' or 'failed to fulfill' assigned work hours. For example: 'You fulfilled assigned work hours' or 'You failed to fulfill assigned work hours'." : ""}
${isLegacyScoring ? "" : "- Do NOT mention work hours, planned hours, actual hours, or Work Hours Fulfillment. Reference the Average Quality of Work rating and its score when relevant."}
${qualityScoringInstructions}
${needsUrgentImprovement ?
  "- Because the total score is below 70, include this warning sentence in paragraph 2 (do not add a 4th paragraph): This week's performance score is below 70%. If the monthly average falls below 70%, it will trigger a formal warning review. Three confirmed warnings may result in reduction of hours or termination. Please take corrective action in ClickUp immediately." :
  ""}

Focus on clarity, priority, and improvement — not full statistical explanation.

Weekly performance metrics:
- Total score: ${score.totalScore} (${rating})
${isLegacyScoring ? `- Work hours: ${record.actualWorkHours}h actual / ${record.plannedWorkHours}h planned (Work Hours Fulfillment: ${score.workHoursFulfillment}/25)` : `- Quality of Work: Average Quality Rating ${record.averageQualityOfWorkScore?.toFixed(2) ?? "not available"}/5 (Quality Score: ${score.qualityOfWork}/25; applicable band: ${qualityBand ? `${qualityBand.ratingRange} = ${qualityBand.points}/25` : "unavailable"})`}
- Task priority handling score: ${score.taskPriorityHandling}/20
- Task priority handling deduction summary: ${taskPriorityDeductionSummary}
- Assigned tasks with No Priority: ${priorityBreakdown.noPriorityAssigned}
- Task completion score: ${score.taskCompletionRate}/25
- Past due management score: ${score.pastDueTaskManagement}/30
- Assigned tasks: ${record.assignedTasks}
- Weekly overdue tasks: ${record.weeklyOverdueTasks}
- All overdue tasks: ${record.allOverdueTasks ?? 0}

Task detail breakdowns:
- Assigned tasks by priority: ${assignedBreakdown}
- Weekly overdue tasks by priority: ${overdueBreakdown}
- All overdue tasks by priority: ${allOverdueBreakdown}

Flag:
- Total score below 70: ${needsUrgentImprovement ? "YES" : "NO"}
- Category status: ${isLegacyScoring ? `Work Hours Fulfillment=${score.workHoursFulfillment < workHoursThreshold ? "LOW" : "OK"}` : qualityCategoryStatus}, Task Priority Handling=${score.taskPriorityHandling < taskPriorityThreshold ? "LOW" : "OK"}, Task Completion Rate=${score.taskCompletionRate < taskCompletionThreshold ? "LOW" : "OK"}, Past Due Task Management=${score.pastDueTaskManagement < pastDueThreshold ? "LOW" : "OK"}
- LOW categories that MUST be addressed: ${lowAreas.length ? lowAreas.join(", ") : "none"}
- Employee visa status: ${workAuthorizationStatus || "Unknown"}

Return the full evaluation comment only.`;

    const buildPrompt = (attempt: number) => {
      if (attempt === 1) {
        return promptBase + "\n\nIf the output is at risk of truncation, finish the sentence before ending.";
      }
      return (
        promptBase +
        "\n\nIf the output is truncated, regenerate it with complete sentences and a full ending." +
        ` Keep it between ${minimumCommentLength} and ${maximumCommentLength} characters. If it is too short, add only relevant detail appropriate to this score tier.`
      );
    };

    const listUrl =
      "https://generativelanguage.googleapis.com/v1beta/models" +
      `?key=${apiKey}`;

    const listResponse = await fetch(listUrl);
    if (!listResponse.ok) {
      const listError = await listResponse.text();
      // If service is unavailable (503), return a special error so frontend can use fallback
      if (listResponse.status === 503) {
        return NextResponse.json(
          { error: "GEMINI_SERVICE_UNAVAILABLE", details: listError },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: "Gemini listModels failed", details: listError },
        { status: 500 }
      );
    }

    const listData = await listResponse.json();
    const models = Array.isArray(listData?.models) ? listData.models : [];
    const candidate = models.find((model: { name?: string; supportedGenerationMethods?: string[] }) => {
      const name = model?.name || "";
      const supports = model?.supportedGenerationMethods || [];
      return name.includes("gemini") && supports.includes("generateContent");
    });

    if (!candidate?.name) {
      return NextResponse.json(
        {
          error: "No Gemini model supports generateContent",
          details: JSON.stringify(models),
        },
        { status: 500 }
      );
    }

    const url =
      `https://generativelanguage.googleapis.com/v1beta/${candidate.name}:generateContent` +
      `?key=${apiKey}`;

    const generateOnce = async (attempt: number) => {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: buildPrompt(attempt) }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2400,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { error: errorText, status: response.status };
      }

      const data = await response.json();
      const content =
        data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!content) {
        return { error: "No content returned from Gemini" };
      }

      return { content };
    };

    let finalContent = "";
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const result = await generateOnce(attempt);
      if (result.error) {
        const isQuotaError =
          typeof result.error === "string" &&
          result.error.includes("RESOURCE_EXHAUSTED");
        const isServiceUnavailable =
          result.status === 503 ||
          (typeof result.error === "string" &&
            (result.error.includes("UNAVAILABLE") ||
              result.error.includes("503")));
        if (isQuotaError) {
          return NextResponse.json(
            { error: "GEMINI_QUOTA_EXCEEDED", details: result.error },
            { status: 429 }
          );
        }
        if (isServiceUnavailable) {
          return NextResponse.json(
            { error: "GEMINI_SERVICE_UNAVAILABLE", details: result.error },
            { status: 503 }
          );
        }
        return NextResponse.json(
          { error: "Gemini request failed", details: result.error },
          { status: 500 }
        );
      }

      const content = result.content || "";
      const isLengthOk =
        content.length >= minimumCommentLength && content.length <= maximumCommentLength;
      const endsWithSentence = /[.!?]$/.test(content);

      if (isLengthOk && endsWithSentence) {
        finalContent = content;
        break;
      }

      finalContent = content;
    }

    if (!finalContent) {
      return NextResponse.json(
        { error: "No content returned from Gemini" },
        { status: 500 }
      );
    }

    if (finalContent.length < minimumCommentLength) {
      finalContent = buildWeeklyFallbackComment({
        totalScore: score.totalScore,
        rating,
        record,
        taskPriorityDeductionSummary,
        hasTaskPriorityDeduction,
        score: {
          scoringVersion: score.scoringVersion,
          workHoursFulfillment: score.workHoursFulfillment,
          qualityOfWork: score.qualityOfWork,
          taskPriorityHandling: score.taskPriorityHandling,
          taskCompletionRate: score.taskCompletionRate,
          pastDueTaskManagement: score.pastDueTaskManagement,
        },
        lowAreas,
        workAuthorizationStatus,
        isExcellentPerformance,
      });
    }

    // If content doesn't end with proper punctuation, trim to last complete sentence
    if (!/[.!?]$/.test(finalContent)) {
      // Find the last sentence-ending punctuation mark
      const lastPunctuationIndex = Math.max(
        finalContent.lastIndexOf('.'),
        finalContent.lastIndexOf('!'),
        finalContent.lastIndexOf('?')
      );
      
      if (lastPunctuationIndex > -1) {
        // Trim to the last complete sentence
        finalContent = finalContent.substring(0, lastPunctuationIndex + 1);
      } else {
        // No punctuation found, just trim and add a period
        finalContent = `${finalContent.trim()}.`;
      }
    }

    return NextResponse.json({ comment: finalContent });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate overall comment", details: String(error) },
      { status: 500 }
    );
  }
}
