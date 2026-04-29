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
  bleu: "#2196F3",
};

const COLLABORATEURS = [
  { id: 1, nom: "Noémie", pole: "Graphisme", avatar: "N", color: "#8E24AA" },
  { id: 2, nom: "Amandine", pole: "Web/SEO", avatar: "A", color: "#1E88E5" },
  { id: 3, nom: "Jérémy", pole: "Social Media", avatar: "J", color: "#43A047" },
  { id: 4, nom: "Marcellin", pole: "SEO/SEA", avatar: "M", color: "#FB8C00" },
  { id: 5, nom: "Arthur", pole: "Sites/Ads", avatar: "Ar", color: "#E53935" },
  { id: 6, nom: "Fanny", pole: "Planning", avatar: "F", color: "#00897B" },
];

const PROJETS = [
  {
    id: 1, nom: "Maison Relais Gourmet", client: "MRG", type: "Standard",
    montantHT: 8500, coutRevient: 2800, statut: "En production",
    taches: [
      { id: 1, nom: "Maquettes site e-commerce", statut: "En cours", collab: 1, tempsAlloue: 24.1, tempsConsomme: 18.5, montant: 3800, cout: 1800 },
      { id: 2, nom: "Intégration WooCommerce", statut: "À faire", collab: 5, tempsAlloue: 20.5, tempsConsomme: 0, montant: 2700, cout: 1000 },
      { id: 3, nom: "Rédaction fiches produits", statut: "Brief", collab: 2, tempsAlloue: 24.1, tempsConsomme: 0, montant: 2000, cout: 0 },
    ],
  },
  {
    id: 2, nom: "Netzy — Refonte site", client: "Netzy", type: "Standard",
    montantHT: 6200, coutRevient: 1900, statut: "BAT en cours",
    taches: [
      { id: 4, nom: "Maquettes UI/UX", statut: "BAT envoyé", collab: 1, tempsAlloue: 19.3, tempsConsomme: 17, montant: 2500, cout: 900 },
      { id: 5, nom: "Développement WordPress", statut: "Attente élément", collab: 4, tempsAlloue: 21.7, tempsConsomme: 8, montant: 2800, cout: 1000 },
      { id: 6, nom: "SEO on-page", statut: "Brief", collab: 2, tempsAlloue: 10.8, tempsConsomme: 0, montant: 900, cout: 0 },
    ],
  },
  {
    id: 3, nom: "Vins d'Anjou-Saumur", client: "InterLoire", type: "Abonnement",
    montantHT: 3200, coutRevient: 800, statut: "En production",
    taches: [
      { id: 7, nom: "Posts réseaux sociaux Mars", statut: "En cours", collab: 3, tempsAlloue: 14.5, tempsConsomme: 11, montant: 1600, cout: 400 },
      { id: 8, nom: "Shooting photo printemps", statut: "En attente validation client", collab: 1, tempsAlloue: 14.5, tempsConsomme: 12, montant: 1600, cout: 400 },
    ],
  },
  {
    id: 4, nom: "BÉRYL Patrimoine — Branding", client: "BÉRYL", type: "Standard",
    montantHT: 12000, coutRevient: 3500, statut: "En production",
    taches: [
      { id: 9, nom: "Identité visuelle", statut: "BAT OK", collab: 1, tempsAlloue: 36.1, tempsConsomme: 30, montant: 5000, cout: 2000 },
      { id: 10, nom: "Charte graphique", statut: "En cours", collab: 1, tempsAlloue: 30.1, tempsConsomme: 22, montant: 4500, cout: 1000 },
      { id: 11, nom: "Supports print", statut: "À faire", collab: 1, tempsAlloue: 18.1, tempsConsomme: 0, montant: 2500, cout: 500 },
    ],
  },
  {
    id: 5, nom: "Roul'Anjou — Naming", client: "B. Aulié", type: "Standard",
    montantHT: 4800, coutRevient: 1200, statut: "À affecter",
    taches: [
      { id: 12, nom: "Recherche naming", statut: "Brief", collab: null, tempsAlloue: 21.7, tempsConsomme: 0, montant: 2400, cout: 600 },
      { id: 13, nom: "Création logo", statut: "Brief", collab: null, tempsAlloue: 21.7, tempsConsomme: 0, montant: 2400, cout: 600 },
    ],
  },
];

