"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  { id: "opportunites",   label: "Opportunités",   href: "/opportunites",   icon: "★" },
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
  const router = useRouter();
  const { currentUser, canSeeMoney, canAccessAdmin } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

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

  const visibleNav = NAV.filter((item) => {
    if (item.moneyOnly && !canSeeMoney) return false;
    if (item.directionOnly && !canAccessAdmin) return false;
    return true;
  });

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore — on tente la redirection quand même
    }
    router.push("/login");
    router.refresh();
  }

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

      <aside className={`app-sidebar ${drawerOpen ? "is-open" : ""}`}>
        <div className="border-b border-[#2A2A2A] px-6 pb-5 pt-7 relative">
          <div className="font-display text-[22px] font-normal tracking-wider text-dore">
            GROUPE ÉCHO
          </div>
          <div className="mt-1 text-[11px] uppercase tracking-[1.5px] text-[#666]">
            CRM Production
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label="Fermer le menu"
            className="absolute right-3 top-3 lg:hidden flex h-8 w-8 items-center justify-center rounded-full bg-[#2A2A2A] text-[#888] hover:text-white"
          >×</button>
        </div>

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

        {/* Carte utilisateur + bouton Déconnexion */}
        <div className="border-t border-[#2A2A2A] px-3 py-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-noir"
              style={{ background: `linear-gradient(135deg, ${currentUser.color}, #D4BA78)` }}
            >
              {currentUser.avatar}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold text-white">{currentUser.nom}</div>
              <div className="text-[11px] text-[#666]">{ROLE_LABEL[currentUser.role]}</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-[#2A2A2A] bg-transparent px-3 py-2 text-[12px] font-medium text-[#888] transition hover:border-rouge hover:text-rouge disabled:opacity-50"
          >
            <span>↩</span>
            <span>{loggingOut ? "Déconnexion…" : "Se déconnecter"}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
