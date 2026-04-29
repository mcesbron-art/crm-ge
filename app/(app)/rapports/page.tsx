"use client";

import { useState } from "react";
import Avatar from "@/components/ui/Avatar";
import { COLORS, getRentabiliteColor, type Collaborateur } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth-context";
import AccessDenied from "@/components/AccessDenied";
import OpportunitesRapport from "@/components/OpportunitesRapport";

type CollabHebdo = Collaborateur & {
  base: number;
  heuresSemaine: number[];
  projets: { nom: string; heures: number; alloue: number; montant: number; cout: number }[];
};

const COLLABORATEURS_HEBDO: CollabHebdo[] = [
  { id: 1, nom: "Noémie",    pole: "Graphisme / Photo / Vidéo",   avatar: "N",  color: "#8E24AA", base: 35,
    heuresSemaine: [7.5, 8, 6.5, 7, 8, 0, 0],
    projets: [
      { nom: "Maison Relais Gourmet", heures: 12, alloue: 24.1, montant: 3800, cout: 1800 },
      { nom: "Netzy", heures: 5, alloue: 19.3, montant: 2500, cout: 900 },
      { nom: "Vins d'Anjou-Saumur", heures: 6, alloue: 14.5, montant: 1600, cout: 400 },
      { nom: "BÉRYL Patrimoine", heures: 14, alloue: 30.1, montant: 4500, cout: 1000 },
    ]},
  { id: 2, nom: "Amandine",  pole: "Web / SEO / Contenu",         avatar: "A",  color: "#1E88E5", base: 35,
    heuresSemaine: [6, 7, 7.5, 6, 5, 0, 0],
    projets: [
      { nom: "Maison Relais Gourmet", heures: 8, alloue: 24.1, montant: 2000, cout: 0 },
      { nom: "Netzy", heures: 10, alloue: 10.8, montant: 900, cout: 0 },
      { nom: "Groupe Écho (interne)", heures: 13.5, alloue: 20, montant: 0, cout: 0 },
    ]},
  { id: 3, nom: "Jérémy",    pole: "Social Media / Vidéo",        avatar: "J",  color: "#43A047", base: 35,
    heuresSemaine: [8, 7, 8, 7.5, 6, 0, 0],
    projets: [
      { nom: "Vins d'Anjou-Saumur", heures: 18, alloue: 14.5, montant: 1600, cout: 400 },
      { nom: "BÉRYL Patrimoine", heures: 8.5, alloue: 18.1, montant: 2500, cout: 500 },
      { nom: "Roul'Anjou", heures: 10, alloue: 21.7, montant: 2400, cout: 600 },
    ]},
  { id: 4, nom: "Marcellin", pole: "SEO / SEA / Sites standards", avatar: "M",  color: "#FB8C00", base: 35,
    heuresSemaine: [7, 7, 6, 7, 5, 0, 0],
    projets: [
      { nom: "Netzy", heures: 8, alloue: 21.7, montant: 2800, cout: 1000 },
      { nom: "Groupe Écho (interne)", heures: 14, alloue: 20, montant: 0, cout: 0 },
      { nom: "Maison Relais Gourmet", heures: 10, alloue: 20.5, montant: 2700, cout: 1000 },
    ]},
  { id: 5, nom: "Arthur",    pole: "Sites complexes / Ads",       avatar: "Ar", color: "#E53935", base: 39,
    heuresSemaine: [8, 8, 7.5, 8, 7, 0, 0],
    projets: [
      { nom: "Maison Relais Gourmet", heures: 16, alloue: 20.5, montant: 2700, cout: 1000 },
      { nom: "Netzy", heures: 15, alloue: 21.7, montant: 2800, cout: 1000 },
      { nom: "BÉRYL Patrimoine", heures: 7.5, alloue: 18.1, montant: 2500, cout: 500 },
    ]},
  { id: 6, nom: "Fanny",     pole: "Planning / Production",       avatar: "F",  color: "#00897B", base: 35,
    heuresSemaine: [6, 5, 6, 5, 4, 0, 0],
    projets: [
      { nom: "Groupe Écho (interne)", heures: 20, alloue: 30, montant: 0, cout: 0 },
      { nom: "Maison Relais Gourmet", heures: 4, alloue: 10, montant: 0, cout: 0 },
      { nom: "Netzy", heures: 2, alloue: 5, montant: 0, cout: 0 },
    ]},
];

