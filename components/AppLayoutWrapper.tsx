"use client";

import Sidebar from "@/components/Sidebar";
import { useTheme } from "@/lib/theme-context";
import { ReactNode } from "react";

export default function AppLayoutWrapper({
  children,
}: Readonly<{ children: ReactNode }>) {
  const { mode } = useTheme();
  const isDark = mode === "dark";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: isDark ? "#0A0A0A" : "#F5F5F5",
        transition: "background 0.3s ease",
      }}
    >
      <Sidebar />
      <main className="app-main">
        {children}
      </main>
    </div>
  );
}
