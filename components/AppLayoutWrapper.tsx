"use client";

import Sidebar from "@/components/Sidebar";
import MobileActiveTimerBar from "@/components/MobileActiveTimerBar";
import PageTransition from "@/components/PageTransition";
import { useTheme } from "@/lib/theme-context";
import { ClientsProvider } from "@/lib/clients-store";
import { TimerProvider } from "@/lib/timer-context";
import { ToastProvider } from "@/lib/toast-context";
import { ReactNode, useEffect, useState } from "react";

export default function AppLayoutWrapper({
  children,
}: Readonly<{ children: ReactNode }>) {
  const { mode } = useTheme();
  const isDark = mode === "dark";
  const [isDesktop, setIsDesktop] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored === "true") setSidebarCollapsed(true);
    const handler = (e: Event) => setSidebarCollapsed((e as CustomEvent).detail.collapsed);
    window.addEventListener("sidebar-toggle", handler);
    return () => window.removeEventListener("sidebar-toggle", handler);
  }, []);

  return (
    <ClientsProvider>
      <ToastProvider>
        <TimerProvider>
          <div
            style={{
              minHeight: "100vh",
              background: isDark ? "#0A0A0A" : "#F5F5F5",
              transition: "background 0.3s ease",
            }}
          >
            <Sidebar />
            <MobileActiveTimerBar />
            <main
              className="app-main"
              style={{
                marginLeft: isDesktop ? (sidebarCollapsed ? 64 : 248) : 0,
                padding: isDesktop ? "32px 40px" : "64px 16px 24px",
                transition: "margin-left 0.25s ease",
              }}
            >
              <PageTransition>{children}</PageTransition>
            </main>
          </div>
        </TimerProvider>
      </ToastProvider>
    </ClientsProvider>
  );
}
