"use client";

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";

type Toast = { id: number; kind: "success" | "error"; message: string };

type ToastContextValue = {
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DURATION_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const push = useCallback((kind: Toast["kind"], message: string) => {
    const id = nextId.current++;
    setToasts(prev => [...prev, { id, kind, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), DURATION_MS);
  }, []);

  const value: ToastContextValue = {
    success: message => push("success", message),
    error: message => push("error", message),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div style={{ position: "fixed", right: 20, bottom: 20, zIndex: 200, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
        {toasts.map(t => (
          <div
            key={t.id}
            role="status"
            style={{
              pointerEvents: "auto",
              display: "flex", alignItems: "center", gap: 10,
              background: "#0A0A0A", border: `1px solid ${t.kind === "success" ? "#1F8A5B" : "#B91C1C"}`,
              borderRadius: 12, padding: "12px 16px", minWidth: 220, maxWidth: 360,
              boxShadow: "0 12px 32px -8px rgba(0,0,0,.5)",
              animation: "toast-in .2s ease-out",
            }}
          >
            <span style={{
              width: 8, height: 8, borderRadius: "50%", flex: "none",
              background: t.kind === "success" ? "#1F8A5B" : "#DC2626",
            }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#E9E7DD", lineHeight: 1.4 }}>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast doit être utilisé dans <ToastProvider>");
  return ctx;
}
