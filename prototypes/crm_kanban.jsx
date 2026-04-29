import { useState, useEffect } from "react";

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

const STATUTS = [
  { id: "brief", label: "Brief", color: "#7C3AED", bg: "#F3E8FF", icon: "✎" },
  { id: "afaire", label: "À faire", color: "#3949AB", bg: "#E8EAF6", icon: "☐" },
  { id: "encours", label: "En cours", color: "#2E7D32", bg: "#E8F5E9", icon: "▶" },
  { id: "attente", label: "Attente élément", color: "#E65100", bg: "#FFF3E0", icon: "⏸" },
  { id: "validation", label: "Validation client", color: "#F57F17", bg: "#FFF8E1", icon: "◷" },
  { id: "bat", label: "BAT envoyé", color: "#0277BD", bg: "#E1F5FE", icon: "✉" },
  { id: "termine", label: "Terminé", color: "#37474F", bg: "#ECEFF1", icon: "✓" },
];

const COLLABORATEURS = [
  { id: 1, nom: "Noémie", pole: "Graphisme", avatar: "N", color: "#8E24AA" },
  { id: 2, nom: "Amandine", pole: "Web/SEO", avatar: "A", color: "#1E88E5" },
  { id: 3, nom: "Jérémy", pole: "Social Media", avatar: "J", color: "#43A047" },
  { id: 4, nom: "Marcellin", pole: "SEO/SEA", avatar: "M", color: "#FB8C00" },
  { id: 5, nom: "Arthur", pole: "Sites/Ads", avatar: "Ar", color: "#E53935" },
  { id: 6, nom: "Fanny", pole: "Planning", avatar: "F", color: "#00897B" },
];

const INITIAL_TACHES = [
  { id: 1, nom: "Maquettes site e-commerce", projet: "Maison Relais Gourmet", statut: "encours", collab: 1, montant: 3800, cout: 1800, tempsAlloue: 24.1, tempsConsomme: 18.5, timer: false, timerStart: null, priorite: "haute" },
  { id: 2, nom: "Intégration WooCommerce", projet: "Maison Relais Gourmet", statut: "afaire", collab: 5, montant: 2700, cout: 1000, tempsAlloue: 20.5, tempsConsomme: 0, timer: false, timerStart: null, priorite: "moyenne" },
  { id: 3, nom: "Rédaction fiches produits", projet: "Maison Relais Gourmet", statut: "brief", collab: 2, montant: 2000, cout: 0, tempsAlloue: 24.1, tempsConsomme: 0, timer: false, timerStart: null, priorite: "basse" },
  { id: 4, nom: "Maquettes UI/UX", projet: "Netzy", statut: "bat", collab: 1, montant: 2500, cout: 900, tempsAlloue: 19.3, tempsConsomme: 17, timer: false, timerStart: null, priorite: "haute" },
  { id: 5, nom: "Développement WordPress", projet: "Netzy", statut: "attente", collab: 4, montant: 2800, cout: 1000, tempsAlloue: 21.7, tempsConsomme: 8, timer: false, timerStart: null, priorite: "haute" },
  { id: 6, nom: "SEO on-page", projet: "Netzy", statut: "brief", collab: 2, montant: 900, cout: 0, tempsAlloue: 10.8, tempsConsomme: 0, timer: false, timerStart: null, priorite: "moyenne" },
  { id: 7, nom: "Posts réseaux sociaux Mars", projet: "Vins d'Anjou-Saumur", statut: "encours", collab: 3, montant: 1600, cout: 400, tempsAlloue: 14.5, tempsConsomme: 11, timer: false, timerStart: null, priorite: "moyenne", abonnement: true },
  { id: 8, nom: "Shooting photo printemps", projet: "Vins d'Anjou-Saumur", statut: "validation", collab: 1, montant: 1600, cout: 400, tempsAlloue: 14.5, tempsConsomme: 12, timer: false, timerStart: null, priorite: "haute" },
  { id: 9, nom: "Identité visuelle", projet: "BÉRYL Patrimoine", statut: "termine", collab: 1, montant: 5000, cout: 2000, tempsAlloue: 36.1, tempsConsomme: 30, timer: false, timerStart: null, priorite: "haute" },
  { id: 10, nom: "Charte graphique", projet: "BÉRYL Patrimoine", statut: "encours", collab: 1, montant: 4500, cout: 1000, tempsAlloue: 30.1, tempsConsomme: 22, timer: false, timerStart: null, priorite: "haute" },
  { id: 11, nom: "Supports print", projet: "BÉRYL Patrimoine", statut: "afaire", collab: 1, montant: 2500, cout: 500, tempsAlloue: 18.1, tempsConsomme: 0, timer: false, timerStart: null, priorite: "moyenne" },
  { id: 12, nom: "Recherche naming", projet: "Roul'Anjou", statut: "brief", collab: null, montant: 2400, cout: 600, tempsAlloue: 21.7, tempsConsomme: 0, timer: false, timerStart: null, priorite: "haute" },
  { id: 13, nom: "Création logo", projet: "Roul'Anjou", statut: "brief", collab: null, montant: 2400, cout: 600, tempsAlloue: 21.7, tempsConsomme: 0, timer: false, timerStart: null, priorite: "moyenne" },
];

