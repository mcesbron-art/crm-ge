"use client";

import { useState } from "react";
import { COLORS } from "@/lib/mock-data";
import {
  useOpportunities,
  type Opportunity,
  type OpportunityStatut,
} from "@/lib/opportunities-context";
import { useAuth } from "@/lib/auth-context";

/**
 * Rubrique "Opportunités" affichée dans la fiche détail d'un collaborateur (/equipe).
 *
 * Pipeline en 4 colonnes :
 *   1. Nouvelle opportunité
 *   2. Contacté
 *   3. Devis
 *   4. Choix (Gagné / Perdu)
 *
 * Chaque carte affiche les coordonnées du contact client (nom, email, téléphone)
 * cliquables pour ouvrir le client mail / passer un appel.
 */

const COLUMNS: { id: OpportunityStatut[]; label: string; icon: string; bg: string; color: string }[] = [
  { id: ["nouvelle"],         label: "Nouvelle opportunité", icon: "✦", bg: "#F3E8FF",            color: "#7C3AED" },
  { id: ["contacte"],         label: "Contacté",             icon: "✉", bg: "#E1F5FE",            color: "#0277BD" },
  { id: ["devis"],            label: "Devis",                icon: "▤", bg: COLORS.orangeBg,      color: "#E65100" },
  { id: ["gagne", "perdu"],   label: "Choix",                icon: "★", bg: COLORS.gris,          color: COLORS.noir },
];

const STATUT_LABEL: Record<OpportunityStatut, { label: string; bg: string; color: string }> = {
  nouvelle: { label: "Nouvelle",  bg: "#F3E8FF",          color: "#7C3AED" },
  contacte: { label: "Contacté",  bg: "#E1F5FE",          color: "#0277BD" },
  devis:    { label: "Devis",     bg: COLORS.orangeBg,    color: "#E65100" },
  gagne:    { label: "Gagné",     bg: COLORS.vertBg,      color: "#1B5E20" },
  perdu:    { label: "Perdu",     bg: COLORS.rougeBg,     color: COLORS.rouge },
};

type Props = {
  collabId: number;
};

