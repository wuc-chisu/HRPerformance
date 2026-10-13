"use client";

import { useSession } from "next-auth/react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type DirectReportSummary = {
  employeeId: string;
  employeeName: string;
  workEmail: string;
};

export type CurrentUserEmployeeContext = {
  id?: string;
  employeeId: string;
  employeeName: string;
  workEmail: string;
  systemRole: string;
  isDirectManager: boolean;
  directReports: DirectReportSummary[];
};

export type UserViewMode = "admin" | "employee";
export type ViewAsRole = "HR Admin" | "Executive" | "Manager" | "Employee";

export const VIEW_AS_ROLES: ViewAsRole[] = ["HR Admin", "Executive", "Manager", "Employee"];

const VIEW_AS_STORAGE_KEY = "hrperformance:view-as-role";
const SWITCHABLE_ROLES = new Set(["HR Admin"]);

type CurrentUserContextValue = {
  loading: boolean;
  signedIn: boolean;
  accessDenied: boolean;
  error: string | null;
  employeeContext: CurrentUserEmployeeContext | null;
  canSwitchView: boolean;
  viewMode: UserViewMode;
  isEmployeeView: boolean;
  viewAsRole: ViewAsRole;
  effectiveRole: string | undefined;
  setViewAsRole: (role: ViewAsRole) => void;
  setViewMode: (mode: UserViewMode) => void;
  refresh: () => Promise<void>;
};

const CurrentUserContext = createContext<CurrentUserContextValue | undefined>(undefined);

export function CurrentUserContextProvider({ children }: { children: ReactNode }) {
  const { status } = useSession();
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employeeContext, setEmployeeContext] = useState<CurrentUserEmployeeContext | null>(null);
  const [viewAsRole, setViewAsRoleState] = useState<ViewAsRole>("HR Admin");
  const viewMode: UserViewMode = viewAsRole === "Employee" ? "employee" : "admin";

  const canSwitchView = Boolean(employeeContext && SWITCHABLE_ROLES.has(employeeContext.systemRole));

  const setViewAsRole = useCallback(
    (role: ViewAsRole) => {
      if (!canSwitchView) {
        setViewAsRoleState("HR Admin");
        return;
      }

      setViewAsRoleState(role);
      try {
        window.localStorage.setItem(VIEW_AS_STORAGE_KEY, role);
      } catch {
        // Ignore storage failures and keep the in-memory mode only.
      }
    },
    [canSwitchView]
  );

  const setViewMode = useCallback(
    (mode: UserViewMode) => setViewAsRole(mode === "employee" ? "Employee" : "HR Admin"),
    [setViewAsRole]
  );

  const effectiveRole = canSwitchView ? viewAsRole : employeeContext?.systemRole;

  const fetchCurrentUserContext = useCallback(async () => {
    if (status === "loading") {
      return;
    }

    if (status !== "authenticated") {
      setLoading(false);
      setSignedIn(false);
      setAccessDenied(false);
      setError(null);
      setEmployeeContext(null);
      setViewAsRoleState("HR Admin");
      return;
    }

    setLoading(true);
    setSignedIn(true);

    try {
      const response = await fetch("/api/auth/current-user-context");
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setEmployeeContext(null);
        setAccessDenied(response.status === 403);
        setError(typeof payload.error === "string" ? payload.error : "Failed to load current user context");
        setViewAsRoleState("HR Admin");
        return;
      }

      setEmployeeContext(payload as CurrentUserEmployeeContext);
      setAccessDenied(false);
      setError(null);

      const storedRole = window.localStorage.getItem(VIEW_AS_STORAGE_KEY) as ViewAsRole | null;
      setViewAsRoleState(
        storedRole &&
          VIEW_AS_ROLES.includes(storedRole) &&
          SWITCHABLE_ROLES.has((payload as CurrentUserEmployeeContext).systemRole)
          ? storedRole
          : "HR Admin"
      );
    } catch (requestError) {
      setEmployeeContext(null);
      setAccessDenied(false);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to load current user context"
      );
      setViewAsRoleState("HR Admin");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void fetchCurrentUserContext();
  }, [fetchCurrentUserContext]);

  const value = useMemo(
    () => ({
      loading,
      signedIn,
      accessDenied,
      error,
      employeeContext,
      canSwitchView,
      viewMode,
      isEmployeeView: viewMode === "employee",
      viewAsRole,
      effectiveRole,
      setViewAsRole,
      setViewMode,
      refresh: fetchCurrentUserContext,
    }),
    [accessDenied, canSwitchView, effectiveRole, employeeContext, error, fetchCurrentUserContext, loading, signedIn, setViewAsRole, setViewMode, viewAsRole, viewMode]
  );

  return <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUserContext() {
  const context = useContext(CurrentUserContext);

  if (!context) {
    throw new Error("useCurrentUserContext must be used within a CurrentUserContextProvider");
  }

  return context;
}