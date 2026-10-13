import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
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
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          <CurrentUserContextProvider>
            <AuthUserButton />
            {children}
          </CurrentUserContextProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
