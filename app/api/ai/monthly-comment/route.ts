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

    const promptBase = `You are a professional HR performance evaluation assistant.

Goal:
Write a focused monthly performance summary based on weekly performance data.

Requirements:
- Length must be between 400 and 700 characters (including spaces).
- Use 2 paragraphs separated by a single blank line. Do not add line breaks within a paragraph.
- Address the employee directly using "You" / "Your".
- Do NOT include the employee ID or name.
- Do NOT invent facts.
- Maintain a professional and concise tone.
- Highlight 1-2 key strengths observed over the month.
- Identify 1-2 areas needing improvement or continued focus.
- Provide practical guidance (1-2 actionable steps).
- End with a complete sentence.
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

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: promptBase }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1500,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const isQuotaError = errorText.includes("RESOURCE_EXHAUSTED");
      return NextResponse.json(
        {
          error: isQuotaError ? "GEMINI_QUOTA_EXCEEDED" : "Gemini request failed",
          details: errorText,
        },
        { status: response.status === 429 ? 429 : 500 }
      );
    }

    const data = await response.json();
    let content = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!content) {
      return NextResponse.json(
        { error: "No content returned from Gemini" },
        { status: 500 }
      );
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
