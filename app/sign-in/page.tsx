import GoogleSignInButton from "@/components/GoogleSignInButton";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
      <header className="bg-linear-to-r from-blue-300 to-purple-300 text-white shadow-lg">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold">WUC HR Application</h1>
          <p className="mt-2 text-white/90">Training &amp; Compliance Portal</p>
        </div>
      </header>

      <main className="flex justify-center px-4 py-12 sm:py-16">
        <section className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
          <div className="h-1.5 bg-linear-to-r from-blue-300 to-purple-300" />
          <div className="p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-blue-100 to-purple-100 text-2xl">
              🎓
            </div>
            <h2 className="mt-5 text-2xl font-bold text-slate-900">Welcome back</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Sign in with your WUC Google account to access your training and compliance courses.
            </p>

            {error === "AccessDenied" && (
              <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                This Google account does not match an active employee record. Please contact HR.
              </p>
            )}
            {error === "Configuration" && (
              <p role="alert" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Google Sign-In configuration error. Please verify your Google OAuth environment variables.
              </p>
            )}
            {error && error !== "AccessDenied" && error !== "Configuration" && (
              <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                Unable to sign in ({error}). Please try again or contact HR.
              </p>
            )}

            <div className="mt-6">
              <GoogleSignInButton />
            </div>

            <p className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
              🔒 Only authorized employee accounts can access this system.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