const PROJETS_DATA = [
  { nom: "Maison Relais Gourmet", client: "MRG",        montantHT: 8500,  coutRevient: 2800, tempsAlloue: 68.7, tempsConsomme: 50, statut: "En production" },
  { nom: "Netzy",                 client: "Netzy",      montantHT: 6200,  coutRevient: 1900, tempsAlloue: 51.8, tempsConsomme: 40, statut: "BAT en cours" },
  { nom: "Vins d'Anjou-Saumur",   client: "InterLoire", montantHT: 3200,  coutRevient: 800,  tempsAlloue: 29.0, tempsConsomme: 24, statut: "En production" },
  { nom: "BÉRYL Patrimoine",      client: "BÉRYL",      montantHT: 12000, coutRevient: 3500, tempsAlloue: 84.3, tempsConsomme: 52, statut: "En production" },
  { nom: "Roul'Anjou",            client: "B. Aulié",   montantHT: 4800,  coutRevient: 1200, tempsAlloue: 43.4, tempsConsomme: 10, statut: "À affecter" },
];

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function BarChart({ value, max, color, height = 8 }: { value: number; max: number; color: string; height?: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ flex: 1, height, borderRadius: height, background: "#EEEEE9", overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", borderRadius: height, background: color, transition: "width 0.6s cubic-bezier(.4,0,.2,1)" }} />
    </div>
  );
}

