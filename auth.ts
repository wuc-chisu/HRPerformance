import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";

import { findActiveEmployeeByEmail } from "@/lib/auth-employee";
import prisma from "@/lib/prisma";

// In local development, default to the project dev port (3001) if not explicitly set in .env.local.
// In production, AUTH_URL / NEXTAUTH_URL and AUTH_SECRET must be provided via deployment environment variables.
if (process.env.NODE_ENV !== "production") {
  if (!process.env.AUTH_URL && !process.env.NEXTAUTH_URL) {
    process.env.AUTH_URL = "http://localhost:3001";
  }
  if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
    process.env.AUTH_SECRET = "hrperformance-local-dev-secret-32-chars-long";
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: {
    strategy: "database",
    maxAge: 8 * 60 * 60,
    updateAge: 60 * 60,
  },
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  trustHost: true,
  callbacks: {
    async signIn({ user, account, profile }) {
      if (
        account?.provider !== "google" ||
        !user.email ||
        profile?.email_verified !== true
      ) {
        return false;
      }

      return Boolean(await findActiveEmployeeByEmail(user.email));
    },
    async authorized({ auth: session, request }) {
      const pathname = request.nextUrl.pathname;
      if (
        pathname === "/sign-in" ||
        pathname.startsWith("/sign-in/") ||
        pathname.startsWith("/api/auth/")
      ) {
        return true;
      }

      const email = session?.user?.email;
      return email ? Boolean(await findActiveEmployeeByEmail(email)) : false;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      try {
        if (new URL(url).origin === baseUrl) {
          return url;
        }
      } catch {
        // Fall back to baseUrl if URL parsing fails
      }
      return baseUrl;
    },
  },
});
