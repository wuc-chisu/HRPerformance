import { NextResponse } from "next/server";
import { WeeklyRecord } from "@/lib/employees";
import {
  calculateWeeklyPerformanceScore,
  getPerformanceRating,
} from "@/lib/performanceScoring";

interface OverallCommentRequest {
  record: WeeklyRecord;
  employeeName?: string;
  employeeId?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OverallCommentRequest;
    const { record, employeeId } = body || {};

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

    const promptBase = `You are a professional HR performance evaluation assistant.

Your task is to generate a structured, objective, and data-driven weekly performance comment.

Strict Rules:
- Base feedback ONLY on the provided metrics.
- Do NOT invent facts.
- Do NOT make personality assumptions.
- Do NOT add unrelated praise.
- Reference specific performance scores in your explanation.
- Provide actionable improvement suggestions tied directly to weak areas.
- Maintain a professional, neutral tone.
- 500–1000 characters.
- Structure the comment into 3 short paragraphs:
  1. Performance Summary
  2. Strengths
  3. Areas for Improvement with Specific Actions

If Total Score is below 70:
- Emphasize urgency for improvement.
- Provide exactly 3 specific improvement actions.
- Avoid overly positive tone.

Address the employee directly using "You" or "Your". Do not include the employee ID.

Weekly performance metrics:
- Total score: ${score.totalScore} (${rating})
- Work hours: ${record.actualWorkHours}h actual / ${record.plannedWorkHours}h planned (Work Hours Fulfillment: ${score.workHoursFulfillment}/25)
- Task priority handling score: ${score.taskPriorityHandling}/20
- Task completion score: ${score.taskCompletionRate}/25
- Past due management score: ${score.pastDueTaskManagement}/30
- Assigned tasks: ${record.assignedTasks}
- Weekly overdue tasks: ${record.weeklyOverdueTasks}
- All overdue tasks: ${record.allOverdueTasks ?? 0}

Task detail breakdowns:
- Assigned tasks by priority: ${assignedBreakdown}
- Weekly overdue tasks by priority: ${overdueBreakdown}
- All overdue tasks by priority: ${allOverdueBreakdown}

Performance flag: Total score below 70 = ${needsUrgentImprovement ? "YES" : "NO"}

Output the 3-paragraph comment only. Do not add headings or bullet points.
Ensure the final paragraph ends with a complete sentence and a period.`;

    const buildPrompt = (attempt: number) => {
      if (attempt === 1) {
        return promptBase + "\n\nIf the output is at risk of truncation, finish the sentence before ending.";
      }
      return (
        promptBase +
        "\n\nIf the output is truncated, regenerate it with complete sentences and a full ending." +
        " Keep it between 500 and 1000 characters."
      );
    };

    const listUrl =
      "https://generativelanguage.googleapis.com/v1beta/models" +
      `?key=${apiKey}`;

    const listResponse = await fetch(listUrl);
    if (!listResponse.ok) {
      const listError = await listResponse.text();
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
            maxOutputTokens: 1400,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { error: errorText };
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
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const result = await generateOnce(attempt);
      if (result.error) {
        return NextResponse.json(
          { error: "Gemini request failed", details: result.error },
          { status: 500 }
        );
      }

      const content = result.content || "";
      const isLengthOk = content.length >= 500 && content.length <= 1000;
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

    if (!/[.!?]$/.test(finalContent)) {
      finalContent = `${finalContent.trim()}.`;
    }

    return NextResponse.json({ comment: finalContent });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate overall comment", details: String(error) },
      { status: 500 }
    );
  }
}
