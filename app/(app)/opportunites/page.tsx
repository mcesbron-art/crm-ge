"use client";

import { useEffect, useState } from "react";
import { COLORS } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth-context";
import {
  STATUT_LABELS, STATUT_COLORS,
  type Opportunite, type Client, type Commercial, type OpportunityStatus,
} from "@/lib/opportunites-types";

/**
 * Page Opportunités — vrai pipeline commercial branché sur Supabase.
 *
 * Kanban 4 colonnes :
 *   1. Demande client       → statut = "demande"
 *   2. Client contacté      → statut = "contacte"
 *   3. Devis fait           → statut = "devis"
 *   4. Choix Gagné/Perdu    → statuts "gagne" et "perdu" regroupés (avec badge couleur)
 *
 * N'importe quel collaborateur peut créer une opportunité.
 * Le commercial responsable est choisi parmi la liste (Maryline, Loris…).
 */

export default function OpportunitesPage() {
  const { canSeeMoney } = useAuth();
  const [opportunites, setOpportunites] = useState<Opportunite[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [commerciaux, setCommerciaux] = useState<Commercial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCommercial, setFilterCommercial] = useState<string | null>(null);
  const [filterClient, setFilterClient] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [oRes, cRes, mRes] = await Promise.all([
        fetch("/api/opportunites", { cache: "no-store" }),
        fetch("/api/clients", { cache: "no-store" }),
        fetch("/api/commerciaux", { cache: "no-store" }),
      ]);
      const oData = await oRes.json();
      const cData = await cRes.json();
      const mData = await mRes.json();
      if (!oRes.ok) throw new Error(oData.error || "Chargement opportunités impossible");
      if (!cRes.ok) throw new Error(cData.error || "Chargement clients impossible");
      if (!mRes.ok) throw new Error(mData.error || "Chargement commerciaux impossible");
      setOpportunites(oData.opportunites ?? []);
      setClients(cData.clients ?? []);
      setCommerciaux(mData.commerciaux ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  const filtered = opportunites.filter((o) => {
    if (filterCommercial && o.commercial_id !== filterCommercial) return false;
    if (filterClient && o.client_id !== filterClient) return false;
    return true;
  });

  const stats = {
    total:    filtered.length,
    demande:  filtered.filter((o) => o.statut === "demande").length,
    contacte: filtered.filter((o) => o.statut === "contacte").length,
    devis:    filtered.filter((o) => o.statut === "devis").length,
    gagne:    filtered.filter((o) => o.statut === "gagne").length,
    perdu:    filtered.filter((o) => o.statut === "perdu").length,
  };

  const pipeline = filtered
    .filter((o) => ["demande", "contacte", "devis"].includes(o.statut))
    .reduce((s, o) => s + (o.montant_estime ?? 0), 0);

  const ca_gagne = filtered
    .filter((o) => o.statut === "gagne")
    .reduce((s, o) => s + (o.montant_estime ?? 0), 0);

  async function changeStatut(id: string, statut: OpportunityStatus) {
    try {
      const r = await fetch(`/api/opportunites/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setOpportunites((prev) => prev.map((o) => (o.id === id ? data.opportunite : o)));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur");
    }
  }

  async function deleteOpp(id: string) {
    if (!confirm("Supprimer cette opportunité ?")) return;
    try {
      const r = await fetch(`/api/opportunites/${id}`, { method: "DELETE" });
      if (!r.ok) {
        const data = await r.json();
        throw new Error(data.error);
      }
      setOpportunites((prev) => prev.filter((o) => o.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur");
    }
  }

  return (
    <div className="animate-fadeIn">
      {/* HEADER */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{
            fontFamily: "var(--font-dm-serif-display), Georgia, serif",
            fontSize: 30, color: COLORS.noir, margin: "0 0 4px", fontWeight: 400,
          }}>Opportunités commerciales</h1>
          <p style={{ color: COLORS.grisMoyen, fontSize: 14, margin: 0 }}>
            Pipeline complet · de la demande client au gain ou perte
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            padding: "10px 18px", borderRadius: 10, border: "none",
            background: COLORS.noir, color: COLORS.dore,
            fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}
        >+ Nouvelle opportunité</button>
      </div>

      {/* KPI */}
      <div className="grid-kpi-4" style={{ marginBottom: 24 }}>
        <KpiCard label="Total" value={stats.total} accent />
        <KpiCard label="Pipeline en cours" value={`${stats.demande + stats.contacte + stats.devis}`} sub={canSeeMoney && pipeline > 0 ? `${(pipeline / 1000).toFixed(1)}k€ estimés` : undefined} color={COLORS.bleu} />
        <KpiCard label="Gagnées" value={stats.gagne} sub={canSeeMoney && ca_gagne > 0 ? `${(ca_gagne / 1000).toFixed(1)}k€ remportés` : undefined} color={COLORS.vert} />
        <KpiCard label="Perdues" value={stats.perdu} color={COLORS.rouge} />
      </div>

      {/* FILTRES */}
      <div style={{
        background: COLORS.blanc, borderRadius: 12,
        border: `1px solid ${COLORS.grisBorder}`, padding: "10px 14px",
        marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.grisMoyen, textTransform: "uppercase", letterSpacing: 0.5 }}>
          Filtrer
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: COLORS.grisMoyen }}>Commercial :</span>
          <button
            onClick={() => setFilterCommercial(null)}
            style={chipBtn(!filterCommercial)}
          >Tous</button>
          {commerciaux.map((c) => (
            <button
              key={c.id}
              onClick={() => setFilterCommercial(filterCommercial === c.id ? null : c.id)}
              style={chipBtn(filterCommercial === c.id)}
            >{c.nom}</button>
          ))}
        </div>

        <span style={{ color: "#DDD" }}>|</span>

        <select
          value={filterClient || ""}
          onChange={(e) => setFilterClient(e.target.value || null)}
          style={{
            padding: "5px 10px", borderRadius: 8,
            border: `1px solid ${COLORS.grisBorder}`, fontSize: 12,
            color: COLORS.noir, background: COLORS.blanc, cursor: "pointer",
          }}
        >
          <option value="">Tous les clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.nom}</option>
          ))}
        </select>
      </div>

      {error && (
        <div style={{
          padding: "12px 16px", marginBottom: 16,
          background: COLORS.rougeBg, border: `1px solid ${COLORS.rouge}55`,
          borderRadius: 10, color: COLORS.rouge, fontSize: 13, fontWeight: 600,
        }}>
          {error}
          {error.toLowerCase().includes("relation") && (
            <div style={{ marginTop: 6, fontSize: 12, fontWeight: 400 }}>
              ↳ Le SQL <code>supabase/migrations/001_opportunites.sql</code> n&apos;a pas
              encore été exécuté dans Supabase.
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: COLORS.grisMoyen }}>
          Chargement…
        </div>
      ) : (
        <KanbanGrid
          opportunites={filtered}
          onChangeStatut={changeStatut}
          onDelete={deleteOpp}
          canSeeMoney={canSeeMoney}
        />
      )}

      {showCreate && (
        <CreateOpportuniteModal
          clients={clients}
          commerciaux={commerciaux}
          onClose={() => setShowCreate(false)}
          onCreated={(opp) => {
            setOpportunites((prev) => [opp, ...prev]);
            setShowCreate(false);
          }}
          onClientCreated={(client) => setClients((prev) => [...prev, client].sort((a, b) => a.nom.localeCompare(b.nom)))}
        />
      )}
    </div>
  );
}

/* =====================================================================
   KANBAN
   ===================================================================== */
function KanbanGrid({
  opportunites, onChangeStatut, onDelete, canSeeMoney,
}: {
  opportunites: Opportunite[];
  onChangeStatut: (id: string, statut: OpportunityStatus) => void;
  onDelete: (id: string) => void;
  canSeeMoney: boolean;
}) {
  const cols: { ids: OpportunityStatus[]; label: string; bg: string; color: string }[] = [
    { ids: ["demande"],          label: "Demande client",    bg: STATUT_COLORS.demande.bg,  color: STATUT_COLORS.demande.color },
    { ids: ["contacte"],         label: "Client contacté",   bg: STATUT_COLORS.contacte.bg, color: STATUT_COLORS.contacte.color },
    { ids: ["devis"],            label: "Devis fait",        bg: STATUT_COLORS.devis.bg,    color: STATUT_COLORS.devis.color },
    { ids: ["gagne", "perdu"],   label: "Choix",             bg: COLORS.gris,               color: COLORS.noir },
  ];

  return (
    <div style={{
      display: "grid", gridTemplateColumns: "repeat(4, minmax(240px, 1fr))",
      gap: 12, overflowX: "auto",
    }}>
      {cols.map((col, i) => {
        const list = opportunites.filter((o) => col.ids.includes(o.statut));
        return (
          <div key={i} style={{
            background: COLORS.blanc, border: `1px solid ${COLORS.grisBorder}`,
            borderRadius: 14, padding: 12, minHeight: 300,
          }}>
            <div style={{
              padding: "6px 10px", borderRadius: 6,
              background: col.bg, color: col.color,
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: 10,
            }}>
              <span style={{ fontSize: 11, fontWeight: 700 }}>{col.label}</span>
              <span style={{
                background: COLORS.blanc, color: col.color,
                fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 10,
              }}>{list.length}</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {list.length === 0 && (
                <div style={{ padding: 12, textAlign: "center", fontSize: 11, color: COLORS.grisMoyen, fontStyle: "italic" }}>—</div>
              )}
              {list.map((opp) => (
                <OpportuniteCard
                  key={opp.id}
                  opp={opp}
                  canSeeMoney={canSeeMoney}
                  onChangeStatut={onChangeStatut}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OpportuniteCard({
  opp, canSeeMoney, onChangeStatut, onDelete,
}: {
  opp: Opportunite;
  canSeeMoney: boolean;
  onChangeStatut: (id: string, statut: OpportunityStatus) => void;
  onDelete: (id: string) => void;
}) {
  const isFinal = opp.statut === "gagne" || opp.statut === "perdu";
  const statColor = STATUT_COLORS[opp.statut].color;

  return (
    <div style={{
      background: COLORS.blanc,
      border: `1px solid ${COLORS.grisBorder}`,
      borderLeft: `4px solid ${statColor}`,
      borderRadius: 8, padding: 10,
    }}>
      <div style={{ fontWeight: 600, fontSize: 13, color: COLORS.noir, marginBottom: 4, lineHeight: 1.3 }}>
        {opp.titre}
      </div>
      <div style={{ fontSize: 11, color: COLORS.grisMoyen, marginBottom: 6 }}>
        <strong style={{ color: COLORS.noir }}>{opp.client?.nom ?? "?"}</strong>
        {canSeeMoney && opp.montant_estime && (
          <span style={{ marginLeft: 6, color: COLORS.dore, fontWeight: 700 }}>
            · {opp.montant_estime.toLocaleString("fr-FR")} €
          </span>
        )}
      </div>

      {/* Contact (toujours visible) */}
      {opp.client && (opp.client.contact_nom || opp.client.contact_email) && (
        <div style={{
          padding: "6px 8px", marginBottom: 8,
          background: COLORS.gris, borderRadius: 5,
          fontSize: 10.5, lineHeight: 1.4,
        }}>
          {opp.client.contact_nom && (
            <div style={{ fontWeight: 600, color: COLORS.noir }}>◉ {opp.client.contact_nom}</div>
          )}
          {opp.client.contact_email && (
            <a href={`mailto:${opp.client.contact_email}`} style={{ color: COLORS.bleu, textDecoration: "none", display: "block" }}>
              ✉ {opp.client.contact_email}
            </a>
          )}
          {opp.client.contact_phone && (
            <a href={`tel:${opp.client.contact_phone.replace(/\s/g, "")}`} style={{ color: COLORS.bleu, textDecoration: "none", display: "block" }}>
              ☎ {opp.client.contact_phone}
            </a>
          )}
        </div>
      )}

      {/* Commercial + demandeur */}
      <div style={{ fontSize: 10, color: COLORS.grisMoyen, marginBottom: 6 }}>
        Commercial : <strong style={{ color: COLORS.noir }}>{opp.commercial?.nom ?? "?"}</strong>
        {" · "}
        Demande : {opp.demandeur?.nom ?? "?"}
      </div>

      {opp.notes && (
        <div style={{
          padding: "5px 7px", marginBottom: 6,
          background: "#FFFCF0", border: "1px solid #FFE082",
          borderRadius: 4, fontSize: 10, color: COLORS.noir, lineHeight: 1.3, fontStyle: "italic",
        }}>« {opp.notes} »</div>
      )}

      {/* Statut + actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
        {isFinal ? (
          <span style={{
            padding: "3px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700,
            background: STATUT_COLORS[opp.statut].bg, color: STATUT_COLORS[opp.statut].color,
          }}>{STATUT_LABELS[opp.statut]}</span>
        ) : (
          <span style={{ fontSize: 10, color: COLORS.grisMoyen }}>
            MAJ {new Date(opp.updated_at).toLocaleDateString("fr-FR")}
          </span>
        )}

        <div style={{ display: "flex", gap: 4 }}>
          {opp.statut === "demande" && (
            <Btn onClick={() => onChangeStatut(opp.id, "contacte")}>→ Contacté</Btn>
          )}
          {opp.statut === "contacte" && (
            <Btn onClick={() => onChangeStatut(opp.id, "devis")}>→ Devis</Btn>
          )}
          {opp.statut === "devis" && (
            <>
              <Btn onClick={() => onChangeStatut(opp.id, "gagne")} color={COLORS.vert}>✓ Gagné</Btn>
              <Btn onClick={() => onChangeStatut(opp.id, "perdu")} color={COLORS.rouge}>✗ Perdu</Btn>
            </>
          )}
          {(opp.statut === "gagne" || opp.statut === "perdu") && (
            <Btn onClick={() => onChangeStatut(opp.id, "devis")}>↩ Rouvrir</Btn>
          )}
          <Btn onClick={() => onDelete(opp.id)} color={COLORS.rouge}>×</Btn>
        </div>
      </div>
    </div>
  );
}

function Btn({ onClick, children, color }: { onClick: () => void; children: React.ReactNode; color?: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "3px 7px", borderRadius: 4,
        border: `1px solid ${COLORS.grisBorder}`,
        background: COLORS.blanc, color: color ?? COLORS.grisMoyen,
        fontSize: 10, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", lineHeight: 1.2,
      }}
    >{children}</button>
  );
}

function KpiCard({
  label, value, sub, accent, color,
}: {
  label: string;
  value: number | string;
  sub?: string;
  accent?: boolean;
  color?: string;
}) {
  return (
    <div style={{
      background: accent ? COLORS.noir : COLORS.blanc,
      border: accent ? "none" : `1px solid ${COLORS.grisBorder}`,
      borderRadius: 14, padding: 18,
    }}>
      <div style={{
        fontSize: 11, color: accent ? "#888" : COLORS.grisMoyen,
        textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4,
      }}>{label}</div>
      <div style={{
        fontSize: 28, fontWeight: 700,
        color: accent ? COLORS.dore : color ?? COLORS.noir,
        fontFamily: "var(--font-dm-serif-display), Georgia, serif", lineHeight: 1.1,
      }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: accent ? "#666" : COLORS.grisMoyen, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function chipBtn(active: boolean): React.CSSProperties {
  return {
    padding: "4px 10px", borderRadius: 14,
    border: `1px solid ${active ? COLORS.dore : COLORS.grisBorder}`,
    background: active ? COLORS.dorePale : COLORS.blanc,
    color: active ? COLORS.dore : COLORS.grisMoyen,
    fontSize: 11, fontWeight: 600, cursor: "pointer",
  };
}

/* =====================================================================
   MODAL DE CRÉATION
   ===================================================================== */
function CreateOpportuniteModal({
  clients, commerciaux, onClose, onCreated, onClientCreated,
}: {
  clients: Client[];
  commerciaux: Commercial[];
  onClose: () => void;
  onCreated: (opp: Opportunite) => void;
  onClientCreated: (c: Client) => void;
}) {
  const [titre, setTitre] = useState("");
  const [clientId, setClientId] = useState("");
  const [commercialId, setCommercialId] = useState(commerciaux[0]?.id ?? "");
  const [montant, setMontant] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewClient, setShowNewClient] = useState(false);

  const valid = titre.trim() && clientId && commercialId;

  async function submit() {
    if (!valid) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch("/api/opportunites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titre: titre.trim(),
          client_id: clientId,
          commercial_id: commercialId,
          montant_estime: montant ? Number(montant) : undefined,
          notes: notes.trim() || undefined,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      onCreated(data.opportunite);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: COLORS.blanc, borderRadius: 16, padding: 24,
          width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto",
          boxShadow: "0 24px 80px rgba(0,0,0,0.3)",
        }}
      >
        <h2 style={{
          fontFamily: "var(--font-dm-serif-display), Georgia, serif",
          fontSize: 22, color: COLORS.noir, margin: "0 0 6px",
        }}>Nouvelle opportunité</h2>
        <p style={{ fontSize: 12, color: COLORS.grisMoyen, marginBottom: 18 }}>
          Vous serez automatiquement enregistré(e) comme demandeur.
        </p>

        <Field label="Titre *">
          <input
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder="Ex: Refonte logo Boulangerie Lamy"
            style={inputStyle}
          />
        </Field>

        <Field label="Client *">
          <div style={{ display: "flex", gap: 6 }}>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            >
              <option value="">— Choisir —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowNewClient(true)}
              style={{
                padding: "8px 12px", borderRadius: 6,
                border: `1px solid ${COLORS.grisBorder}`,
                background: COLORS.blanc, color: COLORS.noir,
                fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
              }}
            >+ Nouveau</button>
          </div>
        </Field>

        <Field label="Commercial responsable *">
          <select
            value={commercialId}
            onChange={(e) => setCommercialId(e.target.value)}
            style={inputStyle}
          >
            {commerciaux.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
        </Field>

        <Field label="Montant estimé (€)">
          <input
            type="number"
            min="0"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            placeholder="3500"
            style={inputStyle}
          />
        </Field>

        <Field label="Notes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Contexte, prochaines étapes…"
            style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
          />
        </Field>

        {error && (
          <div style={{
            padding: "10px 12px", marginBottom: 12,
            background: COLORS.rougeBg, border: `1px solid ${COLORS.rouge}55`,
            borderRadius: 6, color: COLORS.rouge, fontSize: 12, fontWeight: 600,
          }}>{error}</div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: "transparent", border: `1px solid ${COLORS.grisBorder}`, color: COLORS.grisMoyen,
            }}
          >Annuler</button>
          <button
            onClick={submit}
            disabled={!valid || submitting}
            style={{
              padding: "9px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700,
              cursor: valid ? "pointer" : "not-allowed",
              background: valid ? COLORS.noir : COLORS.gris,
              border: "none", color: valid ? COLORS.dore : COLORS.grisMoyen,
              opacity: submitting ? 0.6 : 1,
            }}
          >{submitting ? "Création…" : "Créer l'opportunité"}</button>
        </div>

        {showNewClient && (
          <NewClientModal
            onClose={() => setShowNewClient(false)}
            onCreated={(c) => {
              onClientCreated(c);
              setClientId(c.id);
              setShowNewClient(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

function NewClientModal({
  onClose, onCreated,
}: {
  onClose: () => void;
  onCreated: (c: Client) => void;
}) {
  const [nom, setNom] = useState("");
  const [secteur, setSecteur] = useState("");
  const [contactNom, setContactNom] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!nom.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: nom.trim(),
          secteur: secteur.trim() || undefined,
          contact_nom: contactNom.trim() || undefined,
          contact_email: contactEmail.trim() || undefined,
          contact_phone: contactPhone.trim() || undefined,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      onCreated(data.client);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: COLORS.blanc, borderRadius: 14, padding: 22,
          width: "100%", maxWidth: 460,
          boxShadow: "0 24px 80px rgba(0,0,0,0.3)",
        }}
      >
        <h3 style={{
          fontFamily: "var(--font-dm-serif-display), Georgia, serif",
          fontSize: 18, color: COLORS.noir, margin: "0 0 14px",
        }}>Nouveau client</h3>

        <Field label="Nom de l'entreprise *">
          <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex: Boulangerie Lamy" style={inputStyle} />
        </Field>
        <Field label="Secteur">
          <input value={secteur} onChange={(e) => setSecteur(e.target.value)} placeholder="Ex: Restauration" style={inputStyle} />
        </Field>
        <Field label="Contact — Nom">
          <input value={contactNom} onChange={(e) => setContactNom(e.target.value)} placeholder="Sophie Lamy" style={inputStyle} />
        </Field>
        <Field label="Contact — Email">
          <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="contact@…" style={inputStyle} />
        </Field>
        <Field label="Contact — Téléphone">
          <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="06 12 34 56 78" style={inputStyle} />
        </Field>

        {error && (
          <div style={{
            padding: "9px 11px", marginBottom: 10,
            background: COLORS.rougeBg, border: `1px solid ${COLORS.rouge}55`,
            borderRadius: 6, color: COLORS.rouge, fontSize: 12, fontWeight: 600,
          }}>{error}</div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} disabled={submitting} style={{
            padding: "8px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer",
            background: "transparent", border: `1px solid ${COLORS.grisBorder}`, color: COLORS.grisMoyen,
          }}>Annuler</button>
          <button onClick={submit} disabled={submitting || !nom.trim()} style={{
            padding: "8px 14px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer",
            background: nom.trim() ? COLORS.noir : COLORS.gris,
            border: "none", color: nom.trim() ? COLORS.dore : COLORS.grisMoyen,
            opacity: submitting ? 0.6 : 1,
          }}>{submitting ? "..." : "Créer le client"}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{
        display: "block", fontSize: 10, fontWeight: 600, color: COLORS.grisMoyen,
        textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4,
      }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 10px",
  border: `1px solid ${COLORS.grisBorder}`, borderRadius: 6,
  fontSize: 13, color: COLORS.noir, background: COLORS.blanc,
  outline: "none", fontFamily: "inherit",
};
