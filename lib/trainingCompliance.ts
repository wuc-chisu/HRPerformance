export const TRAINING_CATEGORY_OPTIONS = [
  "WUC_REQUIRED_TRAINING",
  "CALIFORNIA_REQUIRED_TRAINING",
  "ACCREDITATION_COMPLIANCE_TRAINING",
  "FACULTY_TRAINING",
  "CLINIC_SAFETY_TRAINING",
  "PROFESSIONAL_DEVELOPMENT",
  "OTHER",
] as const;

export const TRAINING_REQUIREMENT_TYPE_OPTIONS = ["REQUIRED", "OPTIONAL"] as const;

export const TRAINING_APPLIES_TO_OPTIONS = [
  "ALL_EMPLOYEES",
  "EMPLOYEES",
  "MANAGERS",
  "HR_ADMINS",
  "EXECUTIVES",
  "CALIFORNIA_NON_SUPERVISORY_EMPLOYEES",
  "CALIFORNIA_SUPERVISORS_MANAGERS",
  "APPLICABLE_CALIFORNIA_EMPLOYEES",
  "FACULTY",
  "EDUCATIONAL_ADMINISTRATORS",
  "CLINIC_PERSONNEL",
  "EMPLOYEES_WITH_OCCUPATIONAL_EXPOSURE",
  "ONLINE_HYBRID_FACULTY",
  "DISTANCE_EDUCATION_ADMINISTRATORS",
  "LICENSED_ACUPUNCTURISTS",
  "CUSTOM_GROUP",
] as const;

export const TRAINING_RECURRENCE_OPTIONS = ["ONE_TIME", "ANNUAL", "EVERY_2_YEARS", "CUSTOM"] as const;

export const TRAINING_INTERVAL_UNIT_OPTIONS = ["DAYS", "MONTHS", "YEARS"] as const;

export const TRAINING_METHOD_OPTIONS = [
  "WUC_INTERNAL_COURSE",
  "EXTERNAL_TRAINING",
  "CERTIFICATE_RECORD_TRACKING",
  "PROFESSIONAL_DEVELOPMENT_RECORD",
] as const;

export const TRAINING_COMPLETION_METHOD_OPTIONS = [
  "EXAM_SCORE",
  "CERTIFICATE",
  "HOURS_EVIDENCE_REQUIREMENT",
  "HOURS_CE_REQUIREMENT",
  "HR_VERIFICATION",
] as const;

export const TRAINING_PROGRAM_STATUS_OPTIONS = ["DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"] as const;

export type TrainingCategory = (typeof TRAINING_CATEGORY_OPTIONS)[number];
export type TrainingRequirementType = (typeof TRAINING_REQUIREMENT_TYPE_OPTIONS)[number];
export type TrainingAppliesTo = (typeof TRAINING_APPLIES_TO_OPTIONS)[number];
export type TrainingRecurrence = (typeof TRAINING_RECURRENCE_OPTIONS)[number];
export type TrainingIntervalUnit = (typeof TRAINING_INTERVAL_UNIT_OPTIONS)[number];
export type TrainingMethod = (typeof TRAINING_METHOD_OPTIONS)[number];
export type TrainingCompletionMethod = (typeof TRAINING_COMPLETION_METHOD_OPTIONS)[number];
export type TrainingProgramStatus = (typeof TRAINING_PROGRAM_STATUS_OPTIONS)[number];

export type AssignmentWorkflowStatus = "ASSIGNED" | "COMPLETED" | "WAIVED" | "CANCELLED";
export type TrainingComputedStatus = "UPCOMING" | "DUE_SOON" | "URGENT" | "OVERDUE" | "COMPLETED";

export const TRAINING_CATEGORY_LABELS: Record<TrainingCategory, string> = {
  WUC_REQUIRED_TRAINING: "WUC Required Training",
  CALIFORNIA_REQUIRED_TRAINING: "California Required Training",
  ACCREDITATION_COMPLIANCE_TRAINING: "Accreditation / Compliance Training",
  FACULTY_TRAINING: "Faculty Training",
  CLINIC_SAFETY_TRAINING: "Clinic / Safety Training",
  PROFESSIONAL_DEVELOPMENT: "Professional Development",
  OTHER: "Other",
};

export const TRAINING_REQUIREMENT_LABELS: Record<TrainingRequirementType, string> = {
  REQUIRED: "Required",
  OPTIONAL: "Optional",
};

