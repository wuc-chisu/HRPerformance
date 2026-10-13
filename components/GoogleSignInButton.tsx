"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function GoogleSignInButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      await signIn("google", { callbackUrl: "/" });
    } catch (err) {
      console.error("Failed to initiate Google sign-in:", err);
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSignIn}
      disabled={isLoading}
      className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-linear-to-br from-blue-500 to-red-400 text-xs font-bold text-white">G</span>
      {isLoading ? "Connecting to Google..." : "Continue with Google"}
    </button>
  );
}
