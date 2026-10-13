import GoogleSignInButton from "@/components/GoogleSignInButton";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">WUC HR Application</h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in with your Google account to continue.
        </p>
        {error === "AccessDenied" && (
          <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            This Google account does not match an active employee record. Please contact HR.
          </p>
        )}
        {error === "Configuration" && (
          <p role="alert" className="mt-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            Google Sign-In configuration error. Please verify your Google OAuth environment variables.
          </p>
        )}
        {error && error !== "AccessDenied" && error !== "Configuration" && (
          <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            Unable to sign in ({error}). Please try again or contact HR.
          </p>
        )}
        <div className="mt-6">
          <GoogleSignInButton />
        </div>
      </section>
    </main>
  );
}