function getRentaInfo(consumed, allocated) {
  const pct = allocated > 0 ? (consumed / allocated) * 100 : 0;
  if (pct < 75) return { color: COLORS.vert, bg: COLORS.vertBg, label: "OK", pct };
  if (pct <= 100) return { color: COLORS.orange, bg: COLORS.orangeBg, label: "Limite", pct };
  return { color: COLORS.rouge, bg: COLORS.rougeBg, label: "Dépassé", pct };
}

const prioriteStyles = {
  haute: { color: COLORS.rouge, label: "●", title: "Haute" },
  moyenne: { color: COLORS.orange, label: "●", title: "Moyenne" },
  basse: { color: COLORS.vert, label: "●", title: "Basse" },
};

function Avatar({ collab, size = 28 }) {
  if (!collab) return <div style={{ width: size, height: size, borderRadius: "50%", background: "#E0E0E0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, color: "#999", flexShrink: 0 }}>?</div>;
  return (
    <div title={`${collab.nom} — ${collab.pole}`} style={{ width: size, height: size, borderRadius: "50%", background: collab.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.38, color: "#fff", fontWeight: 700, flexShrink: 0, cursor: "default" }}>
      {collab.avatar}
    </div>
  );
}

function MiniProgressBar({ consumed, allocated }) {
  const pct = allocated > 0 ? Math.min((consumed / allocated) * 100, 120) : 0;
  const display = Math.min(pct, 100);
  const info = getRentaInfo(consumed, allocated);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ flex: 1, height: 5, borderRadius: 3, background: "#EEEEE9", overflow: "hidden" }}>
        <div style={{ width: `${display}%`, height: "100%", borderRadius: 3, background: info.color, transition: "width 0.4s ease" }} />
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color: info.color }}>{Math.round(pct)}%</span>
    </div>
  );
}

