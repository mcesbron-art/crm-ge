"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import Image from "next/image";

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
  { id: "clients",        label: "Clients",        href: "/clients",        icon: "◈" },
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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ type: string; label: string; href: string; icon: string }>>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);

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

  function handleSearch(query: string) {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const results = visibleNav.filter((item) =>
      item.label.toLowerCase().includes(lowerQuery)
    );

    setSearchResults(results.map((item) => ({
      type: "nav",
      label: item.label,
      href: item.href,
      icon: item.icon,
    })));
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
        <div className="border-b border-[#1a1a1a] px-6 pb-5 pt-7 relative flex items-center justify-center">
          <Image
            src="/logo-groupe-echo.png"
            alt="Groupe Echo Logo"
            width={200}
            height={80}
            priority
            style={{ maxWidth: '85%', height: 'auto' }}
          />
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label="Fermer le menu"
            className="absolute right-3 top-3 lg:hidden flex h-8 w-8 items-center justify-center rounded-full bg-[#333333] text-white hover:text-white transition-colors"
          >×</button>
        </div>

        <div className="border-b border-[#333333] px-4 py-4 relative">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#666666] text-lg">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => searchQuery && setShowSearchResults(true)}
              className="w-full rounded-[10px] bg-[#1a1a1a] pl-11 pr-14 py-3 text-sm text-white placeholder-[#888888] border border-[#2a2a2a] outline-none transition focus:border-[#C5A55A] focus:ring-1 focus:ring-[#C5A55A] focus:ring-opacity-30 font-medium"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#666666] text-xs font-semibold">⌘K</span>
          </div>

          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute left-4 right-4 mt-2 rounded-[10px] bg-[#1a1a1a] border border-[#2a2a2a] shadow-xl z-50 max-h-80 overflow-y-auto">
              {searchResults.map((result, idx) => (
                <button
                  key={`${result.type}-${result.href}`}
                  onClick={() => navigateToResult(result.href)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-sm text-white hover:bg-[#2a2a2a] transition ${
                    idx !== searchResults.length - 1 ? "border-b border-[#2a2a2a]" : ""
                  }`}
                >
                  <span className="w-5 text-center text-base">{result.icon}</span>
                  <span className="font-medium flex-1 text-left">{result.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {visibleNav.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.id}
                href={item.href}
                className={[
                  "mb-0.5 flex items-center gap-3 rounded-[8px] px-3.5 py-2.5 text-base transition-all font-medium",
                  active
                    ? "bg-[#1a1a1a] bg-opacity-40 text-white border-l-2 border-[#C5A55A]"
                    : "text-white hover:bg-[#333333] hover:text-[#C5A55A]",
                ].join(" ")}
              >
                <span className="w-5 text-center text-lg">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Carte utilisateur + bouton Déconnexion */}
        <div className="border-t border-[#333333] px-3 py-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-blanc"
              style={{ background: `linear-gradient(135deg, ${currentUser.color}, #000000)` }}
            >
              {currentUser.avatar}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-semibold text-white">{currentUser.nom}</div>
              <div className="text-[13px] text-[#A8D5D0]">{ROLE_LABEL[currentUser.role]}</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-[#C5A55A] bg-transparent px-3 py-2 text-[14px] font-medium text-[#C5A55A] transition hover:border-[#D4BA78] hover:text-[#D4BA78] hover:bg-[#333333] disabled:opacity-50"
          >
            <span>↩</span>
            <span>{loggingOut ? "Déconnexion…" : "Se déconnecter"}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
