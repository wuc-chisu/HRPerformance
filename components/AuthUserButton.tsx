"use client";

import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useCurrentUserContext } from "@/components/CurrentUserContextProvider";

/** Top-right profile and session management bar */
export default function AuthUserButton() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { employeeContext, canSwitchView, viewMode, setViewMode, signedIn } = useCurrentUserContext();

  // If user is not logged in or is currently on the sign-in page, do not display the sign out CTA or profile.
  if (
    pathname?.startsWith("/sign-in") ||
    status !== "authenticated" ||
    !signedIn ||
    !employeeContext
  ) {
    return null;
  }

  const displayEmail = session?.user?.email || employeeContext.workEmail;
  const displayName = employeeContext.employeeName || session?.user?.name || "User";
  const systemRole = employeeContext.systemRole || "Employee";

  const roleBadgeStyle =
    systemRole === "HR Admin"
      ? "bg-purple-100 text-purple-800 border-purple-200"
      : systemRole === "Executive"
      ? "bg-indigo-100 text-indigo-800 border-indigo-200"
      : systemRole === "Manager"
      ? "bg-blue-100 text-blue-800 border-blue-200"
      : "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <div className="fixed right-4 top-4 z-50 flex items-center gap-3 print:hidden">
      {/* Login Profile */}
      <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white/95 px-3 py-1.5 shadow-md backdrop-blur">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-xs">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="flex flex-col text-left">
          <span className="text-xs font-semibold text-slate-900 leading-tight">
            {displayName}
          </span>
          <span className="text-[11px] text-slate-500 leading-tight">
            {displayEmail}
          </span>
        </div>
        <span
          className={`ml-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${roleBadgeStyle}`}
        >
          {systemRole}
        </span>
      </div>

      {/* View As Mode Toggle (HR Admin / Executive only) */}
      {canSwitchView && (
        <div className="rounded-2xl border border-slate-200 bg-white/95 px-3 py-1.5 shadow-md backdrop-blur">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            View As
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setViewMode("admin")}
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${
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
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${
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

      {/* Sign out Button */}
      <button
        type="button"
        onClick={() => void signOut({ callbackUrl: "/sign-in" })}
        className="rounded-full border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-md transition-colors hover:bg-slate-50 hover:text-slate-900"
      >
        Sign out
      </button>
    </div>
  );
}