const statutColors = {
  "À affecter": { bg: "#F3E8FF", text: "#7C3AED", dot: "#7C3AED" },
  "En production": { bg: COLORS.vertBg, text: "#2E7D32", dot: COLORS.vert },
  "BAT en cours": { bg: COLORS.orangeBg, text: "#E65100", dot: COLORS.orange },
  "Facturé": { bg: "#E3F2FD", text: "#1565C0", dot: COLORS.bleu },
  "Clôturé": { bg: "#ECEFF1", text: "#546E7A", dot: "#78909C" },
};

const tacheStatutColors = {
  "Brief": { bg: "#F3E8FF", text: "#7C3AED" },
  "À faire": { bg: "#E8EAF6", text: "#3949AB" },
  "En cours": { bg: COLORS.vertBg, text: "#2E7D32" },
  "Attente élément": { bg: COLORS.orangeBg, text: "#E65100" },
  "En attente validation client": { bg: "#FFF8E1", text: "#F57F17" },
  "BAT envoyé": { bg: "#E1F5FE", text: "#0277BD" },
  "BAT OK": { bg: "#E8F5E9", text: "#1B5E20" },
  "BAT à modifier": { bg: COLORS.rougeBg, text: "#C62828" },
  "Terminé": { bg: "#ECEFF1", text: "#37474F" },
};

function getRentabiliteColor(ratio) {
  if (ratio < 75) return { color: COLORS.vert, bg: COLORS.vertBg, label: "Rentable" };
  if (ratio <= 100) return { color: COLORS.orange, bg: COLORS.orangeBg, label: "Limite" };
  return { color: COLORS.rouge, bg: COLORS.rougeBg, label: "Déficitaire" };
}

function Avatar({ collab, size = 32 }) {
  if (!collab) return <div style={{ width: size, height: size, borderRadius: "50%", background: "#E0E0E0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, color: "#999" }}>?</div>;
  return (
    <div title={`${collab.nom} — ${collab.pole}`} style={{ width: size, height: size, borderRadius: "50%", background: collab.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, color: "#fff", fontWeight: 700, letterSpacing: -0.5, cursor: "default", flexShrink: 0 }}>
      {collab.avatar}
    </div>
  );
}

function StatutBadge({ statut, type = "projet" }) {
  const colors = type === "projet" ? statutColors[statut] : tacheStatutColors[statut];
  if (!colors) return <span>{statut}</span>;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, background: colors.bg, color: colors.text, fontSize: 12, fontWeight: 600, letterSpacing: 0.2, whiteSpace: "nowrap" }}>
      {type === "projet" && <span style={{ width: 7, height: 7, borderRadius: "50%", background: colors.dot }} />}
      {statut}
    </span>
  );
}

function ProgressBar({ consumed, allocated, height = 8 }) {
  const pct = allocated > 0 ? Math.min((consumed / allocated) * 100, 150) : 0;
  const displayPct = Math.min(pct, 100);
  const info = getRentabiliteColor(pct);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
      <div style={{ flex: 1, height, borderRadius: height, background: "#EEEEE9", overflow: "hidden", position: "relative" }}>
        <div style={{ width: `${displayPct}%`, height: "100%", borderRadius: height, background: pct > 100 ? `repeating-linear-gradient(135deg, ${info.color}, ${info.color} 4px, ${info.color}99 4px, ${info.color}99 8px)` : info.color, transition: "width 0.6s cubic-bezier(.4,0,.2,1)" }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: info.color, minWidth: 40, textAlign: "right" }}>{Math.round(pct)}%</span>
    </div>
  );
}

