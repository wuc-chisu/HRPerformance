import { WeeklyRecord } from "./employees";

export interface PerformanceScore {
  scoringVersion: PerformanceScoringVersion;
  workHoursFulfillment: number;
  qualityOfWork: number;
  taskPriorityHandling: number;
  taskCompletionRate: number;
  pastDueTaskManagement: number;
  totalScore: number;
}

export type PerformanceScoringVersion = "LEGACY_WORK_HOURS" | "QUALITY_OF_WORK";

export interface QualityOfWorkScoringBand {
  ratingRange: string;
  points: number;
}

const QUALITY_OF_WORK_CUTOFF = "2026-08-16";

export function getPerformanceScoringVersion(
  recordDate: string | Date
): PerformanceScoringVersion {
  const date =
    recordDate instanceof Date
      ? recordDate.toISOString().slice(0, 10)
      : recordDate.slice(0, 10);
  return date < QUALITY_OF_WORK_CUTOFF
    ? "LEGACY_WORK_HOURS"
    : "QUALITY_OF_WORK";
}

export interface TaskPriorityHandlingBreakdown {
  urgentOverdue: number;
  highOverdue: number;
  normalOverdue: number;
  noPriorityAssigned: number;
  noWorkCompleted: boolean;
  totalDeduction: number;
}

export function calculateWorkHoursFulfillment(
  actualWorkHours: number,
  plannedWorkHours: number
): number {
  if (plannedWorkHours <= 0) return 25;
  return Math.min((actualWorkHours / plannedWorkHours) * 25, 25);
}

export function calculateQualityOfWork(averageRating: number | null | undefined): number {
  if (averageRating == null || !Number.isFinite(averageRating) || averageRating < 1 || averageRating > 5) {
    return 0;
  }
  if (averageRating < 1.5) return 0;
  if (averageRating < 2.5) return 10;
  if (averageRating < 3.5) return 15;
  if (averageRating < 4.5) return 20;
  return 25;
}

export function getQualityOfWorkScoringBand(
  averageRating: number | null | undefined
): QualityOfWorkScoringBand | null {
  if (averageRating == null || !Number.isFinite(averageRating) || averageRating < 1 || averageRating > 5) {
    return null;
  }
  if (averageRating < 1.5) return { ratingRange: "1.00-1.49", points: 0 };
  if (averageRating < 2.5) return { ratingRange: "1.50-2.49", points: 10 };
  if (averageRating < 3.5) return { ratingRange: "2.50-3.49", points: 15 };
  if (averageRating < 4.5) return { ratingRange: "3.50-4.49", points: 20 };
  return { ratingRange: "4.50-5.00", points: 25 };
}

/**
 * Calculate Task Priority Handling score (20% weight)
 *
 * Deduction per overdue task:
 * - Urgent: -4 points each
 * - High:   -3 points each
 * - Normal: -2 points each
 * Deduction per assigned task with no priority:
 * - No Priority: -1 point each
 *
 * Formula:
 *   totalDeduction = (overdueUrgent × 4) + (overdueHigh × 3) + (overdueNormal × 2) + (assignedNoPriority × 1)
 *   finalScore     = max(0, 20 − totalDeduction)
 *
 * If tasks were assigned and every one is weekly overdue (no work completed),
 * the score is 0.
 *
 * Returns: Numeric score (0–20)
 */
export function getTaskPriorityHandlingBreakdown(
  record: WeeklyRecord
): TaskPriorityHandlingBreakdown {
  const weeklyOverdueDetails = record.overdueTasksDetails || [];
  const assignedDetails = record.assignedTasksDetails || [];

  const overdueUrgent =
    weeklyOverdueDetails.find((d) => d.priority === "urgent")?.count || 0;
  const overdueHigh =
    weeklyOverdueDetails.find((d) => d.priority === "high")?.count || 0;
  const overdueNormal =
    weeklyOverdueDetails.find((d) => d.priority === "normal")?.count || 0;
  const noPriorityAssigned =
    assignedDetails.find((d) => d.priority === "no priority")?.count || 0;

  const assignedCount = assignedDetails.reduce((sum, d) => sum + d.count, 0);
  const overdueCount = weeklyOverdueDetails.reduce((sum, d) => sum + d.count, 0);
  const noWorkCompleted = assignedCount > 0 && overdueCount >= assignedCount;

  const totalDeduction = noWorkCompleted
    ? 20
    : overdueUrgent * 4 + overdueHigh * 3 + overdueNormal * 2 + noPriorityAssigned;

  return {
    urgentOverdue: overdueUrgent,
    highOverdue: overdueHigh,
    normalOverdue: overdueNormal,
    noPriorityAssigned,
    noWorkCompleted,
    totalDeduction,
  };
}

