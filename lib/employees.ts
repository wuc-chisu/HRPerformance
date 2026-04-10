// Employee and performance data
export type TaskPriority = "urgent" | "high" | "normal" | "low" | "no priority";

export interface TaskDetail {
  count: number;
  priority: TaskPriority;
}

export type OverdueTaskDetail = TaskDetail;
export type AssignedTaskDetail = TaskDetail;

export interface WeeklyRecord {
  recordId?: string; // Database ID for the record
  startDate: string; // ISO date format YYYY-MM-DD
  endDate: string; // ISO date format YYYY-MM-DD
  plannedWorkHours: number;
  actualWorkHours: number;
  assignedTasks: number;
  assignedTasksDetails?: AssignedTaskDetail[]; // Breakdown by priority
  weeklyOverdueTasks: number;
  overdueTasksDetails?: OverdueTaskDetail[]; // Breakdown by priority
  allOverdueTasks?: number; // Total overdue tasks from all weeks
  allOverdueTasksDetails?: OverdueTaskDetail[]; // Breakdown by priority for all overdue tasks
  managerComment?: string; // Optional manager comment for performance evaluation
}

export type TimeOffType =
  | "PTO"
  | "SICK_LEAVE"
  | "PERSONAL_LEAVE_UNPAID"
  | "JURY_DUTY"
  | "MEDICAL_LEAVE";

export type TimeOffStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

export interface TimeOffRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  department?: string;
  requestType: TimeOffType;
  status: TimeOffStatus;
  startDate: string;
  endDate: string;
  hours?: number | null;
  reason?: string;
  managerNote?: string;
  approvedAt?: string | null;
  plannedHoursAdjustedAt?: string | null;
  createdAt: string;
}

export interface HolidayRecord {
  id: string;
  name: string;
  date: string;
  year: number;
  workLocation: "USA" | "Taiwan";
  isPaid: boolean;
  notes?: string;
}

export interface OnboardingSystemAccess {
  gmail: boolean;
  clickup: boolean;
  moodle: boolean;
  googleDrive: boolean;
}

export type OnboardingFormStatus = "Pending" | "Submitted" | "Approved";

export interface OnboardingFormItem {
  name: string;
  status: OnboardingFormStatus;
  dateCompleted?: string | null;
  verifiedBy: string;
  url?: string;
  extraUrls?: string[];
}

export const REQUIRED_ONBOARDING_FORMS: string[] = [
  "Application Form",
  "Direct Deposit Form",
  "Self-Identification Form",
  "Background Check Form",
  "Copyright Releasing Authorization Form",
  "Portrait Right Authorization Form",
  "Acknowledgement of Drug and Alcohol-Free Form",
  "Emergency Contact Form",
  "Faculty Handbook Signature Form",
  "Form W-4",
  "Form I-9 (Work Authorization)",
  "Verification Form",
  "Form W-9",
  "ID Copy (U.S. Passport or Green Card)",
  "Current Resume",
  "Copy of Diplomas or Degrees",
  "Official Transcripts",
  "Recent Photo (2x3)",
  "PD Training Certification",
  "Faculty/Staff DE Exam",
  "Generate Orientation Certificate",
  "Notify Admin Assistant: Generate Staff Contract",
  "Notify Compliance Dept: Generate Personnel Report",
  "Read through employee manual",
  "Read catalog and signed",
  "Pass orientation exam (70% or higher)",
  "Annual: PD/CEU Training Certification",
  "Annual: Personnel Report",
  "Annual: FERPA training completed certificate",
  "Annual: Training exam 1/year",
  "Annual: Training exam part 1 reference info",
  "Annual: Training exam part 2 reference info",
  "Annual: Training exam part 3 reference info",
  "Annual: Training exam part 4 reference info",
];

export interface OnboardingState {
  checklistAssigned: boolean;
  enrolled: boolean;
  step1Completed: boolean;
  systemAccess: OnboardingSystemAccess;
  step2Completed: boolean;
  step2Forms: OnboardingFormItem[];
  step3Completed: boolean;
  step4Completed: boolean;
  step5Completed: boolean;
  step6AnnualTracking: boolean;
  step2CompletedAt?: string | null;
  step3CompletedAt?: string | null;
  step4CompletedAt?: string | null;
  step5CompletedAt?: string | null;
  step6StartedAt?: string | null;
  step6LastReviewAt?: string | null;
  updatedBy: string;
  updatedAt?: string | null;
  notes?: string;
}

