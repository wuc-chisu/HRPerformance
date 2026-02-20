import { WeeklyRecord } from "./employees";

export interface PerformanceScore {
  workHoursFulfillment: number;
  taskPriorityHandling: number;
  taskCompletionRate: number;
  pastDueTaskManagement: number;
  totalScore: number;
}

/**
 * Calculate Work Hours Fulfillment score (25% weight)
 * Formula: min((actualHours / plannedHours) * 25, 25)
 * - Full 25 points if actual >= planned
 * - Proportional score if actual < planned
 */
export function calculateWorkHoursFulfillment(
  actualWorkHours: number,
  plannedWorkHours: number
): number {
  if (plannedWorkHours === 0) return 0;
  
  const score = (actualWorkHours / plannedWorkHours) * 25;
  return Math.min(score, 25);
}

/**
 * Calculate Task Priority Handling score (20% weight)
 * This evaluates how many assigned tasks have a defined priority (urgent/high/normal/low)
 * vs tasks with no priority
 * 
 * Formula:
 * (tasks with priority) / (total assigned tasks) = result percentage
 * 
 * Scoring bands:
 * ≥ 90%: 20 points
 * 70-89%: 15 points
 * 50-69%: 10 points
 * 30-49%: 5 points
 * < 30%: 0 points
 */
export function calculateTaskPriorityHandling(
  record: WeeklyRecord
): number {
  const taskDetails = record.assignedTasksDetails || [];
  const totalAssignedTasks = record.assignedTasks;

  if (totalAssignedTasks === 0) {
    // If no tasks assigned, full points for priority handling
    return 20;
  }

  // Count tasks that have a priority (not "no priority")
  const tasksWithPriority = taskDetails
    .filter((detail) => detail.priority !== "no priority")
    .reduce((sum, detail) => sum + detail.count, 0);

  const priorityPercentage = (tasksWithPriority / totalAssignedTasks) * 100;

  if (priorityPercentage >= 90) return 20;
  if (priorityPercentage >= 70) return 15;
  if (priorityPercentage >= 50) return 10;
  if (priorityPercentage >= 30) return 5;
  return 0;
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
 * Priority weights (different from task completion - no priority is 1 point):
 * - Urgent: 3 points per task
 * - High: 2 points per task
 * - Normal: 1 point per task
 * - No Priority: 1 point per task
 * 
 * Formula:
 * 1. Calculate Total Overdue Weighted Value from allOverdueTasksDetails
 * 2. Calculate Total Assigned Weighted Value from assignedTasksDetails
 * 3. Weighted Overdue Ratio = Overdue Weighted / (Overdue Weighted + Assigned Weighted)
 * 4. Score based on ratio bands (max 30 points)
 */
export function calculatePastDueTaskManagement(record: WeeklyRecord): number {
  const allOverdueDetails = record.allOverdueTasksDetails || [];
  const assignedDetails = record.assignedTasksDetails || [];

  // Priority weights for past due management (no priority = 1 point)
  const overdueWeights: Record<string, number> = {
    urgent: 3,
    high: 2,
    normal: 1,
    "no priority": 1,
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
 * - Work Hours Fulfillment: 25%
 * - Task Priority Handling: 20%
 * - Task Completion Rate: 25%
 * - Past Due Task Management: 30%
 */
export function calculateWeeklyPerformanceScore(
  record: WeeklyRecord
): PerformanceScore {
  const workHoursFulfillment = calculateWorkHoursFulfillment(
    record.actualWorkHours,
    record.plannedWorkHours
  );
  const taskPriorityHandling = calculateTaskPriorityHandling(record);
  const taskCompletionRate = calculateTaskCompletionRate(record);
  const pastDueTaskManagement = calculatePastDueTaskManagement(record);

  const totalScore =
    workHoursFulfillment +
    taskPriorityHandling +
    taskCompletionRate +
    pastDueTaskManagement;

  return {
    workHoursFulfillment,
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