function TimerDisplay({ tache, onToggle }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!tache.timer || !tache.timerStart) { setElapsed(0); return; }
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - tache.timerStart) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [tache.timer, tache.timerStart]);

  const total = tache.timer ? elapsed : 0;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const display = tache.timer ? `${h > 0 ? h + ":" : ""}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <button onClick={e => { e.stopPropagation(); onToggle(); }}
        style={{ width: 26, height: 26, borderRadius: "50%", border: "none", background: tache.timer ? COLORS.rouge : COLORS.vert, color: "#fff", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: tache.timer ? `0 0 0 3px ${COLORS.rouge}33` : "none" }}>
        {tache.timer ? "⏸" : "▶"}
      </button>
      {display && <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.rouge, fontVariantNumeric: "tabular-nums", animation: "pulse 1.5s infinite" }}>{display}</span>}
    </div>
  );
}

/* ============================================================
   TASK CARD — adapts to role (direction vs collaborateur)
   ============================================================ */
function TaskCard({ tache, collab, onDragStart, onClick, onTimerToggle, isDragging, isDirection }) {
  const marge = tache.montant - tache.cout;
  const info = getRentaInfo(tache.tempsConsomme, tache.tempsAlloue);
  const prio = prioriteStyles[tache.priorite];
  const remaining = Math.max(tache.tempsAlloue - tache.tempsConsomme, 0);

  return (
    <div draggable onDragStart={onDragStart} onClick={onClick}
      style={{
        background: COLORS.blanc, borderRadius: 12, padding: "14px 14px 12px", marginBottom: 8, cursor: "grab",
        border: `1px solid ${isDragging ? COLORS.dore : COLORS.grisBorder}`,
        boxShadow: isDragging ? `0 8px 24px ${COLORS.dore}33` : "0 1px 3px rgba(0,0,0,0.04)",
        transition: "all 0.2s cubic-bezier(.4,0,.2,1)",
        opacity: isDragging ? 0.7 : 1, transform: isDragging ? "rotate(2deg) scale(1.02)" : "none",
      }}
      onMouseEnter={e => { if (!isDragging) { e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; e.currentTarget.style.borderColor = COLORS.dore + "88"; } }}
      onMouseLeave={e => { if (!isDragging) { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)"; e.currentTarget.style.borderColor = COLORS.grisBorder; } }}>
      
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: COLORS.grisMoyen, textTransform: "uppercase", letterSpacing: 0.5, maxWidth: "80%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tache.projet}</span>
        <span title={prio.title} style={{ fontSize: 10, color: prio.color }}>{prio.label}</span>
      </div>

      {/* Nom */}
      <div style={{ fontWeight: 600, fontSize: 13, color: COLORS.noir, lineHeight: 1.35, marginBottom: 10 }}>
        {tache.nom}
        {tache.abonnement && <span style={{ marginLeft: 6, fontSize: 9, padding: "2px 6px", borderRadius: 4, background: COLORS.dorePale, color: COLORS.dore, fontWeight: 700, verticalAlign: "middle" }}>ABO</span>}
      </div>

      {/* === DIRECTION : montant HT + marge + temps === */}
      {isDirection && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: COLORS.grisMoyen, marginBottom: 4 }}>
            <span>Montant: <strong style={{ color: COLORS.noir }}>{tache.montant.toLocaleString("fr-FR")}€</strong> HT</span>
            <span style={{ padding: "2px 8px", borderRadius: 10, background: COLORS.dorePale, color: COLORS.dore, fontWeight: 700, fontSize: 10 }}>Marge {marge.toLocaleString("fr-FR")}€</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: COLORS.grisMoyen }}>
            <span>Temps: <strong style={{ color: COLORS.noir }}>{tache.tempsConsomme}h</strong> / {tache.tempsAlloue}h</span>
            <span style={{ fontSize: 10, color: remaining > 0 ? COLORS.vert : COLORS.rouge, fontWeight: 600 }}>{remaining.toFixed(1)}h restantes</span>
          </div>
        </div>
      )}

      {/* === COLLABORATEUR : temps vendu uniquement — AUCUN MONTANT === */}
      {!isDirection && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: COLORS.noir }}>{tache.tempsAlloue}h</span>
              <span style={{ fontSize: 11, color: COLORS.grisMoyen }}>vendues</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: remaining > 0 ? COLORS.noir : COLORS.rouge }}>
              {remaining > 0 ? `${remaining.toFixed(1)}h restantes` : "Temps dépassé"}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: COLORS.grisMoyen }}>
            <span>Consommé : <strong style={{ color: COLORS.noir }}>{tache.tempsConsomme}h</strong></span>
          </div>
        </div>
      )}

      {/* Progress */}
      <MiniProgressBar consumed={tache.tempsConsomme} allocated={tache.tempsAlloue} />

      {/* Footer */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 10, borderTop: `1px solid ${COLORS.grisBorder}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Avatar collab={collab} size={24} />
          <span style={{ fontSize: 11, color: COLORS.grisMoyen }}>{collab?.nom || "Non affecté"}</span>
        </div>
        <TimerDisplay tache={tache} onToggle={onTimerToggle} />
      </div>
    </div>
  );
}