export default function OpportunitesSection({ collabId }: Props) {
  const { currentUser, canSeeMoney } = useAuth();
  const { getByCollab, add, update, remove, changeStatus } = useOpportunities();

  const opportunities = getByCollab(collabId);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Permissions :
  // - Direction et Admin éditent toutes les opportunités
  // - Le collaborateur édite SES propres opportunités
  const canEdit = canSeeMoney || currentUser.id === collabId;

  return (
    <section style={{
      background: COLORS.blanc, borderRadius: 16,
      border: `1px solid ${COLORS.grisBorder}`, overflow: "hidden",
      marginTop: 20,
    }}>
      {/* HEADER */}
      <header style={{
        padding: "16px 20px",
        borderBottom: `1px solid ${COLORS.grisBorder}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: COLORS.gris, gap: 12, flexWrap: "wrap",
      }}>
        <div>
          <h3 style={{
            fontFamily: "var(--font-dm-serif-display), Georgia, serif",
            fontSize: 17, color: COLORS.noir, margin: "0 0 2px", fontWeight: 400,
          }}>Opportunités commerciales</h3>
          <p style={{ fontSize: 11, color: COLORS.grisMoyen, margin: 0 }}>
            {opportunities.length} opportunité{opportunities.length > 1 ? "s" : ""} ·
            {" "}{opportunities.filter((o) => o.statut === "gagne").length} gagnée{opportunities.filter((o) => o.statut === "gagne").length > 1 ? "s" : ""} ·
            {" "}{opportunities.filter((o) => o.statut === "perdu").length} perdue{opportunities.filter((o) => o.statut === "perdu").length > 1 ? "s" : ""}
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setAdding(true)}
            style={{
              padding: "8px 14px", borderRadius: 8, border: "none",
              background: COLORS.noir, color: COLORS.dore,
              fontSize: 12, fontWeight: 700, cursor: "pointer",
            }}
          >+ Nouvelle opportunité</button>
        )}
      </header>

      {/* FORMULAIRE D'AJOUT */}
      {adding && (
        <OpportunityForm
          collabId={collabId}
          onCancel={() => setAdding(false)}
          onSave={(data) => { add(data); setAdding(false); }}
        />
      )}

      {/* KANBAN 4 COLONNES */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, minmax(220px, 1fr))",
        gap: 0,
        overflowX: "auto",
      }}>
        {COLUMNS.map((col, idx) => {
          const colOpps = opportunities.filter((o) => col.id.includes(o.statut));
          return (
            <div key={idx} style={{
              borderRight: idx < COLUMNS.length - 1 ? `1px solid ${COLORS.grisBorder}` : "none",
              padding: 12,
              background: COLORS.blanc,
              minHeight: 200,
            }}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: 10, padding: "4px 8px",
                background: col.bg, borderRadius: 6,
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: col.color, letterSpacing: 0.3 }}>
                  {col.icon} {col.label}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: col.color,
                  background: COLORS.blanc, padding: "1px 7px", borderRadius: 10,
                }}>{colOpps.length}</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {colOpps.length === 0 && (
                  <div style={{
                    padding: "16px 8px", textAlign: "center",
                    color: COLORS.grisMoyen, fontSize: 11, fontStyle: "italic",
                  }}>—</div>
                )}
                {colOpps.map((opp) => (
                  <OpportunityCard
                    key={opp.id}
                    opp={opp}
                    canEdit={canEdit}
                    isEditing={editingId === opp.id}
                    onStartEdit={() => setEditingId(opp.id)}
                    onCancelEdit={() => setEditingId(null)}
                    onSave={(patch) => { update(opp.id, patch); setEditingId(null); }}
                    onDelete={() => { if (confirm("Supprimer cette opportunité ?")) remove(opp.id); }}
                    onChangeStatus={(s) => changeStatus(opp.id, s)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* =====================================================================
   CARTE OPPORTUNITÉ
   ===================================================================== */
function OpportunityCard({
  opp, canEdit, isEditing, onStartEdit, onCancelEdit, onSave, onDelete, onChangeStatus,
}: {
  opp: Opportunity;
  canEdit: boolean;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (patch: Partial<Opportunity>) => void;
  onDelete: () => void;
  onChangeStatus: (s: OpportunityStatut) => void;
}) {
  const { canSeeMoney } = useAuth();

  if (isEditing) {
    return (
      <OpportunityForm
        existing={opp}
        collabId={opp.collabId}
        onCancel={onCancelEdit}
        onSave={(data) => onSave(data)}
      />
    );
  }

  const isFinal = opp.statut === "gagne" || opp.statut === "perdu";
  const finalStyle = STATUT_LABEL[opp.statut];

  return (
    <div style={{
      background: COLORS.blanc,
      border: `1px solid ${COLORS.grisBorder}`,
      borderLeft: isFinal ? `4px solid ${finalStyle.color}` : `4px solid #DDD`,
      borderRadius: 8, padding: 10,
      transition: "all 0.15s",
    }}>
      {/* Titre + montant */}
      <div style={{
        fontWeight: 600, fontSize: 13, color: COLORS.noir, lineHeight: 1.3,
        marginBottom: 4,
      }}>{opp.title}</div>

      {/* Client */}
      <div style={{ fontSize: 11, color: COLORS.grisMoyen, marginBottom: 8 }}>
        {opp.clientName}
        {canSeeMoney && opp.estimatedAmount !== undefined && opp.estimatedAmount > 0 && (
          <span style={{ marginLeft: 6, color: COLORS.dore, fontWeight: 700 }}>
            · {opp.estimatedAmount.toLocaleString("fr-FR")} €
          </span>
        )}
      </div>

      {/* Contact (toujours visible) */}
      <div style={{
        padding: 8, marginBottom: 8,
        background: COLORS.gris, borderRadius: 6,
        fontSize: 11, lineHeight: 1.5,
      }}>
        <div style={{ fontWeight: 600, color: COLORS.noir, marginBottom: 2 }}>
          ◉ {opp.contactName}
        </div>
        {opp.contactEmail && (
          <a
            href={`mailto:${opp.contactEmail}`}
            style={{ display: "block", color: COLORS.bleu, textDecoration: "none" }}
            title={`Envoyer un email à ${opp.contactName}`}
          >✉ {opp.contactEmail}</a>
        )}
        {opp.contactPhone && (
          <a
            href={`tel:${opp.contactPhone.replace(/\s/g, "")}`}
            style={{ display: "block", color: COLORS.bleu, textDecoration: "none" }}
            title={`Appeler ${opp.contactName}`}
          >☎ {opp.contactPhone}</a>
        )}
      </div>

      {/* Notes (si présentes) */}
      {opp.notes && (
        <div style={{
          padding: "6px 8px", marginBottom: 8,
          background: "#FFFCF0", border: "1px solid #FFE082",
          borderRadius: 4, fontSize: 10, color: COLORS.noir,
          lineHeight: 1.4, fontStyle: "italic",
        }}>
          « {opp.notes} »
        </div>
      )}

      {/* Footer : badge statut + actions */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        gap: 6, flexWrap: "wrap",
      }}>
        {isFinal ? (
          <span style={{
            padding: "3px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700,
            background: finalStyle.bg, color: finalStyle.color,
          }}>{finalStyle.label}</span>
        ) : (
          <span style={{ fontSize: 10, color: COLORS.grisMoyen }}>
            MAJ {new Date(opp.updatedAt).toLocaleDateString("fr-FR")}
          </span>
        )}

        {canEdit && (
          <div style={{ display: "flex", gap: 4 }}>
            {/* Boutons rapides de changement de statut */}
            {opp.statut === "nouvelle" && (
              <ActionBtn onClick={() => onChangeStatus("contacte")} label="→ Contacté" />
            )}
            {opp.statut === "contacte" && (
              <ActionBtn onClick={() => onChangeStatus("devis")} label="→ Devis" />
            )}
            {opp.statut === "devis" && (
              <>
                <ActionBtn onClick={() => onChangeStatus("gagne")} label="✓ Gagné" color={COLORS.vert} />
                <ActionBtn onClick={() => onChangeStatus("perdu")} label="✗ Perdu" color={COLORS.rouge} />
              </>
            )}
            <ActionBtn onClick={onStartEdit} label="✎" />
            <ActionBtn onClick={onDelete} label="×" color={COLORS.rouge} />
          </div>
        )}
      </div>
    </div>
  );
}

