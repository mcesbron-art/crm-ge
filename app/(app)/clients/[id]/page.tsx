"use client";

import { useParams } from "next/navigation";
import { useClientsStore } from "@/lib/clients-store";
import { ClientProject } from "@/lib/clients-data";
import { useAuth } from "@/lib/auth-context";
import { can } from "@/lib/permissions";
import AccessDenied from "@/components/AccessDenied";
import { typography } from "@/lib/typography";

/* ─── Icônes SVG ──────────────────────────────────────────────────────────── */

const IconEmail = ({ stroke = "#B79B5E" }) => (
  <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="5" width="14" height="11" rx="2" /><path d="M3 6.5 10 11l7-4.5" />
  </svg>
);
const IconPhone = ({ stroke = "#B79B5E" }) => (
  <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4.5h3l1.4 3.5-2 1.4c.8 1.8 2.3 3.3 4.1 4.1l1.4-2 3.5 1.4v3c0 .6-.5 1-1 1C9.6 17 4 11.4 4 5.5c0-.5.4-1 1-1z" />
  </svg>
);
const IconPin = ({ stroke = "#B79B5E" }) => (
  <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 17s5.5-4.4 5.5-9A5.5 5.5 0 0 0 4.5 8c0 4.6 5.5 9 5.5 9z" /><circle cx="10" cy="8" r="2" />
  </svg>
);
const IconCalendar = ({ stroke = "#B79B5E" }) => (
  <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7h14M5 4v2m10-2v2M4 7h12v9H4z" />
  </svg>
);
const IconGlobe = ({ stroke = "#B08D32" }) => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="10" r="7" /><path d="M3 10h14M10 3c2 2.2 2 11.8 0 14M10 3c-2 2.2-2 11.8 0 14" />
  </svg>
);

/* ─── Couleur de statut de projet ────────────────────────────────────────── */

function getStatusStyle(status: string) {
  if (status === "En production") return { dot: "#3B82F6", text: "#3B82F6" };
  if (status === "Livré")         return { dot: "#3FBF77", text: "#1F9D57" };
  return { dot: "#9A9990", text: "#9A9990" };
}

