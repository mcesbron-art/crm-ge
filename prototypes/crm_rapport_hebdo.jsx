import { useState } from "react";

const COLORS = {
  noir: "#1A1A1A",
  noirDeep: "#111111",
  dore: "#C5A55A",
  doreLight: "#D4BA78",
  dorePale: "#F5EDD6",
  blanc: "#FFFFFF",
  gris: "#F7F7F5",
  grisMoyen: "#999999",
  grisBorder: "#E5E5E3",
  vert: "#4CAF50",
  vertBg: "#E8F5E9",
  orange: "#FF9800",
  orangeBg: "#FFF3E0",
  rouge: "#E53935",
  rougeBg: "#FFEBEE",
};

const COLLABORATEURS = [
  { id: 1, nom: "Noémie", pole: "Graphisme / Photo / Vidéo", avatar: "N", color: "#8E24AA",
    heuresSemaine: [7.5, 8, 6.5, 7, 8, 0, 0], base: 35,
    projets: [
      { nom: "Maison Relais Gourmet", heures: 12, alloue: 24.1, montant: 3800, cout: 1800 },
      { nom: "Netzy", heures: 5, alloue: 19.3, montant: 2500, cout: 900 },
      { nom: "Vins d'Anjou-Saumur", heures: 6, alloue: 14.5, montant: 1600, cout: 400 },
      { nom: "BÉRYL Patrimoine", heures: 14, alloue: 30.1, montant: 4500, cout: 1000 },
    ]},
  { id: 2, nom: "Amandine", pole: "Web / SEO / Contenu", avatar: "A", color: "#1E88E5",
    heuresSemaine: [6, 7, 7.5, 6, 5, 0, 0], base: 35,
    projets: [
      { nom: "Maison Relais Gourmet", heures: 8, alloue: 24.1, montant: 2000, cout: 0 },
      { nom: "Netzy", heures: 10, alloue: 10.8, montant: 900, cout: 0 },
      { nom: "Groupe Écho (interne)", heures: 13.5, alloue: 20, montant: 0, cout: 0 },
    ]},
  { id: 3, nom: "Jérémy", pole: "Social Media / Vidéo", avatar: "J", color: "#43A047",
    heuresSemaine: [8, 7, 8, 7.5, 6, 0, 0], base: 35,
    projets: [
      { nom: "Vins d'Anjou-Saumur", heures: 18, alloue: 14.5, montant: 1600, cout: 400 },
      { nom: "BÉRYL Patrimoine", heures: 8.5, alloue: 18.1, montant: 2500, cout: 500 },
      { nom: "Roul'Anjou", heures: 10, alloue: 21.7, montant: 2400, cout: 600 },
    ]},
  { id: 4, nom: "Marcellin", pole: "SEO / SEA / Sites standards", avatar: "M", color: "#FB8C00",
    heuresSemaine: [7, 7, 6, 7, 5, 0, 0], base: 35,
    projets: [
      { nom: "Netzy", heures: 8, alloue: 21.7, montant: 2800, cout: 1000 },
      { nom: "Groupe Écho (interne)", heures: 14, alloue: 20, montant: 0, cout: 0 },
      { nom: "Maison Relais Gourmet", heures: 10, alloue: 20.5, montant: 2700, cout: 1000 },
    ]},
  { id: 5, nom: "Arthur", pole: "Sites complexes / Ads", avatar: "Ar", color: "#E53935",
    heuresSemaine: [8, 8, 7.5, 8, 7, 0, 0], base: 39,
    projets: [
      { nom: "Maison Relais Gourmet", heures: 16, alloue: 20.5, montant: 2700, cout: 1000 },
      { nom: "Netzy", heures: 15, alloue: 21.7, montant: 2800, cout: 1000 },
      { nom: "BÉRYL Patrimoine", heures: 7.5, alloue: 18.1, montant: 2500, cout: 500 },
    ]},
  { id: 6, nom: "Fanny", pole: "Planning / Production", avatar: "F", color: "#00897B",
    heuresSemaine: [6, 5, 6, 5, 4, 0, 0], base: 35,
    projets: [
      { nom: "Groupe Écho (interne)", heures: 20, alloue: 30, montant: 0, cout: 0 },
      { nom: "Maison Relais Gourmet", heures: 4, alloue: 10, montant: 0, cout: 0 },
      { nom: "Netzy", heures: 2, alloue: 5, montant: 0, cout: 0 },
    ]},
];

