"use client";

import { useState } from "react";
import Avatar from "@/components/ui/Avatar";
import StatutBadge from "@/components/ui/StatutBadge";
import ProgressBar from "@/components/ui/ProgressBar";
import {
  PROJETS,
  COLLABORATEURS,
  COLORS,
  getRentabiliteColor,
  type Projet,
} from "@/lib/mock-data";
import { useAuth } from "@/lib/auth-context";

function KPICard({
  label, value, sub, icon, accent = false,
}: { label: string; value: React.ReactNode; sub?: string; icon: string; accent?: boolean }) {
  return (
    <div style={{
      background: accent ? COLORS.noir : COLORS.blanc, borderRadius: 16,
      padding: "24px 24px 20px", flex: 1, minWidth: 180,
      border: accent ? "none" : `1px solid ${COLORS.grisBorder}`,
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        fontSize: 13, color: accent ? COLORS.doreLight : COLORS.grisMoyen,
        fontWeight: 500, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8,
      }}>{label}</div>
      <div style={{
        fontSize: 36, fontWeight: 700, color: accent ? COLORS.dore : COLORS.noir,
        lineHeight: 1.1, fontFamily: "var(--font-dm-serif-display), Georgia, serif",
      }}>{value}</div>
      {sub && <div style={{ fontSize: 13, color: accent ? "#999" : COLORS.grisMoyen, marginTop: 6 }}>{sub}</div>}
      <div style={{ position: "absolute", top: 16, right: 20, fontSize: 28, opacity: accent ? 0.3 : 0.12 }}>{icon}</div>
    </div>
  );
}

