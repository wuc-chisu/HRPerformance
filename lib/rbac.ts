import { SystemRole } from "./employees";

export type { SystemRole };

export type AppView =
  | "my-employee-card"
  | "dashboard"
  | "employees"
  | "offboard-employees"
  | "manage"
  | "manage-performance"
  | "employee-lifecycle"
  | "onboarding"
  | "offboarding"
  | "preboarding"
  | "professional-development"
  | "incident-tracking"
  | "time-off";

export interface ActiveEmployeeSummary {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  systemRole: string;
  manager?: string | null;
  department?: string;
  position?: string;
  staffWorkLocation?: string;
}

/** Check if role string is HR Admin */
export function isHrAdmin(systemRole?: string | null): boolean {
  return (systemRole || "").trim().toLowerCase() === "hr admin";
}

/** Check if role string is Executive */
export function isExecutive(systemRole?: string | null): boolean {
  return (systemRole || "").trim().toLowerCase() === "executive";
}

/** Check if role string is Manager */
export function isManager(systemRole?: string | null): boolean {
  return (systemRole || "").trim().toLowerCase() === "manager";
}

/** Check if role string is Employee */
export function isEmployee(systemRole?: string | null): boolean {
  return (systemRole || "").trim().toLowerCase() === "employee";
}

export type EmployeeViewer = {
  id?: string;
  employeeId?: string;
  name?: string;
  employeeName?: string;
  systemRole?: string | null;
};

export type EmployeeTarget = {
  id?: string;
  employeeId?: string;
  name?: string;
  employeeName?: string;
  manager?: string | null;
};

/**
 * Checks if target employee is a direct report of manager.
 * Matches existing direct manager relationship by manager name or manager employeeId.
 */
export function isDirectReportOf(
  manager: { name?: string; employeeName?: string; employeeId?: string; id?: string },
  target: { manager?: string | null }
): boolean {
  if (!target.manager) return false;
  const targetMgr = target.manager.trim().toLowerCase();
  const mgrName = (manager.name || manager.employeeName || "").trim().toLowerCase();
  if (mgrName && targetMgr === mgrName) return true;
  if (manager.employeeId && targetMgr === manager.employeeId.trim().toLowerCase()) return true;
  if (manager.id && targetMgr === manager.id.trim().toLowerCase()) return true;
  return false;
}

/**
 * Checks if target is self or a direct report of the viewer.
 */
export function isSelfOrDirectReport(
  viewer: EmployeeViewer,
  target: EmployeeTarget
): boolean {
  const viewerIds = [viewer.employeeId, viewer.id].filter(Boolean) as string[];
  const targetIds = [target.employeeId, target.id].filter(Boolean) as string[];

  for (const vId of viewerIds) {
    for (const tId of targetIds) {
      if (vId.toLowerCase() === tId.toLowerCase()) {
        return true;
      }
    }
  }

  return isDirectReportOf(viewer, target);
}

/**
 * Returns allowed views for a given system role and view mode.
 * - Employee: Training & Compliance ONLY
 * - Manager: Training & Compliance, Employee, Performance, Corrective Actions, Leave & Holidays
 * - HR Admin: Full access to all pages
 * - Executive: Can view all pages
 */
export function getAllowedViewsForRole(
  systemRole?: string | null,
  isEmployeeView: boolean = false
): Set<AppView> {
  const role = systemRole || "Employee";

  if (isEmployeeView || isEmployee(role)) {
    // All employees (or users in Employee View) can access:
    // - My Employee Card (view-only)
    // - Performance (view-only own records)
    // - Training & Compliance (own assignments/certs)
    // - Leave & Holidays (view & request own time off, view holidays)
    return new Set<AppView>([
      "my-employee-card",
      "manage-performance",
      "professional-development",
      "time-off",
    ]);
  }

  if (isManager(role)) {
    // Manager:
    // Can access: Training & Compliance, Employee, Performance, Corrective Actions, Leave & Holidays
    // Cannot access: Dashboard, Employee Lifecycle
    return new Set<AppView>([
      "employees",
      "manage",
      "manage-performance",
      "incident-tracking",
      "professional-development",
      "time-off",
    ]);
  }

  // HR Admin and Executive: all views
  return new Set<AppView>([
    "dashboard",
    "employees",
    "offboard-employees",
    "manage",
    "manage-performance",
    "employee-lifecycle",
    "onboarding",
    "offboarding",
    "preboarding",
    "professional-development",
    "incident-tracking",
    "time-off",
  ]);
}

/**
 * Only HR Admin can assign or change System Role, or manage user permissions.
 */
export function canManageSystemRoles(systemRole?: string | null): boolean {
  return isHrAdmin(systemRole);
}

export function canManagePermissions(systemRole?: string | null): boolean {
  return isHrAdmin(systemRole);
}

/**
 * Only HR Admin can create or delete employees.
 */
export function canCreateEmployee(systemRole?: string | null): boolean {
  return isHrAdmin(systemRole);
}

export function canDeleteEmployee(systemRole?: string | null): boolean {
  return isHrAdmin(systemRole);
}

/**
 * Can the viewer view the given target employee?
 * - HR Admin & Executive: all employees org-wide
 * - Manager: self + employees assigned via Direct Manager relationship
 * - Employee: self only
 */
export function canViewEmployeeRecord(
  viewer: EmployeeViewer,
  target: EmployeeTarget
): boolean {
  if (isHrAdmin(viewer.systemRole) || isExecutive(viewer.systemRole)) {
    return true;
  }

  return isSelfOrDirectReport(viewer, target);
}

/**
 * Can the viewer edit the given target employee?
 * - HR Admin: yes
 * - Executive: no (read/view access only)
 * - Manager: self or direct reports (cannot edit system role)
 * - Employee: no
 */
export function canEditEmployeeRecord(
  viewer: EmployeeViewer,
  target: EmployeeTarget
): boolean {
  if (isHrAdmin(viewer.systemRole)) {
    return true;
  }

  if (isExecutive(viewer.systemRole)) {
    return false;
  }

  if (isManager(viewer.systemRole)) {
    return isSelfOrDirectReport(viewer, target);
  }

  return false;
}

/**
 * Filters a list of employees based on viewer's role and direct manager relationship.
 */
export function filterEmployeesForViewer<
  T extends EmployeeTarget
>(
  viewer: EmployeeViewer,
  employeesList: T[]
): T[] {
  if (isHrAdmin(viewer.systemRole) || isExecutive(viewer.systemRole)) {
    return employeesList;
  }

  if (isManager(viewer.systemRole)) {
    return employeesList.filter((emp) => isSelfOrDirectReport(viewer, emp));
  }

  // Employee: only self
  const viewerIds = [viewer.employeeId, viewer.id].filter(Boolean) as string[];
  return employeesList.filter((emp) => {
    const empIds = [emp.employeeId, emp.id].filter(Boolean) as string[];
    return viewerIds.some((vId) => empIds.some((eId) => vId.toLowerCase() === eId.toLowerCase()));
  });
}