function KPICard({ label, value, sub, icon, accent = false }) {
  return (
    <div style={{ background: accent ? COLORS.noir : COLORS.blanc, borderRadius: 16, padding: "24px 24px 20px", flex: 1, minWidth: 180, border: accent ? "none" : `1px solid ${COLORS.grisBorder}`, position: "relative", overflow: "hidden" }}>
      <div style={{ fontSize: 13, color: accent ? COLORS.doreLight : COLORS.grisMoyen, fontWeight: 500, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 36, fontWeight: 700, color: accent ? COLORS.dore : COLORS.noir, lineHeight: 1.1, fontFamily: "'DM Serif Display', Georgia, serif" }}>{value}</div>
      {sub && <div style={{ fontSize: 13, color: accent ? "#999" : COLORS.grisMoyen, marginTop: 6 }}>{sub}</div>}
      <div style={{ position: "absolute", top: 16, right: 20, fontSize: 28, opacity: accent ? 0.3 : 0.12 }}>{icon}</div>
    </div>
  );
}

function ProjetRow({ projet, onClick }) {
  const marge = projet.montantHT - projet.coutRevient;
  const margePercent = Math.round((marge / projet.montantHT) * 100);
  const totalAlloue = projet.taches.reduce((s, t) => s + t.tempsAlloue, 0);
  const totalConsomme = projet.taches.reduce((s, t) => s + t.tempsConsomme, 0);
  const ratioTemps = totalAlloue > 0 ? (totalConsomme / totalAlloue) * 100 : 0;
  const rentaInfo = getRentabiliteColor(ratioTemps);

  return (
    <div onClick={onClick} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1.2fr 0.8fr", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${COLORS.grisBorder}`, cursor: "pointer", transition: "background 0.15s", background: "transparent" }}
      onMouseEnter={e => e.currentTarget.style.background = "#FAFAF8"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
      <div>
        <div style={{ fontWeight: 600, color: COLORS.noir, fontSize: 14, marginBottom: 2 }}>{projet.nom}</div>
        <div style={{ fontSize: 12, color: COLORS.grisMoyen }}>{projet.client} · {projet.taches.length} tâche{projet.taches.length > 1 ? "s" : ""}</div>
      </div>
      <div><StatutBadge statut={projet.statut} type="projet" /></div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontWeight: 600, color: COLORS.noir, fontSize: 14 }}>{projet.montantHT.toLocaleString("fr-FR")} €</div>
        <div style={{ fontSize: 12, color: rentaInfo.color, fontWeight: 500 }}>Marge {margePercent}%</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ fontSize: 14, color: COLORS.noir }}><span style={{ fontWeight: 600 }}>{totalConsomme.toFixed(1)}h</span> <span style={{ color: COLORS.grisMoyen }}>/ {totalAlloue.toFixed(1)}h</span></div>
      </div>
      <div style={{ padding: "0 8px" }}><ProgressBar consumed={totalConsomme} allocated={totalAlloue} /></div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: -4 }}>
        {[...new Set(projet.taches.map(t => t.collab).filter(Boolean))].slice(0, 3).map(cid => (
          <div key={cid} style={{ marginLeft: -6 }}><Avatar collab={COLLABORATEURS.find(c => c.id === cid)} size={28} /></div>
        ))}
      </div>
    </div>
  );
}

