"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useClientsStore } from "@/lib/clients-store";
import { Client } from "@/lib/clients-data";
import { typography } from "@/lib/typography";
import Button from "@/components/ui/Button";

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg,#E0BC68,#A47E2A)",
  "linear-gradient(135deg,#D8B25C,#9A7424)",
  "linear-gradient(135deg,#E6C572,#A8801F)",
];

const STATUS_STYLES = {
  Actif:    { color: "#1F8A5B", bg: "#E7F3EB", dot: "#3FBF77" },
  Prospect: { color: "#2563EB", bg: "#E6EEFB", dot: "#2563EB" },
  Inactif:  { color: "#74726A", bg: "#F0EFEA", dot: "#B5B2A6" },
};

type FilterKey = "tous" | "actifs" | "prospects" | "inactifs";

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(w => /[A-Za-zÀ-ÿ]/.test(w))
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join("") || "?";
}

/* ─── Shared field types ─── */
type FormData = {
  name: string; contact: string; sector: string;
  status: "Actif" | "Prospect" | "Inactif";
  email: string; phone: string; city: string;
  siret: string; website: string; notes: string;
};

function inputStyle(focused: boolean): React.CSSProperties {
  return {
    width: "100%",
    padding: "10px 13px",
    border: `1px solid ${focused ? "#C9A24E" : "#E2E1DA"}`,
    borderRadius: 10,
    fontSize: 15.5,
    color: "#1C1B16",
    fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
    background: "#fff",
    outline: "none",
    boxShadow: focused ? "0 0 0 3px rgba(201,162,78,.12)" : "none",
    transition: "border-color .15s, box-shadow .15s",
  };
}

