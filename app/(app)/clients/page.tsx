"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { COLORS } from "@/lib/mock-data";

type Company = {
  id: number;
  name: string;
  address_street?: string;
  address_zip_code?: string;
  address_city?: string;
  address_country?: string;
  is_customer: boolean;
  is_prospect: boolean;
  is_supplier: boolean;
  is_disabled: boolean;
  employees?: {
    id: number;
    firstname: string;
    lastname: string;
    email: string;
    cellphone_number?: string;
    job?: string;
  }[];
};

export default function ClientsPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"tous" | "clients" | "prospects">("clients");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/axonaut/companies", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur chargement");
      setCompanies(data.companies ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = companies.filter((c) => {
    if (filter === "clients" && !c.is_customer) return false;
    if (filter === "prospects" && !c.is_prospect) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: companies.length,
    clients: companies.filter((c) => c.is_customer).length,
    prospects: companies.filter((c) => c.is_prospect).length,
  };

  return (
    <div className="animate-fadeIn">
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{
            fontFamily: "var(--font-dm-serif-display), Georgia, serif",
            fontSize: 30, color: COLORS.noir, margin: "0 0 4px", fontWeight: 400,
          }}>Clients & Prospects</h1>
          <p style={{ color: COLORS.grisMoyen, fontSize: 14, margin: 0 }}>
            Source Axonaut · mise à jour en temps réel
          </p>
        </div>
        <button
          onClick={load}
          style={{
            padding: "10px 18px", borderRadius: 10, border: `1px solid ${COLORS.grisBorder}`,
            background: COLORS.blanc, color: COLORS.noir,
            fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}
        >↻ Rafraîchir</button>
      </div>

      <div className="grid-kpi-4" style={{ marginBottom: 24 }}>
        <KpiCard label="Total" value={stats.total} accent />
        <KpiCard label="Clients" value={stats.clients} color={COLORS.vert} />
        <KpiCard label="Prospects" value={stats.prospects} color={COLORS.bleu} />
        <KpiCard label="Page chargée" value="500 / page" />
      </div>

      <div style={{
        background: COLORS.blanc, borderRadius: 12,
        border: `1px solid ${COLORS.grisBorder}`, padding: "10px 14px",
        marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
      }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une entreprise…"
          style={{
            flex: 1, minWidth: 200, padding: "7px 12px",
            border: `1px solid ${COLORS.grisBorder}`, borderRadius: 8,
            fontSize: 13, color: COLORS.noir, background: COLORS.blanc, outline: "none",
          }}
        />
        {(["tous", "clients", "prospects"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "6px 14px", borderRadius: 14,
              border: `1px solid ${filter === f ? COLORS.dore : COLORS.grisBorder}`,
              background: filter === f ? COLORS.dorePale : COLORS.blanc,
              color: filter === f ? COLORS.dore : COLORS.grisMoyen,
              fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "capitalize",
            }}
          >{f}</button>
        ))}
      </div>

      {error && (
        <div style={{
          padding: "12px 16px", marginBottom: 16,
          background: COLORS.rougeBg, border: `1px solid ${COLORS.rouge}55`,
          borderRadius: 10, color: COLORS.rouge, fontSize: 13, fontWeight: 600,
        }}>{error}</div>
      )}

      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: COLORS.grisMoyen }}>
          Chargement des entreprises Axonaut…
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: COLORS.grisMoyen, marginBottom: 12 }}>
            {filtered.length} entreprise{filtered.length > 1 ? "s" : ""} affichée{filtered.length > 1 ? "s" : ""}
          </div>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
            {filtered.map((c) => (
              <CompanyCard key={c.id} company={c} />
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: COLORS.grisMoyen, gridColumn: "1/-1" }}>
                Aucune entreprise trouvée.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function CompanyCard({ company: c }: { company: Company }) {
  const router = useRouter();
  const badge = c.is_customer
    ? { label: "Client", bg: COLORS.vertBg, color: COLORS.vert }
    : c.is_prospect
    ? { label: "Prospect", bg: "#E3F2FD", color: "#1565C0" }
    : { label: "Autre", bg: COLORS.gris, color: COLORS.grisMoyen };

  return (
    <div
      onClick={() => router.push(`/clients/${c.id}`)}
      style={{
        background: COLORS.blanc, border: `1px solid ${COLORS.grisBorder}`,
        borderRadius: 12, padding: 14, cursor: "pointer",
        transition: "box-shadow 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)")}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.noir, lineHeight: 1.3, flex: 1 }}>
          {c.name}
        </div>
        <span style={{
          padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700,
          background: badge.bg, color: badge.color, whiteSpace: "nowrap", marginLeft: 8,
        }}>{badge.label}</span>
      </div>

      {c.address_city && (
        <div style={{ fontSize: 11, color: COLORS.grisMoyen, marginBottom: 6 }}>
          📍 {c.address_city}{c.address_zip_code ? ` (${c.address_zip_code})` : ""}
        </div>
      )}

      {c.employees && c.employees.length > 0 && (
        <div style={{ borderTop: `1px solid ${COLORS.grisBorder}`, paddingTop: 8, marginTop: 8 }}>
          {c.employees.slice(0, 2).map((e) => (
            <div key={e.id} style={{ fontSize: 11, color: COLORS.grisMoyen, marginBottom: 3 }}>
              <span style={{ fontWeight: 600, color: COLORS.noir }}>{e.firstname} {e.lastname}</span>
              {e.job ? ` · ${e.job}` : ""}
              {e.email && (
                <a href={`mailto:${e.email}`} onClick={(ev) => ev.stopPropagation()} style={{ display: "block", color: COLORS.bleu, textDecoration: "none" }}>
                  ✉ {e.email}
                </a>
              )}
              {e.cellphone_number && (
                <a href={`tel:${e.cellphone_number}`} onClick={(ev) => ev.stopPropagation()} style={{ display: "block", color: COLORS.bleu, textDecoration: "none" }}>
                  ☎ {e.cellphone_number}
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, accent, color }: { label: string; value: number | string; accent?: boolean; color?: string }) {
  return (
    <div style={{
      background: accent ? COLORS.noir : COLORS.blanc,
      border: accent ? "none" : `1px solid ${COLORS.grisBorder}`,
      borderRadius: 14, padding: 18,
    }}>
      <div style={{ fontSize: 11, color: accent ? "#888" : COLORS.grisMoyen, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: accent ? COLORS.dore : color ?? COLORS.noir, fontFamily: "var(--font-dm-serif-display), Georgia, serif", lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}