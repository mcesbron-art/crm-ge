"use client";

import { useState } from "react";
import Avatar from "@/components/ui/Avatar";
import { COLORS } from "@/lib/mock-data";
import OpportunitesSection from "@/components/OpportunitesSection";

type EquipeTache = {
  id: number; nom: string; projet: string; statut: string;
  tempsAlloue: number; tempsConsomme: number;
  priorite: "haute" | "moyenne" | "basse";
  echeance: string; abonnement?: boolean;
};

type EquipeCollab = {
  id: number; nom: string; pole: string; avatar: string; color: string;
  base: number; email: string;
  taches: EquipeTache[];
  heuresSemaine: { total: number; lun: number; mar: number; mer: number; jeu: number; ven: number };
};

const COLLAB_DATA: EquipeCollab[] = [
  { id: 1, nom: "Noémie", pole: "Graphisme / Photo / Vidéo", avatar: "N", color: "#8E24AA", base: 35, email: "noemie@groupe-echo.fr",
    taches: [
      { id: 1,  nom: "Maquettes site e-commerce",  projet: "Maison Relais Gourmet",  statut: "En cours",          tempsAlloue: 24.1, tempsConsomme: 18.5, priorite: "haute",   echeance: "18 mars" },
      { id: 4,  nom: "Maquettes UI/UX",            projet: "Netzy",                  statut: "BAT envoyé",        tempsAlloue: 19.3, tempsConsomme: 17,   priorite: "haute",   echeance: "14 mars" },
      { id: 8,  nom: "Shooting photo printemps",   projet: "Vins d'Anjou-Saumur",    statut: "Validation client", tempsAlloue: 14.5, tempsConsomme: 12,   priorite: "haute",   echeance: "20 mars" },
      { id: 10, nom: "Charte graphique",           projet: "BÉRYL Patrimoine",       statut: "En cours",          tempsAlloue: 30.1, tempsConsomme: 22,   priorite: "haute",   echeance: "25 mars" },
      { id: 11, nom: "Supports print",             projet: "BÉRYL Patrimoine",       statut: "À faire",           tempsAlloue: 18.1, tempsConsomme: 0,    priorite: "moyenne", echeance: "2 avril" },
    ],
    heuresSemaine: { total: 37, lun: 7.5, mar: 8, mer: 6.5, jeu: 7, ven: 8 } },
  { id: 2, nom: "Amandine", pole: "Web / SEO / Contenu", avatar: "A", color: "#1E88E5", base: 35, email: "amandine@groupe-echo.fr",
    taches: [
      { id: 3,  nom: "Rédaction fiches produits",  projet: "Maison Relais Gourmet",  statut: "Brief",    tempsAlloue: 24.1, tempsConsomme: 0, priorite: "basse",   echeance: "28 mars" },
      { id: 6,  nom: "SEO on-page",                projet: "Netzy",                  statut: "Brief",    tempsAlloue: 10.8, tempsConsomme: 0, priorite: "moyenne", echeance: "1 avril" },
      { id: 14, nom: "Audit SEO groupe-echo.fr",   projet: "Groupe Écho (interne)",  statut: "En cours", tempsAlloue: 12,   tempsConsomme: 8, priorite: "moyenne", echeance: "21 mars" },
    ],
    heuresSemaine: { total: 31.5, lun: 6, mar: 7, mer: 7.5, jeu: 6, ven: 5 } },
  { id: 3, nom: "Jérémy", pole: "Social Media / Vidéo", avatar: "J", color: "#43A047", base: 35, email: "jeremy@groupe-echo.fr",
    taches: [
      { id: 7,  nom: "Posts réseaux sociaux Mars", projet: "Vins d'Anjou-Saumur", statut: "En cours", tempsAlloue: 14.5, tempsConsomme: 11, priorite: "moyenne", echeance: "31 mars", abonnement: true },
      { id: 15, nom: "Vidéo corporate BÉRYL",      projet: "BÉRYL Patrimoine",    statut: "À faire",  tempsAlloue: 18.1, tempsConsomme: 0,  priorite: "haute",   echeance: "10 avril" },
      { id: 16, nom: "Stratégie RS Roul'Anjou",    projet: "Roul'Anjou",          statut: "Brief",    tempsAlloue: 10,   tempsConsomme: 0,  priorite: "moyenne", echeance: "15 avril" },
    ],
    heuresSemaine: { total: 36.5, lun: 8, mar: 7, mer: 8, jeu: 7.5, ven: 6 } },
  { id: 4, nom: "Marcellin", pole: "SEO / SEA / Sites standards", avatar: "M", color: "#FB8C00", base: 35, email: "marcellin@groupe-echo.fr",
    taches: [
      { id: 5,  nom: "Développement WordPress",    projet: "Netzy",                 statut: "Attente élément", tempsAlloue: 21.7, tempsConsomme: 8, priorite: "haute", echeance: "22 mars" },
      { id: 17, nom: "Campagne SEA Netzy",         projet: "Netzy",                 statut: "En cours",        tempsAlloue: 15,   tempsConsomme: 6, priorite: "haute", echeance: "18 mars" },
      { id: 18, nom: "Maintenance SEO interne",    projet: "Groupe Écho (interne)", statut: "En cours",        tempsAlloue: 8,    tempsConsomme: 5, priorite: "basse", echeance: "Récurrent" },
    ],
    heuresSemaine: { total: 32, lun: 7, mar: 7, mer: 6, jeu: 7, ven: 5 } },
  { id: 5, nom: "Arthur", pole: "Sites complexes / Ads", avatar: "Ar", color: "#E53935", base: 39, email: "arthur@groupe-echo.fr",
    taches: [
      { id: 2,  nom: "Intégration WooCommerce",    projet: "Maison Relais Gourmet", statut: "À faire", tempsAlloue: 20.5, tempsConsomme: 0,   priorite: "moyenne", echeance: "28 mars" },
      { id: 19, nom: "Module paiement MRG",        projet: "Maison Relais Gourmet", statut: "En cours", tempsAlloue: 12,   tempsConsomme: 9,   priorite: "haute",   echeance: "19 mars" },
      { id: 20, nom: "Optimisation Ads BÉRYL",     projet: "BÉRYL Patrimoine",      statut: "En cours", tempsAlloue: 10,   tempsConsomme: 7.5, priorite: "haute",   echeance: "17 mars" },
    ],
    heuresSemaine: { total: 38.5, lun: 8, mar: 8, mer: 7.5, jeu: 8, ven: 7 } },
  { id: 6, nom: "Fanny", pole: "Planning / Production", avatar: "F", color: "#00897B", base: 35, email: "fanny@groupe-echo.fr",
    taches: [
      { id: 21, nom: "Coordination MRG",             projet: "Maison Relais Gourmet", statut: "En cours", tempsAlloue: 10, tempsConsomme: 4, priorite: "moyenne", echeance: "Continu" },
      { id: 22, nom: "Planning global semaine",      projet: "Groupe Écho (interne)", statut: "En cours", tempsAlloue: 8,  tempsConsomme: 6, priorite: "haute",   echeance: "Chaque lundi" },
      { id: 23, nom: "Suivi facturation Mars",       projet: "Groupe Écho (interne)", statut: "À faire",  tempsAlloue: 6,  tempsConsomme: 0, priorite: "haute",   echeance: "31 mars" },
    ],
    heuresSemaine: { total: 26, lun: 6, mar: 5, mer: 6, jeu: 5, ven: 4 } },
];

