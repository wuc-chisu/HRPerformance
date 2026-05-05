import { NextResponse } from "next/server";
import { WeeklyRecord } from "@/lib/employees";
import {
  calculateWeeklyPerformanceScore,
  getTaskPriorityHandlingBreakdown,
  getPerformanceRating,
} from "@/lib/performanceScoring";

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
    workHoursFulfillment: number;
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

  const paragraphOne =
    `You achieved a total score of ${totalScore.toFixed(2)} (${rating}) this week, and there are clear positives in your performance. ` +
    `${strengthParts.slice(0, 2).join(". ")}. ` +
    `These results show that you can deliver quality outcomes when you maintain consistent execution and prioritize key tasks.`;

  const lowAreaText = lowAreas.length
    ? lowAreas.join(", ")
    : "Past Due Task Management";
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
    const noWorkHoursEntered = record.actualWorkHours === 0;
    const workHoursThreshold = 17.5;
    const taskPriorityThreshold = 14;
    const taskCompletionThreshold = 17.5;
    const pastDueThreshold = 21;
    const lowAreas: string[] = [];

    if (score.workHoursFulfillment < workHoursThreshold) {
      lowAreas.push("Work Hours Fulfillment");
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
        ? `Task Priority Handling direct deduction = -${priorityBreakdown.totalDeduction} points from ${priorityBreakdown.urgentOverdue} urgent overdue task(s), ${priorityBreakdown.highOverdue} high overdue task(s), and ${priorityBreakdown.noPriorityAssigned} assigned task(s) with no priority.`
        : "Task Priority Handling direct deduction = 0 because there were no urgent overdue tasks, no high overdue tasks, and no assigned tasks with no priority.";
    const hasTaskPriorityDeduction = priorityBreakdown.totalDeduction > 0;

    const promptBase = `You are a professional HR performance evaluation assistant.

Goal:
Write a focused and practical weekly performance comment based ONLY on the metrics provided.

Requirements:
- Length must be between 800 and 1200 characters (including spaces).
- Address the employee directly using "You" / "Your".
- Do NOT include the employee ID.
- Do NOT invent facts.
- Maintain a professional and concise tone.
- Avoid excessive breakdown of every metric.
- Do NOT list all numbers repeatedly — reference only the most impactful ones.
- End with a complete sentence.
${isExcellentPerformance ? `- Structure requirement: Use exactly 2 paragraphs separated by a single blank line.
  1) Paragraph 1: celebrate the excellent performance, highlight all strong scoring areas with specific scores.
  2) Paragraph 2: encourage the employee to sustain this level of performance, mention keeping ClickUp tasks up to date and maintaining consistent work habits. Do NOT mention any improvement areas or suggest anything needs fixing.` : `- Use exactly 3 paragraphs separated by a single blank line. Do not add line breaks within a paragraph.
- Highlight the 1–2 strongest areas.
- Clearly identify the 1–2 most critical performance issues.
- Provide practical improvement guidance (4–6 clear, specific actions).
- For each LOW category, include one concrete action with timing/ownership detail (for example: daily planning, end-of-day review, weekly target).
- IMPORTANT: If there are ANY overdue tasks (All overdue tasks > 0), it MUST be mentioned as an area requiring immediate attention and improvement.
- CRITICAL: If any category is marked LOW, you MUST explicitly mention EACH low category by exact name and explain one concrete improvement action for each.
- CRITICAL: If Task Priority Handling direct deduction is greater than 0, you MUST explicitly mention the deduction amount and cause in paragraph 2 or 3 using the provided deduction summary.
- When Task Priority Handling is discussed, explain the actual direct deduction reason using the provided deduction summary. Make clear that assigned tasks with no priority do cause a deduction even if completed.
- Structure requirement (must follow):
  1) Paragraph 1: what is good (strengths and positive outcomes),
  2) Paragraph 2: critical areas needing immediate correction,
  3) Paragraph 3: detailed improvement plan with concrete next steps.
- In paragraph 2 or 3, explicitly instruct the employee to manage tasks properly in ClickUp.`}
${noWorkHoursEntered ? "- CRITICAL: If actual work hours is 0, you MUST include this exact note in the first paragraph: 'IMPORTANT: You must enter and track your work hours in the time tracking system. Failure to record work hours will result in performance evaluation issues and may affect your employment status.'" : ""}
${workAuthorizationStatus === "H-1B" ? "- IMPORTANT: For work hours, do NOT mention specific hours (like '8h / 40h'). Instead, just say whether the employee 'fulfilled' or 'failed to fulfill' assigned work hours. For example: 'You fulfilled assigned work hours' or 'You failed to fulfill assigned work hours'." : ""}
${needsUrgentImprovement ?
  "- Because the total score is below 70, include this warning sentence in paragraph 2 (do not add a 4th paragraph): This week's performance score is below 70%. If the monthly average falls below 70%, it will trigger a formal warning review. Three confirmed warnings may result in reduction of hours or termination. Please take corrective action in ClickUp immediately." :
  ""}

Focus on clarity, priority, and improvement — not full statistical explanation.

Weekly performance metrics:
- Total score: ${score.totalScore} (${rating})
- Work hours: ${record.actualWorkHours}h actual / ${record.plannedWorkHours}h planned (Work Hours Fulfillment: ${score.workHoursFulfillment}/25)
- Task priority handling score: ${score.taskPriorityHandling}/20
- Task priority handling deduction summary: ${taskPriorityDeductionSummary}
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
- Category status: Work Hours Fulfillment=${score.workHoursFulfillment < workHoursThreshold ? "LOW" : "OK"}, Task Priority Handling=${score.taskPriorityHandling < taskPriorityThreshold ? "LOW" : "OK"}, Task Completion Rate=${score.taskCompletionRate < taskCompletionThreshold ? "LOW" : "OK"}, Past Due Task Management=${score.pastDueTaskManagement < pastDueThreshold ? "LOW" : "OK"}
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
        " Keep it between 800 and 1200 characters. If it is too short, add more specific improvement steps and expected outcomes for each low category."
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
      const isLengthOk = content.length >= 800 && content.length <= 1200;
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

    if (finalContent.length < 800) {
      finalContent = buildWeeklyFallbackComment({
        totalScore: score.totalScore,
        rating,
        record,
        taskPriorityDeductionSummary,
        hasTaskPriorityDeduction,
        score: {
          workHoursFulfillment: score.workHoursFulfillment,
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
