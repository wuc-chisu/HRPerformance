"use client";

import { useAuth } from "@clerk/nextjs";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type DirectReportSummary = {
  employeeId: string;
  employeeName: string;
  workEmail: string;
};

export type CurrentUserEmployeeContext = {
  employeeId: string;
  employeeName: string;
  workEmail: string;
  systemRole: string;
  isDirectManager: boolean;
  directReports: DirectReportSummary[];
};

export type UserViewMode = "admin" | "employee";

const VIEW_MODE_STORAGE_KEY = "hrperformance:view-mode";
const SWITCHABLE_ROLES = new Set(["HR Admin", "Executive"]);

type CurrentUserContextValue = {
  loading: boolean;
  signedIn: boolean;
  accessDenied: boolean;
  error: string | null;
  employeeContext: CurrentUserEmployeeContext | null;
  canSwitchView: boolean;
  viewMode: UserViewMode;
  isEmployeeView: boolean;
  setViewMode: (mode: UserViewMode) => void;
  refresh: () => Promise<void>;
};

const CurrentUserContext = createContext<CurrentUserContextValue | undefined>(undefined);

export function CurrentUserContextProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employeeContext, setEmployeeContext] = useState<CurrentUserEmployeeContext | null>(null);
  const [viewMode, setViewModeState] = useState<UserViewMode>("admin");

  const canSwitchView = Boolean(employeeContext && SWITCHABLE_ROLES.has(employeeContext.systemRole));

  const setViewMode = useCallback(
    (mode: UserViewMode) => {
      if (!canSwitchView) {
        setViewModeState("admin");
        return;
      }

      setViewModeState(mode);
      try {
        window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
      } catch {
        // Ignore storage failures and keep the in-memory mode only.
      }
    },
    [canSwitchView]
  );

  const fetchCurrentUserContext = useCallback(async () => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      setLoading(false);
      setSignedIn(false);
      setAccessDenied(false);
      setError(null);
      setEmployeeContext(null);
      setViewModeState("admin");
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
        setViewModeState("admin");
        return;
      }

      setEmployeeContext(payload as CurrentUserEmployeeContext);
      setAccessDenied(false);
      setError(null);

      const storedViewMode = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      const nextViewMode: UserViewMode =
        storedViewMode === "employee" && SWITCHABLE_ROLES.has((payload as CurrentUserEmployeeContext).systemRole)
          ? "employee"
          : "admin";
      setViewModeState(nextViewMode);
    } catch (requestError) {
      setEmployeeContext(null);
      setAccessDenied(false);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to load current user context"
      );
      setViewModeState("admin");
    } finally {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn]);

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
      setViewMode,
      refresh: fetchCurrentUserContext,
    }),
    [accessDenied, canSwitchView, employeeContext, error, fetchCurrentUserContext, loading, signedIn, setViewMode, viewMode]
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