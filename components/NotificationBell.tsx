"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useNotifications, type Notification } from "@/lib/notifications-context";

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "hier";
  if (diffD < 7) return `il y a ${diffD} j`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function NotificationBell() {
  const router = useRouter();
  const { unreadCount, notifications, loading, refetchList, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    refetchList();
  }, [open, refetchList]);

  // Le panneau est rendu via un portail (document.body) car la sidebar a
  // `overflow: hidden` sur son conteneur — un simple position:absolute à
  // l'intérieur serait tronqué à la largeur de la sidebar (248px).
  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setCoords({ top: rect.bottom + 8, left: rect.left });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleClickNotification(n: Notification) {
    if (!n.read_at) await markAsRead(n.id);
    setOpen(false);
    if (n.link) router.push(n.link);
  }

  return (
    <div ref={containerRef} style={{ position: "relative", flexShrink: 0 }}>
      <button
        ref={buttonRef}
        onClick={() => setOpen(o => !o)}
        aria-label="Notifications"
        style={{
          position: "relative",
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: open ? "#242220" : "transparent",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#C9C6BB",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 8a5 5 0 0 1 10 0c0 3.5 1.2 4.8 1.2 4.8H3.8S5 11.5 5 8Z" />
          <path d="M8.2 15.5a1.8 1.8 0 0 0 3.6 0" />
        </svg>
        {unreadCount > 0 && (
          <span style={{
            position: "absolute",
            top: 2,
            right: 2,
            minWidth: 15,
            height: 15,
            borderRadius: "50%",
            background: "#DC2626",
            color: "#fff",
            fontSize: 10,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 3px",
            lineHeight: 1,
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && mounted && createPortal(
        <div
          ref={panelRef}
          style={{
            position: "fixed",
            top: coords.top,
            left: coords.left,
            width: 320,
            background: "#161512",
            border: "1px solid #242220",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,.4)",
            zIndex: 200,
            maxHeight: 400,
            overflowY: "auto",
          }}
        >
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 14px",
            borderBottom: "1px solid #242220",
          }}>
            <span style={{ color: "#EDE9DD", fontSize: 14, fontWeight: 600 }}>Notifications</span>
            {notifications.some(n => !n.read_at) && (
              <button
                onClick={() => markAllAsRead()}
                style={{ background: "none", border: "none", color: "#C9A24E", fontSize: 12.5, cursor: "pointer", fontFamily: "inherit" }}
              >
                Tout marquer comme lu
              </button>
            )}
          </div>

          {loading && (
            <div style={{ padding: "20px 14px", color: "#6E6A5E", fontSize: 13.5, textAlign: "center" }}>Chargement…</div>
          )}

          {!loading && notifications.length === 0 && (
            <div style={{ padding: "20px 14px", color: "#6E6A5E", fontSize: 13.5, textAlign: "center" }}>Aucune notification</div>
          )}

          {!loading && notifications.map((n, idx) => (
            <button
              key={n.id}
              onClick={() => handleClickNotification(n)}
              style={{
                display: "flex",
                width: "100%",
                alignItems: "flex-start",
                gap: 10,
                padding: "11px 14px",
                background: "none",
                border: "none",
                borderBottom: idx !== notifications.length - 1 ? "1px solid #242220" : "none",
                textAlign: "left",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <span style={{
                marginTop: 5,
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: n.read_at ? "transparent" : "#C9A24E",
                flexShrink: 0,
              }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", color: "#EDE9DD", fontSize: 13.5, fontWeight: n.read_at ? 400 : 600 }}>{n.title}</span>
                {n.body && (
                  <span style={{ display: "block", color: "#9A988F", fontSize: 12.5, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.body}</span>
                )}
                <span style={{ display: "block", color: "#6E6A5E", fontSize: 11.5, marginTop: 3 }}>{relativeTime(n.created_at)}</span>
              </span>
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}
