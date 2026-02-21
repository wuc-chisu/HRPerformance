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

  // Set initial title immediately to override root layout
  useEffect(() => {
    document.title = "Weekly Performance Report";
  }, []);

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

  // Set document title when evaluation data loads
  useEffect(() => {
    if (evaluationData) {
      // Format date as YYYYMMDD (8 digits)
      const startDate = evaluationData.record.startDate.replace(/-/g, '');
      const newTitle = `Weekly Performance Report_${evaluationData.employeeName}_${startDate}`;
      console.log('Setting document title to:', newTitle);
      document.title = newTitle;
    }
  }, [evaluationData]);

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
