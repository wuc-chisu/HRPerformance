import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Weekly Performance Report",
  description: "Employee Performance Evaluation",
};

export default function EvaluationLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