const statutStyles: Record<string, { bg: string; color: string }> = {
  "Brief":              { bg: "#F3E8FF", color: "#7C3AED" },
  "À faire":            { bg: "#E8EAF6", color: "#3949AB" },
  "En cours":           { bg: "#E8F5E9", color: "#2E7D32" },
  "Attente élément":    { bg: "#FFF3E0", color: "#E65100" },
  "Validation client":  { bg: "#FFF8E1", color: "#F57F17" },
  "BAT envoyé":         { bg: "#E1F5FE", color: "#0277BD" },
  "Terminé":            { bg: "#ECEFF1", color: "#37474F" },
};

const prioStyles: Record<string, { color: string; icon: string }> = {
  haute:   { color: COLORS.rouge,  icon: "▲" },
  moyenne: { color: COLORS.orange, icon: "●" },
  basse:   { color: COLORS.vert,   icon: "▼" },
};

function getRentaInfo(pct: number) {
  if (pct < 75)  return { color: COLORS.vert,   label: "OK" };
  if (pct <= 100) return { color: COLORS.orange, label: "Limite" };
  return { color: COLORS.rouge, label: "Dépassé" };
}

function ChargeRing({ pct, size = 64, strokeWidth = 7 }: { pct: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(pct, 100) / 100) * circumference;
  const color = pct > 95 ? COLORS.rouge : pct > 80 ? COLORS.orange : COLORS.vert;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#EEEEE9" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex",
        alignItems: "center", justifyContent: "center",
        fontSize: size * 0.24, fontWeight: 700, color,
      }}>{pct}%</div>
    </div>
  );
}

