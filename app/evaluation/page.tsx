"use client";

import { useEffect, useState } from "react";
import { WeeklyRecord } from "@/lib/employees";
import WeeklyPerformanceEvaluation from "@/components/WeeklyPerformanceEvaluation";

export default function EvaluationPage() {
  const [evaluationData, setEvaluationData] = useState<{
    record: WeeklyRecord;
    employeeName: string;
    employeeId?: string;
  } | null>(null);

  useEffect(() => {
    // Get data from sessionStorage
    const dataStr = sessionStorage.getItem("evaluationData");
    if (dataStr) {
      try {
        const data = JSON.parse(dataStr);
        setEvaluationData(data);
      } catch (error) {
        console.error("Failed to parse evaluation data:", error);
      }
    }
  }, []);

  if (!evaluationData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Loading evaluation data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <WeeklyPerformanceEvaluation
          record={evaluationData.record}
          employeeName={evaluationData.employeeName}
          employeeId={evaluationData.employeeId}
        />
      </div>
    </div>
  );
}
