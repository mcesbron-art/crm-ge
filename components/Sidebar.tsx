"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: string;
  moneyOnly?: boolean;
  directionOnly?: boolean;
};

const NAV: NavItem[] = [
  { id: "dashboard",      label: "Dashboard",      href: "/dashboard",      icon: "▦" },
  { id: "projets",        label: "Projets",        href: "/projets",        icon: "▣" },
  { id: "kanban",         label: "Kanban",         href: "/kanban",         icon: "▰" },
  { id: "bat",            label: "BAT",            href: "/bat",            icon: "✎" },
  { id: "calendrier",     label: "Calendrier",     href: "/calendrier",     icon: "▫" },
  { id: "equipe",         label: "Équipe",         href: "/equipe",         icon: "◉" },
  { id: "facturation",    label: "Facturation",    href: "/facturation",    icon: "▤", moneyOnly: true },
  { id: "rapports",       label: "Rapports",       href: "/rapports",       icon: "▥", moneyOnly: true },
  { id: "administration", label: "Administration", href: "/administration", icon: "⚙", directionOnly: true },
];

const ROLE_LABEL: Record<string, string> = {
  direction:     "Direction",
  admin:         "Admin",
  collaborateur: "Collaborateur",
};

export default function Sidebar() {
  const pathname = usePathname();
  const { currentUser, users, setCurrentUserById, canSeeMoney, canAccessAdmin } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Ferme le drawer dès qu'on change de page
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  // Empêche le scroll du body quand le drawer est ouvert sur mobile
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (drawerOpen && window.innerWidth < 1024) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const visibleNav = NAV.filter((item) => {
    if (item.moneyOnly && !canSeeMoney) return false;
    if (item.directionOnly && !canAccessAdmin) return false;
    return true;
  });

  const otherUsers = users.filter((u) => u.id !== currentUser.id && u.actif);

  return (
    <>
      {/* Bouton hamburger (visible mobile/tablet uniquement via CSS) */}
      <button
        className="app-hamburger"
        onClick={() => setDrawerOpen(true)}
        aria-label="Ouvrir le menu"
      >
        ☰
      </button>

      {/* Backdrop (visible mobile uniquement quand drawer ouvert) */}
      <div
        className={`app-sidebar-backdrop ${drawerOpen ? "is-open" : ""}`}
        onClick={() => setDrawerOpen(false)}
      />

      <aside className={`app-sidebar ${drawerOpen ? "is-open" : ""}`}>
        {/* Brand + close button on mobile */}
        <div className="border-b border-[#2A2A2A] px-6 pb-5 pt-7 relative">
          <div className="font-display text-[22px] font-normal tracking-wider text-dore">
            GROUPE ÉCHO
          </div>
          <div className="mt-1 text-[11px] uppercase tracking-[1.5px] text-[#666]">
            CRM Production
          </div>
          {/* Bouton de fermeture du drawer (mobile uniquement) */}
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label="Fermer le menu"
            className="absolute right-3 top-3 lg:hidden flex h-8 w-8 items-center justify-center rounded-full bg-[#2A2A2A] text-[#888] hover:text-white"
          >×</button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {visibleNav.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                className={[
                  "mb-0.5 flex items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-sm transition-all",
                  active
                    ? "bg-[#2A2A2A] font-semibold text-dore"
                    : "text-[#888] hover:bg-[#1F1F1F] hover:text-white",
                ].join(" ")}
              >
                <span className="w-5 text-center text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User card + switcher */}
        <div className="relative border-t border-[#2A2A2A] px-3 py-3">
          {userMenuOpen && (
            <div
              className="absolute bottom-full left-3 right-3 mb-1 max-h-72 overflow-y-auto rounded-lg border border-[#2A2A2A] bg-[#1A1A1A] py-1 shadow-xl"
              onMouseLeave={() => setUserMenuOpen(false)}
            >
              <div className="border-b border-[#2A2A2A] px-3 py-2 text-[10px] uppercase tracking-wider text-[#666]">
                Changer d&apos;utilisateur (démo)
              </div>
              {otherUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => { setCurrentUserById(u.id); setUserMenuOpen(false); }}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-[#222]"
                >
                  <div
                    className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                    style={{ background: u.color }}
                  >
                    {u.avatar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-semibold text-white">{u.nom}</div>
                    <div className="text-[10px] text-[#888]">{ROLE_LABEL[u.role]}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => setUserMenuOpen((o) => !o)}
            className="flex w-full items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-[#1F1F1F]"
          >
            <div
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-noir"
              style={{ background: `linear-gradient(135deg, ${currentUser.color}, #D4BA78)` }}
            >
              {currentUser.avatar}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <div className="truncate text-[13px] font-semibold text-white">{currentUser.nom}</div>
              <div className="text-[11px] text-[#666]">{ROLE_LABEL[currentUser.role]}</div>
            </div>
            <span className="text-[10px] text-[#666]">{userMenuOpen ? "▴" : "▾"}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
