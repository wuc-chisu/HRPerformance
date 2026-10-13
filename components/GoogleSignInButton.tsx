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
      className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
    >
      {isLoading ? "Connecting to Google..." : "Continue with Google"}
    </button>
  );
}