/* ─── Page principale ────────────────────────────────────────────────────── */

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params?.id as string;
  const { currentUser, effectiveRole } = useAuth();
  const { getClientById, getProjects, getContact } = useClientsStore();

  if (!can(effectiveRole, "view_all_pages")) {
    return (
      <AccessDenied
        message="La page Clients est réservée aux administrateurs."
        user={{ nom: currentUser.nom, role: currentUser.role }}
      />
    );
  }

  const client  = getClientById(clientId);
  const projects: ClientProject[] = getProjects(clientId);
  const contact = getContact(clientId);

  if (!client) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#8C8B83", fontFamily: "var(--font-plus-jakarta), sans-serif" }}>
        Client introuvable.
      </div>
    );
  }

  return (
    <div style={{ background: "#F5F5F2", minHeight: "100vh", padding: "20px 30px", fontFamily: "var(--font-plus-jakarta), system-ui, sans-serif" }}>

      {/* ── EN-TÊTE CLIENT ── */}
      <div style={{ background: "#0A0A0A", borderRadius: 18, padding: "26px 28px", color: "#EFE9DA", position: "relative", overflow: "hidden", marginBottom: 16 }}>
        <div style={{ position: "absolute", top: -70, right: -40, width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle,rgba(201,162,78,.20),transparent 68%)", pointerEvents: "none" }} />

        <div style={{ display: "flex", alignItems: "flex-start", gap: 20, position: "relative" }}>
          {/* Avatar */}
          <span style={{ width: 72, height: 72, borderRadius: 18, background: "linear-gradient(135deg,#E0BC68,#A47E2A)", color: "#1A1206", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 28, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {client.avatar}
          </span>

          {/* Infos */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <h1 style={{ ...typography.pageTitle, fontSize: 30, color: "#F4ECD7" }}>
                {client.name}
              </h1>
              <span style={{ display: "flex", alignItems: "center", gap: 6, background: client.status === "Actif" ? "rgba(31,157,87,.16)" : client.status === "Prospect" ? "rgba(37,99,235,.16)" : "rgba(107,114,128,.16)", color: client.status === "Actif" ? "#5FCB8B" : client.status === "Prospect" ? "#60A5FA" : "#9CA3AF", fontSize: 14, fontWeight: 700, padding: "4px 10px", borderRadius: 99 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: client.status === "Actif" ? "#3FBF77" : client.status === "Prospect" ? "#2563EB" : "#6B7280", display: "inline-block" }} />
                {client.status}
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 9, flexWrap: "wrap" }}>
              <span style={{ fontSize: 15, color: "#9A9684" }}>{client.sector}</span>
              {client.siret && client.siret !== "N/C" && <><span style={{ color: "#46443D" }}>·</span><span style={{ fontSize: 15, color: "#9A9684" }}>{client.siret}</span></>}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 22, marginTop: 13, flexWrap: "wrap", fontSize: 15, color: "#AEA890" }}>
              {client.email && <span style={{ display: "flex", alignItems: "center", gap: 7 }}><IconEmail />{client.email}</span>}
              {client.phone && <span style={{ display: "flex", alignItems: "center", gap: 7 }}><IconPhone />{client.phone}</span>}
              {client.city  && <span style={{ display: "flex", alignItems: "center", gap: 7 }}><IconPin />{client.city}</span>}
              {client.joinDate && <span style={{ display: "flex", alignItems: "center", gap: 7 }}><IconCalendar />Client depuis {client.joinDate}</span>}
            </div>
          </div>

          {/* Boutons */}
          {client.email && (
            <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
              <a href={`mailto:${client.email}`} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,.06)", border: "1px solid #2A2825", color: "#E7E4DA", fontSize: 15, fontWeight: 600, padding: "9px 15px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", textDecoration: "none" }}>
                <IconEmail stroke="#E7E4DA" />Contacter
              </a>
            </div>
          )}
        </div>
      </div>

      {/* ── DEUX COLONNES ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.62fr 1fr", gap: 16, marginBottom: 16 }}>

        {/* COLONNE GAUCHE */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Projets */}
          <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 18, padding: "22px 24px", boxShadow: "0 1px 2px rgba(20,20,15,.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 19, fontWeight: 700, color: "#16150F", margin: 0 }}>Projets du client</h3>
              <span style={{ fontSize: 14.5, color: "#9A998F" }}>{projects.length} projet{projects.length !== 1 ? "s" : ""}</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2.5fr 1.3fr 1fr", gap: 14, paddingBottom: 11, borderBottom: "1px solid #EEEDE6" }}>
              {["Projet", "Statut", "Date"].map((h, i) => (
                <span key={h} style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, textAlign: i === 2 ? "right" : "left" }}>{h}</span>
              ))}
            </div>

            {projects.length > 0 ? projects.map(proj => {
              const s = getStatusStyle(proj.status);
              return (
                <div key={proj.id} style={{ display: "grid", gridTemplateColumns: "2.5fr 1.3fr 1fr", gap: 14, alignItems: "center", padding: "14px 0", borderBottom: "1px solid #F2F1EB" }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#1C1B16" }}>{proj.name}</div>
                    <div style={{ fontSize: 14, color: "#A6A498", marginTop: 3 }}>{proj.id}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.dot, display: "inline-block" }} />
                    <span style={{ fontSize: 15, color: "#5C5A52", fontWeight: 500 }}>{proj.status}</span>
                  </div>
                  <div style={{ fontSize: 15, color: "#8C8B83", textAlign: "right" }}>{proj.date}</div>
                </div>
              );
            }) : (
              <div style={{ padding: "24px", textAlign: "center", color: "#A6A498", fontSize: 15 }}>
                Aucun projet pour ce client
              </div>
            )}
          </div>

          {/* Description */}
          {client.description && (
            <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 18, padding: "22px 24px", boxShadow: "0 1px 2px rgba(20,20,15,.04)" }}>
              <h3 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 19, fontWeight: 700, color: "#16150F", margin: "0 0 12px" }}>À propos</h3>
              <p style={{ fontSize: 15.5, color: "#5C5A52", lineHeight: 1.65, margin: 0 }}>{client.description}</p>
            </div>
          )}
        </div>

        {/* COLONNE DROITE */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Contact référent */}
          {contact && (
            <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 18, padding: "22px 24px", boxShadow: "0 1px 2px rgba(20,20,15,.04)" }}>
              <h3 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 18, fontWeight: 700, color: "#16150F", margin: "0 0 16px" }}>Contact référent</h3>
              <div style={{ display: "flex", alignItems: "center", gap: 13, paddingBottom: 16, borderBottom: "1px solid #F0EFEA" }}>
                <span style={{ width: 46, height: 46, borderRadius: "50%", background: contact.color, color: "#fff", fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {contact.avatar}
                </span>
                <div>
                  <div style={{ fontSize: 16.5, fontWeight: 700, color: "#1C1B16" }}>{contact.name}</div>
                  <div style={{ fontSize: 14.5, color: "#8C8B83", marginTop: 2 }}>{contact.role}</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 13, marginTop: 16 }}>
                {contact.email && <div style={{ display: "flex", alignItems: "center", gap: 11, fontSize: 15, color: "#4A483F" }}><IconEmail stroke="#B08D32" />{contact.email}</div>}
                {contact.phone && <div style={{ display: "flex", alignItems: "center", gap: 11, fontSize: 15, color: "#4A483F" }}><IconPhone stroke="#B08D32" />{contact.phone}</div>}
                {client.website && <div style={{ display: "flex", alignItems: "center", gap: 11, fontSize: 15, color: "#4A483F" }}><IconGlobe />{client.website}</div>}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
