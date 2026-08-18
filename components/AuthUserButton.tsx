"use client";

import { UserButton } from "@clerk/nextjs";
import { useCurrentUserContext } from "@/components/CurrentUserContextProvider";

/** A consistent, non-intrusive place for employees to manage or sign out. */
export default function AuthUserButton() {
  const { employeeContext, canSwitchView, viewMode, setViewMode } = useCurrentUserContext();

  return (
    <div className="fixed right-4 top-4 z-50 flex items-start gap-3">
      {employeeContext && canSwitchView && (
        <div className="rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">View As</div>
          <div className="mt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode("admin")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                viewMode === "admin"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => setViewMode("employee")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                viewMode === "employee"
                  ? "bg-sky-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              Employee
            </button>
          </div>
        </div>
      )}
      <UserButton />
    </div>
  );
}
