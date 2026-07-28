"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";

type SearchResult = {
  type: "client" | "ticket" | "tache" | "projet";
  id: string;
  label: string;
  sublabel: string;
  url: string;
};

const CATEGORY_LABELS: Record<SearchResult["type"], string> = {
  client: "Clients",
  ticket: "Tickets",
  tache: "Tâches",
  projet: "Projets",
};

const CATEGORY_ORDER: SearchResult["type"][] = ["client", "ticket", "tache", "projet"];

function CategoryIcon({ type }: { type: SearchResult["type"] }) {
  const common = { width: 16, height: 16, viewBox: "0 0 20 20", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (type) {
    case "client":
      return <svg {...common}><circle cx="10" cy="7" r="3.2" /><path d="M4 16.5c0-3 2.7-5 6-5s6 2 6 5" /></svg>;
    case "ticket":
      return <svg {...common}><rect x="3" y="5.5" width="14" height="9" rx="2" /><line x1="10" y1="5.5" x2="10" y2="14.5" strokeDasharray="1.6 1.6" /></svg>;
    case "tache":
      return <svg {...common}><rect x="3.5" y="3.5" width="13" height="13" rx="2.5" /><path d="M6.5 10.2l2.3 2.3 4.7-4.9" /></svg>;
    case "projet":
      return <svg {...common}><path d="M3 6.5C3 5.7 3.6 5 4.4 5H8l1.6 1.8h6C16.4 6.8 17 7.4 17 8.2V14.6c0 .8-.6 1.4-1.4 1.4H4.4C3.6 16 3 15.4 3 14.6Z" /></svg>;
  }
}

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(o => !o);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    function handleOpenEvent() { setOpen(true); }
    window.addEventListener("open-command-palette", handleOpenEvent);
    return () => window.removeEventListener("open-command-palette", handleOpenEvent);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      return;
    }
  }, [open]);

  useEffect(() => {
    abortRef.current?.abort();

    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    const timeout = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal })
        .then(r => r.json())
        .then((d: { results?: SearchResult[] }) => {
          setResults(d.results ?? []);
          setLoading(false);
        })
        .catch(err => {
          if (err.name !== "AbortError") setLoading(false);
        });
    }, 200);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  function handleSelect(result: SearchResult) {
    setOpen(false);
    router.push(result.url);
  }

  const grouped = CATEGORY_ORDER
    .map(type => ({ type, items: results.filter(r => r.type === type) }))
    .filter(g => g.items.length > 0);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Recherche globale"
      shouldFilter={false}
      style={{
        position: "fixed",
        top: "15%",
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(560px, 92vw)",
        background: "#161512",
        border: "1px solid #242220",
        borderRadius: 12,
        boxShadow: "0 16px 48px rgba(0,0,0,.5)",
        overflow: "hidden",
        zIndex: 100,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid #242220" }}>
        <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="#6E6A5E" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="9" r="6" />
          <line x1="13.5" y1="13.5" x2="18" y2="18" />
        </svg>
        <Command.Input
          value={query}
          onValueChange={setQuery}
          placeholder="Rechercher clients, tickets, tâches, projets…"
          autoFocus
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
        <span style={{ color: "#56544C", fontSize: 12, border: "1px solid #2A2825", borderRadius: 5, padding: "1px 6px" }}>Échap</span>
      </div>

      <Command.List style={{ maxHeight: 360, overflowY: "auto", padding: results.length > 0 ? "6px 0" : 0 }}>
        {query.trim().length < 2 && (
          <div style={{ padding: "24px 16px", color: "#6E6A5E", fontSize: 13.5, textAlign: "center" }}>
            Tapez au moins 2 caractères pour rechercher
          </div>
        )}

        {query.trim().length >= 2 && loading && (
          <div style={{ padding: "24px 16px", color: "#6E6A5E", fontSize: 13.5, textAlign: "center" }}>Recherche…</div>
        )}

        {query.trim().length >= 2 && !loading && results.length === 0 && (
          <Command.Empty>
            <div style={{ padding: "24px 16px", color: "#6E6A5E", fontSize: 13.5, textAlign: "center" }}>
              Aucun résultat pour « {query.trim()} »
            </div>
          </Command.Empty>
        )}

        {grouped.map(group => (
          <Command.Group
            key={group.type}
            heading={CATEGORY_LABELS[group.type]}
            style={{ padding: "6px 0" }}
          >
            {group.items.map(item => (
              <Command.Item
                key={`${item.type}-${item.id}`}
                value={`${item.type}-${item.id}`}
                onSelect={() => handleSelect(item)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 16px",
                  cursor: "pointer",
                  color: "#C9C6BB",
                  fontSize: 14.5,
                }}
              >
                <span style={{ width: 20, display: "flex", alignItems: "center", justifyContent: "center", color: "#9A988F", flexShrink: 0 }}>
                  <CategoryIcon type={item.type} />
                </span>
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
                  <span style={{ display: "block", fontWeight: 500, color: "#EDE9DD", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
                  {item.sublabel && (
                    <span style={{ display: "block", fontSize: 12.5, color: "#6E6A5E", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.sublabel}</span>
                  )}
                </span>
              </Command.Item>
            ))}
          </Command.Group>
        ))}
      </Command.List>

      <style jsx global>{`
        [cmdk-group-heading] {
          padding: 4px 16px;
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          color: #56544C;
        }
        [cmdk-item][data-selected="true"] {
          background: #242220;
        }
        [cmdk-overlay] {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,.6);
          z-index: 99;
        }
      `}</style>
    </Command.Dialog>
  );
}
