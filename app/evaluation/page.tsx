"use client";

import { useEffect, useState } from "react";
import { WeeklyRecord } from "@/lib/employees";
import WeeklyPerformanceEvaluation from "@/components/WeeklyPerformanceEvaluation";

export default function EvaluationPage() {
  const [evaluationData, setEvaluationData] = useState<{
    record: WeeklyRecord;
    employeeName: string;
    employeeId?: string;
    employeeEmail?: string;
    workAuthorizationStatus?: string;
  } | null>(null);

  const applyTitle = (data?: {
    record: WeeklyRecord;
    employeeName: string;
  }) => {
    if (data) {
      const startDate = data.record.startDate.replace(/-/g, "");
      document.title = `Weekly Performance Report_${data.employeeName}_${startDate}`;
      return;
    }

    document.title = "Weekly Performance Report";
  };

  useEffect(() => {
    applyTitle();
  }, []);

  useEffect(() => {
    // Get data from sessionStorage
    const dataStr = sessionStorage.getItem("evaluationData");
    if (dataStr) {
      try {
        const data = JSON.parse(dataStr);

        // Fetch fresh record from DB to pick up saved managerComment
        const recordId = data?.record?.recordId;
        if (recordId) {
          fetch(`/api/weekly-records/${recordId}`)
            .then((res) => res.ok ? res.json() : null)
            .then((freshRecord) => {
              if (freshRecord) {
                data.record = { ...data.record, ...freshRecord };
              }
              setEvaluationData(data);
              applyTitle(data);
              setTimeout(() => applyTitle(data), 100);
            })
            .catch(() => {
              // Fallback to sessionStorage data if fetch fails
              setEvaluationData(data);
              applyTitle(data);
              setTimeout(() => applyTitle(data), 100);
            });
        } else {
          setEvaluationData(data);
          applyTitle(data);
          setTimeout(() => applyTitle(data), 100);
        }
      } catch (error) {
        console.error("Failed to parse evaluation data:", error);
      }
    } else {
      console.log("No evaluation data found in sessionStorage");
    }
  }, []);

  useEffect(() => {
    if (!evaluationData) {
      return;
    }

    const handleReapplyTitle = () => {
      applyTitle(evaluationData);
    };

    document.addEventListener("visibilitychange", handleReapplyTitle);
    window.addEventListener("focus", handleReapplyTitle);

    return () => {
      document.removeEventListener("visibilitychange", handleReapplyTitle);
      window.removeEventListener("focus", handleReapplyTitle);
    };
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
          employeeEmail={evaluationData.employeeEmail}
          workAuthorizationStatus={evaluationData.workAuthorizationStatus}
        />
      </div>
    </div>
  );
}