export function calculateTaskPriorityHandling(
  record: WeeklyRecord
): number {
  const { totalDeduction } = getTaskPriorityHandlingBreakdown(record);

  return Math.max(0, 20 - totalDeduction);
}

/**
 * Calculate Task Completion Rate score (25% weight)
 * This uses priority-weighted scoring where each priority level has different point values:
 * - Urgent: 3 points per task
 * - High: 2 points per task
 * - Normal: 1 point per task
 * - No Priority: 0.5 points per task
 * 
 * Formula:
 * 1. Calculate total weighted value from assigned tasks
 * 2. Calculate incomplete weighted value from overdue tasks
 * 3. Completed weighted value = Total - Incomplete
 * 4. Completion rate = Completed / Total
 * 5. Score = Completion rate × 25 (max 25 points)
 */
export function calculateTaskCompletionRate(record: WeeklyRecord): number {
  const assignedDetails = record.assignedTasksDetails || [];
  const overdueDetails = record.overdueTasksDetails || [];

  // Priority point values
  const priorityWeights: Record<string, number> = {
    urgent: 3,
    high: 2,
    normal: 1,
    "no priority": 0.5,
  };

  // Calculate total weighted value from assigned tasks
  const totalWeightedValue = assignedDetails.reduce((sum, detail) => {
    const weight = priorityWeights[detail.priority] || 0;
    return sum + detail.count * weight;
  }, 0);

  if (totalWeightedValue === 0) {
    // No tasks assigned, full points
    return 25;
  }

  // Calculate incomplete weighted value from overdue tasks
  const incompleteWeightedValue = overdueDetails.reduce((sum, detail) => {
    const weight = priorityWeights[detail.priority] || 0;
    return sum + detail.count * weight;
  }, 0);

  // Calculate completed weighted value
  const completedWeightedValue = totalWeightedValue - incompleteWeightedValue;

  // Calculate completion rate (between 0 and 1)
  const completionRate = completedWeightedValue / totalWeightedValue;

  // Convert to score (max 25 points)
  return completionRate * 25;
}

/**
 * Calculate Past Due Task Management score (30% weight)
 * This evaluates how well the employee manages overdue tasks using weighted ratio
 * 
 * Priority weights (different from task completion - no priority is 2 points):
 * - Urgent: 4 points per task
 * - High: 3 points per task
 * - Normal: 2 points per task
 * - No Priority: 2 points per task
 * 
 * Formula:
 * 1. Calculate Total Overdue Weighted Value from allOverdueTasksDetails
 * 2. Calculate Total Assigned Weighted Value from assignedTasksDetails
 * 3. Weighted Overdue Ratio = Overdue Weighted / (Overdue Weighted + Assigned Weighted)
 * 4. Score based on ratio bands (max 30 points)
 *
 * Override: if assigned, weekly overdue and all overdue task counts are equal
 * (and above 0), nothing was done and the score is 0.
 */