/* Field défini au niveau module → jamais recréé entre les renders */
function ModalField({
  id, label, required, type = "text", placeholder, as,
  value, error, focused,
  onChange, onFocus, onBlur,
}: {
  id: string; label: string; required?: boolean; type?: string;
  placeholder?: string; as?: "textarea" | "select";
  value: string; error?: string; focused: boolean;
  onChange: (v: string) => void;
  onFocus: () => void;
  onBlur: () => void;
}) {
  const base = inputStyle(focused);
  return (
    <div>
      <label style={{ ...typography.label, display: "block", marginBottom: 6 }}>
        {label}{required && <span style={{ color: "#C9A24E", marginLeft: 2 }}>*</span>}
      </label>
      {as === "textarea" ? (
        <textarea rows={3} value={value} placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          onFocus={onFocus} onBlur={onBlur}
          style={{ ...base, resize: "none" }}
        />
      ) : as === "select" ? (
        <select value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={onFocus} onBlur={onBlur}
          style={base}
        >
          <option value="Prospect">Prospect</option>
          <option value="Actif">Actif</option>
          <option value="Inactif">Inactif</option>
        </select>
      ) : (
        <input type={type} value={value} placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          onFocus={onFocus} onBlur={onBlur}
          style={base}
        />
      )}
      {error && (
        <div style={{ fontSize: 13.5, color: "#DC2626", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
          <svg width="12" height="12" viewBox="0 0 20 20" fill="#DC2626">
            <path d="M10 2a8 8 0 1 0 0 16A8 8 0 0 0 10 2zm0 4v4m0 4h.01" stroke="#fff" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          {error}
        </div>
      )}
    </div>
  );
}

/* ─── Modal ─── */
function NouveauClientModal({ onClose, onAdd }: { onClose: () => void; onAdd: (c: Client) => void }) {
  const [form, setForm] = useState<FormData>({
    name: "", contact: "", sector: "", status: "Prospect",
    email: "", phone: "", city: "", siret: "", website: "", notes: "",
  });
  const [focused, setFocused] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const initials = getInitials(form.name);

  function setField(key: keyof FormData, val: string) {
    setForm(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(e => { const n = { ...e }; delete n[key]; return n; });
  }

  function handleSubmit() {
    const e: Record<string, string> = {};
    if (!form.name.trim())    e.name    = "Le nom est requis";
    if (!form.contact.trim()) e.contact = "Le contact est requis";
    if (Object.keys(e).length) { setErrors(e); return; }

    onAdd({
      id: String(Date.now()),
      name: form.name.trim(),
      avatar: getInitials(form.name),
      avatarColor: "#B08D32",
      sector: form.sector.trim() || "—",
      siret: form.siret.trim() || "N/C",
      email: form.email.trim(),
      phone: form.phone.trim(),
      city: form.city.trim(),
      joinDate: new Date().toLocaleDateString("fr-FR", { month: "short", year: "numeric" }),
      status: form.status,
      description: form.notes.trim(),
      website: form.website.trim() || undefined,
      contactName: form.contact.trim(),
      caDisplay: "0 €",
      caTotal: 0,
      projectsCount: 0,
    });
    onClose();
  }

  function field(id: keyof FormData, label: string, opts: {
    required?: boolean; type?: string; placeholder?: string; as?: "textarea" | "select";
  } = {}) {
    return (
      <ModalField
        key={id}
        id={id}
        label={label}
        value={form[id]}
        error={errors[id]}
        focused={focused === id}
        onChange={v => setField(id, v)}
        onFocus={() => setFocused(id)}
        onBlur={() => setFocused(null)}
        {...opts}
      />
    );
  }

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className="modal-overlay-in"
        style={{
          position: "fixed", inset: 0,
          background: "rgba(10,10,10,0.55)",
          backdropFilter: "blur(4px)",
          zIndex: 1000,
        }}
      />

      {/* Panel */}
      <div className="modal-panel-centered-in" style={{
        position: "fixed",
        top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        width: "min(600px, 95vw)",
        maxHeight: "92vh",
        overflowY: "auto",
        background: "#fff",
        borderRadius: 20,
        boxShadow: "0 24px 80px rgba(10,10,10,.22), 0 2px 8px rgba(10,10,10,.08)",
        zIndex: 1001,
        fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif",
      }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          padding: "26px 28px 20px",
          borderBottom: "1px solid #F0EFEA",
          position: "sticky", top: 0, background: "#fff", zIndex: 1,
          borderRadius: "20px 20px 0 0",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Avatar preview */}
            <div style={{
              width: 48, height: 48, borderRadius: 13, flexShrink: 0,
              background: form.name
                ? "linear-gradient(135deg,#E0BC68,#A47E2A)"
                : "#F0EFEA",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 16, fontWeight: 800,
              color: form.name ? "#1A1206" : "#A6A498",
              transition: "background .2s",
            }}>
              {form.name ? initials : (
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#A6A498" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="10" cy="7" r="3.2"/><path d="M3.5 17c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5"/>
                </svg>
              )}
            </div>
            <div>
              <h2 style={{
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: 22, fontWeight: 800, color: "#16150F",
                margin: 0, letterSpacing: "-0.01em",
              }}>
                Nouveau client
              </h2>
              <p style={{ fontSize: 15, color: "#8C8B83", margin: "3px 0 0" }}>
                Renseignez les informations du client
              </p>
            </div>
          </div>

          <Button
            variant="icon"
            aria-label="Fermer"
            onClick={onClose}
            style={{
              background: "#F5F4EF", border: "1px solid #E8E7E0",
              flexShrink: 0, color: "#74726A", fontSize: 18, lineHeight: 1,
            }}
          >×</Button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Section Identité */}
          <div>
            <div style={{ fontSize: 12.5, letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 700, color: "#A6A498", marginBottom: 14 }}>
              Identité
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {field("name",    "Nom du client",       { required: true, placeholder: "Ex. : Maison Relais Gourmet" })}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {field("contact", "Contact référent",  { required: true, placeholder: "Prénom Nom" })}
                {field("status",  "Statut",            { as: "select" })}
              </div>
              {field("sector",  "Secteur d'activité",  { placeholder: "Ex. : Restauration & traiteur" })}
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: "1px solid #F0EFEA" }} />

          {/* Section Coordonnées */}
          <div>
            <div style={{ fontSize: 12.5, letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 700, color: "#A6A498", marginBottom: 14 }}>
              Coordonnées
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {field("email", "Email",      { type: "email", placeholder: "contact@exemple.fr" })}
                {field("phone", "Téléphone",  { placeholder: "02 41 XX XX XX" })}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {field("city",  "Ville",      { placeholder: "Angers" })}
                {field("siret", "SIRET",      { placeholder: "XXX XXX XXX XXXXX" })}
              </div>
              {field("website", "Site web",   { type: "url", placeholder: "https://exemple.fr" })}
            </div>
          </div>

          {/* Divider */}
          <div style={{ borderTop: "1px solid #F0EFEA" }} />

          {/* Section Notes */}
          <div>
            <div style={{ fontSize: 12.5, letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 700, color: "#A6A498", marginBottom: 14 }}>
              Notes
            </div>
            {field("notes", "Notes internes", { as: "textarea", placeholder: "Contexte, historique, points d'attention…" })}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", justifyContent: "flex-end", gap: 10,
          padding: "18px 28px 24px",
          borderTop: "1px solid #F0EFEA",
          position: "sticky", bottom: 0, background: "#fff",
          borderRadius: "0 0 20px 20px",
        }}>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleSubmit}>
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="10" cy="7" r="3.2"/><path d="M3.5 17c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5"/>
              <line x1="16" y1="4" x2="16" y2="8"/><line x1="14" y1="6" x2="18" y2="6"/>
            </svg>
            Créer le client
          </Button>
        </div>
      </div>
    </>
  );
}