export const TRAINING_APPLIES_TO_LABELS: Record<TrainingAppliesTo, string> = {
  ALL_EMPLOYEES: "All Employees",
  EMPLOYEES: "Employees",
  MANAGERS: "Managers",
  HR_ADMINS: "HR Admin",
  EXECUTIVES: "Executives",
  CALIFORNIA_NON_SUPERVISORY_EMPLOYEES: "California Non-Supervisory Employees",
  CALIFORNIA_SUPERVISORS_MANAGERS: "California Supervisors / Managers",
  APPLICABLE_CALIFORNIA_EMPLOYEES: "Applicable California Employees",
  FACULTY: "Faculty",
  EDUCATIONAL_ADMINISTRATORS: "Educational Administrators",
  CLINIC_PERSONNEL: "Clinic Personnel",
  EMPLOYEES_WITH_OCCUPATIONAL_EXPOSURE: "Employees with Occupational Exposure",
  ONLINE_HYBRID_FACULTY: "Online / Hybrid Faculty",
  DISTANCE_EDUCATION_ADMINISTRATORS: "Distance Education Administrator / Team",
  LICENSED_ACUPUNCTURISTS: "Licensed Acupuncturists",
  CUSTOM_GROUP: "Custom Group",
};

export const TRAINING_RECURRENCE_LABELS: Record<TrainingRecurrence, string> = {
  ONE_TIME: "One Time",
  ANNUAL: "Annual",
  EVERY_2_YEARS: "Every 2 Years",
  CUSTOM: "Custom",
};

export const TRAINING_METHOD_LABELS: Record<TrainingMethod, string> = {
  WUC_INTERNAL_COURSE: "WUC Internal Course",
  EXTERNAL_TRAINING: "External Training",
  CERTIFICATE_RECORD_TRACKING: "Certificate / Record Tracking",
  PROFESSIONAL_DEVELOPMENT_RECORD: "Professional Development Record",
};

export const TRAINING_COMPLETION_METHOD_LABELS: Record<TrainingCompletionMethod, string> = {
  EXAM_SCORE: "Exam Score",
  CERTIFICATE: "Certificate",
  HOURS_EVIDENCE_REQUIREMENT: "Hours / Evidence Requirement",
  HOURS_CE_REQUIREMENT: "Hours / CE Requirement",
  HR_VERIFICATION: "HR Verification",
};

