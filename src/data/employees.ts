// Employee and performance data
export interface WeeklyRecord {
  week: number; // Week number
  date: string; // ISO date format YYYY-MM-DD
  plannedWorkHours: number;
  actualWorkHours: number;
  assignedTasks: number;
  weeklyOverdueTasks: number;
}

export interface Employee {
  id: string;
  name: string;
  department: string;
  position: string;
  joinDate: string;
  overallOverdueTasks: number;
  weeklyRecords: WeeklyRecord[];
}

// Sample employee data
export const employees: Employee[] = [
  {
    id: "EMP-001",
    name: "John Smith",
    department: "Engineering",
    position: "Senior Developer",
    joinDate: "2020-01-15",
    overallOverdueTasks: 2,
    weeklyRecords: [
      {
        week: 1,
        date: "2025-02-10",
        plannedWorkHours: 40,
        actualWorkHours: 42,
        assignedTasks: 8,
        weeklyOverdueTasks: 0,
      },
      {
        week: 2,
        date: "2025-02-03",
        plannedWorkHours: 40,
        actualWorkHours: 39,
        assignedTasks: 7,
        weeklyOverdueTasks: 1,
      },
      {
        week: 3,
        date: "2025-01-27",
        plannedWorkHours: 40,
        actualWorkHours: 40,
        assignedTasks: 9,
        weeklyOverdueTasks: 1,
      },
    ],
  },
  {
    id: "EMP-002",
    name: "Sarah Johnson",
    department: "Product",
    position: "Product Manager",
    joinDate: "2021-06-20",
    overallOverdueTasks: 0,
    weeklyRecords: [
      {
        week: 1,
        date: "2025-02-10",
        plannedWorkHours: 40,
        actualWorkHours: 44,
        assignedTasks: 12,
        weeklyOverdueTasks: 0,
      },
      {
        week: 2,
        date: "2025-02-03",
        plannedWorkHours: 40,
        actualWorkHours: 41,
        assignedTasks: 11,
        weeklyOverdueTasks: 0,
      },
      {
        week: 3,
        date: "2025-01-27",
        plannedWorkHours: 40,
        actualWorkHours: 40,
        assignedTasks: 10,
        weeklyOverdueTasks: 0,
      },
    ],
  },
  {
    id: "EMP-003",
    name: "Michael Chen",
    department: "Design",
    position: "UX Designer",
    joinDate: "2022-03-10",
    overallOverdueTasks: 5,
    weeklyRecords: [
      {
        week: 1,
        date: "2025-02-10",
        plannedWorkHours: 40,
        actualWorkHours: 38,
        assignedTasks: 6,
        weeklyOverdueTasks: 2,
      },
      {
        week: 2,
        date: "2025-02-03",
        plannedWorkHours: 40,
        actualWorkHours: 37,
        assignedTasks: 5,
        weeklyOverdueTasks: 2,
      },
      {
        week: 3,
        date: "2025-01-27",
        plannedWorkHours: 40,
        actualWorkHours: 39,
        assignedTasks: 7,
        weeklyOverdueTasks: 1,
      },
    ],
  },
  {
    id: "EMP-004",
    name: "Emily Rodriguez",
    department: "Marketing",
    position: "Marketing Specialist",
    joinDate: "2023-01-05",
    overallOverdueTasks: 3,
    weeklyRecords: [
      {
        week: 1,
        date: "2025-02-10",
        plannedWorkHours: 40,
        actualWorkHours: 41,
        assignedTasks: 10,
        weeklyOverdueTasks: 0,
      },
      {
        week: 2,
        date: "2025-02-03",
        plannedWorkHours: 40,
        actualWorkHours: 42,
        assignedTasks: 9,
        weeklyOverdueTasks: 1,
      },
      {
        week: 3,
        date: "2025-01-27",
        plannedWorkHours: 40,
        actualWorkHours: 40,
        assignedTasks: 11,
        weeklyOverdueTasks: 2,
      },
    ],
  },
];
