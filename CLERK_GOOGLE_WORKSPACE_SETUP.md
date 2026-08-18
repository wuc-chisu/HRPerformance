# Google Workspace authentication with Clerk

The application code is ready for Clerk. Complete the following dashboard setup before using it.

## 1. Create the Clerk application

1. Create a Clerk application at [dashboard.clerk.com](https://dashboard.clerk.com).
2. In **API Keys**, copy the publishable key and secret key for the development instance.
3. Add them to `.env.local` (never commit this file):

   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```

4. Restart `npm run dev`, then open `http://localhost:3001`. Unauthenticated visitors should be redirected to `/sign-in`.

## 2. Require the company Google Workspace account

For an employee-only HR system, use a **Google EASIE enterprise connection** rather than only a general Google social-login button. It ties access to the company's Google Workspace domain and Clerk checks whether the Workspace account has been deprovisioned before issuing a new session.

1. In Clerk, go to **SSO connections** → **Add connection** → **For specific domains or organizations** → **EASIE** → **Google**.
2. Enter the organization email domain (for example, `example.edu`) and save it. For a Clerk development instance, shared credentials can be used.
3. In production, create a Google Cloud OAuth **Web application** and add the redirect URI Clerk displays. Put that OAuth client ID and secret into the Google connection in Clerk.
4. Turn off password, email-code, and any other sign-in methods in Clerk’s **User & authentication** settings if Google Workspace should be the only login method.

## 3. Prevent non-employees from entering

In Clerk’s **Restrictions** page:

1. Enable the allowlist and add the company domain, such as `example.edu`.
2. Enable **Block email subaddresses**. This prevents variants such as `employee+other@example.edu` from creating a separate account.
3. Consider **Restricted** sign-up mode if HR should invite or provision every employee instead of allowing just-in-time account creation.
4. Under **User & authentication**, disable users changing email addresses so an employee cannot attach an unapproved identity later.

## 4. Production release

1. Create a Clerk production instance, set the production application URL/domain in its dashboard, and repeat the Google OAuth credential setup for production.
2. Add the production Clerk keys to the hosting provider’s environment variables. Do not reuse development keys in production.
3. Add the production site URL to Clerk’s allowed redirect URLs, then deploy and test with a real employee Google Workspace account.

## What the code protects

`proxy.ts` requires a valid Clerk session for all application pages and every `/api/*` endpoint. The `/sign-in` route remains public. The profile button in the top right lets employees sign out or manage their Clerk profile.