/* ============================================================
   DETAIL MODAL — adapts to role
   ============================================================ */
function TaskDetailModal({ tache, collab, onClose, onStatutChange, isDirection }) {
  if (!tache) return null;
  const marge = tache.montant - tache.cout;
  const ratio = tache.tempsAlloue > 0 ? (tache.tempsConsomme / tache.tempsAlloue) * 100 : 0;
  const info = getRentaInfo(tache.tempsConsomme, tache.tempsAlloue);
  const remaining = Math.max(tache.tempsAlloue - tache.tempsConsomme, 0);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, animation: "fadeIn 0.2s ease" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: COLORS.blanc, borderRadius: 20, width: 520, maxHeight: "85vh", overflow: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.2)" }}>
        
        {/* Header */}
        <div style={{ padding: "24px 28px 16px", borderBottom: `1px solid ${COLORS.grisBorder}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 11, color: COLORS.grisMoyen, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>{tache.projet}</div>
              <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 22, color: COLORS.noir, margin: 0 }}>{tache.nom}</h2>
            </div>
            <button onClick={onClose} style={{ background: COLORS.gris, border: "none", width: 32, height: 32, borderRadius: "50%", cursor: "pointer", fontSize: 16, color: COLORS.grisMoyen, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
        </div>

        <div style={{ padding: "20px 28px" }}>
          {/* Statut selector */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.grisMoyen, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>Statut</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {STATUTS.map(s => (
                <button key={s.id} onClick={() => onStatutChange(tache.id, s.id)}
                  style={{ padding: "6px 14px", borderRadius: 20, border: tache.statut === s.id ? `2px solid ${s.color}` : "1px solid #E0E0E0", background: tache.statut === s.id ? s.bg : COLORS.blanc, color: tache.statut === s.id ? s.color : COLORS.grisMoyen, fontSize: 12, fontWeight: tache.statut === s.id ? 700 : 400, cursor: "pointer", fontFamily: "inherit" }}>
                  {s.icon} {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Collaborateur */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 0", borderTop: `1px solid ${COLORS.grisBorder}` }}>
            <Avatar collab={collab} size={36} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.noir }}>{collab?.nom || "Non affecté"}</div>
              <div style={{ fontSize: 12, color: COLORS.grisMoyen }}>{collab?.pole || "En attente d'affectation"}</div>
            </div>
          </div>

          {/* === DIRECTION ONLY: Financier === */}
          {isDirection && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, margin: "16px 0", padding: "16px", background: COLORS.gris, borderRadius: 12 }}>
              <div>
                <div style={{ fontSize: 10, color: COLORS.grisMoyen, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 2 }}>Montant HT</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.noir }}>{tache.montant.toLocaleString("fr-FR")}€</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: COLORS.grisMoyen, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 2 }}>Coût revient</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.grisMoyen }}>{tache.cout.toLocaleString("fr-FR")}€</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: COLORS.grisMoyen, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 2 }}>Marge</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.dore }}>{marge.toLocaleString("fr-FR")}€</div>
              </div>
            </div>
          )}

          {/* Temps de production — visible par tous, formulation adaptée */}
          <div style={{ padding: "16px", background: COLORS.gris, borderRadius: 12, marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: COLORS.grisMoyen, textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 2 }}>Temps de production</div>
                {isDirection ? (
                  <div style={{ fontSize: 16 }}>
                    <strong style={{ color: COLORS.noir }}>{tache.tempsConsomme}h</strong>
                    <span style={{ color: COLORS.grisMoyen }}> consommées sur </span>
                    <strong style={{ color: COLORS.noir }}>{tache.tempsAlloue}h</strong>
                    <span style={{ color: COLORS.grisMoyen }}> allouées</span>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.noir, lineHeight: 1.2 }}>{tache.tempsAlloue}h <span style={{ fontSize: 14, fontWeight: 400, color: COLORS.grisMoyen }}>vendues</span></div>
                    <div style={{ fontSize: 14, marginTop: 4 }}>
                      <span style={{ color: COLORS.noir, fontWeight: 600 }}>{tache.tempsConsomme}h</span>
                      <span style={{ color: COLORS.grisMoyen }}> consommées · </span>
                      <span style={{ color: remaining > 0 ? COLORS.vert : COLORS.rouge, fontWeight: 700 }}>{remaining.toFixed(1)}h restantes</span>
                    </div>
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: info.color }}>{Math.round(ratio)}%</div>
                <div style={{ fontSize: 11, color: info.color, fontWeight: 600 }}>{info.label}</div>
              </div>
            </div>
            <div style={{ height: 10, borderRadius: 5, background: "#E5E5E0", overflow: "hidden" }}>
              <div style={{ width: `${Math.min(ratio, 100)}%`, height: "100%", borderRadius: 5, background: ratio > 100 ? `repeating-linear-gradient(135deg, ${info.color}, ${info.color} 4px, ${info.color}99 4px, ${info.color}99 8px)` : info.color, transition: "width 0.5s ease" }} />
            </div>
            {isDirection && (
              <div style={{ fontSize: 11, color: COLORS.grisMoyen, marginTop: 6 }}>
                Calcul : marge {marge.toLocaleString("fr-FR")}€ ÷ 83€/h = {tache.tempsAlloue}h
              </div>
            )}
          </div>

          {/* BAT (si applicable) */}
          {(tache.statut === "bat" || tache.statut === "validation") && (
            <div style={{ padding: "16px", background: "#E1F5FE", borderRadius: 12, marginBottom: 16, border: "1px solid #B3E5FC" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0277BD", marginBottom: 10 }}>✉ Module BAT</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "#4CAF50", color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>✓ BAT OK</button>
                <button style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "#E53935", color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>✕ BAT Non</button>
                <button style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "#FF9800", color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>✎ À modifier</button>
              </div>
            </div>
          )}

          {/* Facturation — DIRECTION ONLY */}
          {isDirection && (
            <div style={{ padding: "16px", border: `1px solid ${COLORS.grisBorder}`, borderRadius: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.noir, marginBottom: 10 }}>€ Facturation</div>
              <div style={{ display: "flex", gap: 8 }}>
                {["30%", "50%", "100%"].map(p => (
                  <button key={p} style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1px solid ${COLORS.grisBorder}`, background: COLORS.blanc, color: COLORS.noir, fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}
                    onMouseEnter={e => { e.currentTarget.style.background = COLORS.dorePale; e.currentTarget.style.borderColor = COLORS.dore; }}
                    onMouseLeave={e => { e.currentTarget.style.background = COLORS.blanc; e.currentTarget.style.borderColor = COLORS.grisBorder; }}>
                    Facturer {p}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MAIN KANBAN
   ============================================================ */
export default function KanbanBoard() {
  const [taches, setTaches] = useState(INITIAL_TACHES);
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [selectedTache, setSelectedTache] = useState(null);
  const [filterCollab, setFilterCollab] = useState(null);
  const [filterProjet, setFilterProjet] = useState(null);
  const [role, setRole] = useState("direction"); // "direction" ou "collaborateur"

  const isDirection = role === "direction";
  const projets = [...new Set(INITIAL_TACHES.map(t => t.projet))];

  const filteredTaches = taches.filter(t => {
    if (filterCollab && t.collab !== filterCollab) return false;
    if (filterProjet && t.projet !== filterProjet) return false;
    return true;
  });

  const handleDrop = (statutId) => {
    if (draggedId !== null) setTaches(prev => prev.map(t => t.id === draggedId ? { ...t, statut: statutId } : t));
    setDraggedId(null);
    setDragOverCol(null);
  };

  const toggleTimer = (id) => {
    setTaches(prev => prev.map(t => {
      if (t.id !== id) return t;
      if (t.timer) {
        const elapsed = (Date.now() - t.timerStart) / 3600000;
        return { ...t, timer: false, timerStart: null, tempsConsomme: Math.round((t.tempsConsomme + elapsed) * 10) / 10 };
      }
      return { ...t, timer: true, timerStart: Date.now() };
    }));
  };

  const changeStatut = (id, newStatut) => {
    setTaches(prev => prev.map(t => t.id === id ? { ...t, statut: newStatut } : t));
    setSelectedTache(prev => prev ? { ...prev, statut: newStatut } : null);
  };

  const activeTimers = taches.filter(t => t.timer).length;

  return (
    <div style={{ minHeight: "100vh", background: COLORS.gris, fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Serif+Display&display=swap" rel="stylesheet" />
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: #D4D4D0; border-radius: 3px; }
      `}</style>

      {/* TOP BAR */}
      <div style={{ background: COLORS.noirDeep, padding: "12px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <span style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 18, color: COLORS.dore }}>GROUPE ÉCHO</span>
          <span style={{ color: "#444", fontSize: 18 }}>|</span>
          <span style={{ color: "#AAA", fontSize: 14, fontWeight: 500 }}>Vue Kanban</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {activeTimers > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 20, background: COLORS.rouge + "22", border: `1px solid ${COLORS.rouge}44` }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: COLORS.rouge, animation: "pulse 1.5s infinite" }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.rouge }}>{activeTimers} timer{activeTimers > 1 ? "s" : ""} actif{activeTimers > 1 ? "s" : ""}</span>
            </div>
          )}

          {/* === ROLE SWITCHER === */}
          <div style={{ display: "flex", background: "#2A2A2A", borderRadius: 10, padding: 3, gap: 2 }}>
            <button onClick={() => setRole("direction")}
              style={{ padding: "6px 16px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: isDirection ? COLORS.dore : "transparent", color: isDirection ? COLORS.noir : "#888", transition: "all 0.2s" }}>
              👑 Direction
            </button>
            <button onClick={() => setRole("collaborateur")}
              style={{ padding: "6px 16px", borderRadius: 8, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", background: !isDirection ? COLORS.dore : "transparent", color: !isDirection ? COLORS.noir : "#888", transition: "all 0.2s" }}>
              👤 Collaborateur
            </button>
          </div>

          <div style={{ width: 32, height: 32, borderRadius: "50%", background: `linear-gradient(135deg, ${COLORS.dore}, ${COLORS.doreLight})`, display: "flex", alignItems: "center", justifyContent: "center", color: COLORS.noir, fontWeight: 700, fontSize: 13 }}>
            {isDirection ? "MC" : "N"}
          </div>
        </div>
      </div>

      {/* ROLE BANNER */}
      <div style={{ padding: "8px 28px", background: isDirection ? COLORS.dorePale : "#E8EAF6", borderBottom: `1px solid ${isDirection ? COLORS.dore + "44" : "#C5CAE9"}`, display: "flex", alignItems: "center", gap: 8, fontSize: 12, transition: "all 0.3s" }}>
        <span style={{ fontWeight: 700, color: isDirection ? COLORS.dore : "#3949AB" }}>
          {isDirection ? "👑 Vue Direction" : "👤 Vue Collaborateur"}
        </span>
        <span style={{ color: COLORS.grisMoyen }}>—</span>
        <span style={{ color: COLORS.grisMoyen }}>
          {isDirection
            ? "Accès complet : montants HT, marges, coûts de revient, temps, facturation et rentabilité"
            : "Accès restreint : seuls le temps vendu, le temps consommé et le temps restant sont visibles"}
        </span>
      </div>

      {/* FILTERS */}
      <div style={{ padding: "12px 28px", display: "flex", gap: 12, alignItems: "center", borderBottom: `1px solid ${COLORS.grisBorder}`, background: COLORS.blanc }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.grisMoyen, textTransform: "uppercase", letterSpacing: 0.5 }}>Filtrer :</span>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => setFilterCollab(null)}
            style={{ padding: "5px 12px", borderRadius: 16, border: `1px solid ${!filterCollab ? COLORS.dore : COLORS.grisBorder}`, background: !filterCollab ? COLORS.dorePale : COLORS.blanc, color: !filterCollab ? COLORS.dore : COLORS.grisMoyen, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            Tous
          </button>
          {COLLABORATEURS.map(c => (
            <button key={c.id} onClick={() => setFilterCollab(filterCollab === c.id ? null : c.id)}
              style={{ padding: "5px 12px", borderRadius: 16, border: `1px solid ${filterCollab === c.id ? c.color : COLORS.grisBorder}`, background: filterCollab === c.id ? c.color + "18" : COLORS.blanc, color: filterCollab === c.id ? c.color : COLORS.grisMoyen, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.color }} />
              {c.nom}
            </button>
          ))}
        </div>
        <span style={{ color: "#DDD" }}>|</span>
        <select value={filterProjet || ""} onChange={e => setFilterProjet(e.target.value || null)}
          style={{ padding: "5px 10px", borderRadius: 8, border: `1px solid ${COLORS.grisBorder}`, fontSize: 12, color: COLORS.noir, background: COLORS.blanc, fontFamily: "inherit", cursor: "pointer" }}>
          <option value="">Tous les projets</option>
          {projets.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <div style={{ marginLeft: "auto", fontSize: 12, color: COLORS.grisMoyen }}>{filteredTaches.length} tâche{filteredTaches.length > 1 ? "s" : ""}</div>
      </div>

      {/* KANBAN COLUMNS */}
      <div style={{ display: "flex", gap: 12, padding: "20px 28px", overflowX: "auto", minHeight: "calc(100vh - 160px)" }}>
        {STATUTS.map(statut => {
          const colTaches = filteredTaches.filter(t => t.statut === statut.id);
          const isOver = dragOverCol === statut.id;
          return (
            <div key={statut.id}
              onDragOver={e => { e.preventDefault(); setDragOverCol(statut.id); }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={() => handleDrop(statut.id)}
              style={{
                flex: "0 0 260px", background: isOver ? statut.bg : "#F0F0ED", borderRadius: 14, padding: "0 0 12px",
                border: isOver ? `2px dashed ${statut.color}` : "2px solid transparent",
                transition: "all 0.2s ease", display: "flex", flexDirection: "column",
              }}>
              <div style={{ padding: "14px 14px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: statut.color }} />
                  <span style={{ fontWeight: 700, fontSize: 13, color: COLORS.noir }}>{statut.label}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.grisMoyen, background: COLORS.blanc, width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>{colTaches.length}</span>
              </div>
              <div style={{ padding: "0 8px", flex: 1, overflowY: "auto" }}>
                {colTaches.map(tache => (
                  <TaskCard key={tache.id} tache={tache} collab={COLLABORATEURS.find(c => c.id === tache.collab)}
                    onDragStart={() => setDraggedId(tache.id)} onClick={() => setSelectedTache(tache)}
                    onTimerToggle={() => toggleTimer(tache.id)} isDragging={draggedId === tache.id}
                    isDirection={isDirection} />
                ))}
                {colTaches.length === 0 && (
                  <div style={{ textAlign: "center", padding: "24px 12px", color: "#CCC", fontSize: 12, fontStyle: "italic" }}>Glissez une tâche ici</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* DETAIL MODAL */}
      {selectedTache && (
        <TaskDetailModal
          tache={taches.find(t => t.id === selectedTache.id) || selectedTache}
          collab={COLLABORATEURS.find(c => c.id === selectedTache.collab)}
          onClose={() => setSelectedTache(null)}
          onStatutChange={changeStatut}
          isDirection={isDirection}
        />
      )}
    </div>
  );
}