const PROJETS_DATA = [
  { nom: "Maison Relais Gourmet", client: "MRG", montantHT: 8500, coutRevient: 2800, tempsAlloue: 68.7, tempsConsomme: 50, statut: "En production" },
  { nom: "Netzy", client: "Netzy", montantHT: 6200, coutRevient: 1900, tempsAlloue: 51.8, tempsConsomme: 40, statut: "BAT en cours" },
  { nom: "Vins d'Anjou-Saumur", client: "InterLoire", montantHT: 3200, coutRevient: 800, tempsAlloue: 29.0, tempsConsomme: 24, statut: "En production" },
  { nom: "BÉRYL Patrimoine", client: "BÉRYL", montantHT: 12000, coutRevient: 3500, tempsAlloue: 84.3, tempsConsomme: 52, statut: "En production" },
  { nom: "Roul'Anjou", client: "B. Aulié", montantHT: 4800, coutRevient: 1200, tempsAlloue: 43.4, tempsConsomme: 10, statut: "À affecter" },
];

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function getRentaInfo(pct) {
  if (pct < 75) return { color: COLORS.vert, bg: COLORS.vertBg, label: "Rentable" };
  if (pct <= 100) return { color: COLORS.orange, bg: COLORS.orangeBg, label: "Limite" };
  return { color: COLORS.rouge, bg: COLORS.rougeBg, label: "Déficitaire" };
}

function Avatar({ collab, size = 32 }) {
  return (
    <div title={collab.nom} style={{ width: size, height: size, borderRadius: "50%", background: collab.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, color: "#fff", fontWeight: 700, flexShrink: 0 }}>
      {collab.avatar}
    </div>
  );
}

function BarChart({ value, max, color, height = 8 }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ flex: 1, height, borderRadius: height, background: "#EEEEE9", overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", borderRadius: height, background: color, transition: "width 0.6s cubic-bezier(.4,0,.2,1)" }} />
    </div>
  );
}

