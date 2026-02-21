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
        
        // Set title immediately with available data
        const startDate = data.record.startDate.replace(/-/g, '');
        const newTitle = `Weekly Performance Report_${data.employeeName}_${startDate}`;
        document.title = newTitle;
        console.log('Setting document title to:', newTitle);
      } catch (error) {
        console.error("Failed to parse evaluation data:", error);
      }
    } else {
      console.log("No evaluation data found in sessionStorage");
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
