import { NextResponse } from "next/server";

interface MonthlyCommentRequest {
  employeeName?: string;
  employeeId?: string;
  year: number;
  month: number;
  monthName: string;
  weeklyScores: Array<{
    startDate: string;
    endDate: string;
    totalScore: number;
    rating: string;
    breakdown: {
      workHoursFulfillment: number;
      taskPriorityHandling: number;
      taskCompletionRate: number;
      pastDueTaskManagement: number;
    };
  }>;
  monthlyAverage: number;
  monthlyRating: string;
  workAuthorizationStatus?: string;
}

function buildMonthlyFallbackComment(params: {
  monthName: string;
  year: number;
  monthlyAverage: number;
  monthlyRating: string;
  weeklyCount: number;
  avgWorkHours: number;
  avgPriority: number;
  avgCompletion: number;
  avgPastDue: number;
  trend: string;
  lowAreas: string[];
}) {
  const {
    monthName,
    year,
    monthlyAverage,
    monthlyRating,
    weeklyCount,
    avgWorkHours,
    avgPriority,
    avgCompletion,
    avgPastDue,
    trend,
    lowAreas,
  } = params;

  const strengths: string[] = [];
  if (avgPriority >= 16) {
    strengths.push("your task priority handling remained strong across the month");
  }
  if (avgCompletion >= 20) {
    strengths.push("your task completion consistency supported steady execution");
  }
  if (avgWorkHours >= 20) {
    strengths.push("you generally fulfilled work hour expectations and maintained reliable contribution");
  }
  if (strengths.length === 0) {
    strengths.push("you maintained engagement and completed key assignments during the evaluation period");
  }

  const paragraphOne =
    `Your ${monthName} ${year} monthly performance average is ${monthlyAverage.toFixed(2)} (${monthlyRating}) based on ${weeklyCount} evaluated weeks, with an overall ${trend} trend. ` +
    `${strengths.slice(0, 2).join(". ")}. ` +
    `These results show that your baseline capability is solid when priorities are managed consistently.`;

  const lowAreaText = lowAreas.length
    ? lowAreas.join(", ")
    : "Past Due Task Management";
  const paragraphTwo =
    `Critical areas now require immediate correction: ${lowAreaText}. ` +
    `Your category averages are Work Hours Fulfillment ${avgWorkHours.toFixed(1)}/25, Task Priority Handling ${avgPriority.toFixed(1)}/20, Task Completion Rate ${avgCompletion.toFixed(1)}/25, and Past Due Task Management ${avgPastDue.toFixed(1)}/30, which indicates ongoing execution gaps that must be addressed right away. ` +
    `Please correct this immediately to prevent continued risk to overall monthly performance.`;

  const paragraphThree =
    `To improve, use ClickUp as your daily control system: begin each day with a priority review, complete urgent and high-priority tasks before lower-priority items, and update every task status by end-of-day. ` +
    `Set weekly goals to reduce overdue items, split complex work into smaller subtasks with clear deadlines, and escalate blockers early for support. ` +
    `This disciplined ClickUp workflow will improve completion reliability, reduce past due exposure, and increase your monthly category scores in a measurable way.`;

  let fallback = `${paragraphOne}\n\n${paragraphTwo}\n\n${paragraphThree}`;

  if (fallback.length < 800) {
    fallback +=
      " You should also conduct a mid-week ClickUp checkpoint to verify target progress and ensure corrective actions are being completed on schedule.";
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
    const body = (await request.json()) as MonthlyCommentRequest;
    const {
      employeeName,
      year,
      month,
      monthName,
      weeklyScores,
      monthlyAverage,
      monthlyRating,
      workAuthorizationStatus,
    } = body || {};

    if (!weeklyScores || weeklyScores.length === 0) {
      return NextResponse.json(
        { error: "No weekly scores provided" },
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

    // Calculate trend
    const scores = weeklyScores.map(ws => ws.totalScore);
    let trend = "stable";
    if (scores.length >= 2) {
      const firstHalf = scores.slice(0, Math.ceil(scores.length / 2));
      const secondHalf = scores.slice(Math.ceil(scores.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      const diff = secondAvg - firstAvg;
      
      if (Math.abs(diff) >= 3) {
        trend = diff > 0 ? "improving" : "declining";
      }
    }

    // Find best and worst weeks
    const sortedByScore = [...weeklyScores].sort((a, b) => b.totalScore - a.totalScore);
    const bestWeek = sortedByScore[0];
    const worstWeek = sortedByScore[sortedByScore.length - 1];

    // Calculate average breakdown scores
    const avgWorkHours = weeklyScores.reduce((sum, ws) => sum + ws.breakdown.workHoursFulfillment, 0) / weeklyScores.length;
    const avgPriority = weeklyScores.reduce((sum, ws) => sum + ws.breakdown.taskPriorityHandling, 0) / weeklyScores.length;
    const avgCompletion = weeklyScores.reduce((sum, ws) => sum + ws.breakdown.taskCompletionRate, 0) / weeklyScores.length;
    const avgPastDue = weeklyScores.reduce((sum, ws) => sum + ws.breakdown.pastDueTaskManagement, 0) / weeklyScores.length;

    const needsUrgentImprovement = monthlyAverage < 70;
    const workHoursThreshold = 17.5;
    const taskPriorityThreshold = 14;
    const taskCompletionThreshold = 17.5;
    const pastDueThreshold = 21;
    const lowAreas: string[] = [];

    if (avgWorkHours < workHoursThreshold) {
      lowAreas.push("Work Hours Fulfillment");
    }
    if (avgPriority < taskPriorityThreshold) {
      lowAreas.push("Task Priority Handling");
    }
    if (avgCompletion < taskCompletionThreshold) {
      lowAreas.push("Task Completion Rate");
    }
    if (avgPastDue < pastDueThreshold) {
      lowAreas.push("Past Due Task Management");
    }

    const promptBase = `You are a professional HR performance evaluation assistant.

Goal:
Write a focused monthly performance summary based on weekly performance data.

Requirements:
- Length must be between 800 and 1200 characters (including spaces).
- Use exactly 3 paragraphs separated by a single blank line. Do not add line breaks within a paragraph.
- Address the employee directly using "You" / "Your".
- Do NOT include the employee ID or name.
- Do NOT invent facts.
- Maintain a professional and concise tone.
- Highlight 1-2 key strengths observed over the month.
- Identify 1-3 areas needing improvement or continued focus.
- Provide practical guidance (4-6 clear, actionable steps).
- For each LOW category, include one concrete action with timing/ownership detail (for example: daily planning, end-of-day review, weekly target).
- End with a complete sentence.
- CRITICAL: If any category is marked LOW in the input, you MUST explicitly mention EACH low category by exact name and provide one concrete improvement action for each. Do not skip any LOW category.
- Structure requirement (must follow):
  1) Paragraph 1: what is good (monthly strengths),
  2) Paragraph 2: critical areas needing immediate correction,
  3) Paragraph 3: detailed improvement plan.
- In paragraph 2 or 3, explicitly instruct the employee to manage tasks properly in ClickUp.
${needsUrgentImprovement ? "- CRITICAL: Because monthly average is below 70%, emphasize this requires immediate improvement and mention the formal warning policy." : ""}

Monthly performance data for ${monthName} ${year}:
- Monthly average score: ${monthlyAverage.toFixed(2)} (${monthlyRating})
- Number of weeks evaluated: ${weeklyScores.length}
- Performance trend: ${trend}
- Best week score: ${bestWeek.totalScore.toFixed(2)} (${bestWeek.rating})
- Lowest week score: ${worstWeek.totalScore.toFixed(2)} (${worstWeek.rating})

Average scores by category:
- Work Hours Fulfillment: ${avgWorkHours.toFixed(1)}/25
- Task Priority Handling: ${avgPriority.toFixed(1)}/20
- Task Completion Rate: ${avgCompletion.toFixed(1)}/25
- Past Due Task Management: ${avgPastDue.toFixed(1)}/30

Category status:
- Work Hours Fulfillment: ${avgWorkHours < workHoursThreshold ? "LOW" : "OK"}
- Task Priority Handling: ${avgPriority < taskPriorityThreshold ? "LOW" : "OK"}
- Task Completion Rate: ${avgCompletion < taskCompletionThreshold ? "LOW" : "OK"}
- Past Due Task Management: ${avgPastDue < pastDueThreshold ? "LOW" : "OK"}
- LOW categories that MUST be addressed: ${lowAreas.length ? lowAreas.join(", ") : "none"}

Weekly scores: ${weeklyScores.map(ws => ws.totalScore.toFixed(1)).join(", ")}

Return only the monthly summary comment.`;

    const listUrl =
      "https://generativelanguage.googleapis.com/v1beta/models" +
      `?key=${apiKey}`;

    const listResponse = await fetch(listUrl);
    if (!listResponse.ok) {
      const listError = await listResponse.text();
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
            maxOutputTokens: 2000,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { error: errorText, status: response.status };
      }

      const data = await response.json();
      const content = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!content) {
        return { error: "No content returned from Gemini" };
      }

      return { content };
    };

    let content = "";
    for (let attempt = 1; attempt <= 3; attempt += 1) {
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

      const nextContent = result.content || "";
      const isLengthOk = nextContent.length >= 800 && nextContent.length <= 1200;
      const endsWithSentence = /[.!?]$/.test(nextContent);

      content = nextContent;
      if (isLengthOk && endsWithSentence) {
        break;
      }
    }

    if (!content) {
      return NextResponse.json(
        { error: "No content returned from Gemini" },
        { status: 500 }
      );
    }

    if (content.length < 800) {
      content = buildMonthlyFallbackComment({
        monthName,
        year,
        monthlyAverage,
        monthlyRating,
        weeklyCount: weeklyScores.length,
        avgWorkHours,
        avgPriority,
        avgCompletion,
        avgPastDue,
        trend,
        lowAreas,
      });
    }

    // Trim to last complete sentence if needed
    if (!/[.!?]$/.test(content)) {
      const lastPunctuationIndex = Math.max(
        content.lastIndexOf('.'),
        content.lastIndexOf('!'),
        content.lastIndexOf('?')
      );
      
      if (lastPunctuationIndex > -1) {
        content = content.substring(0, lastPunctuationIndex + 1);
      } else {
        content = `${content.trim()}.`;
      }
    }

    return NextResponse.json({ comment: content });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate monthly comment", details: String(error) },
      { status: 500 }
    );
  }
}