export interface OnboardingStep1Update {
  systemAccess: OnboardingSystemAccess;
  checklistAssigned: boolean;
  updatedBy: string;
  notes?: string;
}

export interface OnboardingStep2Update {
  forms: OnboardingFormItem[];
}

export type OfficeDay =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday";

export interface OfficeSchedule {
  days: OfficeDay[];
  startTime: string;
  endTime: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  manager: string;
  position: string;
  joinDate: string;
  workAuthorizationStatus?: string;
  staffWorkLocation?: string;
  employeeType?: "Full time" | "Contract";
  contractWorkHours?: number;
  officeSchedule?: OfficeSchedule | null;
  overallOverdueTasks?: number;
  onboarding?: OnboardingState;
  weeklyRecords: WeeklyRecord[];
  timeOffRequests?: TimeOffRequest[];
}

// Sample employee data
export const employees: Employee[] = [
  {
    id: "EMP-001",
    name: "John Smith",
    email: "john.smith@example.com",
    department: "Engineering",
    manager: "David Wilson",
    position: "Senior Developer",
    joinDate: "2020-01-15",
    overallOverdueTasks: 2,
    weeklyRecords: [
      {
        startDate: "2025-02-10",
        endDate: "2025-02-16",
        plannedWorkHours: 40,
        actualWorkHours: 42,
        assignedTasks: 8,
        weeklyOverdueTasks: 0,
      },
      {
        startDate: "2025-02-03",
        endDate: "2025-02-09",
        plannedWorkHours: 40,
        actualWorkHours: 39,
        assignedTasks: 7,
        weeklyOverdueTasks: 1,
      },
      {
        startDate: "2025-01-27",
        endDate: "2025-02-02",
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
    email: "sarah.johnson@example.com",
    department: "Product",
    manager: "Laura Kim",
    position: "Product Manager",
    joinDate: "2021-06-20",
    overallOverdueTasks: 0,
    weeklyRecords: [
      {
        startDate: "2025-02-10",
        endDate: "2025-02-16",
        plannedWorkHours: 40,
        actualWorkHours: 44,
        assignedTasks: 12,
        weeklyOverdueTasks: 0,
      },
      {
        startDate: "2025-02-03",
        endDate: "2025-02-09",
        plannedWorkHours: 40,
        actualWorkHours: 41,
        assignedTasks: 11,
        weeklyOverdueTasks: 0,
      },
      {
        startDate: "2025-01-27",
        endDate: "2025-02-02",
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
    email: "michael.chen@example.com",
    department: "Design",
    manager: "Rachel Moore",
    position: "UX Designer",
    joinDate: "2022-03-10",
    overallOverdueTasks: 5,
    weeklyRecords: [
      {
        startDate: "2025-02-10",
        endDate: "2025-02-16",
        plannedWorkHours: 40,
        actualWorkHours: 38,
        assignedTasks: 6,
        weeklyOverdueTasks: 2,
      },
      {
        startDate: "2025-02-03",
        endDate: "2025-02-09",
        plannedWorkHours: 40,
        actualWorkHours: 37,
        assignedTasks: 5,
        weeklyOverdueTasks: 2,
      },
      {
        startDate: "2025-01-27",
        endDate: "2025-02-02",
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
    email: "emily.rodriguez@example.com",
    department: "Marketing",
    manager: "James Carter",
    position: "Marketing Specialist",
    joinDate: "2023-01-05",
    overallOverdueTasks: 3,
    weeklyRecords: [
      {
        startDate: "2025-02-10",
        endDate: "2025-02-16",
        plannedWorkHours: 40,
        actualWorkHours: 41,
        assignedTasks: 10,
        weeklyOverdueTasks: 0,
      },
      {
        startDate: "2025-02-03",
        endDate: "2025-02-09",
        plannedWorkHours: 40,
        actualWorkHours: 42,
        assignedTasks: 9,
        weeklyOverdueTasks: 1,
      },
      {
        startDate: "2025-01-27",
        endDate: "2025-02-02",
        plannedWorkHours: 40,
        actualWorkHours: 40,
        assignedTasks: 11,
        weeklyOverdueTasks: 2,
      },
    ],
  },
];