function ActionBtn({ onClick, label, color }: { onClick: () => void; label: string; color?: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "3px 6px", borderRadius: 4,
        border: `1px solid ${COLORS.grisBorder}`,
        background: COLORS.blanc, color: color ?? COLORS.grisMoyen,
        fontSize: 10, fontWeight: 600, cursor: "pointer",
        whiteSpace: "nowrap", lineHeight: 1.2,
      }}
    >{label}</button>
  );
}

/* =====================================================================
   FORMULAIRE — création / édition
   ===================================================================== */
function OpportunityForm({
  existing, collabId, onCancel, onSave,
}: {
  existing?: Opportunity;
  collabId: number;
  onCancel: () => void;
  onSave: (data: Omit<Opportunity, "id" | "createdAt" | "updatedAt">) => void;
}) {
  const [title, setTitle]                 = useState(existing?.title ?? "");
  const [clientName, setClientName]       = useState(existing?.clientName ?? "");
  const [contactName, setContactName]     = useState(existing?.contactName ?? "");
  const [contactEmail, setContactEmail]   = useState(existing?.contactEmail ?? "");
  const [contactPhone, setContactPhone]   = useState(existing?.contactPhone ?? "");
  const [estimatedAmount, setEstimatedAmount] = useState(existing?.estimatedAmount?.toString() ?? "");
  const [notes, setNotes]                 = useState(existing?.notes ?? "");
  const [statut, setStatut]               = useState<OpportunityStatut>(existing?.statut ?? "nouvelle");

  const valid = title.trim() && clientName.trim() && contactName.trim();

  const handleSave = () => {
    if (!valid) return;
    onSave({
      collabId,
      title: title.trim(),
      clientName: clientName.trim(),
      contactName: contactName.trim(),
      contactEmail: contactEmail.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      estimatedAmount: estimatedAmount ? Number(estimatedAmount) : undefined,
      notes: notes.trim() || undefined,
      statut,
    });
  };

  return (
    <div style={{
      padding: 14, background: "#FFFCF6",
      border: `2px solid ${COLORS.dore}`, borderRadius: 8,
      margin: 12,
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <Field label="Titre *" value={title} onChange={setTitle} placeholder="Ex: Refonte logo Boulangerie" />
        <Field label="Client *" value={clientName} onChange={setClientName} placeholder="Nom de l'entreprise" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
        <Field label="Contact *" value={contactName} onChange={setContactName} placeholder="Sophie Lamy" />
        <Field label="Email" type="email" value={contactEmail} onChange={setContactEmail} placeholder="contact@…" />
        <Field label="Téléphone" value={contactPhone} onChange={setContactPhone} placeholder="06 12 34 56 78" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
        <Field label="Montant estimé (€)" type="number" value={estimatedAmount} onChange={setEstimatedAmount} placeholder="3500" />
        <div>
          <label style={{
            display: "block", fontSize: 9, fontWeight: 600, color: COLORS.grisMoyen,
            textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3,
          }}>Statut</label>
          <select
            value={statut}
            onChange={(e) => setStatut(e.target.value as OpportunityStatut)}
            style={{
              width: "100%", padding: "6px 8px",
              border: `1px solid ${COLORS.grisBorder}`, borderRadius: 5,
              fontSize: 12, color: COLORS.noir, background: COLORS.blanc,
              outline: "none", fontFamily: "inherit", cursor: "pointer",
            }}
          >
            <option value="nouvelle">Nouvelle</option>
            <option value="contacte">Contacté</option>
            <option value="devis">Devis</option>
            <option value="gagne">Gagné</option>
            <option value="perdu">Perdu</option>
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{
          display: "block", fontSize: 9, fontWeight: 600, color: COLORS.grisMoyen,
          textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3,
        }}>Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Contexte, prochaines étapes…"
          style={{
            width: "100%", padding: "6px 8px",
            border: `1px solid ${COLORS.grisBorder}`, borderRadius: 5,
            fontSize: 12, color: COLORS.noir, background: COLORS.blanc,
            outline: "none", fontFamily: "inherit", resize: "vertical",
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
        <button
          onClick={onCancel}
          style={{
            padding: "6px 12px", borderRadius: 6,
            background: "transparent", border: `1px solid ${COLORS.grisBorder}`,
            color: COLORS.grisMoyen, fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}
        >Annuler</button>
        <button
          onClick={handleSave}
          disabled={!valid}
          style={{
            padding: "6px 12px", borderRadius: 6, border: "none",
            background: valid ? COLORS.noir : COLORS.gris,
            color: valid ? COLORS.dore : COLORS.grisMoyen,
            fontSize: 12, fontWeight: 700,
            cursor: valid ? "pointer" : "not-allowed",
          }}
        >{existing ? "Enregistrer" : "Créer"}</button>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", placeholder,
}: {
  label: string; value: string;
  onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label style={{
        display: "block", fontSize: 9, fontWeight: 600, color: COLORS.grisMoyen,
        textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3,
      }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%", padding: "6px 8px",
          border: `1px solid ${COLORS.grisBorder}`, borderRadius: 5,
          fontSize: 12, color: COLORS.noir, background: COLORS.blanc,
          outline: "none", fontFamily: "inherit",
        }}
      />
    </div>
  );
}