function DayBars({ heures, base }: { heures: number[]; base: number }) {
  const maxH = 10;
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 48 }}>
      {heures.map((h, i) => {
        const pct = Math.min((h / maxH) * 100, 100);
        const isWeekend = i >= 5;
        const overBase = h > base / 5;
        return (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, flex: 1 }}>
            <div style={{ width: "100%", height: 48, display: "flex", alignItems: "flex-end" }}>
              <div style={{
                width: "100%", borderRadius: 3,
                height: `${pct}%`, minHeight: h > 0 ? 4 : 0,
                background: isWeekend ? "#E0E0E0" : overBase ? COLORS.orange : COLORS.vert,
                transition: "height 0.4s ease",
              }} />
            </div>
            <span style={{ fontSize: 9, color: COLORS.grisMoyen, fontWeight: 500 }}>{JOURS[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function RapportsPage() {
  const { currentUser, canSeeMoney } = useAuth();
  const [activeTab, setActiveTab] = useState<"collaborateurs" | "projets" | "rentaCollab">("collaborateurs");
  const [selectedCollab, setSelectedCollab] = useState<CollabHebdo | null>(null);

  if (!canSeeMoney) {
    return (
      <AccessDenied
        message="Les rapports financiers sont réservés à la Direction et aux Admins."
        user={{ nom: currentUser.nom, role: currentUser.role }}
      />
    );
  }

  const totalHeures = COLLABORATEURS_HEBDO.reduce((s, c) => s + c.heuresSemaine.reduce((a, b) => a + b, 0), 0);
  const totalBase = COLLABORATEURS_HEBDO.reduce((s, c) => s + c.base, 0);
  const tauxOccupation = Math.round((totalHeures / totalBase) * 100);
  const totalCA = PROJETS_DATA.reduce((s, p) => s + p.montantHT, 0);
  const totalMarge = PROJETS_DATA.reduce((s, p) => s + (p.montantHT - p.coutRevient), 0);
  const totalCoutReel = PROJETS_DATA.reduce((s, p) => s + p.tempsConsomme * 83, 0);
  const margeReelle = totalCA - totalCoutReel;

  const tabs = [
    { id: "collaborateurs", label: "Temps par collaborateur" },
    { id: "projets",        label: "Rentabilité par projet" },
    { id: "rentaCollab",    label: "Rentabilité par collaborateur" },
  ] as const;

  return (
    <div className="animate-fadeIn">
      {/* HEADER */}
      <div style={{ marginBottom: 28, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{
            fontFamily: "var(--font-dm-serif-display), Georgia, serif",
            fontSize: 30, color: COLORS.noir, margin: "0 0 4px", fontWeight: 400,
          }}>Rapport de la semaine</h1>
          <p style={{ color: COLORS.grisMoyen, fontSize: 14, margin: 0 }}>
            Semaine du 10 au 16 mars 2026 · Généré automatiquement le lundi 17 mars
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{
            padding: "8px 18px", background: COLORS.dore, border: "none", borderRadius: 8,
            fontSize: 12, fontWeight: 600, color: COLORS.noir, cursor: "pointer",
          }}>Envoyer par email</button>
          <button style={{
            padding: "8px 18px", background: COLORS.blanc, border: `1px solid ${COLORS.grisBorder}`,
            borderRadius: 8, fontSize: 12, fontWeight: 600, color: COLORS.noir, cursor: "pointer",
          }}>Exporter PDF</button>
        </div>
      </div>

      {/* KPI GLOBAUX */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 28 }}>
        {[
          { label: "Heures totales",   value: `${totalHeures}h`, sub: `sur ${totalBase}h disponibles`, dark: false },
          { label: "Taux occupation",  value: `${tauxOccupation}%`, sub: tauxOccupation > 85 ? "Charge élevée" : "Capacité disponible", color: tauxOccupation > 85 ? COLORS.orange : COLORS.vert, dark: false },
          { label: "CA en production", value: `${(totalCA / 1000).toFixed(1)}k€`, sub: `${PROJETS_DATA.length} projets actifs`, dark: false },
          { label: "Marge théorique",  value: `${(totalMarge / 1000).toFixed(1)}k€`, sub: `${Math.round((totalMarge / totalCA) * 100)}% du CA`, color: COLORS.dore, dark: false },
          { label: "Marge réelle",     value: `${(margeReelle / 1000).toFixed(1)}k€`, sub: margeReelle > 0 ? "Agence rentable" : "Attention", color: margeReelle > 0 ? COLORS.vert : COLORS.rouge, dark: true },
        ].map((kpi, i) => (
          <div key={i} style={{
            background: kpi.dark ? COLORS.noir : COLORS.blanc,
            borderRadius: 16, padding: "22px 20px",
            border: kpi.dark ? "none" : `1px solid ${COLORS.grisBorder}`, textAlign: "center",
          }}>
            <div style={{
              fontSize: 11, color: kpi.dark ? "#888" : COLORS.grisMoyen,
              textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6,
            }}>{kpi.label}</div>
            <div style={{
              fontSize: 28, fontWeight: 700,
              color: kpi.color || (kpi.dark ? COLORS.blanc : COLORS.noir),
              fontFamily: "var(--font-dm-serif-display), Georgia, serif", lineHeight: 1.1,
            }}>{kpi.value}</div>
            <div style={{ fontSize: 11, color: kpi.dark ? "#666" : COLORS.grisMoyen, marginTop: 4 }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* TABS */}
      <div style={{
        display: "flex", gap: 4, marginBottom: 24,
        background: COLORS.blanc, borderRadius: 12, padding: 4,
        border: `1px solid ${COLORS.grisBorder}`,
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSelectedCollab(null); }}
            style={{
              flex: 1, padding: "12px 16px", borderRadius: 10, border: "none", cursor: "pointer",
              background: activeTab === tab.id ? COLORS.noir : "transparent",
              color: activeTab === tab.id ? COLORS.dore : COLORS.grisMoyen,
              fontSize: 13, fontWeight: 600, transition: "all 0.2s",
            }}
          >{tab.label}</button>
        ))}
      </div>

      {/* TAB 1 : COLLABORATEURS */}
      {activeTab === "collaborateurs" && (
        <div className="animate-fadeIn" style={{
          display: "grid", gridTemplateColumns: selectedCollab ? "1fr 1fr" : "1fr", gap: 20,
        }}>
          <div style={{ background: COLORS.blanc, borderRadius: 16, border: `1px solid ${COLORS.grisBorder}`, overflow: "hidden" }}>
            <div style={{
              padding: "16px 20px", borderBottom: `1px solid ${COLORS.grisBorder}`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <h3 style={{
                fontFamily: "var(--font-dm-serif-display), Georgia, serif",
                fontSize: 17, color: COLORS.noir, margin: 0, fontWeight: 400,
              }}>Heures enregistrées</h3>
              <span style={{ fontSize: 12, color: COLORS.grisMoyen }}>{totalHeures}h cette semaine</span>
            </div>
            {COLLABORATEURS_HEBDO.map((collab) => {
              const total = collab.heuresSemaine.reduce((a, b) => a + b, 0);
              const taux = Math.round((total / collab.base) * 100);
              const isSelected = selectedCollab?.id === collab.id;
              return (
                <div
                  key={collab.id}
                  onClick={() => setSelectedCollab(isSelected ? null : collab)}
                  style={{
                    display: "grid", gridTemplateColumns: "auto 1fr auto 140px",
                    alignItems: "center", gap: 14,
                    padding: "14px 20px", borderBottom: `1px solid ${COLORS.grisBorder}`,
                    cursor: "pointer",
                    background: isSelected ? COLORS.dorePale : "transparent",
                    transition: "background 0.15s",
                  }}
                >
                  <Avatar collab={collab} size={36} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.noir }}>{collab.nom}</div>
                    <div style={{ fontSize: 11, color: COLORS.grisMoyen }}>{collab.pole}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.noir }}>{total}h</div>
                    <div style={{
                      fontSize: 11, fontWeight: 600,
                      color: taux > 95 ? COLORS.rouge : taux > 80 ? COLORS.orange : COLORS.vert,
                    }}>{taux}% occupation</div>
                  </div>
                  <DayBars heures={collab.heuresSemaine} base={collab.base} />
                </div>
              );
            })}
          </div>

          {selectedCollab && (
            <div className="animate-slideIn">
              <div style={{ background: COLORS.blanc, borderRadius: 16, border: `1px solid ${COLORS.grisBorder}`, overflow: "hidden" }}>
                <div style={{
                  padding: "20px", borderBottom: `1px solid ${COLORS.grisBorder}`,
                  display: "flex", alignItems: "center", gap: 14,
                }}>
                  <Avatar collab={selectedCollab} size={44} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 18, color: COLORS.noir }}>{selectedCollab.nom}</div>
                    <div style={{ fontSize: 13, color: COLORS.grisMoyen }}>{selectedCollab.pole}</div>
                  </div>
                </div>
                <div style={{ padding: 20 }}>
                  <div style={{
                    fontSize: 12, fontWeight: 600, color: COLORS.grisMoyen,
                    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12,
                  }}>Répartition par projet</div>
                  {selectedCollab.projets.map((p, i) => {
                    const totalH = selectedCollab.heuresSemaine.reduce((a, b) => a + b, 0);
                    const pctProjet = totalH > 0 ? Math.round((p.heures / totalH) * 100) : 0;
                    const tempsRatio = p.alloue > 0 ? Math.round((p.heures / p.alloue) * 100) : 0;
                    const info = getRentabiliteColor(tempsRatio);
                    return (
                      <div key={i} style={{
                        padding: "12px 0",
                        borderBottom: i < selectedCollab.projets.length - 1 ? `1px solid ${COLORS.grisBorder}` : "none",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <span style={{ fontWeight: 600, fontSize: 13, color: COLORS.noir }}>{p.nom}</span>
                          <span style={{ fontSize: 13 }}>
                            <strong>{p.heures}h</strong>
                            <span style={{ color: COLORS.grisMoyen }}> ({pctProjet}%)</span>
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <BarChart value={p.heures} max={p.alloue} color={info.color} height={6} />
                          <span style={{
                            fontSize: 11, color: info.color, fontWeight: 600,
                            minWidth: 70, textAlign: "right",
                          }}>{p.heures}h / {p.alloue}h</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2 : RENTABILITÉ PAR PROJET */}
      {activeTab === "projets" && (
        <div className="animate-fadeIn" style={{ background: COLORS.blanc, borderRadius: 16, border: `1px solid ${COLORS.grisBorder}`, overflow: "hidden" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr",
            padding: "12px 20px", background: COLORS.gris,
            borderBottom: `1px solid ${COLORS.grisBorder}`,
            fontSize: 10, fontWeight: 700, color: COLORS.grisMoyen,
            textTransform: "uppercase", letterSpacing: 0.5,
          }}>
            <div>Projet</div>
            <div style={{ textAlign: "right" }}>Montant HT</div>
            <div style={{ textAlign: "right" }}>Marge théorique</div>
            <div style={{ textAlign: "center" }}>Temps</div>
            <div style={{ textAlign: "right" }}>Coût réel</div>
            <div style={{ textAlign: "right" }}>Marge réelle</div>
          </div>
          {PROJETS_DATA.map((p, i) => {
            const marge = p.montantHT - p.coutRevient;
            const coutReel = p.tempsConsomme * 83;
            const margeR = p.montantHT - coutReel;
            const tempsRatio = p.tempsAlloue > 0 ? (p.tempsConsomme / p.tempsAlloue) * 100 : 0;
            const info = getRentabiliteColor(tempsRatio);
            const rentaPct = p.montantHT > 0 ? Math.round((margeR / p.montantHT) * 100) : 0;
            return (
              <div key={i} style={{
                display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr",
                alignItems: "center", padding: "16px 20px",
                borderBottom: `1px solid ${COLORS.grisBorder}`,
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.noir }}>{p.nom}</div>
                  <div style={{ fontSize: 11, color: COLORS.grisMoyen }}>{p.client}</div>
                </div>
                <div style={{ textAlign: "right", fontWeight: 600, fontSize: 14, color: COLORS.noir }}>
                  {p.montantHT.toLocaleString("fr-FR")}€
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.dore }}>{marge.toLocaleString("fr-FR")}€</div>
                  <div style={{ fontSize: 11, color: COLORS.grisMoyen }}>{Math.round((marge / p.montantHT) * 100)}%</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 13 }}>
                    <strong>{p.tempsConsomme}h</strong>
                    <span style={{ color: COLORS.grisMoyen }}> / {p.tempsAlloue}h</span>
                  </div>
                  <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                    <BarChart value={p.tempsConsomme} max={p.tempsAlloue} color={info.color} height={5} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: info.color }}>{Math.round(tempsRatio)}%</span>
                  </div>
                </div>
                <div style={{ textAlign: "right", fontSize: 14, color: COLORS.grisMoyen }}>
                  {coutReel.toLocaleString("fr-FR")}€
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: margeR >= 0 ? COLORS.vert : COLORS.rouge }}>
                    {margeR >= 0 ? "+" : ""}{margeR.toLocaleString("fr-FR")}€
                  </div>
                  <div style={{ fontSize: 11, color: margeR >= 0 ? COLORS.vert : COLORS.rouge }}>
                    {rentaPct}% rentabilité
                  </div>
                </div>
              </div>
            );
          })}
          <div style={{
            display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr",
            alignItems: "center", padding: "16px 20px", background: COLORS.noir,
          }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.dore }}>TOTAL</div>
            <div style={{ textAlign: "right", fontWeight: 700, fontSize: 14, color: COLORS.blanc }}>
              {totalCA.toLocaleString("fr-FR")}€
            </div>
            <div style={{ textAlign: "right", fontWeight: 700, fontSize: 14, color: COLORS.dore }}>
              {totalMarge.toLocaleString("fr-FR")}€
            </div>
            <div style={{ textAlign: "center", fontWeight: 600, fontSize: 13, color: COLORS.blanc }}>
              {PROJETS_DATA.reduce((s, p) => s + p.tempsConsomme, 0)}h
            </div>
            <div style={{ textAlign: "right", fontWeight: 600, fontSize: 14, color: "#CCC" }}>
              {totalCoutReel.toLocaleString("fr-FR")}€
            </div>
            <div style={{ textAlign: "right", fontWeight: 700, fontSize: 14, color: margeReelle >= 0 ? COLORS.vert : COLORS.rouge }}>
              {margeReelle >= 0 ? "+" : ""}{margeReelle.toLocaleString("fr-FR")}€
            </div>
          </div>
        </div>
      )}

      {/* TAB 3 : RENTA COLLAB */}
      {activeTab === "rentaCollab" && (
        <div className="animate-fadeIn">
          <div style={{ background: COLORS.blanc, borderRadius: 16, border: `1px solid ${COLORS.grisBorder}`, overflow: "hidden" }}>
            <div style={{
              display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1.2fr",
              padding: "12px 20px", background: COLORS.gris,
              borderBottom: `1px solid ${COLORS.grisBorder}`,
              fontSize: 10, fontWeight: 700, color: COLORS.grisMoyen,
              textTransform: "uppercase", letterSpacing: 0.5,
            }}>
              <div>Collaborateur</div>
              <div style={{ textAlign: "right" }}>CA généré</div>
              <div style={{ textAlign: "right" }}>Heures</div>
              <div style={{ textAlign: "right" }}>Coût réel (×83€)</div>
              <div style={{ textAlign: "right" }}>Marge nette</div>
              <div style={{ textAlign: "center" }}>Ratio</div>
            </div>
            {COLLABORATEURS_HEBDO.map((collab) => {
              const totalH = collab.heuresSemaine.reduce((a, b) => a + b, 0);
              const caGenere = collab.projets.reduce((s, p) => s + p.montant, 0);
              const coutReel = Math.round(totalH * 83);
              const margeNette = caGenere - coutReel;
              const ratioPct = caGenere > 0 ? Math.round((margeNette / caGenere) * 100) : -100;
              const isRentable = margeNette >= 0;
              return (
                <div key={collab.id} style={{
                  display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1.2fr",
                  alignItems: "center", padding: "16px 20px",
                  borderBottom: `1px solid ${COLORS.grisBorder}`,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Avatar collab={collab} size={36} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.noir }}>{collab.nom}</div>
                      <div style={{ fontSize: 11, color: COLORS.grisMoyen }}>{collab.pole}</div>
                    </div>
                  </div>
                  <div style={{
                    textAlign: "right", fontWeight: 600, fontSize: 14,
                    color: caGenere > 0 ? COLORS.noir : COLORS.grisMoyen,
                  }}>{caGenere > 0 ? `${caGenere.toLocaleString("fr-FR")}€` : "—"}</div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.noir }}>{totalH}h</div>
                    <div style={{ fontSize: 11, color: COLORS.grisMoyen }}>/ {collab.base}h</div>
                  </div>
                  <div style={{ textAlign: "right", fontSize: 14, color: COLORS.grisMoyen }}>
                    {coutReel.toLocaleString("fr-FR")}€
                  </div>
                  <div style={{ textAlign: "right", fontWeight: 700, fontSize: 14, color: isRentable ? COLORS.vert : COLORS.rouge }}>
                    {isRentable ? "+" : ""}{margeNette.toLocaleString("fr-FR")}€
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <div style={{ flex: 1, maxWidth: 120 }}>
                      <div style={{ height: 8, borderRadius: 4, background: "#EEEEE9", overflow: "hidden" }}>
                        {caGenere > 0 && (
                          <div style={{
                            width: `${Math.min(Math.abs(ratioPct), 100)}%`, height: "100%",
                            borderRadius: 4, background: isRentable ? COLORS.vert : COLORS.rouge,
                            transition: "width 0.6s ease",
                          }} />
                        )}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 12, fontWeight: 700,
                      color: caGenere > 0 ? (isRentable ? COLORS.vert : COLORS.rouge) : COLORS.grisMoyen,
                      minWidth: 40, textAlign: "right",
                    }}>{caGenere > 0 ? `${ratioPct}%` : "N/A"}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{
            marginTop: 16, padding: "14px 20px",
            background: COLORS.dorePale, borderRadius: 12,
            border: `1px solid ${COLORS.dore}33`,
            display: "flex", gap: 24, fontSize: 12, color: COLORS.noir, flexWrap: "wrap",
          }}>
            <span><strong>Formule :</strong> Marge nette = CA généré − (Heures × 83€/h)</span>
            <span>·</span>
            <span><strong>Ratio :</strong> Marge nette ÷ CA généré × 100</span>
            <span>·</span>
            <span style={{ color: COLORS.grisMoyen }}>N/A = collaborateur non facturable (planning, admin)</span>
          </div>
        </div>
      )}

      {/* SECTION OPPORTUNITÉS COMMERCIALES — toujours visible */}
      <OpportunitesRapport />
    </div>
  );
}
