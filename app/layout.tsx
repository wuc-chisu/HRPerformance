import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import AuthUserButton from "@/components/AuthUserButton";
import { CurrentUserContextProvider } from "@/components/CurrentUserContextProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WUC HR Application",
  description: "HR Performance Review System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider signInUrl="/sign-in" afterSignOutUrl="/sign-in">
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <CurrentUserContextProvider>
            <AuthUserButton />
            {children}
          </CurrentUserContextProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
