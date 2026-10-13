"use client";

import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useCurrentUserContext, VIEW_AS_ROLES, type ViewAsRole } from "@/components/CurrentUserContextProvider";

/** Top-right profile and session management bar */
export default function AuthUserButton() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { employeeContext, canSwitchView, viewAsRole, setViewAsRole, signedIn } = useCurrentUserContext();

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
    <div className="fixed right-4 top-4 z-50 flex items-start gap-2 print:hidden">
      <details className="group relative">
        <summary className="flex cursor-pointer list-none items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 shadow-md backdrop-blur [&::-webkit-details-marker]:hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-blue-600 to-indigo-600 text-xs font-bold text-white shadow-xs">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <span className="max-w-32 truncate text-xs font-semibold text-slate-900">
            {displayName}
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${roleBadgeStyle}`}
          >
            {systemRole}
          </span>
          <span aria-hidden="true" className="text-xs text-slate-500">▾</span>
        </summary>
        <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-blue-600 to-indigo-600 text-sm font-bold text-white">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900">{displayName}</div>
              <div className="truncate text-xs text-slate-500">{displayEmail}</div>
            </div>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => void signOut({ callbackUrl: "/sign-in" })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              Sign out
            </button>
          </div>
        </div>
      </details>

      {canSwitchView && (
        <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 shadow-md backdrop-blur">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">View As</span>
          <select
            value={viewAsRole}
            onChange={(event) => setViewAsRole(event.target.value as ViewAsRole)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            {VIEW_AS_ROLES.map((role) => (
              <option key={role} value={role}>
                {role === "HR Admin" ? "Admin" : role}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
