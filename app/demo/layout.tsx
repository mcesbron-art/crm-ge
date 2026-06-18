"use client";

import Sidebar from "@/components/Sidebar";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider, useTheme } from "@/lib/theme-context";
import { ReactNode } from "react";

const mockUser = {
  id: 0,
  nom: "Demo User",
  email: "demo@groupe-echo.fr",
  pole: "Direction",
  avatar: "DU",
  color: "#C5A55A",
  role: "admin" as const,
  base: 0,
  actif: true,
};

function DemoLayoutContent({
  children,
}: Readonly<{ children: ReactNode }>) {
  const { mode } = useTheme();
  const isDark = mode === "dark";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: isDark ? "#0A0A0A" : "#FFFFFF",
        transition: "background 0.3s ease",
      }}
    >
      <Sidebar />
      <main className="app-main">
        <div style={{ padding: "20px 32px" }}>
          {children}
        </div>
      </main>
    </div>
  );
}

export default function DemoLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ThemeProvider>
      <AuthProvider initialUser={mockUser}>
        <DemoLayoutContent>{children}</DemoLayoutContent>
      </AuthProvider>
    </ThemeProvider>
  );
}
