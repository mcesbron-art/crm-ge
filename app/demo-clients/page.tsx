"use client";

import { useState } from "react";
import { getClient, getClientMetrics, getClientProjects, getClientContact, getAllClients } from "@/lib/clients-data";

export default function DemoClientsPage() {
  const [selectedId, setSelectedId] = useState("1");

  const client = getClient(selectedId);
  const metrics = getClientMetrics(selectedId);
  const projects = getClientProjects(selectedId);
  const contact = getClientContact(selectedId);
  const allClients = getAllClients();

  if (!client || !metrics) return <div>Erreur de chargement</div>;

  const kpis = [
    { label: "CA TOTAL FACTURÉ", value: metrics.totalRevenue, icon: "💶" },
    { label: "CA EN COURS", value: metrics.pendingRevenue, icon: "📋" },
    { label: "MARGE MOYENNE", value: metrics.avgMargin, icon: "📊" },
    { label: "PROJETS RÉALISÉS", value: String(metrics.projectCount), icon: "📦" },
  ];

  const getStatusColor = (status: string) => {
    if (status === "En production") return { bg: "#E1F5FE", text: "#0277BD", dot: "#0277BD" };
    if (status === "Livré") return { bg: "#E8F5E9", text: "#2E7D32", dot: "#2E7D32" };
    return { bg: "#F5F5F5", text: "#757575", dot: "#757575" };
  };

  return (
    <div style={{ background: "#F5F4EF", minHeight: "100vh", padding: "26px 30px", fontFamily: "var(--font-plus-jakarta), sans-serif" }}>
      {/* Sélecteur de client */}
      <div style={{ marginBottom: 20, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {allClients.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedId(c.id)}
            style={{
              padding: "8px 14px",
              background: selectedId === c.id ? "#0F0E0A" : "#fff",
              color: selectedId === c.id ? "#E9D7A6" : "#1C1B16",
              border: "1px solid #ECEBE4",
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* En-tête */}
      <div style={{
        background: "#0F0E0A",
        borderRadius: 16,
        padding: "20px 24px",
        marginBottom: 16,
        display: "flex",
        gap: 16,
        alignItems: "flex-start",
      }}>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: client.avatarColor,
          color: "#fff",
          fontSize: 18,
          fontWeight: 900,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}>
          {client.avatar}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 19, fontWeight: 700, color: "#E9D7A6", margin: 0, lineHeight: 1.1 }}>
              {client.name}
            </h1>
            <span style={{ background: "#1F9D57", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 2, whiteSpace: "nowrap" }}>
              ✓ {client.status === "Actif" ? "Client actif" : client.status}
            </span>
          </div>

          <div style={{ display: "flex", gap: 20, fontSize: "12.5px", color: "#A6A498", marginBottom: 4, lineHeight: 1.1 }}>
            <span>{client.sector}</span>
            <span style={{ display: "flex", gap: 3 }}>
              <span>📋</span>
              <span>{client.siret}</span>
            </span>
          </div>

          <div style={{ display: "flex", gap: 16, fontSize: "12.5px", color: "#A6A498", marginBottom: 3, lineHeight: 1.1 }}>
            <span style={{ display: "flex", gap: 3 }}>
              <span>📧</span>
              <span>{client.email}</span>
            </span>
            <span style={{ display: "flex", gap: 3 }}>
              <span>☎️</span>
              <span>{client.phone}</span>
            </span>
            <span style={{ display: "flex", gap: 3 }}>
              <span>📍</span>
              <span>{client.city}</span>
            </span>
          </div>

          <div style={{ fontSize: "12.5px", color: "#A6A498", lineHeight: 1.1, display: "flex", gap: 3 }}>
            <span>📅</span>
            <span>Client depuis {client.joinDate}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
          <button style={{ padding: "6px 12px", background: "#F5F4EF", border: "none", borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-plus-jakarta), sans-serif", color: "#1C1B16", whiteSpace: "nowrap" }}>
            ☎️ Contacter
          </button>
          <button style={{ padding: "6px 12px", background: "#B08D32", border: "none", borderRadius: 5, fontSize: 12, fontWeight: 600, color: "#fff", cursor: "pointer", fontFamily: "var(--font-plus-jakarta), sans-serif", whiteSpace: "nowrap" }}>
            📊 + Nouveau projet
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {kpis.map((kpi, i) => (
          <div key={i} style={{ background: "#F5F4EF", border: "1px solid #ECEBE4", borderRadius: 11, padding: "16px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <span style={{ fontSize: "9px", textTransform: "uppercase", color: "#9A988F", fontWeight: 900, letterSpacing: "0.12em", fontFamily: "var(--font-plus-jakarta), sans-serif" }}>
                {kpi.label}
              </span>
              <span style={{ fontSize: 16, color: "#E4C77B", opacity: 0.5 }}>
                {kpi.icon}
              </span>
            </div>

            <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 32, fontWeight: 700, color: "#1C1B16", marginBottom: 8, lineHeight: 1 }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      {/* Projets et Contact */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, marginBottom: 24 }}>
        {/* Projets */}
        <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 16, padding: 24, fontFamily: "var(--font-plus-jakarta), sans-serif" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 20, fontWeight: 700, margin: 0, color: "#1C1B16" }}>
              Projets du client
            </h3>
            <span style={{ fontSize: 14, color: "#8C8B83", fontWeight: 600 }}>{projects.length} projets</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 12, paddingBottom: 12, borderBottom: "1px solid #ECEBE4", marginBottom: 12 }}>
            <span style={{ fontSize: "12px", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 }}>PROJET</span>
            <span style={{ fontSize: "12px", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 }}>STATUT</span>
            <span style={{ fontSize: "12px", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 }}>MONTANT</span>
            <span style={{ fontSize: "12px", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 }}>DATE</span>
          </div>

          {projects.map((proj) => {
            const colors = getStatusColor(proj.status);
            return (
              <div key={proj.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 12, padding: "12px 0", borderBottom: "1px solid #F5F4EF", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#1C1B16" }}>{proj.name}</div>
                  <div style={{ fontSize: 13, color: "#8C8B83", marginTop: 2 }}>{proj.id}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: colors.dot }} />
                  <span style={{ fontSize: 14, color: colors.text }}>{proj.status}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#1C1B16" }}>{proj.amount}</div>
                <div style={{ fontSize: 14, color: "#8C8B83" }}>{proj.date}</div>
              </div>
            );
          })}
        </div>

        {/* Contact */}
        {contact && (
          <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 16, padding: 24 }}>
            <h3 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 20, fontWeight: 700, margin: "0 0 16px", color: "#1C1B16" }}>
              Contact référent
            </h3>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: contact.color, color: "#fff", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {contact.avatar}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#1C1B16" }}>{contact.name}</div>
                <div style={{ fontSize: 13, color: "#8C8B83" }}>{contact.role}</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 14, color: "#8C8B83" }}>
              <div>📧 {contact.email}</div>
              <div>☎️ {contact.phone}</div>
              <div>🌐 {client.website || "N/A"}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