export const TRAINING_PROGRAM_STATUS_LABELS: Record<TrainingProgramStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ARCHIVED: "Archived",
};

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function daysBetween(today: Date, dueDate: Date) {
  const ms = startOfDay(dueDate).getTime() - startOfDay(today).getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

export function deriveRecurrenceInterval(
  recurrence: TrainingRecurrence,
  customIntervalValue?: number | null,
  customIntervalUnit?: TrainingIntervalUnit | null
): { value: number | null; unit: TrainingIntervalUnit | null } {
  if (recurrence === "ONE_TIME") {
    return { value: null, unit: null };
  }

  if (recurrence === "ANNUAL") {
    return { value: 12, unit: "MONTHS" };
  }

  if (recurrence === "EVERY_2_YEARS") {
    return { value: 24, unit: "MONTHS" };
  }

  if (recurrence === "CUSTOM") {
    return {
      value: customIntervalValue && customIntervalValue > 0 ? customIntervalValue : 1,
      unit: customIntervalUnit || "MONTHS",
    };
  }

  return { value: null, unit: null };
}

export function addInterval(date: Date, intervalValue: number | null, intervalUnit: TrainingIntervalUnit | null) {
  if (!intervalValue || !intervalUnit) {
    return null;
  }

  const next = new Date(date);

  if (intervalUnit === "DAYS") {
    next.setDate(next.getDate() + intervalValue);
  } else if (intervalUnit === "MONTHS") {
    next.setMonth(next.getMonth() + intervalValue);
  } else if (intervalUnit === "YEARS") {
    next.setFullYear(next.getFullYear() + intervalValue);
  }

  return next;
}

export function calculateNextCycleDate(
  startDate: Date,
  recurrence: TrainingRecurrence,
  customIntervalValue?: number | null,
  customIntervalUnit?: TrainingIntervalUnit | null
) {
  const interval = deriveRecurrenceInterval(recurrence, customIntervalValue, customIntervalUnit);
  return addInterval(startDate, interval.value, interval.unit);
}

export function calculateCycleDurationDays(startDate: Date, dueDate: Date) {
  return Math.max(0, daysBetween(startDate, dueDate));
}

export function calculateDueDateFromWindow(startDate: Date, windowDays: number) {
  const dueDate = new Date(startDate);
  dueDate.setDate(dueDate.getDate() + Math.max(0, windowDays));
  return dueDate;
}

export function calculateAssignmentComputedStatus(input: {
  status: AssignmentWorkflowStatus;
  dueDate: Date;
  completionDate?: Date | null;
  today?: Date;
}): TrainingComputedStatus {
  if (input.status === "COMPLETED" || input.completionDate) {
    return "COMPLETED";
  }

  const today = input.today || new Date();
  const daysLeft = daysBetween(today, input.dueDate);

  if (daysLeft < 0) {
    return "OVERDUE";
  }

  if (daysLeft <= 7) {
    return "URGENT";
  }

  if (daysLeft <= 30) {
    return "DUE_SOON";
  }

  return "UPCOMING";
}

export function buildAlertBuckets(computedStatuses: TrainingComputedStatus[]) {
  return {
    dueSoon: computedStatuses.filter((status) => status === "DUE_SOON").length,
    urgent: computedStatuses.filter((status) => status === "URGENT").length,
    overdue: computedStatuses.filter((status) => status === "OVERDUE").length,
  };
}

export type EligibleTrainingEmployee = {
  id: string;
  employeeId: string;
  name: string;
  systemRole: string;
  department: string;
  position: string;
  staffWorkLocation?: string | null;
};

function includesNormalized(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

function isCaliforniaEmployee(employee: EligibleTrainingEmployee) {
  const location = (employee.staffWorkLocation || "").trim().toLowerCase();
  const department = employee.department.toLowerCase();
  const position = employee.position.toLowerCase();

  return (
    location === "ca" ||
    location === "california" ||
    location.includes("california") ||
    includesNormalized(department, ["california", "ca "]) ||
    includesNormalized(position, ["california", "ca "])
  );
}

function isSupervisoryRole(employee: EligibleTrainingEmployee) {
  const role = employee.systemRole.toLowerCase();
  const position = employee.position.toLowerCase();

  return (
    role === "manager" ||
    role === "hr admin" ||
    role === "executive" ||
    includesNormalized(position, ["manager", "supervisor", "director", "administrator", "dean", "chair"])
  );
}

function isEducationalAdministrator(employee: EligibleTrainingEmployee) {
  const department = employee.department.toLowerCase();
  const position = employee.position.toLowerCase();

  return includesNormalized(position, ["administrator", "director", "dean", "chair", "principal"]) ||
    includesNormalized(department, ["academic affairs", "education", "instruction", "faculty"]);
}

function isClinicOrExposureRole(employee: EligibleTrainingEmployee) {
  const department = employee.department.toLowerCase();
  const position = employee.position.toLowerCase();

  return includesNormalized(department, ["clinic", "patient", "health", "acupuncture", "lab"]) ||
    includesNormalized(position, ["clinic", "patient", "health", "acupuncturist", "exposure", "sharps", "lab"]);
}

function isDistanceEducationAdministrator(employee: EligibleTrainingEmployee) {
  const department = employee.department.toLowerCase();
  const position = employee.position.toLowerCase();
  const isDistanceEducation = includesNormalized(`${department} ${position}`, ["distance education", "online", "hybrid"]);

  return isDistanceEducation && isEducationalAdministrator(employee);
}

export function isRoleMatch(appliesTo: string[], role: string) {
  if (appliesTo.includes("ALL_EMPLOYEES")) return true;
  if (appliesTo.includes("EMPLOYEES") && role === "Employee") return true;
  if (appliesTo.includes("MANAGERS") && role === "Manager") return true;
  if (appliesTo.includes("HR_ADMINS") && role === "HR Admin") return true;
  if (appliesTo.includes("EXECUTIVES") && role === "Executive") return true;
  return false;
}

export function resolveEligibleEmployees(
  employees: EligibleTrainingEmployee[],
  appliesTo: string[],
  customGroupName: string | null
) {
  const normalizedCustom = (customGroupName || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return employees.filter((employee) => {
    if (isRoleMatch(appliesTo, employee.systemRole)) return true;

    const positionLower = employee.position.toLowerCase();
    const departmentLower = employee.department.toLowerCase();
    const californiaEmployee = isCaliforniaEmployee(employee);
    const supervisoryRole = isSupervisoryRole(employee);

    if (appliesTo.includes("CALIFORNIA_NON_SUPERVISORY_EMPLOYEES") && californiaEmployee && !supervisoryRole) {
      return true;
    }

    if (appliesTo.includes("CALIFORNIA_SUPERVISORS_MANAGERS") && californiaEmployee && supervisoryRole) {
      return true;
    }

    if (appliesTo.includes("APPLICABLE_CALIFORNIA_EMPLOYEES") && californiaEmployee) {
      return true;
    }

    if (appliesTo.includes("FACULTY") && positionLower.includes("faculty")) return true;
    if (appliesTo.includes("EDUCATIONAL_ADMINISTRATORS") && isEducationalAdministrator(employee)) return true;
    if (appliesTo.includes("CLINIC_PERSONNEL") && (departmentLower.includes("clinic") || positionLower.includes("clinic"))) {
      return true;
    }
    if (appliesTo.includes("EMPLOYEES_WITH_OCCUPATIONAL_EXPOSURE") && isClinicOrExposureRole(employee)) return true;
    if (
      appliesTo.includes("ONLINE_HYBRID_FACULTY") &&
      positionLower.includes("faculty") &&
      (positionLower.includes("online") || positionLower.includes("hybrid"))
    ) {
      return true;
    }
    if (appliesTo.includes("DISTANCE_EDUCATION_ADMINISTRATORS") && isDistanceEducationAdministrator(employee)) {
      return true;
    }
    if (appliesTo.includes("LICENSED_ACUPUNCTURISTS") && positionLower.includes("acupuncturist")) return true;

    if (appliesTo.includes("CUSTOM_GROUP") && normalizedCustom.length > 0) {
      return normalizedCustom.includes(employee.employeeId) || normalizedCustom.includes(employee.name);
    }

    return false;
  });
}