function MiniBar({ value, max, color, height = 6 }: { value: number; max: number; color: string; height?: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ height, borderRadius: height, background: "#EEEEE9", overflow: "hidden", width: "100%" }}>
      <div style={{ width: `${pct}%`, height: "100%", borderRadius: height, background: color, transition: "width 0.5s ease" }} />
    </div>
  );
}

function DayMiniChart({ data, base }: { data: EquipeCollab["heuresSemaine"]; base: number }) {
  const days = ["L", "M", "Me", "J", "V"];
  const values = [data.lun, data.mar, data.mer, data.jeu, data.ven];
  const dailyBase = base / 5;
  const maxH = 10;
  return (
    <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 36 }}>
      {values.map((v, i) => {
        const pct = Math.min((v / maxH) * 100, 100);
        const over = v > dailyBase;
        return (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1, flex: 1 }}>
            <div style={{ width: "100%", height: 36, display: "flex", alignItems: "flex-end" }}>
              <div style={{
                width: "100%", borderRadius: 2, height: `${pct}%`,
                minHeight: v > 0 ? 3 : 0,
                background: over ? COLORS.orange : COLORS.vert,
                transition: "height 0.3s ease",
              }} />
            </div>
            <span style={{ fontSize: 8, color: COLORS.grisMoyen }}>{days[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

function CollabCard({ collab, onClick }: { collab: EquipeCollab; onClick: () => void }) {
  const taux = Math.round((collab.heuresSemaine.total / collab.base) * 100);
  const tachesEnCours = collab.taches.filter((t) => t.statut === "En cours").length;
  const tachesAlerte = collab.taches.filter((t) => t.tempsAlloue > 0 && (t.tempsConsomme / t.tempsAlloue) >= 0.75).length;
  const totalAlloue = collab.taches.reduce((s, t) => s + t.tempsAlloue, 0);
  const totalConsomme = collab.taches.reduce((s, t) => s + t.tempsConsomme, 0);

  return (
    <div
      onClick={onClick}
      style={{
        background: COLORS.blanc, borderRadius: 16, padding: 20,
        border: `1px solid ${COLORS.grisBorder}`, cursor: "pointer",
        transition: "all 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Avatar collab={collab} size={44} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: COLORS.noir }}>{collab.nom}</div>
            <div style={{ fontSize: 12, color: COLORS.grisMoyen }}>{collab.pole}</div>
          </div>
        </div>
        <ChargeRing pct={taux} size={52} strokeWidth={5} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
        <div style={{ background: COLORS.gris, borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.noir }}>{collab.taches.length}</div>
          <div style={{ fontSize: 9, color: COLORS.grisMoyen, textTransform: "uppercase", letterSpacing: 0.3 }}>Tâches</div>
        </div>
        <div style={{ background: COLORS.gris, borderRadius: 8, padding: "8px 10px", textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.vert }}>{tachesEnCours}</div>
          <div style={{ fontSize: 9, color: COLORS.grisMoyen, textTransform: "uppercase", letterSpacing: 0.3 }}>En cours</div>
        </div>
        <div style={{
          background: tachesAlerte > 0 ? COLORS.rougeBg : COLORS.gris,
          borderRadius: 8, padding: "8px 10px", textAlign: "center",
        }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: tachesAlerte > 0 ? COLORS.rouge : COLORS.grisMoyen }}>{tachesAlerte}</div>
          <div style={{ fontSize: 9, color: COLORS.grisMoyen, textTransform: "uppercase", letterSpacing: 0.3 }}>Alertes</div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: COLORS.grisMoyen }}>Cette semaine</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.noir }}>
          {collab.heuresSemaine.total}h
          <span style={{ color: COLORS.grisMoyen, fontWeight: 400 }}> / {collab.base}h</span>
        </span>
      </div>
      <DayMiniChart data={collab.heuresSemaine} base={collab.base} />

      <div style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: COLORS.grisMoyen, marginBottom: 4 }}>
          <span>Temps total projets</span>
          <span>{totalConsomme}h / {totalAlloue}h</span>
        </div>
        <MiniBar
          value={totalConsomme}
          max={totalAlloue}
          color={getRentaInfo(totalAlloue > 0 ? (totalConsomme / totalAlloue) * 100 : 0).color}
        />
      </div>
    </div>
  );
}

