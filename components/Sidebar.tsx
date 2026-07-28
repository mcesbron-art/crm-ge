"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTimer } from "@/lib/timer-context";
import { can, type Permission } from "@/lib/permissions";
import Image from "next/image";
import NotificationBell from "@/components/NotificationBell";

type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  /** Entrée masquée si le rôle courant n'a pas cette permission — voir lib/permissions.ts. */
  permission?: Permission;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "PRINCIPAL",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        href: "/dashboard",
        icon: (
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="6" height="6" rx="1.4" />
            <rect x="11" y="3" width="6" height="6" rx="1.4" />
            <rect x="3" y="11" width="6" height="6" rx="1.4" />
            <rect x="11" y="11" width="6" height="6" rx="1.4" />
          </svg>
        ),
      },
      {
        id: "projets",
        label: "Projets",
        href: "/projets",
        icon: (
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6.5C3 5.7 3.6 5 4.4 5H8l1.6 1.8h6C16.4 6.8 17 7.4 17 8.2V14.6c0 .8-.6 1.4-1.4 1.4H4.4C3.6 16 3 15.4 3 14.6Z" />
          </svg>
        ),
      },
      {
        id: "mes-taches",
        label: "Mes tâches",
        href: "/mes-taches",
        icon: (
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3.5" y="3.5" width="13" height="13" rx="2.5" />
            <path d="M6.5 10.2l2.3 2.3 4.7-4.9" />
          </svg>
        ),
      },
      {
        id: "tickets",
        label: "Tickets",
        href: "/tickets",
        icon: (
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5.5" width="14" height="9" rx="2" />
            <line x1="10" y1="5.5" x2="10" y2="14.5" strokeDasharray="1.6 1.6" />
          </svg>
        ),
      },
    ],
  },
  {
    label: "GESTION",
    items: [
      {
        id: "equipe",
        label: "Équipe",
        href: "/equipe",
        icon: (
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="7.6" cy="8" r="2.6" />
            <path d="M3 16c0-2.5 2-4 4.6-4s4.6 1.5 4.6 4" />
            <circle cx="14.4" cy="8.6" r="2" />
            <path d="M13 12.4c2 0 4 1.2 4 3.6" />
          </svg>
        ),
        permission: "view_all_pages",
      },
      {
        id: "absences",
        label: "Absences",
        href: "/absences",
        icon: (
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4.5" width="14" height="12.5" rx="2" />
            <line x1="3" y1="8.4" x2="17" y2="8.4" />
            <line x1="6.8" y1="2.6" x2="6.8" y2="5.4" />
            <line x1="13.2" y1="2.6" x2="13.2" y2="5.4" />
          </svg>
        ),
      },
      {
        id: "clients",
        label: "Clients",
        href: "/clients",
        icon: (
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="10" cy="7" r="3" />
            <path d="M4 16.5c0-3.2 2.7-5.2 6-5.2s6 2 6 5.2" />
          </svg>
        ),
        permission: "view_all_pages",
      },
      {
        id: "opportunites",
        label: "Opportunités",
        href: "/opportunites",
        icon: (
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 3l1.7 4.3L16 9l-4.3 1.7L10 15l-1.7-4.3L4 9l4.3-1.7z" />
          </svg>
        ),
      },
      {
        id: "facturation",
        label: "Facturation",
        href: "/facturation",
        icon: (
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5.5 3.2h9v13.6l-1.8-1.1-1.8 1.1-1.8-1.1-1.8 1.1-1.8-1.1z" />
            <line x1="8" y1="7" x2="12" y2="7" />
            <line x1="8" y1="10" x2="12" y2="10" />
          </svg>
        ),
        permission: "view_billing",
      },
    ],
  },
  {
    label: "SYSTÈME",
    items: [
      {
        id: "documents",
        label: "Documents",
        href: "/documents",
        icon: (
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4.5" width="14" height="12" rx="2" />
            <path d="M7 4.5V3.4C7 2.9 7.4 2.5 8 2.5h4c.5 0 1 .4 1 1v1.1" />
          </svg>
        ),
        permission: "view_common_documents",
      },
      {
        id: "rapports",
        label: "Rapports",
        href: "/rapports",
        icon: (
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="17" x2="17" y2="17" />
            <rect x="4.5" y="10" width="2.6" height="7" rx="0.8" />
            <rect x="8.7" y="7" width="2.6" height="10" rx="0.8" />
            <rect x="12.9" y="4.5" width="2.6" height="12.5" rx="0.8" />
          </svg>
        ),
        permission: "view_billing",
      },
      {
        id: "administration",
        label: "Administration",
        href: "/administration",
        icon: (
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="10" cy="10" r="4.2" />
            <circle cx="10" cy="10" r="1.4" />
          </svg>
        ),
        permission: "manage_users",
      },
    ],
  },
];

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  collaborateur: "Collaborateur",
};