function ProjetDetail({ projet, onBack }) {
  const marge = projet.montantHT - projet.coutRevient;
  const totalAlloue = projet.taches.reduce((s, t) => s + t.tempsAlloue, 0);
  const totalConsomme = projet.taches.reduce((s, t) => s + t.tempsConsomme, 0);

  return (
    <div style={{ animation: "fadeIn 0.3s ease" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: COLORS.dore, fontWeight: 600, fontSize: 14, padding: "0 0 16px", fontFamily: "inherit" }}>
        ← Retour au dashboard
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 28, color: COLORS.noir, margin: 0 }}>{projet.nom}</h2>
        <StatutBadge statut={projet.statut} type="projet" />
        {projet.type === "Abonnement" && <span style={{ padding: "4px 10px", borderRadius: 20, background: COLORS.dorePale, color: COLORS.dore, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase" }}>Abonnement</span>}
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
        <div style={{ flex: 1, background: COLORS.blanc, border: `1px solid ${COLORS.grisBorder}`, borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 12, color: COLORS.grisMoyen, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Montant HT</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.noir, fontFamily: "'DM Serif Display', Georgia, serif" }}>{projet.montantHT.toLocaleString("fr-FR")} €</div>
        </div>
        <div style={{ flex: 1, background: COLORS.blanc, border: `1px solid ${COLORS.grisBorder}`, borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 12, color: COLORS.grisMoyen, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Marge disponible</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.dore, fontFamily: "'DM Serif Display', Georgia, serif" }}>{marge.toLocaleString("fr-FR")} €</div>
        </div>
        <div style={{ flex: 1, background: COLORS.blanc, border: `1px solid ${COLORS.grisBorder}`, borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 12, color: COLORS.grisMoyen, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Temps production</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.noir, fontFamily: "'DM Serif Display', Georgia, serif" }}>{totalConsomme.toFixed(1)}h <span style={{ fontSize: 16, color: COLORS.grisMoyen, fontWeight: 400 }}>/ {totalAlloue.toFixed(1)}h</span></div>
        </div>
      </div>

      <h3 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 18, color: COLORS.noir, marginBottom: 16 }}>Tâches du projet</h3>
      <div style={{ background: COLORS.blanc, borderRadius: 16, border: `1px solid ${COLORS.grisBorder}`, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 0.8fr 1.2fr 1fr", padding: "12px 20px", background: COLORS.gris, borderBottom: `1px solid ${COLORS.grisBorder}`, fontSize: 11, fontWeight: 600, color: COLORS.grisMoyen, textTransform: "uppercase", letterSpacing: 0.5 }}>
          <div>Tâche</div><div>Statut</div><div>Collaborateur</div><div>Temps (consommé / alloué)</div><div>Rentabilité</div>
        </div>
        {projet.taches.map(tache => {
          const collab = COLLABORATEURS.find(c => c.id === tache.collab);
          const ratio = tache.tempsAlloue > 0 ? (tache.tempsConsomme / tache.tempsAlloue) * 100 : 0;
          return (
            <div key={tache.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 0.8fr 1.2fr 1fr", alignItems: "center", padding: "14px 20px", borderBottom: `1px solid ${COLORS.grisBorder}` }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.noir }}>{tache.nom}</div>
                <div style={{ fontSize: 12, color: COLORS.grisMoyen }}>{tache.montant.toLocaleString("fr-FR")} € HT · Marge: {(tache.montant - tache.cout).toLocaleString("fr-FR")} €</div>
              </div>
              <div><StatutBadge statut={tache.statut} type="tache" /></div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Avatar collab={collab} size={26} />
                <span style={{ fontSize: 12, color: COLORS.grisMoyen }}>{collab?.nom || "—"}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span style={{ fontSize: 13 }}><strong>{tache.tempsConsomme}h</strong> <span style={{ color: COLORS.grisMoyen }}>/ {tache.tempsAlloue}h</span></span>
                <ProgressBar consumed={tache.tempsConsomme} allocated={tache.tempsAlloue} height={6} />
              </div>
              <div>
                {tache.tempsConsomme > 0 ? (
                  <span style={{ fontSize: 13, fontWeight: 600, color: getRentabiliteColor(ratio).color }}>{getRentabiliteColor(ratio).label} ({Math.round(ratio)}%)</span>
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

export default function CRMDashboard() {
  const [selectedProjet, setSelectedProjet] = useState(null);
  const [activeNav, setActiveNav] = useState("dashboard");

  const totalCA = PROJETS.reduce((s, p) => s + p.montantHT, 0);
  const totalMarge = PROJETS.reduce((s, p) => s + (p.montantHT - p.coutRevient), 0);
  const totalTaches = PROJETS.reduce((s, p) => s + p.taches.length, 0);
  const tachesEnCours = PROJETS.reduce((s, p) => s + p.taches.filter(t => t.statut === "En cours").length, 0);
  const alertes = PROJETS.reduce((s, p) => s + p.taches.filter(t => t.tempsAlloue > 0 && (t.tempsConsomme / t.tempsAlloue) >= 0.75).length, 0);

  return (
    <div style={{ minHeight: "100vh", background: COLORS.gris, fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #D4D4D0; border-radius: 3px; }
      `}</style>

      {/* SIDEBAR */}
      <div style={{ position: "fixed", top: 0, left: 0, width: 240, height: "100vh", background: COLORS.noirDeep, display: "flex", flexDirection: "column", zIndex: 10 }}>
        <div style={{ padding: "28px 24px 20px", borderBottom: "1px solid #2A2A2A" }}>
          <div style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 22, color: COLORS.dore, fontWeight: 400, letterSpacing: 0.5 }}>GROUPE ÉCHO</div>
          <div style={{ fontSize: 11, color: "#666", letterSpacing: 1.5, textTransform: "uppercase", marginTop: 4 }}>CRM Production</div>
        </div>
        <nav style={{ padding: "16px 12px", flex: 1 }}>
          {[
            { id: "dashboard", label: "Dashboard", icon: "◆" },
            { id: "projets", label: "Projets", icon: "▣" },
            { id: "kanban", label: "Kanban", icon: "☰" },
            { id: "calendrier", label: "Calendrier", icon: "◫" },
            { id: "equipe", label: "Équipe", icon: "●" },
            { id: "facturation", label: "Facturation", icon: "€" },
            { id: "rapports", label: "Rapports", icon: "▤" },
          ].map(item => (
            <div key={item.id} onClick={() => { setActiveNav(item.id); setSelectedProjet(null); }}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderRadius: 10, marginBottom: 2, cursor: "pointer", background: activeNav === item.id ? "#2A2A2A" : "transparent", color: activeNav === item.id ? COLORS.dore : "#888", fontSize: 14, fontWeight: activeNav === item.id ? 600 : 400, transition: "all 0.15s" }}
              onMouseEnter={e => { if (activeNav !== item.id) e.currentTarget.style.background = "#1F1F1F"; }}
              onMouseLeave={e => { if (activeNav !== item.id) e.currentTarget.style.background = "transparent"; }}>
              <span style={{ fontSize: 16, width: 20, textAlign: "center" }}>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </nav>
        <div style={{ padding: "16px 20px", borderTop: "1px solid #2A2A2A" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.dore}, ${COLORS.doreLight})`, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.noir, fontWeight: 700, fontSize: 14 }}>MC</div>
            <div>
              <div style={{ fontSize: 13, color: COLORS.blanc, fontWeight: 600 }}>Maryline</div>
              <div style={{ fontSize: 11, color: "#666" }}>Direction</div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ marginLeft: 240, padding: "32px 40px" }}>
        {selectedProjet ? (
          <ProjetDetail projet={selectedProjet} onBack={() => setSelectedProjet(null)} />
        ) : (
          <div style={{ animation: "fadeIn 0.3s ease" }}>
            {/* HEADER */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
              <div>
                <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 32, color: COLORS.noir, margin: "0 0 4px", fontWeight: 400 }}>Dashboard</h1>
                <p style={{ color: COLORS.grisMoyen, fontSize: 14, margin: 0 }}>Semaine du 10 au 16 mars 2026</p>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button style={{ padding: "10px 20px", background: COLORS.blanc, border: `1px solid ${COLORS.grisBorder}`, borderRadius: 10, fontSize: 13, fontWeight: 600, color: COLORS.noir, cursor: "pointer", fontFamily: "inherit" }}>Exporter PDF</button>
                <button style={{ padding: "10px 20px", background: COLORS.noir, border: "none", borderRadius: 10, fontSize: 13, fontWeight: 600, color: COLORS.dore, cursor: "pointer", fontFamily: "inherit" }}>+ Nouveau projet</button>
              </div>
            </div>

            {/* KPI CARDS */}
            <div style={{ display: "flex", gap: 16, marginBottom: 32 }}>
              <KPICard label="Projets actifs" value={PROJETS.filter(p => p.statut !== "Clôturé").length} sub={`${totalTaches} tâches au total`} icon="▣" accent />
              <KPICard label="CA en production" value={`${(totalCA / 1000).toFixed(1)}k€`} sub={`Marge: ${(totalMarge / 1000).toFixed(1)}k€`} icon="€" />
              <KPICard label="Tâches en cours" value={tachesEnCours} sub={`sur ${totalTaches} tâches`} icon="▶" />
              <KPICard label="Alertes rentabilité" value={alertes} sub={alertes > 0 ? "Tâches à surveiller" : "Tout est OK"} icon="⚠" />
            </div>

            {/* ALERTES */}
            {(() => {
              const tachesAlerte = PROJETS.flatMap(p => p.taches.filter(t => t.tempsAlloue > 0 && (t.tempsConsomme / t.tempsAlloue) >= 0.75).map(t => ({ ...t, projet: p.nom })));
              if (tachesAlerte.length === 0) return null;
              return (
                <div style={{ background: "#FFF8F0", border: "1px solid #FFE0B2", borderRadius: 14, padding: "16px 20px", marginBottom: 24 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#E65100", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>⚠ Alertes temps de production</div>
                  {tachesAlerte.map(t => {
                    const ratio = Math.round((t.tempsConsomme / t.tempsAlloue) * 100);
                    const info = getRentabiliteColor(ratio);
                    return (
                      <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 0", fontSize: 13 }}>
                        <span style={{ fontWeight: 600, color: info.color }}>{ratio}%</span>
                        <span style={{ color: COLORS.noir, fontWeight: 500 }}>{t.nom}</span>
                        <span style={{ color: COLORS.grisMoyen }}>— {t.projet}</span>
                        <Avatar collab={COLLABORATEURS.find(c => c.id === t.collab)} size={22} />
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* PROJETS TABLE */}
            <div style={{ background: COLORS.blanc, borderRadius: 16, border: `1px solid ${COLORS.grisBorder}`, overflow: "hidden" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px", borderBottom: `1px solid ${COLORS.grisBorder}` }}>
                <h3 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 18, color: COLORS.noir, margin: 0, fontWeight: 400 }}>Projets en cours</h3>
                <span style={{ fontSize: 12, color: COLORS.grisMoyen }}>{PROJETS.length} projets</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1.2fr 0.8fr", padding: "10px 20px", background: COLORS.gris, borderBottom: `1px solid ${COLORS.grisBorder}`, fontSize: 11, fontWeight: 600, color: COLORS.grisMoyen, textTransform: "uppercase", letterSpacing: 0.5 }}>
                <div>Projet</div><div>Statut</div><div style={{ textAlign: "right" }}>Montant</div><div style={{ textAlign: "right" }}>Temps</div><div style={{ paddingLeft: 8 }}>Rentabilité</div><div style={{ textAlign: "right" }}>Équipe</div>
              </div>
              {PROJETS.map(p => <ProjetRow key={p.id} projet={p} onClick={() => setSelectedProjet(p)} />)}
            </div>

            {/* ACTIVITÉ ÉQUIPE */}
            <div style={{ marginTop: 32, background: COLORS.blanc, borderRadius: 16, border: `1px solid ${COLORS.grisBorder}`, overflow: "hidden" }}>
              <div style={{ padding: "18px 20px", borderBottom: `1px solid ${COLORS.grisBorder}` }}>
                <h3 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 18, color: COLORS.noir, margin: 0, fontWeight: 400 }}>Charge équipe cette semaine</h3>
              </div>
              <div style={{ padding: 20, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                {COLLABORATEURS.map(c => {
                  const taches = PROJETS.flatMap(p => p.taches.filter(t => t.collab === c.id));
                  const heures = taches.reduce((s, t) => s + t.tempsConsomme, 0);
                  const charge = Math.min(Math.round((heures / 35) * 100), 100);
                  return (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12, background: COLORS.gris }}>
                      <Avatar collab={c} size={36} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontWeight: 600, fontSize: 13, color: COLORS.noir }}>{c.nom}</span>
                          <span style={{ fontSize: 12, color: COLORS.grisMoyen }}>{heures}h / 35h</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 3, background: "#E5E5E3", overflow: "hidden" }}>
                          <div style={{ width: `${charge}%`, height: "100%", borderRadius: 3, background: charge > 90 ? COLORS.rouge : charge > 70 ? COLORS.orange : COLORS.vert, transition: "width 0.5s ease" }} />
                        </div>
                        <div style={{ fontSize: 11, color: COLORS.grisMoyen, marginTop: 4 }}>{taches.length} tâche{taches.length > 1 ? "s" : ""} · {c.pole}</div>
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
  );
}
