"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  siret?: string;
  intracommunity_number?: string;
  comments?: string;
  employees?: {
    id: number;
    firstname: string;
    lastname: string;
    email: string;
    cellphone_number?: string;
    phone_number?: string;
    job?: string;
  }[];
};

type Quotation = {
  id: number;
  number: string;
  title?: string;
  status: string;
  pre_tax_amount: number;
  date: string;
};

type Invoice = {
  id: number;
  number: string;
  title?: string;
  status: string;
  pre_tax_amount: number;
  total_amount: number;
  date: string;
};

type Ticket = {
  id: string;
  titre: string;
  description?: string;
  statut: string;
  priorite: string;
  created_at: string;
  collaborateur?: { nom: string; avatar: string; color: string };
};

type Note = {
  id: string;
  contenu: string;
  created_at: string;
  collaborateur?: { nom: string; avatar: string; color: string };
};

type Tab = "infos" | "commercial" | "projets" | "tickets" | "opportunites" | "notes" | "kpis";

function stripHtml(html?: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

const STATUS_QUOTATION: Record<string, { label: string; bg: string; color: string }> = {
  draft:     { label: "Brouillon",  bg: "#ECEFF1", color: "#546E7A" },
  sent:      { label: "Envoyé",     bg: "#E1F5FE", color: "#0277BD" },
  validated: { label: "Validé",     bg: "#FFF8E1", color: "#F9A825" },
  accepted:  { label: "Accepté",    bg: "#E8F5E9", color: "#2E7D32" },
  refused:   { label: "Refusé",     bg: "#FFEBEE", color: "#C62828" },
};

const STATUS_INVOICE: Record<string, { label: string; bg: string; color: string }> = {
  draft:  { label: "Brouillon", bg: "#ECEFF1", color: "#546E7A" },
  sent:   { label: "Envoyée",   bg: "#E1F5FE", color: "#0277BD" },
  paid:   { label: "Payée",     bg: "#E8F5E9", color: "#2E7D32" },
  late:   { label: "En retard", bg: "#FFEBEE", color: "#C62828" },
};

const PRIORITE_COLORS: Record<string, { bg: string; color: string }> = {
  basse:   { bg: "#F5F5F5",  color: "#757575" },
  normale: { bg: "#E3F2FD",  color: "#1565C0" },
  haute:   { bg: "#FFF3E0",  color: "#E65100" },
  urgente: { bg: "#FFEBEE",  color: "#C62828" },
};

const TICKET_STATUT: Record<string, { label: string; bg: string; color: string }> = {
  ouvert:    { label: "Ouvert",    bg: "#E3F2FD", color: "#1565C0" },
  en_cours:  { label: "En cours",  bg: "#FFF8E1", color: "#F9A825" },
  resolu:    { label: "Résolu",    bg: "#E8F5E9", color: "#2E7D32" },
  ferme:     { label: "Fermé",     bg: "#ECEFF1", color: "#546E7A" },
};

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = Number(params.id);

  const [company, setCompany] = useState<Company | null>(null);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("infos");

  // Formulaire ticket
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketTitre, setTicketTitre] = useState("");
  const [ticketDesc, setTicketDesc] = useState("");
  const [ticketPriorite, setTicketPriorite] = useState("normale");
  const [savingTicket, setSavingTicket] = useState(false);

  // Formulaire note
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    loadAll();
  }, [companyId]);

  async function loadAll() {
    setLoading(true);
    try {
      const [compRes, quotRes, invRes, tickRes, noteRes] = await Promise.all([
        fetch(`/api/axonaut/companies/${companyId}`),
        fetch(`/api/axonaut/companies/${companyId}/quotations`),
        fetch(`/api/axonaut/companies/${companyId}/invoices`),
        fetch(`/api/clients/${companyId}/tickets`),
        fetch(`/api/clients/${companyId}/notes`),
      ]);
      const compData = await compRes.json();
      const quotData = await quotRes.json();
      const invData = await invRes.json();
      const tickData = await tickRes.json();
      const noteData = await noteRes.json();

      setCompany(compData.company ?? null);
      setQuotations(quotData.quotations ?? []);
      setInvoices(invData.invoices ?? []);
      setTickets(tickData.tickets ?? []);
      setNotes(noteData.notes ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function createTicket() {
    if (!ticketTitre.trim()) return;
    setSavingTicket(true);
    try {
      const r = await fetch(`/api/clients/${companyId}/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titre: ticketTitre, description: ticketDesc, priorite: ticketPriorite }),
      });
      const data = await r.json();
      if (r.ok) {
        setTickets((prev) => [data.ticket, ...prev]);
        setTicketTitre("");
        setTicketDesc("");
        setTicketPriorite("normale");
        setShowTicketForm(false);
      }
    } finally {
      setSavingTicket(false);
    }
  }

  async function createNote() {
    if (!newNote.trim()) return;
    setSavingNote(true);
    try {
      const r = await fetch(`/api/clients/${companyId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenu: newNote }),
      });
      const data = await r.json();
      if (r.ok) {
        setNotes((prev) => [data.note, ...prev]);
        setNewNote("");
      }
    } finally {
      setSavingNote(false);
    }
  }

  async function updateTicketStatut(ticketId: string, statut: string) {
    await fetch(`/api/clients/${companyId}/tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut }),
    });
    setTickets((prev) => prev.map((t) => t.id === ticketId ? { ...t, statut } : t));
  }

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: "center", color: COLORS.grisMoyen }}>
        Chargement du client…
      </div>
    );
  }

  if (!company) {
    return (
      <div style={{ padding: 40 }}>
        <button onClick={() => router.back()} style={{ color: COLORS.dore, background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>
          ← Retour
        </button>
        <div style={{ marginTop: 20, color: COLORS.rouge }}>Client introuvable.</div>
      </div>
    );
  }

  const caTotal = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.pre_tax_amount, 0);
  const devisTotal = quotations.length;
  const devisAcceptes = quotations.filter((q) => ["accepted", "validated"].includes(q.status)).length;
  const tauxTransfo = devisTotal > 0 ? Math.round((devisAcceptes / devisTotal) * 100) : 0;

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "infos", label: "Infos" },
    { id: "commercial", label: "Commercial", count: quotations.length },
    { id: "projets", label: "Projets" },
    { id: "tickets", label: "Tickets", count: tickets.filter((t) => t.statut !== "ferme").length },
    { id: "opportunites", label: "Opportunités" },
    { id: "notes", label: "Notes", count: notes.length },
    { id: "kpis", label: "KPIs" },
  ];

  const badge = company.is_customer
    ? { label: "Client", bg: "#E8F5E9", color: "#2E7D32" }
    : company.is_prospect
    ? { label: "Prospect", bg: "#E3F2FD", color: "#1565C0" }
    : { label: "Autre", bg: COLORS.gris, color: COLORS.grisMoyen };

  return (
    <div className="animate-fadeIn">
      {/* HEADER */}
      <div style={{ marginBottom: 20 }}>
        <button
          onClick={() => router.push("/clients")}
          style={{ color: COLORS.grisMoyen, background: "none", border: "none", cursor: "pointer", fontSize: 13, marginBottom: 12 }}
        >← Retour aux clients</button>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h1 style={{
                fontFamily: "var(--font-dm-serif-display), Georgia, serif",
                fontSize: 28, color: COLORS.noir, margin: 0, fontWeight: 400,
              }}>{company.name}</h1>
              <span style={{
                padding: "3px 10px", borderRadius: 10, fontSize: 11, fontWeight: 700,
                background: badge.bg, color: badge.color,
              }}>{badge.label}</span>
            </div>
            {company.address_city && (
              <div style={{ fontSize: 13, color: COLORS.grisMoyen, marginTop: 4 }}>
                📍 {company.address_street ? `${company.address_street}, ` : ""}{company.address_zip_code} {company.address_city}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{
        display: "flex", gap: 4, borderBottom: `2px solid ${COLORS.grisBorder}`,
        marginBottom: 20, overflowX: "auto", flexWrap: "nowrap",
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "8px 16px", border: "none", background: "none", cursor: "pointer",
              fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 400,
              color: activeTab === tab.id ? COLORS.dore : COLORS.grisMoyen,
              borderBottom: activeTab === tab.id ? `2px solid ${COLORS.dore}` : "2px solid transparent",
              whiteSpace: "nowrap", marginBottom: -2,
            }}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span style={{
                marginLeft: 6, padding: "1px 6px", borderRadius: 10, fontSize: 10, fontWeight: 700,
                background: activeTab === tab.id ? COLORS.dore : COLORS.grisBorder,
                color: activeTab === tab.id ? COLORS.noir : COLORS.grisMoyen,
              }}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* CONTENU DES ONGLETS */}

      {activeTab === "infos" && (
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
          <Card title="Informations légales">
            {company.siret && <InfoRow label="SIRET" value={company.siret} />}
            {company.intracommunity_number && <InfoRow label="TVA intracommunautaire" value={company.intracommunity_number} />}
            {company.address_street && <InfoRow label="Adresse" value={`${company.address_street}, ${company.address_zip_code} ${company.address_city}`} />}
            {company.comments && <InfoRow label="Commentaires" value={company.comments} />}
          </Card>

          <Card title="Contacts">
            {company.employees && company.employees.length > 0 ? (
              company.employees.map((e) => (
                <div key={e.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${COLORS.grisBorder}` }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: COLORS.noir }}>
                    {e.firstname} {e.lastname}
                  </div>
                  {e.job && <div style={{ fontSize: 11, color: COLORS.grisMoyen, marginBottom: 4 }}>{e.job}</div>}
                  {e.email && (
                    <a href={`mailto:${e.email}`} style={{ display: "block", fontSize: 12, color: COLORS.bleu, textDecoration: "none" }}>
                      ✉ {e.email}
                    </a>
                  )}
                  {e.cellphone_number && (
                    <a href={`tel:${e.cellphone_number}`} style={{ display: "block", fontSize: 12, color: COLORS.bleu, textDecoration: "none" }}>
                      ☎ {e.cellphone_number}
                    </a>
                  )}
                </div>
              ))
            ) : (
              <div style={{ color: COLORS.grisMoyen, fontSize: 13 }}>Aucun contact enregistré.</div>
            )}
          </Card>
        </div>
      )}

      {activeTab === "commercial" && (
        <div style={{ display: "grid", gap: 16 }}>
          <Card title={`Devis (${quotations.length})`}>
            {quotations.length === 0 ? (
              <div style={{ color: COLORS.grisMoyen, fontSize: 13 }}>Aucun devis.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${COLORS.grisBorder}` }}>
                    <th style={{ textAlign: "left", padding: "6px 8px", color: COLORS.grisMoyen, fontWeight: 600, fontSize: 11 }}>N°</th>
                    <th style={{ textAlign: "left", padding: "6px 8px", color: COLORS.grisMoyen, fontWeight: 600, fontSize: 11 }}>Titre</th>
                    <th style={{ textAlign: "left", padding: "6px 8px", color: COLORS.grisMoyen, fontWeight: 600, fontSize: 11 }}>Date</th>
                    <th style={{ textAlign: "right", padding: "6px 8px", color: COLORS.grisMoyen, fontWeight: 600, fontSize: 11 }}>Montant HT</th>
                    <th style={{ textAlign: "left", padding: "6px 8px", color: COLORS.grisMoyen, fontWeight: 600, fontSize: 11 }}>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((q) => {
                    const st = STATUS_QUOTATION[q.status] ?? { label: q.status, bg: "#EEE", color: "#666" };
                    return (
                      <tr key={q.id} style={{ borderBottom: `1px solid ${COLORS.grisBorder}` }}>
                        <td style={{ padding: "8px", fontFamily: "monospace", fontSize: 11, color: COLORS.grisMoyen }}>#{q.number}</td>
                        <td style={{ padding: "8px", color: COLORS.noir }}>{stripHtml(q.title) || `Devis ${q.number}`}</td>
                        <td style={{ padding: "8px", color: COLORS.grisMoyen }}>{new Date(q.date).toLocaleDateString("fr-FR")}</td>
                        <td style={{ padding: "8px", textAlign: "right", fontWeight: 600, color: COLORS.dore }}>{q.pre_tax_amount.toLocaleString("fr-FR")} €</td>
                        <td style={{ padding: "8px" }}>
                          <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, background: st.bg, color: st.color }}>{st.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Card>

          <Card title={`Factures (${invoices.length})`}>
            {invoices.length === 0 ? (
              <div style={{ color: COLORS.grisMoyen, fontSize: 13 }}>Aucune facture.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${COLORS.grisBorder}` }}>
                    <th style={{ textAlign: "left", padding: "6px 8px", color: COLORS.grisMoyen, fontWeight: 600, fontSize: 11 }}>N°</th>
                    <th style={{ textAlign: "left", padding: "6px 8px", color: COLORS.grisMoyen, fontWeight: 600, fontSize: 11 }}>Titre</th>
                    <th style={{ textAlign: "left", padding: "6px 8px", color: COLORS.grisMoyen, fontWeight: 600, fontSize: 11 }}>Date</th>
                    <th style={{ textAlign: "right", padding: "6px 8px", color: COLORS.grisMoyen, fontWeight: 600, fontSize: 11 }}>Montant HT</th>
                    <th style={{ textAlign: "left", padding: "6px 8px", color: COLORS.grisMoyen, fontWeight: 600, fontSize: 11 }}>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => {
                    const st = STATUS_INVOICE[inv.status] ?? { label: inv.status, bg: "#EEE", color: "#666" };
                    return (
                      <tr key={inv.id} style={{ borderBottom: `1px solid ${COLORS.grisBorder}` }}>
                        <td style={{ padding: "8px", fontFamily: "monospace", fontSize: 11, color: COLORS.grisMoyen }}>#{inv.number}</td>
                        <td style={{ padding: "8px", color: COLORS.noir }}>{stripHtml(inv.title) || `Facture ${inv.number}`}</td>
                        <td style={{ padding: "8px", color: COLORS.grisMoyen }}>{new Date(inv.date).toLocaleDateString("fr-FR")}</td>
                        <td style={{ padding: "8px", textAlign: "right", fontWeight: 600, color: COLORS.dore }}>{inv.pre_tax_amount.toLocaleString("fr-FR")} €</td>
                        <td style={{ padding: "8px" }}>
                          <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, background: st.bg, color: st.color }}>{st.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Card>
        </div>
      )}

      {activeTab === "projets" && (
        <Card title="Projets en cours">
          <div style={{ color: COLORS.grisMoyen, fontSize: 13 }}>
            Fonctionnalité à venir — les projets Kanban liés à ce client apparaîtront ici.
          </div>
        </Card>
      )}

      {activeTab === "tickets" && (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.noir }}>
              {tickets.filter((t) => t.statut !== "ferme").length} ticket{tickets.filter((t) => t.statut !== "ferme").length > 1 ? "s" : ""} ouvert{tickets.filter((t) => t.statut !== "ferme").length > 1 ? "s" : ""}
            </div>
            <button
              onClick={() => setShowTicketForm(true)}
              style={{
                padding: "8px 16px", borderRadius: 8, border: "none",
                background: COLORS.noir, color: COLORS.dore,
                fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}
            >+ Nouveau ticket</button>
          </div>

          {showTicketForm && (
            <Card title="Nouveau ticket">
              <div style={{ display: "grid", gap: 12 }}>
                <input
                  value={ticketTitre}
                  onChange={(e) => setTicketTitre(e.target.value)}
                  placeholder="Titre du ticket"
                  style={inputStyle}
                />
                <textarea
                  value={ticketDesc}
                  onChange={(e) => setTicketDesc(e.target.value)}
                  placeholder="Description du problème ou de la demande…"
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
                />
                <select value={ticketPriorite} onChange={(e) => setTicketPriorite(e.target.value)} style={inputStyle}>
                  <option value="basse">Priorité basse</option>
                  <option value="normale">Priorité normale</option>
                  <option value="haute">Priorité haute</option>
                  <option value="urgente">Urgente</option>
                </select>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button onClick={() => setShowTicketForm(false)} style={{ padding: "8px 14px", borderRadius: 7, border: `1px solid ${COLORS.grisBorder}`, background: "none", color: COLORS.grisMoyen, cursor: "pointer", fontSize: 13 }}>
                    Annuler
                  </button>
                  <button onClick={createTicket} disabled={savingTicket || !ticketTitre.trim()} style={{ padding: "8px 14px", borderRadius: 7, border: "none", background: COLORS.noir, color: COLORS.dore, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                    {savingTicket ? "Création…" : "Créer"}
                  </button>
                </div>
              </div>
            </Card>
          )}

          {tickets.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", color: COLORS.grisMoyen, fontSize: 13 }}>Aucun ticket pour ce client.</div>
          ) : (
            tickets.map((t) => {
              const st = TICKET_STATUT[t.statut] ?? { label: t.statut, bg: "#EEE", color: "#666" };
              const pr = PRIORITE_COLORS[t.priorite] ?? { bg: "#EEE", color: "#666" };
              return (
                <div key={t.id} style={{
                  background: COLORS.blanc, border: `1px solid ${COLORS.grisBorder}`,
                  borderLeft: `4px solid ${st.color}`, borderRadius: 10, padding: 14,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.noir }}>{t.titre}</div>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, background: pr.bg, color: pr.color }}>{t.priorite}</span>
                      <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, background: st.bg, color: st.color }}>{st.label}</span>
                    </div>
                  </div>
                  {t.description && <div style={{ fontSize: 13, color: COLORS.grisMoyen, marginBottom: 8 }}>{t.description}</div>}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ fontSize: 11, color: COLORS.grisMoyen }}>
                      {new Date(t.created_at).toLocaleDateString("fr-FR")}
                      {t.collaborateur && ` · ${t.collaborateur.nom}`}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {t.statut === "ouvert" && <BtnSmall onClick={() => updateTicketStatut(t.id, "en_cours")}>→ En cours</BtnSmall>}
                      {t.statut === "en_cours" && <BtnSmall onClick={() => updateTicketStatut(t.id, "resolu")} color={COLORS.vert}>✓ Résolu</BtnSmall>}
                      {t.statut === "resolu" && <BtnSmall onClick={() => updateTicketStatut(t.id, "ferme")}>Fermer</BtnSmall>}
                      {t.statut !== "ferme" && <BtnSmall onClick={() => updateTicketStatut(t.id, "ferme")} color={COLORS.grisMoyen}>×</BtnSmall>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === "opportunites" && (
        <Card title="Opportunités">
          <div style={{ color: COLORS.grisMoyen, fontSize: 13 }}>
            Fonctionnalité à venir — les opportunités liées à ce client apparaîtront ici.
          </div>
        </Card>
      )}

      {activeTab === "notes" && (
        <div style={{ display: "grid", gap: 16 }}>
          <Card title="Ajouter une note">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Compte-rendu d'appel, remarque, information importante…"
              rows={4}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", marginBottom: 10 }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={createNote}
                disabled={savingNote || !newNote.trim()}
                style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: COLORS.noir, color: COLORS.dore, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
              >{savingNote ? "Enregistrement…" : "Ajouter la note"}</button>
            </div>
          </Card>

          {notes.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", color: COLORS.grisMoyen, fontSize: 13 }}>Aucune note pour ce client.</div>
          ) : (
            notes.map((n) => (
              <div key={n.id} style={{
                background: "#FFFCF0", border: "1px solid #FFE082",
                borderRadius: 10, padding: 14,
              }}>
                <div style={{ fontSize: 13, color: COLORS.noir, lineHeight: 1.6, marginBottom: 8 }}>{n.contenu}</div>
                <div style={{ fontSize: 11, color: COLORS.grisMoyen }}>
                  {new Date(n.created_at).toLocaleDateString("fr-FR")} à {new Date(n.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  {n.collaborateur && ` · ${n.collaborateur.nom}`}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "kpis" && (
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
          <KpiCard label="CA total (facturé)" value={`${caTotal.toLocaleString("fr-FR")} €`} accent />
          <KpiCard label="Devis envoyés" value={devisTotal} />
          <KpiCard label="Devis acceptés" value={devisAcceptes} color={COLORS.vert} />
          <KpiCard label="Taux de transformation" value={`${tauxTransfo}%`} color={tauxTransfo > 50 ? COLORS.vert : COLORS.dore} />
          <KpiCard label="Factures" value={invoices.length} />
          <KpiCard label="Tickets ouverts" value={tickets.filter((t) => ["ouvert", "en_cours"].includes(t.statut)).length} color={COLORS.rouge} />
        </div>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: COLORS.blanc, border: `1px solid ${COLORS.grisBorder}`,
      borderRadius: 14, padding: 20,
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.noir, marginBottom: 14, textTransform: "uppercase", letterSpacing: 0.5 }}>{title}</div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: COLORS.grisMoyen, textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 13, color: COLORS.noir, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function KpiCard({ label, value, accent, color }: { label: string; value: string | number; accent?: boolean; color?: string }) {
  return (
    <div style={{
      background: accent ? COLORS.noir : COLORS.blanc,
      border: accent ? "none" : `1px solid ${COLORS.grisBorder}`,
      borderRadius: 14, padding: 18,
    }}>
      <div style={{ fontSize: 11, color: accent ? "#888" : COLORS.grisMoyen, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: accent ? COLORS.dore : color ?? COLORS.noir, fontFamily: "var(--font-dm-serif-display), Georgia, serif", lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}

function BtnSmall({ onClick, children, color }: { onClick: () => void; children: React.ReactNode; color?: string }) {
  return (
    <button onClick={onClick} style={{
      padding: "3px 8px", borderRadius: 5,
      border: `1px solid ${COLORS.grisBorder}`,
      background: COLORS.blanc, color: color ?? COLORS.grisMoyen,
      fontSize: 11, fontWeight: 600, cursor: "pointer",
    }}>{children}</button>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px",
  border: `1px solid ${COLORS.grisBorder}`, borderRadius: 6,
  fontSize: 13, color: COLORS.noir, background: COLORS.blanc,
  outline: "none", fontFamily: "inherit", boxSizing: "border-box",
};