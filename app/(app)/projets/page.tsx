"use client";

import { useState } from "react";
import Avatar from "@/components/ui/Avatar";
import StatutBadge from "@/components/ui/StatutBadge";
import ProgressBar from "@/components/ui/ProgressBar";
import {
  PROJETS, COLLABORATEURS, COLORS, getRentabiliteColor,
  type Projet,
} from "@/lib/mock-data";
import { useAuth } from "@/lib/auth-context";

export default function ProjetsPage() {
  const { canSeeMoney } = useAuth();
  const [search, setSearch] = useState("");
  const [statutFilter, setStatutFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = PROJETS.filter((p) => {
    if (search && !`${p.nom} ${p.client}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (statutFilter && p.statut !== statutFilter) return false;
    if (typeFilter && p.type !== typeFilter) return false;
    return true;
  });

  const allStatuts = [...new Set(PROJETS.map((p) => p.statut))];

  return (
    <div className="animate-fadeIn">
      {/* HEADER */}
      <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{
            fontFamily: "var(--font-dm-serif-display), Georgia, serif",
            fontSize: 30, color: COLORS.noir, margin: "0 0 4px", fontWeight: 400,
          }}>Projets</h1>
          <p style={{ color: COLORS.grisMoyen, fontSize: 14, margin: 0 }}>
            {filtered.length} projet{filtered.length > 1 ? "s" : ""} {filtered.length !== PROJETS.length && `(sur ${PROJETS.length})`}
          </p>
        </div>
        <button style={{
          padding: "10px 20px", background: COLORS.noir, border: "none",
          borderRadius: 10, fontSize: 13, fontWeight: 600, color: COLORS.dore, cursor: "pointer",
        }}>+ Nouveau projet</button>
      </div>

      {/* FILTERS */}
      <div style={{
        background: COLORS.blanc, borderRadius: 12,
        border: `1px solid ${COLORS.grisBorder}`, padding: "12px 16px",
        display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap",
      }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un projet ou client…"
          style={{
            flex: 1, minWidth: 240,
            padding: "8px 12px", border: `1px solid ${COLORS.grisBorder}`, borderRadius: 8,
            fontSize: 13, color: COLORS.noir, outline: "none", fontFamily: "inherit",
          }}
        />
        <select
          value={statutFilter}
          onChange={(e) => setStatutFilter(e.target.value)}
          style={{
            padding: "8px 12px", border: `1px solid ${COLORS.grisBorder}`, borderRadius: 8,
            fontSize: 13, color: COLORS.noir, background: COLORS.blanc, cursor: "pointer",
          }}
        >
          <option value="">Tous statuts</option>
          {allStatuts.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{
            padding: "8px 12px", border: `1px solid ${COLORS.grisBorder}`, borderRadius: 8,
            fontSize: 13, color: COLORS.noir, background: COLORS.blanc, cursor: "pointer",
          }}
        >
          <option value="">Tous types</option>
          <option value="Standard">Standard</option>
          <option value="Abonnement">Abonnement</option>
        </select>
        {(search || statutFilter || typeFilter) && (
          <button
            onClick={() => { setSearch(""); setStatutFilter(""); setTypeFilter(""); }}
            style={{
              padding: "8px 14px", background: "transparent",
              border: `1px solid ${COLORS.grisBorder}`, borderRadius: 8,
              fontSize: 12, fontWeight: 600, color: COLORS.grisMoyen, cursor: "pointer",
            }}
          >Réinitialiser</button>
        )}
      </div>

      {/* LIST */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filtered.length === 0 && (
          <div style={{
            padding: "48px 20px", textAlign: "center",
            background: COLORS.blanc, borderRadius: 16,
            border: `1px solid ${COLORS.grisBorder}`,
            color: COLORS.grisMoyen, fontStyle: "italic",
          }}>Aucun projet ne correspond aux filtres.</div>
        )}

        {filtered.map((projet) => (
          <ProjetRow key={projet.id} projet={projet} expanded={expanded.has(projet.id)} onToggle={() => toggle(projet.id)} canSeeMoney={canSeeMoney} />
        ))}
      </div>
    </div>
  );
}

function ProjetRow({ projet, expanded, onToggle, canSeeMoney }: {
  projet: Projet; expanded: boolean; onToggle: () => void; canSeeMoney: boolean;
}) {
  const marge = projet.montantHT - projet.coutRevient;
  const margePercent = Math.round((marge / projet.montantHT) * 100);
  const totalAlloue = projet.taches.reduce((s, t) => s + t.tempsAlloue, 0);
  const totalConsomme = projet.taches.reduce((s, t) => s + t.tempsConsomme, 0);
  const ratioTemps = totalAlloue > 0 ? (totalConsomme / totalAlloue) * 100 : 0;
  const rentaInfo = getRentabiliteColor(ratioTemps);

  return (
    <div style={{
      background: COLORS.blanc, borderRadius: 16,
      border: `1px solid ${COLORS.grisBorder}`, overflow: "hidden",
      transition: "all 0.2s",
    }}>
      <div
        onClick={onToggle}
        style={{
          display: "grid",
          gridTemplateColumns: canSeeMoney
            ? "auto 2fr 1fr 1fr 1fr 1.2fr 0.8fr"
            : "auto 2fr 1fr 1fr 1.2fr 0.8fr",
          alignItems: "center", gap: 16, padding: "16px 20px",
          cursor: "pointer", transition: "background 0.15s",
        }}
      >
        <span style={{
          width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center",
          color: COLORS.grisMoyen, fontSize: 14, transform: expanded ? "rotate(90deg)" : "rotate(0)",
          transition: "transform 0.2s",
        }}>▶</span>

        <div>
          <div style={{ fontWeight: 600, color: COLORS.noir, fontSize: 14, marginBottom: 2, display: "flex", alignItems: "center", gap: 8 }}>
            {projet.nom}
            {projet.type === "Abonnement" && (
              <span style={{
                fontSize: 9, padding: "2px 6px", borderRadius: 4,
                background: COLORS.dorePale, color: COLORS.dore, fontWeight: 700,
              }}>ABO</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: COLORS.grisMoyen }}>
            {projet.client} · {projet.taches.length} tâche{projet.taches.length > 1 ? "s" : ""}
          </div>
        </div>

        <div><StatutBadge statut={projet.statut} type="projet" /></div>

        {canSeeMoney && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 600, color: COLORS.noir, fontSize: 14 }}>
              {projet.montantHT.toLocaleString("fr-FR")} €
            </div>
            <div style={{ fontSize: 12, color: rentaInfo.color, fontWeight: 500 }}>
              Marge {margePercent}%
            </div>
          </div>
        )}

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 14, color: COLORS.noir }}>
            <span style={{ fontWeight: 600 }}>{totalConsomme.toFixed(1)}h</span>
            <span style={{ color: COLORS.grisMoyen }}> / {totalAlloue.toFixed(1)}h</span>
          </div>
        </div>

        <div style={{ padding: "0 8px" }}><ProgressBar consumed={totalConsomme} allocated={totalAlloue} /></div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          {[...new Set(projet.taches.map((t) => t.collab).filter(Boolean))].slice(0, 3).map((cid) => (
            <div key={cid} style={{ marginLeft: -6 }}>
              <Avatar collab={COLLABORATEURS.find((c) => c.id === cid)} size={28} />
            </div>
          ))}
        </div>
      </div>

      {expanded && (
        <div className="animate-fadeIn" style={{ borderTop: `1px solid ${COLORS.grisBorder}`, background: COLORS.gris }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: canSeeMoney ? "2fr 1fr 0.8fr 1.2fr 1fr" : "2fr 1fr 0.8fr 1.2fr",
            padding: "10px 20px",
            fontSize: 10, fontWeight: 700, color: COLORS.grisMoyen,
            textTransform: "uppercase", letterSpacing: 0.5,
            borderBottom: `1px solid ${COLORS.grisBorder}`,
          }}>
            <div>Tâche</div>
            <div>Statut</div>
            <div>Collab</div>
            <div>Temps</div>
            {canSeeMoney && <div style={{ textAlign: "right" }}>Marge</div>}
          </div>

          {projet.taches.map((tache) => {
            const collab = COLLABORATEURS.find((c) => c.id === tache.collab);
            const ratio = tache.tempsAlloue > 0 ? (tache.tempsConsomme / tache.tempsAlloue) * 100 : 0;
            const tInfo = getRentabiliteColor(ratio);
            return (
              <div key={tache.id} style={{
                display: "grid",
                gridTemplateColumns: canSeeMoney ? "2fr 1fr 0.8fr 1.2fr 1fr" : "2fr 1fr 0.8fr 1.2fr",
                alignItems: "center", padding: "12px 20px",
                borderBottom: `1px solid ${COLORS.grisBorder}`, background: COLORS.blanc,
              }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13, color: COLORS.noir }}>{tache.nom}</div>
                  {canSeeMoney && (
                    <div style={{ fontSize: 11, color: COLORS.grisMoyen }}>
                      {tache.montant.toLocaleString("fr-FR")} € HT
                    </div>
                  )}
                  {!canSeeMoney && tache.tempsConsomme > 0 && (
                    <div style={{ fontSize: 11, color: tInfo.color, fontWeight: 600 }}>
                      {tInfo.label} · {Math.round(ratio)}%
                    </div>
                  )}
                </div>
                <div><StatutBadge statut={tache.statut} type="tache" /></div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Avatar collab={collab} size={24} />
                  <span style={{ fontSize: 11, color: COLORS.grisMoyen }}>{collab?.nom || "—"}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 12 }}>
                    <strong>{tache.tempsConsomme}h</strong>
                    <span style={{ color: COLORS.grisMoyen }}> / {tache.tempsAlloue}h</span>
                  </span>
                  <ProgressBar consumed={tache.tempsConsomme} allocated={tache.tempsAlloue} height={5} showPct={false} />
                </div>
                {canSeeMoney && (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: COLORS.dore }}>
                      {(tache.montant - tache.cout).toLocaleString("fr-FR")} €
                    </div>
                    {tache.tempsConsomme > 0 && (
                      <div style={{ fontSize: 10, color: tInfo.color, fontWeight: 600 }}>
                        {tInfo.label} ({Math.round(ratio)}%)
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