function ProjetRow({ projet, onClick, canSeeMoney }: { projet: Projet; onClick: () => void; canSeeMoney: boolean }) {
  const marge = projet.montantHT - projet.coutRevient;
  const margePercent = Math.round((marge / projet.montantHT) * 100);
  const totalAlloue = projet.taches.reduce((s, t) => s + t.tempsAlloue, 0);
  const totalConsomme = projet.taches.reduce((s, t) => s + t.tempsConsomme, 0);
  const ratioTemps = totalAlloue > 0 ? (totalConsomme / totalAlloue) * 100 : 0;
  const rentaInfo = getRentabiliteColor(ratioTemps);

  // Grid : on ajoute la colonne "Montant" uniquement si canSeeMoney
  const gridCols = canSeeMoney
    ? "2fr 1fr 1fr 1fr 1.2fr 0.8fr"
    : "2fr 1fr 1fr 1.2fr 0.8fr";

  return (
    <div
      onClick={onClick}
      style={{
        display: "grid",
        gridTemplateColumns: gridCols,
        alignItems: "center",
        padding: "16px 20px",
        borderBottom: `1px solid ${COLORS.grisBorder}`,
        cursor: "pointer",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = COLORS.grisLight)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div>
        <div style={{ fontWeight: 600, color: COLORS.noir, fontSize: 14, marginBottom: 2 }}>{projet.nom}</div>
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
          <div style={{ fontSize: 12, color: rentaInfo.color, fontWeight: 500 }}>Marge {margePercent}%</div>
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
  );
}

function ProjetDetail({ projet, onBack, canSeeMoney }: { projet: Projet; onBack: () => void; canSeeMoney: boolean }) {
  const marge = projet.montantHT - projet.coutRevient;
  const totalAlloue = projet.taches.reduce((s, t) => s + t.tempsAlloue, 0);
  const totalConsomme = projet.taches.reduce((s, t) => s + t.tempsConsomme, 0);

  return (
    <div className="animate-fadeIn">
      <button
        onClick={onBack}
        style={{
          background: "none", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6,
          color: COLORS.dore, fontWeight: 600, fontSize: 14,
          padding: "0 0 16px",
        }}
      >
        ← Retour au dashboard
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <h2 style={{
          fontFamily: "var(--font-dm-serif-display), Georgia, serif",
          fontSize: 28, color: COLORS.noir, margin: 0,
        }}>{projet.nom}</h2>
        <StatutBadge statut={projet.statut} type="projet" />
        {projet.type === "Abonnement" && (
          <span style={{
            padding: "4px 10px", borderRadius: 20,
            background: COLORS.dorePale, color: COLORS.dore,
            fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase",
          }}>Abonnement</span>
        )}
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
        {canSeeMoney && (
          <div style={{ flex: 1, background: COLORS.blanc, border: `1px solid ${COLORS.grisBorder}`, borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 12, color: COLORS.grisMoyen, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Montant HT</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.noir, fontFamily: "var(--font-dm-serif-display), Georgia, serif" }}>
              {projet.montantHT.toLocaleString("fr-FR")} €
            </div>
          </div>
        )}
        {canSeeMoney && (
          <div style={{ flex: 1, background: COLORS.blanc, border: `1px solid ${COLORS.grisBorder}`, borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 12, color: COLORS.grisMoyen, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Marge disponible</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.dore, fontFamily: "var(--font-dm-serif-display), Georgia, serif" }}>
              {marge.toLocaleString("fr-FR")} €
            </div>
          </div>
        )}
        <div style={{ flex: 1, background: COLORS.blanc, border: `1px solid ${COLORS.grisBorder}`, borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 12, color: COLORS.grisMoyen, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>
            {canSeeMoney ? "Temps production" : "Temps vendu"}
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.noir, fontFamily: "var(--font-dm-serif-display), Georgia, serif" }}>
            {totalConsomme.toFixed(1)}h <span style={{ fontSize: 16, color: COLORS.grisMoyen, fontWeight: 400 }}>/ {totalAlloue.toFixed(1)}h</span>
          </div>
        </div>
        {!canSeeMoney && (
          <div style={{ flex: 1, background: COLORS.blanc, border: `1px solid ${COLORS.grisBorder}`, borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 12, color: COLORS.grisMoyen, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Avancement</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.dore, fontFamily: "var(--font-dm-serif-display), Georgia, serif" }}>
              {totalAlloue > 0 ? Math.round((totalConsomme / totalAlloue) * 100) : 0}%
            </div>
          </div>
        )}
      </div>

      <h3 style={{ fontFamily: "var(--font-dm-serif-display), Georgia, serif", fontSize: 18, color: COLORS.noir, marginBottom: 16 }}>
        Tâches du projet
      </h3>
      <div style={{ background: COLORS.blanc, borderRadius: 16, border: `1px solid ${COLORS.grisBorder}`, overflow: "hidden" }}>
        <div style={{
          display: "grid", gridTemplateColumns: "2fr 1fr 0.8fr 1.2fr 1fr",
          padding: "12px 20px", background: COLORS.gris,
          borderBottom: `1px solid ${COLORS.grisBorder}`,
          fontSize: 11, fontWeight: 600, color: COLORS.grisMoyen,
          textTransform: "uppercase", letterSpacing: 0.5,
        }}>
          <div>Tâche</div><div>Statut</div><div>Collaborateur</div>
          <div>Temps (consommé / alloué)</div><div>Rentabilité</div>
        </div>
        {projet.taches.map((tache) => {
          const collab = COLLABORATEURS.find((c) => c.id === tache.collab);
          const ratio = tache.tempsAlloue > 0 ? (tache.tempsConsomme / tache.tempsAlloue) * 100 : 0;
          const info = getRentabiliteColor(ratio);
          return (
            <div key={tache.id} style={{
              display: "grid", gridTemplateColumns: "2fr 1fr 0.8fr 1.2fr 1fr", alignItems: "center",
              padding: "14px 20px", borderBottom: `1px solid ${COLORS.grisBorder}`,
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.noir }}>{tache.nom}</div>
                {canSeeMoney && (
                  <div style={{ fontSize: 12, color: COLORS.grisMoyen }}>
                    {tache.montant.toLocaleString("fr-FR")} € HT · Marge: {(tache.montant - tache.cout).toLocaleString("fr-FR")} €
                  </div>
                )}
              </div>
              <div><StatutBadge statut={tache.statut} type="tache" /></div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Avatar collab={collab} size={26} />
                <span style={{ fontSize: 12, color: COLORS.grisMoyen }}>{collab?.nom || "—"}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 13 }}>
                  <strong>{tache.tempsConsomme}h</strong>
                  <span style={{ color: COLORS.grisMoyen }}> / {tache.tempsAlloue}h</span>
                </span>
                <ProgressBar consumed={tache.tempsConsomme} allocated={tache.tempsAlloue} height={6} showPct={false} />
              </div>
              <div>
                {tache.tempsConsomme > 0 ? (
                  <span style={{ fontSize: 13, fontWeight: 600, color: info.color }}>
                    {info.label} ({Math.round(ratio)}%)
                  </span>
                ) : (
                  <span style={{ fontSize: 13, color: COLORS.grisMoyen }}>—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { canSeeMoney } = useAuth();
  const [selectedProjet, setSelectedProjet] = useState<Projet | null>(null);

  const totalCA = PROJETS.reduce((s, p) => s + p.montantHT, 0);
  const totalMarge = PROJETS.reduce((s, p) => s + (p.montantHT - p.coutRevient), 0);
  const totalTaches = PROJETS.reduce((s, p) => s + p.taches.length, 0);
  const tachesEnCours = PROJETS.reduce((s, p) => s + p.taches.filter((t) => t.statut === "En cours").length, 0);
  const alertes = PROJETS.reduce(
    (s, p) => s + p.taches.filter((t) => t.tempsAlloue > 0 && (t.tempsConsomme / t.tempsAlloue) >= 0.75).length, 0
  );

  if (selectedProjet) {
    return <ProjetDetail projet={selectedProjet} onBack={() => setSelectedProjet(null)} canSeeMoney={canSeeMoney} />;
  }

  const tachesAlerte = PROJETS.flatMap((p) =>
    p.taches.filter((t) => t.tempsAlloue > 0 && (t.tempsConsomme / t.tempsAlloue) >= 0.75)
      .map((t) => ({ ...t, projet: p.nom }))
  );

  return (
    <div className="animate-fadeIn">
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <div>
          <h1 style={{
            fontFamily: "var(--font-dm-serif-display), Georgia, serif",
            fontSize: 32, color: COLORS.noir, margin: "0 0 4px", fontWeight: 400,
          }}>Dashboard</h1>
          <p style={{ color: COLORS.grisMoyen, fontSize: 14, margin: 0 }}>Semaine du 10 au 16 mars 2026</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{
            padding: "10px 20px", background: COLORS.blanc, border: `1px solid ${COLORS.grisBorder}`,
            borderRadius: 10, fontSize: 13, fontWeight: 600, color: COLORS.noir, cursor: "pointer",
          }}>Exporter PDF</button>
          <button style={{
            padding: "10px 20px", background: COLORS.noir, border: "none",
            borderRadius: 10, fontSize: 13, fontWeight: 600, color: COLORS.dore, cursor: "pointer",
          }}>+ Nouveau projet</button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid-kpi-4" style={{ marginBottom: 32 }}>
        <KPICard
          label="Projets actifs"
          value={PROJETS.filter((p) => p.statut !== "Clôturé").length}
          sub={`${totalTaches} tâches au total`}
          icon="▣"
          accent
        />
        {canSeeMoney && (
          <KPICard label="CA en production" value={`${(totalCA / 1000).toFixed(1)}k€`} sub={`Marge: ${(totalMarge / 1000).toFixed(1)}k€`} icon="€" />
        )}
        <KPICard label="Tâches en cours" value={tachesEnCours} sub={`sur ${totalTaches} tâches`} icon="▶" />
        <KPICard label={canSeeMoney ? "Alertes rentabilité" : "Alertes temps"} value={alertes} sub={alertes > 0 ? "Tâches à surveiller" : "Tout est OK"} icon="⚠" />
      </div>

      {/* ALERTES */}
      {tachesAlerte.length > 0 && (
        <div style={{
          background: "#FFF8F0", border: "1px solid #FFE0B2",
          borderRadius: 14, padding: "16px 20px", marginBottom: 24,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#E65100", marginBottom: 10 }}>
            ⚠ Alertes temps de production
          </div>
          {tachesAlerte.map((t) => {
            const ratio = Math.round((t.tempsConsomme / t.tempsAlloue) * 100);
            const info = getRentabiliteColor(ratio);
            return (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 0", fontSize: 13 }}>
                <span style={{ fontWeight: 600, color: info.color }}>{ratio}%</span>
                <span style={{ color: COLORS.noir, fontWeight: 500 }}>{t.nom}</span>
                <span style={{ color: COLORS.grisMoyen }}>— {t.projet}</span>
                <Avatar collab={COLLABORATEURS.find((c) => c.id === t.collab)} size={22} />
              </div>
            );
          })}
        </div>
      )}

      {/* PROJETS TABLE */}
      <div className="responsive-table-wrapper" style={{ background: COLORS.blanc, borderRadius: 16, border: `1px solid ${COLORS.grisBorder}`, overflow: "hidden" }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "18px 20px", borderBottom: `1px solid ${COLORS.grisBorder}`,
        }}>
          <h3 style={{
            fontFamily: "var(--font-dm-serif-display), Georgia, serif",
            fontSize: 18, color: COLORS.noir, margin: 0, fontWeight: 400,
          }}>Projets en cours</h3>
          <span style={{ fontSize: 12, color: COLORS.grisMoyen }}>{PROJETS.length} projets</span>
        </div>
        <div style={{
          display: "grid",
          gridTemplateColumns: canSeeMoney ? "2fr 1fr 1fr 1fr 1.2fr 0.8fr" : "2fr 1fr 1fr 1.2fr 0.8fr",
          padding: "10px 20px", background: COLORS.gris,
          borderBottom: `1px solid ${COLORS.grisBorder}`,
          fontSize: 11, fontWeight: 600, color: COLORS.grisMoyen,
          textTransform: "uppercase", letterSpacing: 0.5,
        }}>
          <div>Projet</div>
          <div>Statut</div>
          {canSeeMoney && <div style={{ textAlign: "right" }}>Montant</div>}
          <div style={{ textAlign: "right" }}>Temps</div>
          <div style={{ paddingLeft: 8 }}>{canSeeMoney ? "Rentabilité" : "Avancement"}</div>
          <div style={{ textAlign: "right" }}>Équipe</div>
        </div>
        {PROJETS.map((p) => (
          <ProjetRow key={p.id} projet={p} onClick={() => setSelectedProjet(p)} canSeeMoney={canSeeMoney} />
        ))}
      </div>

      {/* CHARGE EQUIPE */}
      <div style={{ marginTop: 32, background: COLORS.blanc, borderRadius: 16, border: `1px solid ${COLORS.grisBorder}`, overflow: "hidden" }}>
        <div style={{ padding: "18px 20px", borderBottom: `1px solid ${COLORS.grisBorder}` }}>
          <h3 style={{
            fontFamily: "var(--font-dm-serif-display), Georgia, serif",
            fontSize: 18, color: COLORS.noir, margin: 0, fontWeight: 400,
          }}>Charge équipe cette semaine</h3>
        </div>
        <div className="grid-cards-3" style={{ padding: 20 }}>
          {COLLABORATEURS.map((c) => {
            const taches = PROJETS.flatMap((p) => p.taches.filter((t) => t.collab === c.id));
            const heures = taches.reduce((s, t) => s + t.tempsConsomme, 0);
            const charge = Math.min(Math.round((heures / 35) * 100), 100);
            return (
              <div key={c.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 16px", borderRadius: 12, background: COLORS.gris,
              }}>
                <Avatar collab={c} size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: COLORS.noir }}>{c.nom}</span>
                    <span style={{ fontSize: 12, color: COLORS.grisMoyen }}>{heures}h / 35h</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: "#E5E5E3", overflow: "hidden" }}>
                    <div style={{
                      width: `${charge}%`, height: "100%", borderRadius: 3,
                      background: charge > 90 ? COLORS.rouge : charge > 70 ? COLORS.orange : COLORS.vert,
                      transition: "width 0.5s ease",
                    }} />
                  </div>
                  <div style={{ fontSize: 11, color: COLORS.grisMoyen, marginTop: 4 }}>
                    {taches.length} tâche{taches.length > 1 ? "s" : ""} · {c.pole}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
