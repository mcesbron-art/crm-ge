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
  icon: React.ReactNode;
  moneyOnly?: boolean;
  directionOnly?: boolean;
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
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
        )
      },
      {
        id: "projets",
        label: "Projets",
        href: "/projets",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
        )
      },
      {
        id: "kanban",
        label: "Kanban",
        href: "/kanban",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="4" height="16"></rect>
            <rect x="10.5" y="4" width="4" height="16"></rect>
            <rect x="18" y="4" width="4" height="16"></rect>
          </svg>
        )
      },
      {
        id: "bat",
        label: "BAT",
        href: "/bat",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        )
      },
      {
        id: "calendrier",
        label: "Calendrier",
        href: "/calendrier",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        )
      },
    ]
  },
  {
    label: "GESTION",
    items: [
      {
        id: "equipe",
        label: "Équipe",
        href: "/equipe",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        )
      },
      {
        id: "clients",
        label: "Clients",
        href: "/clients",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
            <circle cx="12" cy="7" r="4"></circle>
          </svg>
        )
      },
      {
        id: "opportunites",
        label: "Opportunités",
        href: "/opportunites",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
          </svg>
        )
      },
      {
        id: "facturation",
        label: "Facturation",
        href: "/facturation",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
            <line x1="2" y1="17" x2="22" y2="17"></line>
            <path d="M2 5h20"></path>
          </svg>
        ),
        moneyOnly: true
      },
    ]
  },
  {
    label: "SYSTÈME",
    items: [
      {
        id: "rapports",
        label: "Rapports",
        href: "/rapports",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <path d="M3 17v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2"></path>
            <path d="M12 3v6"></path>
          </svg>
        ),
        moneyOnly: true
      },
      {
        id: "administration",
        label: "Administration",
        href: "/administration",
        icon: (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 1v6m0 6v6M4.22 4.22l4.24 4.24m5.08 5.08l4.24 4.24M1 12h6m6 0h6M4.22 19.78l4.24-4.24m5.08-5.08l4.24-4.24"></path>
          </svg>
        ),
        directionOnly: true
      },
    ]
  }
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
  const [searchResults, setSearchResults] = useState<Array<{ type: string; label: string; href: string; icon: React.ReactNode }>>([]);
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

  const visibleNav = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.moneyOnly && !canSeeMoney) return false;
      if (item.directionOnly && !canAccessAdmin) return false;
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
          results.push({
            type: "nav",
            label: item.label,
            href: item.href,
            icon: item.icon,
          });
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
                  <span className="w-5 flex items-center justify-center">{result.icon}</span>
                  <span className="font-medium flex-1 text-left">{result.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {visibleNav.map((group, groupIdx) => (
            <div key={group.label} className={groupIdx > 0 ? "mt-6" : ""}>
              <div className="px-3.5 py-2 text-xs font-bold text-[#666666] uppercase tracking-wider">
                {group.label}
              </div>
              {group.items.map((item) => {
                const active = pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={[
                      "mb-0.5 flex items-center gap-3 rounded-[8px] px-3.5 py-2.5 text-sm transition-all font-medium",
                      active
                        ? "bg-[#1a1a1a] bg-opacity-40 text-[#C5A55A] border-l-2 border-[#C5A55A]"
                        : "text-[#999999] hover:bg-[#333333] hover:text-white",
                    ].join(" ")}
                  >
                    <span className="w-5 flex items-center justify-center text-lg">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
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
