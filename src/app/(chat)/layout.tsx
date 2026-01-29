import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Chat Bot - MIS Dashboard",
  description: "AI Data Assistant Chat Bot",
};

export default function ChatGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // No MainLayout, no ChatWidget - just the children
  return <>{children}</>;
}