export function calculatePastDueTaskManagement(record: WeeklyRecord): number {
  const allOverdueDetails = record.allOverdueTasksDetails || [];
  const assignedDetails = record.assignedTasksDetails || [];

  // Priority weights for past due management
  const overdueWeights: Record<string, number> = {
    urgent: 4,
    high: 3,
    normal: 2,
    "no priority": 2,
  };

  // Priority weights for assigned tasks (no priority = 0.5 point)
  const assignedWeights: Record<string, number> = {
    urgent: 3,
    high: 2,
    normal: 1,
    "no priority": 0.5,
  };

  // Calculate total overdue weighted value
  const totalOverdueWeighted = allOverdueDetails.reduce((sum, detail) => {
    const weight = overdueWeights[detail.priority] || 0;
    return sum + detail.count * weight;
  }, 0);

  // Calculate total assigned weighted value
  const totalAssignedWeighted = assignedDetails.reduce((sum, detail) => {
    const weight = assignedWeights[detail.priority] || 0;
    return sum + detail.count * weight;
  }, 0);

  // Nothing was done: assigned = weekly overdue = all overdue
  const sumCounts = (details: { count: number }[]) =>
    details.reduce((sum, d) => sum + d.count, 0);
  const assignedCount = sumCounts(assignedDetails);
  if (
    assignedCount > 0 &&
    sumCounts(record.overdueTasksDetails || []) === assignedCount &&
    sumCounts(allOverdueDetails) === assignedCount
  ) {
    return 0;
  }

  // If no tasks assigned and no overdue, full score
  if (totalOverdueWeighted === 0 && totalAssignedWeighted === 0) {
    return 30;
  }

  // If no overdue tasks, full score
  if (totalOverdueWeighted === 0) {
    return 30;
  }

  // Calculate weighted overdue ratio (as percentage)
  const weightedOverdueRatio =
    (totalOverdueWeighted / (totalOverdueWeighted + totalAssignedWeighted)) * 100;

  // Score bands
  if (weightedOverdueRatio === 0) return 30;
  if (weightedOverdueRatio <= 10) return 25;
  if (weightedOverdueRatio <= 25) return 20;
  if (weightedOverdueRatio <= 40) return 15;
  if (weightedOverdueRatio <= 60) return 10;
  if (weightedOverdueRatio <= 75) return 5;
  return 0;
}

/**
 * Calculate total weekly performance score (100 points)
 * Weights:
 * - Work Hours Fulfillment or Quality of Work: 25%, based on record date
 * - Task Priority Handling: 20%
 * - Task Completion Rate: 25%
 * - Past Due Task Management: 30%
 */
export function calculateWeeklyPerformanceScore(
  record: WeeklyRecord
): PerformanceScore {
  const scoringVersion = getPerformanceScoringVersion(record.startDate);
  const workHoursFulfillment =
    scoringVersion === "LEGACY_WORK_HOURS"
      ? calculateWorkHoursFulfillment(record.actualWorkHours, record.plannedWorkHours)
      : 0;
  const qualityOfWork =
    scoringVersion === "QUALITY_OF_WORK"
      ? calculateQualityOfWork(record.averageQualityOfWorkScore)
      : 0;
  const taskPriorityHandling = calculateTaskPriorityHandling(record);
  const taskCompletionRate = calculateTaskCompletionRate(record);
  const pastDueTaskManagement = calculatePastDueTaskManagement(record);

  const totalScore =
    (scoringVersion === "LEGACY_WORK_HOURS"
      ? workHoursFulfillment
      : qualityOfWork) +
    taskPriorityHandling +
    taskCompletionRate +
    pastDueTaskManagement;

  return {
    scoringVersion,
    workHoursFulfillment,
    qualityOfWork,
    taskPriorityHandling,
    taskCompletionRate,
    pastDueTaskManagement,
    totalScore: Math.round(totalScore * 100) / 100, // Round to 2 decimal places
  };
}

/**
 * Get performance rating based on total score
 */
export function getPerformanceRating(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Very Good";
  if (score >= 70) return "Good";
  return "Below Expectation";
}

/**
 * Get performance color based on score
 */
export function getPerformanceColor(score: number): string {
  if (score >= 90) return "text-green-600";
  if (score >= 80) return "text-green-500";
  if (score >= 70) return "text-blue-600";
  return "text-red-600";
}

/**
 * Get background color based on score
 */
export function getPerformanceBgColor(score: number): string {
  if (score >= 90) return "bg-green-100";
  if (score >= 80) return "bg-green-50";
  if (score >= 70) return "bg-blue-100";
  return "bg-red-100";
}