function DayBars({ heures, base }) {
  const maxH = 10;
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 48 }}>
      {heures.map((h, i) => {
        const pct = Math.min((h / maxH) * 100, 100);
        const isWeekend = i >= 5;
        const overBase = h > (base / 5);
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

function KPIBig({ label, value, sub, color }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 11, color: COLORS.grisMoyen, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color: color || COLORS.noir, fontFamily: "'DM Serif Display', Georgia, serif", lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: COLORS.grisMoyen, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function RentabiliteGauge({ pct, size = 80 }) {
  const info = getRentaInfo(pct);
  const clampedPct = Math.min(pct, 150);
  const angle = (clampedPct / 150) * 180;
  return (
    <div style={{ position: "relative", width: size, height: size / 2 + 10, overflow: "hidden" }}>
      <svg width={size} height={size / 2 + 10} viewBox={`0 0 ${size} ${size / 2 + 10}`}>
        <path d={`M ${size * 0.1} ${size / 2} A ${size * 0.4} ${size * 0.4} 0 0 1 ${size * 0.9} ${size / 2}`}
          fill="none" stroke="#EEEEE9" strokeWidth={size * 0.1} strokeLinecap="round" />
        <path d={`M ${size * 0.1} ${size / 2} A ${size * 0.4} ${size * 0.4} 0 0 1 ${size * 0.9} ${size / 2}`}
          fill="none" stroke={info.color} strokeWidth={size * 0.1} strokeLinecap="round"
          strokeDasharray={`${(angle / 180) * Math.PI * size * 0.4} ${Math.PI * size * 0.4}`}
          style={{ transition: "stroke-dasharray 0.8s ease" }} />
      </svg>
      <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", textAlign: "center" }}>
        <div style={{ fontSize: size * 0.22, fontWeight: 700, color: info.color, lineHeight: 1 }}>{Math.round(pct)}%</div>
      </div>
    </div>
  );
}

export default function RapportHebdo() {
  const [activeTab, setActiveTab] = useState("collaborateurs");
  const [selectedCollab, setSelectedCollab] = useState(null);

  // Calculs globaux
  const totalHeures = COLLABORATEURS.reduce((s, c) => s + c.heuresSemaine.reduce((a, b) => a + b, 0), 0);
  const totalBase = COLLABORATEURS.reduce((s, c) => s + c.base, 0);
  const tauxOccupation = Math.round((totalHeures / totalBase) * 100);
  const totalCA = PROJETS_DATA.reduce((s, p) => s + p.montantHT, 0);
  const totalMarge = PROJETS_DATA.reduce((s, p) => s + (p.montantHT - p.coutRevient), 0);
  const totalCoutReel = PROJETS_DATA.reduce((s, p) => s + p.tempsConsomme * 83, 0);
  const margeReelle = totalCA - totalCoutReel;
  const ratioGlobal = totalCA > 0 ? Math.round((totalCoutReel / totalCA) * 100) : 0;

  const tabs = [
    { id: "collaborateurs", label: "Temps par collaborateur", icon: "👥" },
    { id: "projets", label: "Rentabilité par projet", icon: "📊" },
    { id: "rentaCollab", label: "Rentabilité par collaborateur", icon: "💰" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: COLORS.gris, fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: #D4D4D0; border-radius: 3px; }
      `}</style>

      {/* TOP BAR */}
      <div style={{ background: COLORS.noirDeep, padding: "14px 32px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <span style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 18, color: COLORS.dore }}>GROUPE ÉCHO</span>
          <span style={{ color: "#444", fontSize: 18 }}>|</span>
          <span style={{ color: "#AAA", fontSize: 14, fontWeight: 500 }}>Rapport hebdomadaire</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button style={{ padding: "8px 18px", background: COLORS.dore, border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, color: COLORS.noir, cursor: "pointer", fontFamily: "inherit" }}>📧 Envoyer par email</button>
          <button style={{ padding: "8px 18px", background: "#2A2A2A", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, color: "#AAA", cursor: "pointer", fontFamily: "inherit" }}>📄 Exporter PDF</button>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.dore}, ${COLORS.doreLight})`, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.noir, fontWeight: 700, fontSize: 13 }}>MC</div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 32px" }}>
        {/* HEADER */}
        <div style={{ marginBottom: 32, animation: "fadeIn 0.3s ease" }}>
          <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 30, color: COLORS.noir, margin: "0 0 4px", fontWeight: 400 }}>Rapport de la semaine</h1>
          <p style={{ color: COLORS.grisMoyen, fontSize: 14, margin: 0 }}>Semaine du 10 au 16 mars 2026 · Généré automatiquement le lundi 17 mars</p>
        </div>

        {/* KPI GLOBAUX */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 32, animation: "fadeIn 0.4s ease" }}>
          {[
            { label: "Heures totales", value: `${totalHeures}h`, sub: `sur ${totalBase}h disponibles`, bg: COLORS.blanc },
            { label: "Taux d'occupation", value: `${tauxOccupation}%`, sub: tauxOccupation > 85 ? "Charge élevée" : "Capacité disponible", bg: COLORS.blanc, color: tauxOccupation > 85 ? COLORS.orange : COLORS.vert },
            { label: "CA en production", value: `${(totalCA / 1000).toFixed(1)}k€`, sub: `${PROJETS_DATA.length} projets actifs`, bg: COLORS.blanc },
            { label: "Marge théorique", value: `${(totalMarge / 1000).toFixed(1)}k€`, sub: `${Math.round((totalMarge / totalCA) * 100)}% du CA`, bg: COLORS.blanc, color: COLORS.dore },
            { label: "Marge réelle", value: `${(margeReelle / 1000).toFixed(1)}k€`, sub: margeReelle > 0 ? "Agence rentable" : "Attention", bg: COLORS.noir, color: margeReelle > 0 ? COLORS.vert : COLORS.rouge, dark: true },
          ].map((kpi, i) => (
            <div key={i} style={{ background: kpi.bg || COLORS.blanc, borderRadius: 16, padding: "22px 20px", border: kpi.dark ? "none" : `1px solid ${COLORS.grisBorder}`, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: kpi.dark ? "#888" : COLORS.grisMoyen, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>{kpi.label}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: kpi.color || COLORS.noir, fontFamily: "'DM Serif Display', Georgia, serif", lineHeight: 1.1 }}>{kpi.value}</div>
              <div style={{ fontSize: 11, color: kpi.dark ? "#666" : COLORS.grisMoyen, marginTop: 4 }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* TABS */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, background: COLORS.blanc, borderRadius: 12, padding: 4, border: `1px solid ${COLORS.grisBorder}` }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSelectedCollab(null); }}
              style={{
                flex: 1, padding: "12px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit",
                background: activeTab === tab.id ? COLORS.noir : "transparent",
                color: activeTab === tab.id ? COLORS.dore : COLORS.grisMoyen,
                fontSize: 13, fontWeight: 600, transition: "all 0.2s",
              }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ============================================================
            TAB 1 : TEMPS PAR COLLABORATEUR
            ============================================================ */}
        {activeTab === "collaborateurs" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{ display: "grid", gridTemplateColumns: selectedCollab ? "1fr 1fr" : "1fr", gap: 20 }}>
              {/* Liste collaborateurs */}
              <div style={{ background: COLORS.blanc, borderRadius: 16, border: `1px solid ${COLORS.grisBorder}`, overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: `1px solid ${COLORS.grisBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 17, color: COLORS.noir, margin: 0, fontWeight: 400 }}>Heures enregistrées</h3>
                  <span style={{ fontSize: 12, color: COLORS.grisMoyen }}>{totalHeures}h cette semaine</span>
                </div>
                {COLLABORATEURS.map(collab => {
                  const total = collab.heuresSemaine.reduce((a, b) => a + b, 0);
                  const taux = Math.round((total / collab.base) * 100);
                  const isSelected = selectedCollab?.id === collab.id;
                  return (
                    <div key={collab.id} onClick={() => setSelectedCollab(isSelected ? null : collab)}
                      style={{
                        display: "grid", gridTemplateColumns: "auto 1fr auto 140px", alignItems: "center", gap: 14,
                        padding: "14px 20px", borderBottom: `1px solid ${COLORS.grisBorder}`, cursor: "pointer",
                        background: isSelected ? COLORS.dorePale : "transparent", transition: "background 0.15s",
                      }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = "#FAFAF8"; }}
                      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = "transparent"; }}>
                      <Avatar collab={collab} size={36} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.noir }}>{collab.nom}</div>
                        <div style={{ fontSize: 11, color: COLORS.grisMoyen }}>{collab.pole}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.noir }}>{total}h</div>
                        <div style={{ fontSize: 11, color: taux > 95 ? COLORS.rouge : taux > 80 ? COLORS.orange : COLORS.vert, fontWeight: 600 }}>{taux}% occupation</div>
                      </div>
                      <DayBars heures={collab.heuresSemaine} base={collab.base} />
                    </div>
                  );
                })}
              </div>

              {/* Détail collaborateur sélectionné */}
              {selectedCollab && (
                <div style={{ animation: "slideIn 0.3s ease" }}>
                  <div style={{ background: COLORS.blanc, borderRadius: 16, border: `1px solid ${COLORS.grisBorder}`, overflow: "hidden" }}>
                    <div style={{ padding: "20px", borderBottom: `1px solid ${COLORS.grisBorder}`, display: "flex", alignItems: "center", gap: 14 }}>
                      <Avatar collab={selectedCollab} size={44} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 18, color: COLORS.noir }}>{selectedCollab.nom}</div>
                        <div style={{ fontSize: 13, color: COLORS.grisMoyen }}>{selectedCollab.pole}</div>
                      </div>
                    </div>
                    <div style={{ padding: "20px" }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.grisMoyen, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>Répartition par projet</div>
                      {selectedCollab.projets.map((p, i) => {
                        const totalH = selectedCollab.heuresSemaine.reduce((a, b) => a + b, 0);
                        const pctProjet = totalH > 0 ? Math.round((p.heures / totalH) * 100) : 0;
                        const tempsRatio = p.alloue > 0 ? Math.round((p.heures / p.alloue) * 100) : 0;
                        const info = getRentaInfo(tempsRatio);
                        return (
                          <div key={i} style={{ padding: "12px 0", borderBottom: i < selectedCollab.projets.length - 1 ? `1px solid ${COLORS.grisBorder}` : "none" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                              <span style={{ fontWeight: 600, fontSize: 13, color: COLORS.noir }}>{p.nom}</span>
                              <span style={{ fontSize: 13 }}><strong>{p.heures}h</strong> <span style={{ color: COLORS.grisMoyen }}>({pctProjet}%)</span></span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <BarChart value={p.heures} max={p.alloue} color={info.color} height={6} />
                              <span style={{ fontSize: 11, color: info.color, fontWeight: 600, minWidth: 70, textAlign: "right" }}>{p.heures}h / {p.alloue}h</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 2 : RENTABILITÉ PAR PROJET
            ============================================================ */}
        {activeTab === "projets" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{ background: COLORS.blanc, borderRadius: 16, border: `1px solid ${COLORS.grisBorder}`, overflow: "hidden" }}>
              {/* Header */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 0.8fr", padding: "12px 20px", background: COLORS.gris, borderBottom: `1px solid ${COLORS.grisBorder}`, fontSize: 10, fontWeight: 700, color: COLORS.grisMoyen, textTransform: "uppercase", letterSpacing: 0.5 }}>
                <div>Projet</div>
                <div style={{ textAlign: "right" }}>Montant HT</div>
                <div style={{ textAlign: "right" }}>Marge théorique</div>
                <div style={{ textAlign: "center" }}>Temps</div>
                <div style={{ textAlign: "right" }}>Coût réel</div>
                <div style={{ textAlign: "right" }}>Marge réelle</div>
                <div style={{ textAlign: "center" }}>Statut</div>
              </div>
              {PROJETS_DATA.map((p, i) => {
                const marge = p.montantHT - p.coutRevient;
                const coutReel = p.tempsConsomme * 83;
                const margeReelle = p.montantHT - coutReel;
                const tempsRatio = p.tempsAlloue > 0 ? (p.tempsConsomme / p.tempsAlloue) * 100 : 0;
                const info = getRentaInfo(tempsRatio);
                const rentaPct = p.montantHT > 0 ? Math.round((margeReelle / p.montantHT) * 100) : 0;
                return (
                  <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 0.8fr", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${COLORS.grisBorder}`, transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#FAFAF8"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.noir }}>{p.nom}</div>
                      <div style={{ fontSize: 11, color: COLORS.grisMoyen }}>{p.client}</div>
                    </div>
                    <div style={{ textAlign: "right", fontWeight: 600, fontSize: 14, color: COLORS.noir }}>{p.montantHT.toLocaleString("fr-FR")}€</div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.dore }}>{marge.toLocaleString("fr-FR")}€</div>
                      <div style={{ fontSize: 11, color: COLORS.grisMoyen }}>{Math.round((marge / p.montantHT) * 100)}%</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 13 }}><strong>{p.tempsConsomme}h</strong> <span style={{ color: COLORS.grisMoyen }}>/ {p.tempsAlloue}h</span></div>
                      <div style={{ marginTop: 4 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <BarChart value={p.tempsConsomme} max={p.tempsAlloue} color={info.color} height={5} />
                          <span style={{ fontSize: 10, fontWeight: 700, color: info.color }}>{Math.round(tempsRatio)}%</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", fontSize: 14, color: COLORS.grisMoyen }}>{coutReel.toLocaleString("fr-FR")}€</div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: margeReelle >= 0 ? COLORS.vert : COLORS.rouge }}>{margeReelle >= 0 ? "+" : ""}{margeReelle.toLocaleString("fr-FR")}€</div>
                      <div style={{ fontSize: 11, color: margeReelle >= 0 ? COLORS.vert : COLORS.rouge }}>{rentaPct}% rentabilité</div>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <RentabiliteGauge pct={tempsRatio} size={60} />
                    </div>
                  </div>
                );
              })}
              {/* TOTAL */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 0.8fr", alignItems: "center", padding: "16px 20px", background: COLORS.noir }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.dore }}>TOTAL</div>
                <div style={{ textAlign: "right", fontWeight: 700, fontSize: 14, color: COLORS.blanc }}>{totalCA.toLocaleString("fr-FR")}€</div>
                <div style={{ textAlign: "right", fontWeight: 700, fontSize: 14, color: COLORS.dore }}>{totalMarge.toLocaleString("fr-FR")}€</div>
                <div style={{ textAlign: "center", fontWeight: 600, fontSize: 13, color: COLORS.blanc }}>{PROJETS_DATA.reduce((s, p) => s + p.tempsConsomme, 0)}h / {PROJETS_DATA.reduce((s, p) => s + p.tempsAlloue, 0).toFixed(1)}h</div>
                <div style={{ textAlign: "right", fontWeight: 600, fontSize: 14, color: "#CCC" }}>{totalCoutReel.toLocaleString("fr-FR")}€</div>
                <div style={{ textAlign: "right", fontWeight: 700, fontSize: 14, color: margeReelle >= 0 ? COLORS.vert : COLORS.rouge }}>{margeReelle >= 0 ? "+" : ""}{margeReelle.toLocaleString("fr-FR")}€</div>
                <div />
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 3 : RENTABILITÉ PAR COLLABORATEUR
            ============================================================ */}
        {activeTab === "rentaCollab" && (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            <div style={{ background: COLORS.blanc, borderRadius: 16, border: `1px solid ${COLORS.grisBorder}`, overflow: "hidden" }}>
              {/* Header */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1.2fr", padding: "12px 20px", background: COLORS.gris, borderBottom: `1px solid ${COLORS.grisBorder}`, fontSize: 10, fontWeight: 700, color: COLORS.grisMoyen, textTransform: "uppercase", letterSpacing: 0.5 }}>
                <div>Collaborateur</div>
                <div style={{ textAlign: "right" }}>CA généré</div>
                <div style={{ textAlign: "right" }}>Heures</div>
                <div style={{ textAlign: "right" }}>Coût réel (×83€)</div>
                <div style={{ textAlign: "right" }}>Marge nette</div>
                <div style={{ textAlign: "center" }}>Ratio rentabilité</div>
              </div>
              {COLLABORATEURS.map(collab => {
                const totalH = collab.heuresSemaine.reduce((a, b) => a + b, 0);
                const caGenere = collab.projets.reduce((s, p) => s + p.montant, 0);
                const coutReel = Math.round(totalH * 83);
                const margeNette = caGenere - coutReel;
                const ratioPct = caGenere > 0 ? Math.round((margeNette / caGenere) * 100) : -100;
                const isRentable = margeNette >= 0;
                return (
                  <div key={collab.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1.2fr", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${COLORS.grisBorder}`, transition: "background 0.15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#FAFAF8"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <Avatar collab={collab} size={36} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.noir }}>{collab.nom}</div>
                        <div style={{ fontSize: 11, color: COLORS.grisMoyen }}>{collab.pole}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", fontWeight: 600, fontSize: 14, color: caGenere > 0 ? COLORS.noir : COLORS.grisMoyen }}>{caGenere > 0 ? `${caGenere.toLocaleString("fr-FR")}€` : "—"}</div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.noir }}>{totalH}h</div>
                      <div style={{ fontSize: 11, color: COLORS.grisMoyen }}>/ {collab.base}h</div>
                    </div>
                    <div style={{ textAlign: "right", fontSize: 14, color: COLORS.grisMoyen }}>{coutReel.toLocaleString("fr-FR")}€</div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: isRentable ? COLORS.vert : COLORS.rouge }}>{isRentable ? "+" : ""}{margeNette.toLocaleString("fr-FR")}€</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <div style={{ flex: 1, maxWidth: 120 }}>
                        <div style={{ height: 8, borderRadius: 4, background: "#EEEEE9", overflow: "hidden", position: "relative" }}>
                          {caGenere > 0 && (
                            <div style={{
                              width: `${Math.min(Math.abs(ratioPct), 100)}%`,
                              height: "100%", borderRadius: 4,
                              background: isRentable ? COLORS.vert : COLORS.rouge,
                              transition: "width 0.6s ease",
                            }} />
                          )}
                        </div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: caGenere > 0 ? (isRentable ? COLORS.vert : COLORS.rouge) : COLORS.grisMoyen, minWidth: 40, textAlign: "right" }}>
                        {caGenere > 0 ? `${ratioPct}%` : "N/A"}
                      </span>
                    </div>
                  </div>
                );
              })}
              {/* TOTAL */}
              {(() => {
                const totalH = COLLABORATEURS.reduce((s, c) => s + c.heuresSemaine.reduce((a, b) => a + b, 0), 0);
                const totalCACollab = COLLABORATEURS.reduce((s, c) => s + c.projets.reduce((a, p) => a + p.montant, 0), 0);
                const totalCout = Math.round(totalH * 83);
                const totalMargeN = totalCACollab - totalCout;
                return (
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1.2fr", alignItems: "center", padding: "16px 20px", background: COLORS.noir }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.dore }}>TOTAL ÉQUIPE</div>
                    <div style={{ textAlign: "right", fontWeight: 700, fontSize: 14, color: COLORS.blanc }}>{totalCACollab.toLocaleString("fr-FR")}€</div>
                    <div style={{ textAlign: "right", fontWeight: 700, fontSize: 14, color: COLORS.blanc }}>{totalH}h</div>
                    <div style={{ textAlign: "right", fontWeight: 600, fontSize: 14, color: "#CCC" }}>{totalCout.toLocaleString("fr-FR")}€</div>
                    <div style={{ textAlign: "right", fontWeight: 700, fontSize: 14, color: totalMargeN >= 0 ? COLORS.vert : COLORS.rouge }}>{totalMargeN >= 0 ? "+" : ""}{totalMargeN.toLocaleString("fr-FR")}€</div>
                    <div />
                  </div>
                );
              })()}
            </div>

            {/* Légende */}
            <div style={{ marginTop: 16, padding: "14px 20px", background: COLORS.dorePale, borderRadius: 12, border: `1px solid ${COLORS.dore}33`, display: "flex", gap: 24, fontSize: 12, color: COLORS.noir }}>
              <span><strong>Formule :</strong> Marge nette = CA généré − (Heures × 83€/h)</span>
              <span>·</span>
              <span><strong>Ratio :</strong> Marge nette ÷ CA généré × 100</span>
              <span>·</span>
              <span style={{ color: COLORS.grisMoyen }}>N/A = collaborateur non facturable (planning, admin)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