/* ─── Export CSV ─────────────────────────────────────────────────────────── */

function csvCell(v: string | number | undefined | null): string {
  const s = String(v ?? "");
  // Entre guillemets si la valeur contient virgule, guillemets ou saut de ligne
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function exportToCSV(clientList: Client[]) {
  const headers = [
    "Nom", "Contact référent", "Secteur", "Statut",
    "CA Total", "Projets", "Email", "Téléphone",
    "Ville", "SIRET", "Site web", "Client depuis",
  ];

  const rows = clientList.map(c => [
    csvCell(c.name),
    csvCell(c.contactName),
    csvCell(c.sector),
    csvCell(c.status),
    csvCell(c.caDisplay ?? "0 €"),
    csvCell(c.projectsCount ?? 0),
    csvCell(c.email),
    csvCell(c.phone),
    csvCell(c.city),
    csvCell(c.siret),
    csvCell(c.website),
    csvCell(c.joinDate),
  ].join(","));

  const csv = [headers.join(","), ...rows].join("\n");
  // BOM UTF-8 pour une ouverture correcte dans Excel
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `clients-groupe-echo-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─── Page ─── */
export default function ClientsPage() {
  const router = useRouter();
  const { clients, addClient } = useClientsStore();
  const [filter, setFilter] = useState<FilterKey>("tous");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);

  const activeCount   = clients.filter(c => c.status === "Actif").length;
  const prospectCount = clients.filter(c => c.status === "Prospect").length;
  const inactifCount  = clients.filter(c => c.status === "Inactif").length;

  const FILTER_DEFS: { key: FilterKey; label: string; count: number }[] = [
    { key: "tous",      label: "Tous",      count: clients.length },
    { key: "actifs",    label: "Actifs",    count: activeCount },
    { key: "prospects", label: "Prospects", count: prospectCount },
    { key: "inactifs",  label: "Inactifs",  count: inactifCount },
  ];

  const filteredClients = clients.filter(c => {
    const matchFilter =
      filter === "tous" ||
      (filter === "actifs"    && c.status === "Actif") ||
      (filter === "prospects" && c.status === "Prospect") ||
      (filter === "inactifs"  && c.status === "Inactif");
    return matchFilter && c.name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div style={{ margin: "-32px -40px", background: "#F5F5F2", minHeight: "100vh", fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif" }}>

      {/* ── CONTENT ── */}
      <div style={{ padding: "26px 30px 36px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Title row */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <h1 style={typography.pageTitle}>
              Clients
            </h1>
            <div style={{ ...typography.description, marginTop: 5 }}>
              {clients.length} clients · {activeCount} actifs
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="secondary" onClick={() => exportToCSV(clients)}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 3v8" /><path d="M7 8.5l3 3 3-3" />
                <path d="M4.5 13.5v1.5C4.5 15.6 5 16 5.5 16h9c.5 0 1-.4 1-1v-1.5" />
              </svg>
              Exporter
            </Button>
            <Button variant="primary" onClick={() => setShowModal(true)}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>Nouveau client
            </Button>
          </div>
        </div>

        {/* ── TOOLBAR ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
          <div style={{ display: "flex", background: "#F0EFEA", border: "1px solid #E8E7E0", borderRadius: 10, padding: 3, gap: 2 }}>
            {FILTER_DEFS.map(f => {
              const active = filter === f.key;
              return (
                <span key={f.key} onClick={() => setFilter(f.key)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 14px", borderRadius: 7, fontSize: 14.5, fontWeight: 600, cursor: "pointer", color: active ? "#0A0A0A" : "#8C8B83", background: active ? "#fff" : "transparent", boxShadow: active ? "0 1px 2px rgba(20,20,15,.10)" : "none" }}>
                  {f.label}
                  <span style={{ fontSize: 13, fontWeight: 700, background: active ? "rgba(201,162,78,.16)" : "#E6E5DE", color: active ? "#B0892B" : "#9A998F", borderRadius: 99, padding: "1px 7px" }}>{f.count}</span>
                </span>
              );
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 9, background: "#fff", border: "1px solid #E2E1DA", borderRadius: 10, padding: "9px 13px", width: 280 }}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#A6A498" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="9" r="6" /><line x1="13.5" y1="13.5" x2="18" y2="18" />
            </svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un client…" style={{ flex: 1, border: "none", outline: "none", fontSize: 15, color: "#1C1B16", fontFamily: "inherit", background: "transparent" }} />
          </div>
        </div>

        {/* ── TABLE ── */}
        <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 18, padding: "8px 24px 16px", boxShadow: "0 1px 2px rgba(20,20,15,.04)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2.4fr 2fr 1.2fr 0.5fr", gap: 14, padding: "16px 0 12px", borderBottom: "1px solid #EEEDE6" }}>
            <span style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 }}>Client</span>
            <span style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 }}>Secteur</span>
            <span style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 }}>Statut</span>
            <span />
          </div>

          {filteredClients.map((client, idx) => (
            <ClientRow
              key={client.id}
              client={client}
              st={STATUS_STYLES[client.status]}
              avatarBg={AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length]}
              onClick={() => router.push(`/clients/${client.id}`)}
            />
          ))}

          {filteredClients.length === 0 && (
            <div style={{ padding: "32px", textAlign: "center", color: "#A6A498", fontSize: 15 }}>
              Aucun client ne correspond à votre recherche
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL ── */}
      {showModal && (
        <NouveauClientModal
          onClose={() => setShowModal(false)}
          onAdd={c => { addClient(c); setShowModal(false); }}
        />
      )}
    </div>
  );
}

function ClientRow({ client, st, avatarBg, onClick }: { client: Client; st: { color: string; bg: string; dot: string }; avatarBg: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ display: "grid", gridTemplateColumns: "2.4fr 2fr 1.2fr 0.5fr", gap: 14, alignItems: "center", padding: "14px 0", borderBottom: "1px solid #F2F1EB", cursor: "pointer", borderRadius: 8, background: hovered ? "#FBFAF6" : "transparent", transition: "background .15s" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
        <span style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 16, fontWeight: 800, color: "#1A1206", background: avatarBg }}>{client.avatar}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 16.5, fontWeight: 700, color: "#1C1B16" }}>{client.name}</div>
          <div style={{ fontSize: 14.5, color: "#A6A498", marginTop: 2 }}>{client.contactName ?? "—"}</div>
        </div>
      </div>
      <div style={{ fontSize: 15, color: "#5C5A52" }}>{client.sector}</div>
      <div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, color: st.color, background: st.bg, borderRadius: 99, padding: "4px 11px" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: st.dot, display: "inline-block" }} />
          {client.status}
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", color: "#C9C7BC" }}>
        <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7.5 4.5 13 10l-5.5 5.5" /></svg>
      </div>
    </div>
  );
}
