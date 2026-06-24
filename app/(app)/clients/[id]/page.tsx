"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

// Plus Jakarta Sans est importé via le layout global

export default function ClientDetailPage() {
  const params = useParams();
  const clientId = params?.id;
  const [followupTab, setFollowupTab] = useState<"Opportunités" | "Tâches" | "Tickets">("Tickets");
  const [showAddTicket, setShowAddTicket] = useState(false);

  const client = {
    name: "Maison Relais Gourmet",
    type: "Restaurant & traiteur d'événementiel",
    siret: "SIRET 812-456-789 00021",
    email: "contact@relais-gourmet.fr",
    phone: "02 418 25 00",
    city: "Angers, Maine-et-Loire",
    since: "Client depuis sept. 2023",
    status: "Client actif!",
    avatar: "MR",
    avatarBg: "#C5A55A",
  };

  const kpis = [
    { label: "CA TOTAL FACTURÉ", value: "47.2 k€", sub: "+18% vs 2024", icon: "💶" },
    { label: "CA EN COURS", value: "8.5 k€", sub: "3 devis, en production", icon: "📋" },
    { label: "MARGE MOYENNE", value: "67 %", sub: "Réalisation au-dessus du seuil", icon: "📊" },
    { label: "PROJETS RÉALISÉS", value: "9", sub: "8 livrés, 1 en cours", icon: "📦" },
  ];

  const projects = [
    { name: "Maquettes site e-commerce", ref: "MRG-09", status: "En production", amount: "8 500 €", date: "Mars 2026" },
    { name: "Campagne emailing printemps", ref: "MRG-08", status: "Livré", amount: "3 200 €", date: "Févr. 2026" },
    { name: "Refonte identité de marque", ref: "MRG-07", status: "Livré", amount: "12 000 €", date: "Nov. 2025" },
    { name: "Shooting photo produits", ref: "MRG-06", status: "Livré", amount: "4 100 €", date: "Sept. 2025" },
    { name: "Brochure traiteur 2025", ref: "MRG-05", status: "Livré", amount: "2 800 €", date: "Juin 2025" },
  ];

  const contactRef = { name: "Claire Lemaire", role: "Directrice marketing", email: "c.lemaire@relais-gourmet.fr", phone: "0612 45 78 90", avatar: "CL", color: "#7C3AED" };

  const documents = [
    { name: "Devis", count: "2" },
    { name: "Commandes", count: "2" },
    { name: "Factures", count: "3" },
  ];

  const activities = [
    { author: "Vous", time: "Hier à 18:45", content: "Appel avec le client concernant le brief projet", count: "6 commentaires", avatar: "GE", color: "#0A0A0A" },
    { author: "Maryline L.", time: "Mardi • 2025-03-31", content: "Devis PRG-06 envoyé", count: "1 commentaire", avatar: "ML", color: "#7C3AED" },
    { author: "Thomas B.", time: "Mercredi • 2025-03-28", content: "Nouvelle prise contact", avatar: "TB", color: "#2563EB" },
  ];

  const tickets = [
    { ref: "#T-218", title: "Bug affichage page panier sur mobile", tags: ["Site internet", "Urgent"], priority: "Haute", status: "En cours", assigned: { name: "Adrien D.", initials: "AD", color: "#16A34A" } },
    { ref: "#T-205", title: "Mise à jour visuels page d'accueil", tags: ["Graphisme", "Site internet"], priority: "Normale", status: "Nouveau", assigned: { name: "Thomas B.", initials: "TB", color: "#2563EB" } },
  ];

  const getStatusColor = (status: string) => {
    if (status === "En production") return { bg: "#E1F5FE", text: "#0277BD", dot: "#0277BD" };
    if (status === "Livré") return { bg: "#E8F5E9", text: "#2E7D32", dot: "#2E7D32" };
    return { bg: "#F5F5F5", text: "#757575", dot: "#757575" };
  };

  const getPriorityColor = (priority: string) => {
    if (priority === "Haute") return { bg: "#FED7AA", text: "#92400E" };
    if (priority === "Normale") return { bg: "#DBEAFE", text: "#1E40AF" };
    return { bg: "#F0FDF4", text: "#166534" };
  };

  const getStatusBadgeColor = (status: string) => {
    if (status === "En cours") return { bg: "#FEF3C7", text: "#92400E" };
    if (status === "Nouveau") return { bg: "#F3F4F6", text: "#4B5563" };
    return { bg: "#E0F2FE", text: "#0369A1" };
  };

  const Modal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    if (!isOpen) return null;
    return (
      <>
        <div onClick={onClose} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 999 }} />
        <div style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background: "#fff",
          border: "1px solid #E7E4DA",
          borderRadius: 16,
          padding: 24,
          width: "90%",
          maxWidth: 500,
          zIndex: 1000,
          fontFamily: "var(--font-plus-jakarta), sans-serif",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontSize: 20, fontWeight: 700, margin: 0, color: "#1C1B16" }}>
              Nouveau ticket
            </h3>
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#8C8B83" }}>×</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <input type="text" placeholder="Titre du ticket" style={{ padding: "10px 12px", border: "1px solid #E7E4DA", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-plus-jakarta), sans-serif", color: "#1C1B16" }} />
            <textarea placeholder="Description" rows={3} style={{ padding: "10px 12px", border: "1px solid #E7E4DA", borderRadius: 8, fontSize: 13, resize: "none", fontFamily: "var(--font-plus-jakarta), sans-serif", color: "#1C1B16" }} />
            <select style={{ padding: "10px 12px", border: "1px solid #E7E4DA", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-plus-jakarta), sans-serif", color: "#1C1B16" }}>
              <option>Sélectionner une priorité</option>
              <option>Basse</option>
              <option>Normale</option>
              <option>Haute</option>
            </select>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 12 }}>
              <button onClick={onClose} style={{ padding: "8px 16px", background: "#F4ECD7", border: "1px solid #E7E4DA", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-plus-jakarta), sans-serif", color: "#1C1B16" }}>
                Annuler
              </button>
              <button style={{ padding: "8px 16px", background: "#0F0E0A", border: "none", color: "#E9D7A6", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-plus-jakarta), sans-serif" }}>
                Créer
              </button>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div style={{ background: "#F4ECD7", minHeight: "100vh", padding: "26px 30px", fontFamily: "var(--font-plus-jakarta), sans-serif" }}>
      {/* Section 1: En-tête + KPIs */}
      <div style={{ marginBottom: 16 }}>
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
          {/* Avatar */}
          <div style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "#B08D32",
            color: "#fff",
            fontSize: 18,
            fontWeight: 900,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontFamily: "var(--font-playfair), Georgia, serif",
          }}>
            {client.avatar}
          </div>

          {/* Contenu */}
          <div style={{ flex: 1 }}>
            {/* Titre + Badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <h1 style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontSize: 19, fontWeight: 700, color: "#E9D7A6", margin: 0, lineHeight: 1.1 }}>
                {client.name}
              </h1>
              <span style={{ background: "#1F9D57", color: "#fff", fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 2, whiteSpace: "nowrap" }}>
                ✓ {client.status}
              </span>
            </div>

            {/* Ligne 1: Type + SIRET */}
            <div style={{ display: "flex", gap: 20, fontSize: "10.5px", color: "#A6A498", marginBottom: 4, lineHeight: 1.1 }}>
              <span>{client.type}</span>
              <span style={{ display: "flex", gap: 3 }}>
                <span>📋</span>
                <span>{client.siret}</span>
              </span>
            </div>

            {/* Ligne 2: Email, Phone, City */}
            <div style={{ display: "flex", gap: 16, fontSize: "10.5px", color: "#A6A498", marginBottom: 3, lineHeight: 1.1 }}>
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

            {/* Ligne 3: Client depuis */}
            <div style={{ fontSize: "10.5px", color: "#A6A498", lineHeight: 1.1, display: "flex", gap: 3 }}>
              <span>📋</span>
              <span>{client.since}</span>
            </div>
          </div>

          {/* Boutons */}
          <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
            <button style={{ padding: "6px 12px", background: "#E7E4DA", border: "none", borderRadius: 5, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-plus-jakarta), sans-serif", color: "#1C1B16", whiteSpace: "nowrap" }}>
              ☎️ Contacter
            </button>
            <button style={{ padding: "6px 12px", background: "#B08D32", border: "none", borderRadius: 5, fontSize: 10, fontWeight: 600, color: "#fff", cursor: "pointer", fontFamily: "var(--font-plus-jakarta), sans-serif", whiteSpace: "nowrap" }}>
              📊 + Nouveau projet
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {kpis.map((kpi, i) => (
            <div key={i} style={{ background: "#F4ECD7", border: "1px solid #E7E4DA", borderRadius: 11, padding: "16px 14px" }}>
              {/* Header: Label + Icon */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <span style={{ fontSize: "7px", textTransform: "uppercase", color: "#9A988F", fontWeight: 900, letterSpacing: "0.12em", fontFamily: "var(--font-plus-jakarta), sans-serif" }}>
                  {kpi.label}
                </span>
                <span style={{ fontSize: 14, color: "#E4C77B", opacity: 0.5 }}>
                  {kpi.icon}
                </span>
              </div>

              {/* Value */}
              <div style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontSize: 32, fontWeight: 700, color: "#1C1B16", marginBottom: 8, lineHeight: 1 }}>
                {kpi.value}
              </div>

              {/* Sub */}
              <div style={{ fontSize: "9px", color: "#8C8B83", lineHeight: 1.3, fontFamily: "var(--font-plus-jakarta), sans-serif" }}>
                {kpi.sub}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Projets + Contacts + Documents */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24, marginBottom: 24 }}>
        {/* Projets */}
        <div style={{ background: "#fff", border: "1px solid #E7E4DA", borderRadius: 16, padding: 24, fontFamily: "var(--font-plus-jakarta), sans-serif" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontSize: 20, fontWeight: 700, margin: 0, color: "#1C1B16" }}>
              Projets du client
            </h3>
            <span style={{ fontSize: 12, color: "#8C8B83", fontWeight: 600 }}>{projects.length} projets</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 12, paddingBottom: 12, borderBottom: "1px solid #E7E4DA", marginBottom: 12 }}>
            <span style={{ fontSize: "10px", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 }}>PROJET</span>
            <span style={{ fontSize: "10px", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 }}>STATUT</span>
            <span style={{ fontSize: "10px", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 }}>MONTANT</span>
            <span style={{ fontSize: "10px", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 }}>DATE</span>
          </div>

          {projects.map((proj, i) => {
            const colors = getStatusColor(proj.status);
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 12, padding: "12px 0", borderBottom: "1px solid #F4ECD7", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1C1B16" }}>{proj.name}</div>
                  <div style={{ fontSize: 11, color: "#8C8B83", marginTop: 2 }}>{proj.ref}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: colors.dot }} />
                  <span style={{ fontSize: 12, color: colors.text }}>{proj.status}</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#1C1B16" }}>{proj.amount}</div>
                <div style={{ fontSize: 12, color: "#8C8B83" }}>{proj.date}</div>
              </div>
            );
          })}
        </div>

        {/* Contacts + Documents */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24, fontFamily: "var(--font-plus-jakarta), sans-serif" }}>
          {/* Contact référent */}
          <div style={{ background: "#fff", border: "1px solid #E7E4DA", borderRadius: 16, padding: 24 }}>
            <h3 style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontSize: 20, fontWeight: 700, margin: "0 0 16px", color: "#1C1B16" }}>
              Contact référent
            </h3>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: contactRef.color, color: "#fff", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {contactRef.avatar}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#1C1B16" }}>{contactRef.name}</div>
                <div style={{ fontSize: 11, color: "#8C8B83" }}>{contactRef.role}</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12, color: "#8C8B83" }}>
              <div>📧 {contactRef.email}</div>
              <div>☎️ {contactRef.phone}</div>
              <div>🌐 relais-gourmet.fr</div>
            </div>
          </div>

          {/* Documents commerciaux */}
          <div style={{ background: "#fff", border: "1px solid #E7E4DA", borderRadius: 16, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontSize: 20, fontWeight: 700, margin: 0, color: "#1C1B16" }}>
                Documents commerciaux
              </h3>
              <span style={{ fontSize: 12, color: "#8C8B83", cursor: "pointer" }}>Tout voir</span>
            </div>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              {documents.map((doc, i) => (
                <button key={i} style={{ padding: "6px 12px", background: "#F4ECD7", border: "1px solid #E7E4DA", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-plus-jakarta), sans-serif", color: "#1C1B16" }}>
                  {doc.name} <span style={{ fontWeight: 700 }}>{doc.count}</span>
                </button>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "#8C8B83", textAlign: "center", padding: "16px" }}>
              Aucun document pour le moment
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Activité récente + Documents partagés */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24, fontFamily: "var(--font-plus-jakarta), sans-serif" }}>
        {/* Activité */}
        <div style={{ background: "#fff", border: "1px solid #E7E4DA", borderRadius: 16, padding: 24 }}>
          <h3 style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontSize: 20, fontWeight: 700, margin: "0 0 16px", color: "#1C1B16" }}>
            Activité récente
          </h3>
          {activities.map((act, i) => (
            <div key={i} style={{ paddingBottom: 16, marginBottom: 16, borderBottom: i < activities.length - 1 ? "1px solid #F4ECD7" : "none", display: "flex", gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: act.color, color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {act.avatar}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#1C1B16" }}>{act.author}</div>
                <div style={{ fontSize: 11, color: "#8C8B83", marginTop: 2 }}>{act.time}</div>
                <div style={{ fontSize: 12, color: "#56544C", marginTop: 4 }}>{act.content}</div>
                {act.count && <div style={{ fontSize: 11, color: "#8C8B83", marginTop: 4, cursor: "pointer" }}>⭐ {act.count}</div>}
              </div>
            </div>
          ))}
        </div>

        {/* Documents partagés */}
        <div style={{ background: "#fff", border: "1px solid #E7E4DA", borderRadius: 16, padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontSize: 20, fontWeight: 700, margin: 0, color: "#1C1B16" }}>
              Documents partagés
            </h3>
            <span style={{ fontSize: 12, color: "#8C8B83", cursor: "pointer" }}>Tout voir</span>
          </div>
          <div style={{ fontSize: 12, color: "#8C8B83", textAlign: "center", padding: "32px 16px" }}>
            Aucun document partagé
          </div>
        </div>
      </div>

      {/* Section 4: Suivi client */}
      <div style={{ background: "#fff", border: "1px solid #E7E4DA", borderRadius: 16, padding: 24, fontFamily: "var(--font-plus-jakarta), sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h3 style={{ fontFamily: "var(--font-playfair), Georgia, serif", fontSize: 24, fontWeight: 700, margin: 0, color: "#1C1B16" }}>
            Suivi client
          </h3>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 8, background: "#F4ECD7", padding: "6px 8px", borderRadius: 8 }}>
              {[
                { label: "Opportunités", count: 3 },
                { label: "Tâches", count: 5 },
                { label: "Tickets", count: 2 },
              ].map((tab) => (
                <button
                  key={tab.label}
                  onClick={() => setFollowupTab(tab.label as any)}
                  style={{
                    background: followupTab === tab.label ? "#fff" : "transparent",
                    border: followupTab === tab.label ? "1px solid #E7E4DA" : "none",
                    color: followupTab === tab.label ? "#1C1B16" : "#8C8B83",
                    padding: "6px 12px",
                    borderRadius: 6,
                    fontSize: "12px",
                    fontWeight: followupTab === tab.label ? 700 : 600,
                    cursor: "pointer",
                    fontFamily: "var(--font-plus-jakarta), sans-serif",
                  }}
                >
                  {tab.label} <span style={{ fontWeight: 700 }}>{tab.count}</span>
                </button>
              ))}
            </div>

            <button onClick={() => setShowAddTicket(true)} style={{ padding: "8px 16px", background: "#0F0E0A", border: "none", color: "#E9D7A6", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", marginLeft: "auto", fontFamily: "var(--font-plus-jakarta), sans-serif" }}>
              ➕ Nouveau {followupTab === "Tickets" ? "ticket" : followupTab === "Tâches" ? "tâche" : "opportunité"}
            </button>
          </div>
        </div>

        {followupTab === "Tickets" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "0.8fr 1.5fr 1fr 0.8fr 0.8fr 1fr", gap: 16, paddingBottom: 12, borderBottom: "1px solid #E7E4DA", marginBottom: 12 }}>
              <span style={{ fontSize: "10px", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 }}>RÉF.</span>
              <span style={{ fontSize: "10px", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 }}>SUJET</span>
              <span style={{ fontSize: "10px", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 }}>PRIORITÉ</span>
              <span style={{ fontSize: "10px", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 }}>STATUT</span>
              <span style={{ fontSize: "10px", textTransform: "uppercase", color: "#A6A498", fontWeight: 700 }}>AFFECTÉ À</span>
            </div>

            {tickets.map((ticket, i) => {
              const priColor = getPriorityColor(ticket.priority);
              const statColor = getStatusBadgeColor(ticket.status);
              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "0.8fr 1.5fr 1fr 0.8fr 0.8fr 1fr", gap: 16, padding: "16px 0", borderBottom: "1px solid #F4ECD7", alignItems: "center" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#8C8B83" }}>{ticket.ref}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#1C1B16", marginBottom: 4 }}>{ticket.title}</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {ticket.tags.map((tag, j) => (
                        <span key={j} style={{ fontSize: 11, color: "#2563EB", background: "#DBEAFE", padding: "2px 8px", borderRadius: 4 }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{ background: priColor.bg, color: priColor.text, fontSize: 12, fontWeight: 600, padding: "4px 8px", borderRadius: 6, display: "inline-block" }}>
                    🔴 {ticket.priority}
                  </div>
                  <div style={{ background: statColor.bg, color: statColor.text, fontSize: 12, fontWeight: 600, padding: "4px 8px", borderRadius: 6, display: "inline-block" }}>
                    {ticket.status}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: ticket.assigned.color, color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {ticket.assigned.initials}
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "#1C1B16" }}>{ticket.assigned.name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {followupTab === "Opportunités" && (
          <div style={{ textAlign: "center", padding: "32px", color: "#8C8B83" }}>
            Aucune opportunité pour le moment
          </div>
        )}

        {followupTab === "Tâches" && (
          <div style={{ textAlign: "center", padding: "32px", color: "#8C8B83" }}>
            Aucune tâche pour le moment
          </div>
        )}
      </div>

      <Modal isOpen={showAddTicket} onClose={() => setShowAddTicket(false)} />
    </div>
  );
}