const IconPlay = () => (
  <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><path d="M6 4.5v11l9-5.5z" /></svg>
);
const IconPause = () => (
  <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor"><rect x="5.5" y="4.5" width="3.2" height="11" rx="1" /><rect x="11.3" y="4.5" width="3.2" height="11" rx="1" /></svg>
);
const IconStop = () => (
  <svg width="11" height="11" viewBox="0 0 20 20" fill="currentColor"><rect x="4.5" y="4.5" width="11" height="11" rx="2" /></svg>
);
const IconChevronRight = () => (
  <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="7 4 13 10 7 16" /></svg>
);

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, effectiveRole } = useAuth();
  const { activeTimer, elapsed, busy: timerBusy, pauseTimer, resumeTimer, stopTimer } = useTimer();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ type: string; label: string; href: string; icon: React.ReactNode }>>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("sidebar-collapsed") : null;
    if (stored === "true") setCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebar-collapsed", String(next));
      window.dispatchEvent(new CustomEvent("sidebar-toggle", { detail: { collapsed: next } }));
    }
  };

  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (drawerOpen && window.innerWidth < 1024) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const visibleNav = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.permission && !can(effectiveRole, item.permission)) return false;
      return true;
    }),
  })).filter((group) => group.items.length > 0);

  function handleSearch(query: string) {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const results: Array<{ type: string; label: string; href: string; icon: React.ReactNode }> = [];

    visibleNav.forEach((group) => {
      group.items.forEach((item) => {
        if (item.label.toLowerCase().includes(lowerQuery)) {
          results.push({ type: "nav", label: item.label, href: item.href, icon: item.icon });
        }
      });
    });

    setSearchResults(results);
    setShowSearchResults(true);
  }

  function navigateToResult(href: string) {
    router.push(href);
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    router.push("/login");
    router.refresh();
  }

  const sidebarWidth = collapsed ? 64 : 248;

  return (
    <>
      <button
        className="app-hamburger"
        onClick={() => setDrawerOpen(true)}
        aria-label="Ouvrir le menu"
      >
        ☰
      </button>

      <div
        className={`app-sidebar-backdrop ${drawerOpen ? "is-open" : ""}`}
        onClick={() => setDrawerOpen(false)}
      />

      <aside
        className={`app-sidebar ${drawerOpen ? "is-open" : ""}`}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          height: "100vh",
          width: sidebarWidth,
          background: "#0A0A0A",
          zIndex: 30,
          display: "flex",
          flexDirection: "column",
          transition: "width 0.25s ease, transform 0.25s ease",
          overflow: "hidden",
        }}
      >
        {/* Logo */}
        <div style={{
          padding: collapsed ? "14px 0" : "22px 16px 16px",
          borderBottom: "1px solid #1A1816",
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          minHeight: 68,
          flexShrink: 0,
        }}>
          {collapsed ? (
            <div style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #C9A24E, #8C6A20)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 800,
              color: "#1A1206",
              flexShrink: 0,
            }}>
              GE
            </div>
          ) : (
            <>
              <Image
                src="/logo-groupe-echo.png"
                alt="Groupe Écho"
                width={160}
                height={48}
                priority
                style={{ width: 160, height: "auto", display: "block" }}
              />
              <NotificationBell />
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Fermer"
                style={{
                  position: "absolute",
                  right: 12,
                  top: 12,
                  display: "none",
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "#242220",
                  border: "none",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 16,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                className="lg:hidden"
              >×</button>
            </>
          )}
        </div>

        {/* Search — hidden in compact mode */}
        {!collapsed && (
          <div style={{ padding: "12px 16px 8px", position: "relative", flexShrink: 0 }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              background: "#161512",
              border: "1px solid #242220",
              borderRadius: 10,
              padding: "9px 12px",
            }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#6E6A5E" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="9" r="6" />
                <line x1="13.5" y1="13.5" x2="18" y2="18" />
              </svg>
              <input
                type="text"
                placeholder="Rechercher…"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onFocus={() => searchQuery && setShowSearchResults(true)}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: 15,
                  color: "#fff",
                  fontFamily: "inherit",
                }}
              />
              <span
                onClick={() => window.dispatchEvent(new CustomEvent("open-command-palette"))}
                style={{ color: "#56544C", fontSize: 13, border: "1px solid #2A2825", borderRadius: 5, padding: "1px 6px", cursor: "pointer" }}
              >⌘K</span>
            </div>

            {showSearchResults && searchResults.length > 0 && (
              <div style={{
                position: "absolute",
                left: 16,
                right: 16,
                top: "calc(100% - 4px)",
                background: "#161512",
                border: "1px solid #242220",
                borderRadius: 10,
                boxShadow: "0 8px 24px rgba(0,0,0,.4)",
                zIndex: 50,
                maxHeight: 320,
                overflowY: "auto",
              }}>
                {searchResults.map((result, idx) => (
                  <button
                    key={`${result.type}-${result.href}`}
                    onClick={() => navigateToResult(result.href)}
                    style={{
                      display: "flex",
                      width: "100%",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 14px",
                      background: "none",
                      border: "none",
                      borderBottom: idx !== searchResults.length - 1 ? "1px solid #242220" : "none",
                      color: "#C9C6BB",
                      fontSize: 15,
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "inherit",
                    }}
                  >
                    <span style={{ width: 20, display: "flex", alignItems: "center", justifyContent: "center", color: "#9A988F" }}>{result.icon}</span>
                    <span style={{ fontWeight: 500 }}>{result.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: collapsed ? "4px 0 8px" : "4px 16px 8px" }}>
          {visibleNav.map((group, groupIdx) => (
            <div key={group.label} style={{ marginTop: groupIdx > 0 ? 20 : 10 }}>
              {!collapsed && (
                <div style={{
                  color: "#56544C",
                  fontSize: 12,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  fontWeight: 700,
                  padding: "0 10px",
                  marginBottom: 7,
                  whiteSpace: "nowrap",
                }}>
                  {group.label}
                </div>
              )}
              {collapsed && groupIdx > 0 && (
                <div style={{ height: 1, background: "#1A1816", margin: "0 12px 14px" }} />
              )}
              {group.items.map((item) => {
                const active = pathname?.startsWith(item.href) ?? false;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    style={active ? {
                      background: "rgba(201,162,78,0.13)",
                      boxShadow: collapsed ? "none" : "inset 2px 0 0 #C9A24E",
                      color: "#E4C77B",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: collapsed ? "center" : "flex-start",
                      gap: collapsed ? 0 : 11,
                      padding: collapsed ? "10px 0" : "9px 11px",
                      borderRadius: 9,
                      fontSize: 15.5,
                      marginBottom: 2,
                      textDecoration: "none",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                    } : {
                      color: "#9A988F",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: collapsed ? "center" : "flex-start",
                      gap: collapsed ? 0 : 11,
                      padding: collapsed ? "10px 0" : "9px 11px",
                      borderRadius: 9,
                      fontSize: 15.5,
                      fontWeight: 500,
                      marginBottom: 2,
                      textDecoration: "none",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span style={{ width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {item.icon}
                    </span>
                    <span style={{
                      overflow: "hidden",
                      maxWidth: collapsed ? 0 : 160,
                      opacity: collapsed ? 0 : 1,
                      transition: "max-width 0.22s ease, opacity 0.15s ease",
                      display: "inline-block",
                    }}>
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User card */}
        <div style={{ padding: collapsed ? "12px 8px 8px" : "12px 16px 8px", flexShrink: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: collapsed ? 0 : 11,
              justifyContent: collapsed ? "center" : "flex-start",
              background: "#161512",
              border: "1px solid #242220",
              borderRadius: 12,
              padding: collapsed ? "10px 0" : "10px 11px",
              overflow: "hidden",
            }}
          >
            <span
              onClick={() => router.push("/profil")}
              title={currentUser.nom + " · Mon profil"}
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: currentUser.avatarUrl ? undefined : `linear-gradient(135deg, #C9A24E, #8C6A20)`,
                backgroundImage: currentUser.avatarUrl ? `url(${currentUser.avatarUrl})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
                color: "#1A1206",
                fontSize: 14,
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                cursor: "pointer",
              }}
            >
              {!currentUser.avatarUrl && currentUser.avatar}
            </span>
            <div
              onClick={() => router.push("/profil")}
              style={{
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                maxWidth: collapsed ? 0 : 200,
                opacity: collapsed ? 0 : 1,
                transition: "max-width 0.22s ease, opacity 0.15s ease",
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, color: "#EDE9DD", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {currentUser.nom}
              </div>
              <div style={{ fontSize: 13, color: "#B79B5E" }}>{ROLE_LABEL[currentUser.role]}</div>
            </div>
            {!collapsed && (
              <span
                onClick={handleLogout}
                title={loggingOut ? "Déconnexion…" : "Se déconnecter"}
                style={{ display: "flex", cursor: "pointer", flexShrink: 0, padding: 2 }}
              >
                <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="#6E6A5E" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 5H6.5C5.7 5 5 5.7 5 6.5v7C5 14.3 5.7 15 6.5 15H11" />
                  <path d="M13 7l3 3-3 3" />
                  <line x1="16" y1="10" x2="8.5" y2="10" />
                </svg>
              </span>
            )}
          </div>
        </div>

        {/* Chrono actif — visible sur toutes les pages, pas seulement Mes tâches.
            Le temps est l'élément visuel dominant du bloc ; l'état pause a un
            traitement visuel distinct (bordure/teinte neutre, pas d'animation) pour
            ne jamais reposer uniquement sur la couleur. */}
        {activeTimer && (() => {
          const isPaused = !activeTimer.startedAt;
          const label = isPaused ? "Chrono en pause" : "Chrono en cours";
          return (
            <div style={{ padding: collapsed ? "0 8px 10px" : "0 16px 10px", flexShrink: 0 }}>
              <div
                style={{
                  background: isPaused ? "#1D1B17" : "linear-gradient(135deg,#3A2308,#241305)",
                  border: `1.5px solid ${isPaused ? "#5C5A52" : "#C9A24E"}`,
                  borderRadius: 12,
                  padding: collapsed ? "9px 0" : "11px 12px",
                  overflow: "hidden",
                  animation: !collapsed && !isPaused ? "timerGlow 2s ease-in-out infinite" : "none",
                }}
              >
                {collapsed ? (
                  <button
                    type="button"
                    onClick={() => router.push("/mes-taches")}
                    title={`${label} · ${activeTimer.taskLabel} · ${elapsed}`}
                    aria-label={`${label} : ${activeTimer.taskLabel}, ${elapsed}`}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                  >
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: isPaused ? "#8C8B83" : "#E4A93A", boxShadow: isPaused ? "none" : "0 0 6px 1px rgba(228,169,58,.7)", animation: !isPaused ? "pulse 1.4s ease-in-out infinite" : "none", flexShrink: 0 }} />
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: isPaused ? "#8C8B83" : "#E4C77B", fontVariantNumeric: "tabular-nums" }}>{elapsed}</span>
                  </button>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: isPaused ? "#8C8B83" : "#E4A93A", boxShadow: isPaused ? "none" : "0 0 6px 1px rgba(228,169,58,.7)", animation: !isPaused ? "pulse 1.4s ease-in-out infinite" : "none", flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: isPaused ? "#9A988F" : "#E4C77B" }}>
                        {label}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => router.push("/mes-taches")}
                      title="Voir la tâche"
                      style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer", marginBottom: 8 }}
                    >
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: "#F4ECD7", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {activeTimer.taskLabel}
                      </div>
                      {activeTimer.projectName && (
                        <div style={{ fontSize: 12, color: "#B7AE95", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 1 }}>
                          {activeTimer.projectName}
                        </div>
                      )}
                    </button>

                    <div style={{ fontSize: 20, fontWeight: 800, color: isPaused ? "#C9C6BB" : "#E4C77B", fontVariantNumeric: "tabular-nums", lineHeight: 1, marginBottom: 10 }}>
                      {elapsed}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {isPaused ? (
                        <button
                          type="button"
                          className="btn"
                          aria-label="Reprendre le chrono"
                          title="Reprendre"
                          disabled={timerBusy}
                          onClick={() => resumeTimer()}
                          style={{ width: 28, height: 28, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, background: "rgba(31,138,91,.16)", border: "none", color: "#4ADE80" }}
                        >
                          <IconPlay />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn"
                          aria-label="Mettre le chrono en pause"
                          title="Pause"
                          disabled={timerBusy}
                          onClick={() => pauseTimer()}
                          style={{ width: 28, height: 28, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, background: "rgba(194,65,12,.16)", border: "none", color: "#FB923C" }}
                        >
                          <IconPause />
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn"
                        aria-label="Arrêter le chrono"
                        title="Arrêter"
                        disabled={timerBusy}
                        onClick={() => stopTimer()}
                        style={{ width: 28, height: 28, padding: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, background: "rgba(220,38,38,.14)", border: "none", color: "#F87171" }}
                      >
                        <IconStop />
                      </button>
                      <button
                        type="button"
                        onClick={() => router.push("/mes-taches")}
                        style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 3, background: "none", border: "none", color: "#B7AE95", fontSize: 12, fontWeight: 600, cursor: "pointer", padding: "4px 2px" }}
                      >
                        Voir la tâche
                        <IconChevronRight />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {/* Collapse toggle button */}
        <div style={{ padding: collapsed ? "0 8px 16px" : "0 16px 16px", flexShrink: 0 }}>
          <button
            onClick={toggleCollapsed}
            title={collapsed ? "Développer la sidebar" : "Réduire la sidebar"}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              gap: 8,
              padding: collapsed ? "7px 0" : "7px 11px",
              background: "none",
              border: "1px solid #242220",
              borderRadius: 9,
              color: "#56544C",
              fontSize: 14,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "border-color 0.15s ease, color 0.15s ease",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.color = "#9A988F";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#3A3830";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.color = "#56544C";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "#242220";
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transform: collapsed ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 0.25s ease", flexShrink: 0 }}
            >
              <polyline points="7 4 13 10 7 16" />
            </svg>
            {!collapsed && (
              <span style={{ overflow: "hidden", maxWidth: collapsed ? 0 : 120, opacity: collapsed ? 0 : 1, transition: "max-width 0.22s ease, opacity 0.15s ease", whiteSpace: "nowrap" }}>
                Réduire
              </span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
