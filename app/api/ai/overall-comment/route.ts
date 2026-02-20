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

Goal:
Write a focused and practical weekly performance comment based ONLY on the metrics provided.

Requirements:
- Length must be between 600 and 1000 characters (including spaces).
- Use 3 paragraphs separated by a single blank line. Do not add line breaks within a paragraph.
- Address the employee directly using "You" / "Your".
- Do NOT include the employee ID.
- Do NOT invent facts.
- Maintain a professional and concise tone.
- Highlight the 1–2 strongest areas.
- Clearly identify the 1–2 most critical performance issues.
- Provide practical improvement guidance (2–3 clear actions).
- Avoid excessive breakdown of every metric.
- Do NOT list all numbers repeatedly — reference only the most impactful ones.
- End with a complete sentence.

Focus on clarity, priority, and improvement — not full statistical explanation.

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

Flag:
- Total score below 70: ${needsUrgentImprovement ? "YES" : "NO"}

Return the full evaluation comment only.`;

    const buildPrompt = (attempt: number) => {
      if (attempt === 1) {
        return promptBase + "\n\nIf the output is at risk of truncation, finish the sentence before ending.";
      }
      return (
        promptBase +
        "\n\nIf the output is truncated, regenerate it with complete sentences and a full ending." +
        " Keep it between 600 and 1000 characters."
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
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const result = await generateOnce(attempt);
      if (result.error) {
        const statusCode = result.status === 429 ? 429 : 500;
        const isQuotaError =
          typeof result.error === "string" &&
          result.error.includes("RESOURCE_EXHAUSTED");
        return NextResponse.json(
          {
            error: isQuotaError ? "GEMINI_QUOTA_EXCEEDED" : "Gemini request failed",
            details: result.error,
          },
          { status: statusCode }
        );
      }

      const content = result.content || "";
      const isLengthOk = content.length >= 600 && content.length <= 1000;
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