function CollabDetail({ collab, onClose }: { collab: EquipeCollab; onClose: () => void }) {
  const taux = Math.round((collab.heuresSemaine.total / collab.base) * 100);
  const dispo = Math.max(collab.base - collab.heuresSemaine.total, 0);

  return (
    <div className="animate-fadeIn">
      <button
        onClick={onClose}
        style={{
          background: "none", border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", gap: 6,
          color: COLORS.dore, fontWeight: 600, fontSize: 14, padding: "0 0 16px",
        }}
      >← Retour à l&apos;équipe</button>

      <div style={{ background: COLORS.blanc, borderRadius: 16, border: `1px solid ${COLORS.grisBorder}`, overflow: "hidden", marginBottom: 20 }}>
        <div style={{
          padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center",
          borderBottom: `1px solid ${COLORS.grisBorder}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Avatar collab={collab} size={48} />
            <div>
              <div style={{
                fontWeight: 700, fontSize: 20, color: COLORS.noir,
                fontFamily: "var(--font-dm-serif-display), Georgia, serif",
              }}>{collab.nom}</div>
              <div style={{ fontSize: 13, color: COLORS.grisMoyen }}>{collab.pole} · {collab.email}</div>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0 }}>
          {[
            { label: "Heures semaine",  value: `${collab.heuresSemaine.total}h`, sub: `/ ${collab.base}h`, color: COLORS.noir },
            { label: "Taux occupation", value: `${taux}%`, sub: taux > 95 ? "Surchargé" : taux > 80 ? "Chargé" : "Disponible", color: taux > 95 ? COLORS.rouge : taux > 80 ? COLORS.orange : COLORS.vert },
            { label: "Disponibilité",   value: `${dispo}h`, sub: "restantes", color: dispo > 0 ? COLORS.vert : COLORS.rouge },
            { label: "Tâches actives",  value: collab.taches.length, sub: `${collab.taches.filter((t) => t.statut === "En cours").length} en cours`, color: COLORS.noir },
          ].map((kpi, i) => (
            <div key={i} style={{
              padding: "18px 20px",
              borderRight: i < 3 ? `1px solid ${COLORS.grisBorder}` : "none",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 10, color: COLORS.grisMoyen, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{kpi.label}</div>
              <div style={{
                fontSize: 26, fontWeight: 700, color: kpi.color,
                fontFamily: "var(--font-dm-serif-display), Georgia, serif", lineHeight: 1.1,
              }}>{kpi.value}</div>
              <div style={{ fontSize: 11, color: COLORS.grisMoyen, marginTop: 2 }}>{kpi.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: COLORS.blanc, borderRadius: 16, border: `1px solid ${COLORS.grisBorder}`, overflow: "hidden" }}>
        <div style={{
          padding: "16px 24px", borderBottom: `1px solid ${COLORS.grisBorder}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <h3 style={{
            fontFamily: "var(--font-dm-serif-display), Georgia, serif",
            fontSize: 17, color: COLORS.noir, margin: 0, fontWeight: 400,
          }}>Tâches assignées</h3>
          <span style={{ fontSize: 12, color: COLORS.grisMoyen }}>
            {collab.taches.length} tâche{collab.taches.length > 1 ? "s" : ""}
          </span>
        </div>

        {collab.taches.map((tache, i) => {
          const ratio = tache.tempsAlloue > 0 ? (tache.tempsConsomme / tache.tempsAlloue) * 100 : 0;
          const info = getRentaInfo(ratio);
          const remaining = Math.max(tache.tempsAlloue - tache.tempsConsomme, 0);
          const sStyle = statutStyles[tache.statut] || { bg: COLORS.gris, color: COLORS.grisMoyen };
          const prio = prioStyles[tache.priorite];

          return (
            <div key={tache.id} style={{
              padding: "16px 24px",
              borderBottom: i < collab.taches.length - 1 ? `1px solid ${COLORS.grisBorder}` : "none",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 10, color: prio.color }}>{prio.icon}</span>
                    <span style={{ fontWeight: 600, fontSize: 14, color: COLORS.noir }}>{tache.nom}</span>
                    {tache.abonnement && (
                      <span style={{
                        fontSize: 9, padding: "2px 6px", borderRadius: 4,
                        background: COLORS.dorePale, color: COLORS.dore, fontWeight: 700,
                      }}>ABO</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: COLORS.grisMoyen }}>
                    {tache.projet} · Échéance: {tache.echeance}
                  </div>
                </div>
                <span style={{
                  padding: "4px 12px", borderRadius: 16,
                  background: sStyle.bg, color: sStyle.color,
                  fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
                }}>{tache.statut}</span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: COLORS.grisMoyen, marginBottom: 4 }}>
                    <span>Temps : <strong style={{ color: COLORS.noir }}>{tache.tempsConsomme}h</strong> / {tache.tempsAlloue}h vendues</span>
                    <span style={{ fontWeight: 600, color: remaining > 0 ? COLORS.vert : COLORS.rouge }}>
                      {remaining.toFixed(1)}h restantes
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <MiniBar value={tache.tempsConsomme} max={tache.tempsAlloue} color={info.color} height={6} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: info.color, minWidth: 32, textAlign: "right" }}>
                      {Math.round(ratio)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* RUBRIQUE OPPORTUNITÉS */}
      <OpportunitesSection collabId={collab.id} />
    </div>
  );
}

export default function EquipePage() {
  const [selectedCollab, setSelectedCollab] = useState<EquipeCollab | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "list">("cards");

  const totalHeures = COLLAB_DATA.reduce((s, c) => s + c.heuresSemaine.total, 0);
  const totalBase = COLLAB_DATA.reduce((s, c) => s + c.base, 0);
  const totalTaches = COLLAB_DATA.reduce((s, c) => s + c.taches.length, 0);
  const totalAlertes = COLLAB_DATA.reduce(
    (s, c) => s + c.taches.filter((t) => t.tempsAlloue > 0 && (t.tempsConsomme / t.tempsAlloue) >= 0.75).length, 0
  );

  if (selectedCollab) {
    return <CollabDetail collab={selectedCollab} onClose={() => setSelectedCollab(null)} />;
  }

  return (
    <div className="animate-fadeIn">
      {/* HEADER */}
      <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{
            fontFamily: "var(--font-dm-serif-display), Georgia, serif",
            fontSize: 30, color: COLORS.noir, margin: "0 0 4px", fontWeight: 400,
          }}>Équipe</h1>
          <p style={{ color: COLORS.grisMoyen, fontSize: 14, margin: 0 }}>
            Semaine du 10 au 16 mars 2026 · {COLLAB_DATA.length} collaborateurs
          </p>
        </div>
        <div style={{ display: "flex", background: "#1A1A1A", borderRadius: 8, padding: 3 }}>
          <button
            onClick={() => setViewMode("cards")}
            style={{
              padding: "5px 14px", borderRadius: 6, border: "none",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              background: viewMode === "cards" ? COLORS.dore : "transparent",
              color: viewMode === "cards" ? COLORS.noir : "#888",
            }}
          >Cartes</button>
          <button
            onClick={() => setViewMode("list")}
            style={{
              padding: "5px 14px", borderRadius: 6, border: "none",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              background: viewMode === "list" ? COLORS.dore : "transparent",
              color: viewMode === "list" ? COLORS.noir : "#888",
            }}
          >Liste</button>
        </div>
      </div>

      {/* KPI BAR */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Heures totales",  value: `${totalHeures}h`, sub: `sur ${totalBase}h`, accent: true },
          { label: "Taux moyen",      value: `${Math.round((totalHeures / totalBase) * 100)}%`, sub: "d'occupation" },
          { label: "Tâches actives",  value: totalTaches, sub: "en cours" },
          { label: "Alertes temps",   value: totalAlertes, sub: totalAlertes > 0 ? "à surveiller" : "tout OK" },
        ].map((kpi, i) => (
          <div key={i} style={{
            background: kpi.accent ? COLORS.noir : COLORS.blanc,
            borderRadius: 14, padding: "18px 20px",
            border: kpi.accent ? "none" : `1px solid ${COLORS.grisBorder}`,
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div>
              <div style={{
                fontSize: 10, color: kpi.accent ? "#888" : COLORS.grisMoyen,
                textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4,
              }}>{kpi.label}</div>
              <div style={{
                fontSize: 26, fontWeight: 700,
                color: kpi.accent ? COLORS.dore : COLORS.noir,
                fontFamily: "var(--font-dm-serif-display), Georgia, serif",
              }}>{kpi.value}</div>
              <div style={{ fontSize: 11, color: kpi.accent ? "#666" : COLORS.grisMoyen }}>{kpi.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {viewMode === "cards" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {COLLAB_DATA.map((c) => (
            <CollabCard key={c.id} collab={c} onClick={() => setSelectedCollab(c)} />
          ))}
        </div>
      ) : (
        <div style={{ background: COLORS.blanc, borderRadius: 16, border: `1px solid ${COLORS.grisBorder}`, overflow: "hidden" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "2fr 0.8fr 0.8fr 0.8fr 1fr 1.2fr",
            padding: "12px 20px", background: COLORS.gris,
            borderBottom: `1px solid ${COLORS.grisBorder}`,
            fontSize: 10, fontWeight: 700, color: COLORS.grisMoyen,
            textTransform: "uppercase", letterSpacing: 0.5,
          }}>
            <div>Collaborateur</div>
            <div style={{ textAlign: "center" }}>Heures</div>
            <div style={{ textAlign: "center" }}>Occupation</div>
            <div style={{ textAlign: "center" }}>Tâches</div>
            <div style={{ textAlign: "center" }}>Alertes</div>
            <div>Semaine</div>
          </div>
          {COLLAB_DATA.map((c) => {
            const taux = Math.round((c.heuresSemaine.total / c.base) * 100);
            const alertes = c.taches.filter((t) => t.tempsAlloue > 0 && (t.tempsConsomme / t.tempsAlloue) >= 0.75).length;
            return (
              <div
                key={c.id}
                onClick={() => setSelectedCollab(c)}
                style={{
                  display: "grid", gridTemplateColumns: "2fr 0.8fr 0.8fr 0.8fr 1fr 1.2fr",
                  alignItems: "center", padding: "14px 20px",
                  borderBottom: `1px solid ${COLORS.grisBorder}`, cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Avatar collab={c} size={36} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.noir }}>{c.nom}</div>
                    <div style={{ fontSize: 11, color: COLORS.grisMoyen }}>{c.pole}</div>
                  </div>
                </div>
                <div style={{ textAlign: "center", fontWeight: 600, fontSize: 14, color: COLORS.noir }}>
                  {c.heuresSemaine.total}h
                  <span style={{ color: COLORS.grisMoyen, fontWeight: 400, fontSize: 12 }}> / {c.base}h</span>
                </div>
                <div style={{ textAlign: "center" }}>
                  <span style={{
                    padding: "4px 10px", borderRadius: 12,
                    fontSize: 12, fontWeight: 700,
                    background: taux > 95 ? COLORS.rougeBg : taux > 80 ? COLORS.orangeBg : COLORS.vertBg,
                    color: taux > 95 ? COLORS.rouge : taux > 80 ? COLORS.orange : COLORS.vert,
                  }}>{taux}%</span>
                </div>
                <div style={{ textAlign: "center", fontWeight: 600, fontSize: 14, color: COLORS.noir }}>
                  {c.taches.length}
                </div>
                <div style={{ textAlign: "center" }}>
                  {alertes > 0 ? (
                    <span style={{
                      padding: "4px 10px", borderRadius: 12, fontSize: 12, fontWeight: 700,
                      background: COLORS.rougeBg, color: COLORS.rouge,
                    }}>⚠ {alertes}</span>
                  ) : (
                    <span style={{ fontSize: 12, color: COLORS.grisMoyen }}>—</span>
                  )}
                </div>
                <DayMiniChart data={c.heuresSemaine} base={c.base} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
