"use client";

import { useState, useEffect } from "react";
import Avatar from "@/components/ui/Avatar";
import { COLLABORATEURS, COLORS, getRentabiliteColor } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth-context";
import { useBats, BAT_MAX_SIZE } from "@/lib/bat-context";
import BatPanel from "@/components/BatPanel";

const STATUTS = [
  { id: "brief",      label: "Brief",             color: "#7C3AED", bg: "#F3E8FF" },
  { id: "afaire",     label: "À faire",           color: "#3949AB", bg: "#E8EAF6" },
  { id: "encours",    label: "En cours",          color: "#2E7D32", bg: "#E8F5E9" },
  { id: "attente",    label: "Attente élément",   color: "#E65100", bg: "#FFF3E0" },
  { id: "validation", label: "Validation client", color: "#F57F17", bg: "#FFF8E1" },
  { id: "bat",        label: "BAT envoyé",        color: "#0277BD", bg: "#E1F5FE" },
  { id: "termine",    label: "Terminé",           color: "#37474F", bg: "#ECEFF1" },
];

type KanbanTache = {
  id: number; nom: string; projet: string; statut: string; collab: number | null;
  montant: number; cout: number; tempsAlloue: number; tempsConsomme: number;
  timer: boolean; timerStart: number | null;
  priorite: "haute" | "moyenne" | "basse"; abonnement?: boolean;
};

const INITIAL_TACHES: KanbanTache[] = [
  { id: 1,  nom: "Maquettes site e-commerce",   projet: "Maison Relais Gourmet",  statut: "encours",    collab: 1,    montant: 3800, cout: 1800, tempsAlloue: 24.1, tempsConsomme: 18.5, timer: false, timerStart: null, priorite: "haute"   },
  { id: 2,  nom: "Intégration WooCommerce",     projet: "Maison Relais Gourmet",  statut: "afaire",     collab: 5,    montant: 2700, cout: 1000, tempsAlloue: 20.5, tempsConsomme: 0,    timer: false, timerStart: null, priorite: "moyenne" },
  { id: 3,  nom: "Rédaction fiches produits",   projet: "Maison Relais Gourmet",  statut: "brief",      collab: 2,    montant: 2000, cout: 0,    tempsAlloue: 24.1, tempsConsomme: 0,    timer: false, timerStart: null, priorite: "basse"   },
  { id: 4,  nom: "Maquettes UI/UX",             projet: "Netzy",                  statut: "bat",        collab: 1,    montant: 2500, cout: 900,  tempsAlloue: 19.3, tempsConsomme: 17,   timer: false, timerStart: null, priorite: "haute"   },
  { id: 5,  nom: "Développement WordPress",     projet: "Netzy",                  statut: "attente",    collab: 4,    montant: 2800, cout: 1000, tempsAlloue: 21.7, tempsConsomme: 8,    timer: false, timerStart: null, priorite: "haute"   },
  { id: 6,  nom: "SEO on-page",                 projet: "Netzy",                  statut: "brief",      collab: 2,    montant: 900,  cout: 0,    tempsAlloue: 10.8, tempsConsomme: 0,    timer: false, timerStart: null, priorite: "moyenne" },
  { id: 7,  nom: "Posts réseaux sociaux Mars",  projet: "Vins d'Anjou-Saumur",    statut: "encours",    collab: 3,    montant: 1600, cout: 400,  tempsAlloue: 14.5, tempsConsomme: 11,   timer: false, timerStart: null, priorite: "moyenne", abonnement: true },
  { id: 8,  nom: "Shooting photo printemps",    projet: "Vins d'Anjou-Saumur",    statut: "validation", collab: 1,    montant: 1600, cout: 400,  tempsAlloue: 14.5, tempsConsomme: 12,   timer: false, timerStart: null, priorite: "haute"   },
  { id: 9,  nom: "Identité visuelle",           projet: "BÉRYL Patrimoine",       statut: "termine",    collab: 1,    montant: 5000, cout: 2000, tempsAlloue: 36.1, tempsConsomme: 30,   timer: false, timerStart: null, priorite: "haute"   },
  { id: 10, nom: "Charte graphique",            projet: "BÉRYL Patrimoine",       statut: "encours",    collab: 1,    montant: 4500, cout: 1000, tempsAlloue: 30.1, tempsConsomme: 22,   timer: false, timerStart: null, priorite: "haute"   },
  { id: 11, nom: "Supports print",              projet: "BÉRYL Patrimoine",       statut: "afaire",     collab: 1,    montant: 2500, cout: 500,  tempsAlloue: 18.1, tempsConsomme: 0,    timer: false, timerStart: null, priorite: "moyenne" },
  { id: 12, nom: "Recherche naming",            projet: "Roul'Anjou",             statut: "brief",      collab: null, montant: 2400, cout: 600,  tempsAlloue: 21.7, tempsConsomme: 0,    timer: false, timerStart: null, priorite: "haute"   },
  { id: 13, nom: "Création logo",               projet: "Roul'Anjou",             statut: "brief",      collab: null, montant: 2400, cout: 600,  tempsAlloue: 21.7, tempsConsomme: 0,    timer: false, timerStart: null, priorite: "moyenne" },
];

const prioStyles: Record<string, { color: string; label: string }> = {
  haute:   { color: COLORS.rouge,  label: "▲" },
  moyenne: { color: COLORS.orange, label: "●" },
  basse:   { color: COLORS.vert,   label: "▼" },
};

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

/** Détecte un nom de mois dans une chaîne et renvoie son index (0-11) ou -1. */
function detectMonth(text: string): { index: number; match: string } | null {
  for (let i = 0; i < MONTHS_FR.length; i++) {
    const m = MONTHS_FR[i];
    const re = new RegExp(`\\b${m}\\b`, "i");
    const found = text.match(re);
    if (found) return { index: i, match: found[0] };
  }
  return null;
}

/** Renvoie le nom du mois suivant en fonction d'un index 0-11. */
function nextMonthName(index: number): string {
  return MONTHS_FR[(index + 1) % 12];
}

function MiniProgress({ consumed, allocated }: { consumed: number; allocated: number }) {
  const pct = allocated > 0 ? Math.min((consumed / allocated) * 100, 120) : 0;
  const display = Math.min(pct, 100);
  const info = getRentabiliteColor(pct);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ flex: 1, height: 5, borderRadius: 3, background: "#EEEEE9", overflow: "hidden" }}>
        <div style={{ width: `${display}%`, height: "100%", borderRadius: 3, background: info.color, transition: "width 0.4s ease" }} />
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color: info.color }}>{Math.round(pct)}%</span>
    </div>
  );
}

function TimerDisplay({ tache, onToggle }: { tache: KanbanTache; onToggle: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!tache.timer || !tache.timerStart) {
      setElapsed(0);
      return;
    }
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - (tache.timerStart ?? 0)) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [tache.timer, tache.timerStart]);

  const total = tache.timer ? elapsed : 0;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const display = tache.timer
    ? `${h > 0 ? h + ":" : ""}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        style={{
          width: 26, height: 26, borderRadius: "50%", border: "none",
          background: tache.timer ? COLORS.rouge : COLORS.vert, color: "#fff",
          fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: tache.timer ? `0 0 0 3px ${COLORS.rouge}33` : "none",
        }}
      >
        {tache.timer ? "⏸" : "▶"}
      </button>
      {display && (
        <span style={{
          fontSize: 12, fontWeight: 700, color: COLORS.rouge,
          fontVariantNumeric: "tabular-nums", animation: "pulse 1.5s infinite",
        }}>{display}</span>
      )}
    </div>
  );
}

function TaskCard({
  tache, bat, onDragStart, onClick, onTimerToggle, isDragging, isDirection,
}: {
  tache: KanbanTache;
  bat?: ReturnType<typeof useBats>["bats"][number];
  onDragStart: () => void;
  onClick: () => void;
  onTimerToggle: () => void;
  isDragging: boolean;
  isDirection: boolean;
}) {
  const collab = COLLABORATEURS.find((c) => c.id === tache.collab);
  const marge = tache.montant - tache.cout;
  const prio = prioStyles[tache.priorite];
  const remaining = Math.max(tache.tempsAlloue - tache.tempsConsomme, 0);

  // Style du badge BAT en fonction du statut
  const batBadge = bat ? (() => {
    if (bat.statut === "valide")   return { bg: COLORS.vertBg,  color: "#1B5E20",    icon: "✓", label: `BAT v${bat.version} validé` };
    if (bat.statut === "modifier") return { bg: COLORS.rougeBg, color: COLORS.rouge, icon: "✎", label: `BAT v${bat.version} à modifier` };
    return                                { bg: "#E1F5FE",      color: "#0277BD",    icon: "📄", label: `BAT v${bat.version} envoyé` };
  })() : null;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      style={{
        background: COLORS.blanc, borderRadius: 12,
        padding: "14px 14px 12px", marginBottom: 8, cursor: "grab",
        border: `1px solid ${isDragging ? COLORS.dore : COLORS.grisBorder}`,
        boxShadow: isDragging ? `0 8px 24px ${COLORS.dore}33` : "0 1px 3px rgba(0,0,0,0.04)",
        transition: "all 0.2s cubic-bezier(.4,0,.2,1)",
        opacity: isDragging ? 0.7 : 1,
        transform: isDragging ? "rotate(2deg) scale(1.02)" : "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{
          fontSize: 10, fontWeight: 600, color: COLORS.grisMoyen,
          textTransform: "uppercase", letterSpacing: 0.5,
          maxWidth: "80%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{tache.projet}</span>
        <span style={{ fontSize: 10, color: prio.color }}>{prio.label}</span>
      </div>

      <div style={{ fontWeight: 600, fontSize: 13, color: COLORS.noir, lineHeight: 1.35, marginBottom: 8 }}>
        {tache.nom}
        {tache.abonnement && (
          <span style={{
            marginLeft: 6, fontSize: 9, padding: "2px 6px", borderRadius: 4,
            background: COLORS.dorePale, color: COLORS.dore, fontWeight: 700, verticalAlign: "middle",
          }}>ABO</span>
        )}
      </div>

      {batBadge && (
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "3px 8px", borderRadius: 4,
          background: batBadge.bg, color: batBadge.color,
          fontSize: 10, fontWeight: 700, marginBottom: 10,
        }}>
          <span>{batBadge.icon}</span>
          <span>{batBadge.label}</span>
        </div>
      )}

      {isDirection && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: COLORS.grisMoyen, marginBottom: 4 }}>
            <span>Montant: <strong style={{ color: COLORS.noir }}>{tache.montant.toLocaleString("fr-FR")}€</strong> HT</span>
            <span style={{ padding: "2px 8px", borderRadius: 10, background: COLORS.dorePale, color: COLORS.dore, fontWeight: 700, fontSize: 10 }}>
              Marge {marge.toLocaleString("fr-FR")}€
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: COLORS.grisMoyen }}>
            <span>Temps: <strong style={{ color: COLORS.noir }}>{tache.tempsConsomme}h</strong> / {tache.tempsAlloue}h</span>
            <span style={{ fontSize: 10, color: remaining > 0 ? COLORS.vert : COLORS.rouge, fontWeight: 600 }}>
              {remaining.toFixed(1)}h restantes
            </span>
          </div>
        </div>
      )}

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
          <div style={{ fontSize: 11, color: COLORS.grisMoyen }}>
            Consommé : <strong style={{ color: COLORS.noir }}>{tache.tempsConsomme}h</strong>
          </div>
        </div>
      )}

      <MiniProgress consumed={tache.tempsConsomme} allocated={tache.tempsAlloue} />

      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginTop: 10, paddingTop: 10, borderTop: `1px solid ${COLORS.grisBorder}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Avatar collab={collab} size={24} />
          <span style={{ fontSize: 11, color: COLORS.grisMoyen }}>{collab?.nom || "Non affecté"}</span>
        </div>
        <TimerDisplay tache={tache} onToggle={onTimerToggle} />
      </div>
    </div>
  );
}

export default function KanbanPage() {
  const { currentUser, canSeeMoney } = useAuth();
  const { bats, getBatByTaskId, createBat } = useBats();

  const [taches, setTaches] = useState<KanbanTache[]>(INITIAL_TACHES);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);
  const [filterCollab, setFilterCollab] = useState<number | null>(null);
  const [filterProjet, setFilterProjet] = useState<string | null>(null);
  const [selectedTacheId, setSelectedTacheId] = useState<number | null>(null);
  const [batError, setBatError] = useState<string | null>(null);

  const isDirection = canSeeMoney;
  const projets = [...new Set(INITIAL_TACHES.map((t) => t.projet))];

  const selectedTache = selectedTacheId !== null ? taches.find((t) => t.id === selectedTacheId) ?? null : null;
  const selectedBat   = selectedTache ? getBatByTaskId(selectedTache.id) : undefined;

  /** Affecte un collaborateur à une tâche. */
  const assignCollabToTask = (taskId: number, newCollabId: number | null) => {
    setTaches((prev) => prev.map((t) => t.id === taskId ? { ...t, collab: newCollabId } : t));
  };

  /** Régénère une tâche d'abonnement pour le mois suivant.
   *  Crée une copie de la tâche avec le mois mis à jour dans le nom,
   *  remet le temps consommé à 0, statut "à faire". */
  const regenerateSubscription = (taskId: number) => {
    const source = taches.find((t) => t.id === taskId);
    if (!source || !source.abonnement) return;

    let newNom = source.nom;
    const detected = detectMonth(source.nom);
    if (detected) {
      const next = nextMonthName(detected.index);
      // Préserve la casse simple : on remplace par le nom détecté avec capitale identique au mois courant
      newNom = source.nom.replace(detected.match, next);
    } else {
      // Pas de mois dans le nom : on en ajoute un
      const now = new Date();
      const m = MONTHS_FR[now.getMonth()];
      newNom = `${source.nom} — ${m}`;
    }

    const newId = Math.max(...taches.map((t) => t.id)) + 1;
    const newTache: KanbanTache = {
      ...source,
      id: newId,
      nom: newNom,
      statut: "afaire",
      tempsConsomme: 0,
      timer: false,
      timerStart: null,
    };
    setTaches((prev) => [...prev, newTache]);
    return newId;
  };

  const handleUploadBatForTask = (file: File) => {
    if (!selectedTache) return;
    setBatError(null);
    if (file.type !== "application/pdf") {
      setBatError("Seuls les PDF sont acceptés.");
      return;
    }
    if (file.size > BAT_MAX_SIZE) {
      setBatError(`Fichier trop lourd (max ${(BAT_MAX_SIZE / 1024 / 1024).toFixed(0)} Mo).`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        createBat({
          taskId: selectedTache.id,
          taskName: selectedTache.nom,
          projet: selectedTache.projet,
          client: selectedTache.projet.split(" — ")[0] ?? selectedTache.projet,
          collabId: selectedTache.collab,
          pdfName: file.name,
          pdfDataUrl: reader.result as string,
          pdfSize: file.size,
          uploadedBy: currentUser.nom,
        });
        // Pousse la tâche dans la colonne "BAT envoyé"
        setTaches((prev) => prev.map((t) => t.id === selectedTache.id ? { ...t, statut: "bat" } : t));
      } catch (e) {
        setBatError(e instanceof Error ? e.message : "Erreur");
      }
    };
    reader.readAsDataURL(file);
  };

  const filteredTaches = taches.filter((t) => {
    if (filterCollab && t.collab !== filterCollab) return false;
    if (filterProjet && t.projet !== filterProjet) return false;
    return true;
  });

  const handleDrop = (statutId: string) => {
    if (draggedId !== null) {
      setTaches((prev) => prev.map((t) => (t.id === draggedId ? { ...t, statut: statutId } : t)));
    }
    setDraggedId(null);
    setDragOverCol(null);
  };

  const toggleTimer = (id: number) => {
    setTaches((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        if (t.timer) {
          const elapsed = (Date.now() - (t.timerStart ?? Date.now())) / 3600000;
          return { ...t, timer: false, timerStart: null, tempsConsomme: Math.round((t.tempsConsomme + elapsed) * 10) / 10 };
        }
        return { ...t, timer: true, timerStart: Date.now() };
      })
    );
  };

  const activeTimers = taches.filter((t) => t.timer).length;

  /**
   * Auto-synchro statut BAT → colonne Kanban.
   * - BAT validé   → tâche en "Terminé"
   * - BAT à modif. → tâche en "À faire" (à reprendre en production)
   * - BAT envoyé   → tâche en "BAT envoyé" (cohérence)
   *
   * On ne touche PAS aux tâches sans BAT, ni aux statuts non concernés.
   */
  useEffect(() => {
    setTaches((prev) => {
      let changed = false;
      const next = prev.map((t) => {
        const bat = getBatByTaskId(t.id);
        if (!bat) return t;
        let target: string | null = null;
        if (bat.statut === "valide"   && t.statut !== "termine") target = "termine";
        if (bat.statut === "modifier" && (t.statut === "bat" || t.statut === "termine")) target = "afaire";
        if (bat.statut === "envoye"   && t.statut === "termine") target = "bat";
        if (target && target !== t.statut) {
          changed = true;
          return { ...t, statut: target };
        }
        return t;
      });
      return changed ? next : prev;
    });
    // dépend uniquement de bats : pas de boucle infinie
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bats]);

  // Le layout (app) ajoute une marge gauche de 240px et un padding ;
  // Pour le kanban on veut occuper toute la largeur dispo donc on utilise un negative margin
  return (
    <div style={{ marginLeft: -40, marginRight: -40, marginTop: -32 }}>
      {/* ROLE + TIMERS BANNER */}
      <div style={{
        background: isDirection ? COLORS.dorePale : "#E8EAF6",
        borderBottom: `1px solid ${isDirection ? COLORS.dore + "44" : "#C5CAE9"}`,
        padding: "10px 28px", display: "flex", alignItems: "center", gap: 12, fontSize: 12,
      }}>
        <span style={{ fontWeight: 700, color: isDirection ? COLORS.dore : "#3949AB" }}>
          {currentUser.role === "direction" ? "★ Vue Direction" :
           currentUser.role === "admin"     ? "★ Vue Admin"     :
                                              "♟ Vue Collaborateur"}
        </span>
        <span style={{ color: COLORS.grisMoyen }}>—</span>
        <span style={{ color: COLORS.grisMoyen, flex: 1 }}>
          {isDirection
            ? "Accès complet : montants HT, marges, coûts de revient, temps, facturation et rentabilité"
            : "Accès restreint : seuls le temps vendu, le temps consommé et le temps restant sont visibles"}
        </span>

        {activeTimers > 0 && (
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "4px 12px", borderRadius: 16,
            background: COLORS.rouge + "22", border: `1px solid ${COLORS.rouge}44`,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: "50%",
              background: COLORS.rouge, animation: "pulse 1.5s infinite",
            }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.rouge }}>
              {activeTimers} timer{activeTimers > 1 ? "s" : ""} actif{activeTimers > 1 ? "s" : ""}
            </span>
          </div>
        )}

        <div style={{
          padding: "4px 12px", borderRadius: 16,
          background: COLORS.blanc, border: `1px solid ${COLORS.grisBorder}`,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <div style={{
            width: 22, height: 22, borderRadius: "50%",
            background: currentUser.color, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 10, fontWeight: 700,
          }}>{currentUser.avatar}</div>
          <span style={{ fontSize: 11, fontWeight: 600, color: COLORS.noir }}>{currentUser.nom}</span>
          <span style={{ fontSize: 10, color: COLORS.grisMoyen }}>· change via la sidebar</span>
        </div>
      </div>

      {/* FILTERS */}
      <div style={{
        padding: "12px 28px", display: "flex", gap: 10, alignItems: "center",
        borderBottom: `1px solid ${COLORS.grisBorder}`, background: COLORS.blanc,
        flexWrap: "wrap",
      }}>
        <span style={{
          fontSize: 11, fontWeight: 600, color: COLORS.grisMoyen,
          textTransform: "uppercase", letterSpacing: 0.5,
        }}>Filtrer :</span>
        <button
          onClick={() => setFilterCollab(null)}
          style={{
            padding: "5px 12px", borderRadius: 16,
            border: `1px solid ${!filterCollab ? COLORS.dore : COLORS.grisBorder}`,
            background: !filterCollab ? COLORS.dorePale : COLORS.blanc,
            color: !filterCollab ? COLORS.dore : COLORS.grisMoyen,
            fontSize: 11, fontWeight: 600, cursor: "pointer",
          }}
        >Tous</button>
        {COLLABORATEURS.map((c) => (
          <button
            key={c.id}
            onClick={() => setFilterCollab(filterCollab === c.id ? null : c.id)}
            style={{
              padding: "5px 12px", borderRadius: 16,
              border: `1px solid ${filterCollab === c.id ? c.color : COLORS.grisBorder}`,
              background: filterCollab === c.id ? c.color + "18" : COLORS.blanc,
              color: filterCollab === c.id ? c.color : COLORS.grisMoyen,
              fontSize: 11, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.color }} />
            {c.nom}
          </button>
        ))}
        <span style={{ color: "#DDD" }}>|</span>
        <select
          value={filterProjet || ""}
          onChange={(e) => setFilterProjet(e.target.value || null)}
          style={{
            padding: "5px 10px", borderRadius: 8,
            border: `1px solid ${COLORS.grisBorder}`, fontSize: 12,
            color: COLORS.noir, background: COLORS.blanc, cursor: "pointer",
          }}
        >
          <option value="">Tous les projets</option>
          {projets.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <div style={{ marginLeft: "auto", fontSize: 12, color: COLORS.grisMoyen }}>
          {filteredTaches.length} tâche{filteredTaches.length > 1 ? "s" : ""}
        </div>
      </div>

      {/* COLUMNS */}
      <div className="kanban-columns">
        {STATUTS.map((statut) => {
          const colTaches = filteredTaches.filter((t) => t.statut === statut.id);
          const isOver = dragOverCol === statut.id;
          return (
            <div
              key={statut.id}
              onDragOver={(e) => { e.preventDefault(); setDragOverCol(statut.id); }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={() => handleDrop(statut.id)}
              style={{
                flex: "0 0 260px",
                background: isOver ? statut.bg : "#F0F0ED",
                borderRadius: 14, padding: "0 0 12px",
                border: isOver ? `2px dashed ${statut.color}` : "2px solid transparent",
                transition: "all 0.2s ease",
                display: "flex", flexDirection: "column",
                minHeight: 200,
              }}
            >
              <div style={{
                padding: "14px 14px 10px",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: statut.color }} />
                  <span style={{ fontWeight: 700, fontSize: 13, color: COLORS.noir }}>{statut.label}</span>
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 700, color: COLORS.grisMoyen,
                  background: COLORS.blanc, width: 24, height: 24, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{colTaches.length}</span>
              </div>
              <div style={{ padding: "0 8px", flex: 1 }}>
                {colTaches.map((tache) => (
                  <TaskCard
                    key={tache.id}
                    tache={tache}
                    bat={getBatByTaskId(tache.id)}
                    onDragStart={() => setDraggedId(tache.id)}
                    onClick={() => setSelectedTacheId(tache.id)}
                    onTimerToggle={() => toggleTimer(tache.id)}
                    isDragging={draggedId === tache.id}
                    isDirection={isDirection}
                  />
                ))}
                {colTaches.length === 0 && (
                  <div style={{
                    textAlign: "center", padding: "24px 12px",
                    color: "#CCC", fontSize: 12, fontStyle: "italic",
                  }}>Glissez une tâche ici</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL TÂCHE + BAT */}
      {selectedTache && (
        <TaskModal
          tache={selectedTache}
          bat={selectedBat}
          isDirection={isDirection}
          batError={batError}
          onClose={() => { setSelectedTacheId(null); setBatError(null); }}
          onUploadBat={handleUploadBatForTask}
          onChangeStatut={(newStatut) => {
            setTaches((prev) => prev.map((t) =>
              t.id === selectedTache.id ? { ...t, statut: newStatut } : t
            ));
          }}
          onRegenerateSubscription={() => {
            const newId = regenerateSubscription(selectedTache.id);
            if (newId) setSelectedTacheId(newId);
          }}
          onAssignCollab={(newCollabId) => assignCollabToTask(selectedTache.id, newCollabId)}
        />
      )}
    </div>
  );
}

/* =====================================================================
   MODAL TÂCHE — détails + actions BAT inline
   ===================================================================== */
function TaskModal({
  tache, bat, isDirection, batError,
  onClose, onUploadBat, onChangeStatut, onRegenerateSubscription, onAssignCollab,
}: {
  tache: KanbanTache;
  bat: ReturnType<typeof useBats>["bats"][number] | undefined;
  isDirection: boolean;
  batError: string | null;
  onClose: () => void;
  onUploadBat: (file: File) => void;
  onChangeStatut: (newStatut: string) => void;
  onRegenerateSubscription: () => void;
  onAssignCollab: (newCollabId: number | null) => void;
}) {
  const collab = COLLABORATEURS.find((c) => c.id === tache.collab);
  const marge = tache.montant - tache.cout;
  const remaining = Math.max(tache.tempsAlloue - tache.tempsConsomme, 0);
  const ratio = tache.tempsAlloue > 0 ? (tache.tempsConsomme / tache.tempsAlloue) * 100 : 0;
  const info = getRentabiliteColor(ratio);

  return (
    <div
      onClick={onClose}
      className="modal-overlay"
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 100, padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="modal-content"
        style={{
          background: COLORS.blanc, borderRadius: 16,
          width: "100%", maxWidth: 1100, maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 24px 80px rgba(0,0,0,0.3)",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "20px 24px",
          borderBottom: `1px solid ${COLORS.grisBorder}`,
          display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16,
          position: "sticky", top: 0, background: COLORS.blanc, zIndex: 1,
        }}>
          <div>
            <div style={{
              fontSize: 11, color: COLORS.grisMoyen, textTransform: "uppercase",
              letterSpacing: 0.5, marginBottom: 4,
            }}>{tache.projet}</div>
            <h2 style={{
              fontFamily: "var(--font-dm-serif-display), Georgia, serif",
              fontSize: 22, color: COLORS.noir, margin: 0,
            }}>
              {tache.nom}
              {tache.abonnement && (
                <span style={{
                  marginLeft: 10, fontSize: 10, padding: "3px 8px", borderRadius: 4,
                  background: COLORS.dorePale, color: COLORS.dore, fontWeight: 700,
                  verticalAlign: "middle",
                }}>ABONNEMENT</span>
              )}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: COLORS.gris, border: "none",
              width: 36, height: 36, borderRadius: "50%",
              cursor: "pointer", fontSize: 18, color: COLORS.grisMoyen,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >×</button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Statut selector */}
          <div style={{ marginBottom: 20 }}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: COLORS.grisMoyen,
              textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8,
            }}>Statut</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {STATUTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onChangeStatut(s.id)}
                  style={{
                    padding: "6px 12px", borderRadius: 16,
                    border: tache.statut === s.id ? `2px solid ${s.color}` : "1px solid #E0E0E0",
                    background: tache.statut === s.id ? s.bg : COLORS.blanc,
                    color: tache.statut === s.id ? s.color : COLORS.grisMoyen,
                    fontSize: 12, fontWeight: tache.statut === s.id ? 700 : 500, cursor: "pointer",
                  }}
                >{s.label}</button>
              ))}
            </div>
          </div>

          {/* Régénération abonnement */}
          {tache.abonnement && isDirection && (
            <div style={{
              padding: "12px 16px", marginBottom: 16,
              background: COLORS.dorePale, border: `1px solid ${COLORS.dore}55`,
              borderRadius: 10,
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
            }}>
              <div style={{ fontSize: 12, color: COLORS.noir }}>
                <strong style={{ color: COLORS.dore }}>↻ Tâche d&apos;abonnement</strong>
                <span style={{ color: COLORS.grisMoyen }}> — créer la prochaine occurrence (mois suivant)</span>
              </div>
              <button
                onClick={onRegenerateSubscription}
                style={{
                  padding: "8px 14px", borderRadius: 8,
                  background: COLORS.noir, border: "none", color: COLORS.dore,
                  fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
                }}
              >Régénérer mois suivant</button>
            </div>
          )}

          {/* Collab + temps */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16,
          }}>
            <div style={{
              padding: 14, background: COLORS.gris, borderRadius: 10,
            }}>
              <div style={{
                fontSize: 10, color: COLORS.grisMoyen,
                textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 6,
              }}>Affecté à</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar collab={collab} size={32} />
                {isDirection ? (
                  <select
                    value={tache.collab ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      onAssignCollab(v === "" ? null : Number(v));
                    }}
                    style={{
                      flex: 1, padding: "6px 8px",
                      border: `1px solid ${COLORS.grisBorder}`, borderRadius: 6,
                      fontSize: 13, color: COLORS.noir, background: COLORS.blanc,
                      outline: "none", fontFamily: "inherit", cursor: "pointer",
                    }}
                  >
                    <option value="">— Non affecté —</option>
                    {COLLABORATEURS.map((c) => (
                      <option key={c.id} value={c.id}>{c.nom} · {c.pole}</option>
                    ))}
                  </select>
                ) : (
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.noir }}>{collab?.nom || "Non affecté"}</div>
                    <div style={{ fontSize: 11, color: COLORS.grisMoyen }}>{collab?.pole || ""}</div>
                  </div>
                )}
              </div>
            </div>
            <div style={{ padding: 14, background: COLORS.gris, borderRadius: 10 }}>
              <div style={{
                fontSize: 10, color: COLORS.grisMoyen,
                textTransform: "uppercase", letterSpacing: 0.3, marginBottom: 4,
              }}>Temps</div>
              <div style={{ fontSize: 14 }}>
                <strong style={{ color: COLORS.noir }}>{tache.tempsConsomme}h</strong>
                <span style={{ color: COLORS.grisMoyen }}> / {tache.tempsAlloue}h</span>
                {" · "}
                <span style={{ color: remaining > 0 ? COLORS.vert : COLORS.rouge, fontWeight: 700 }}>
                  {remaining.toFixed(1)}h restantes
                </span>
              </div>
              <div style={{ fontSize: 11, color: info.color, fontWeight: 600, marginTop: 2 }}>
                {info.label} ({Math.round(ratio)}%)
              </div>
            </div>
          </div>

          {/* DIRECTION : financier */}
          {isDirection && (
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20,
              padding: 16, background: COLORS.gris, borderRadius: 10,
            }}>
              <div>
                <div style={{ fontSize: 10, color: COLORS.grisMoyen, textTransform: "uppercase", letterSpacing: 0.3 }}>Montant HT</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.noir }}>{tache.montant.toLocaleString("fr-FR")}€</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: COLORS.grisMoyen, textTransform: "uppercase", letterSpacing: 0.3 }}>Coût revient</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.grisMoyen }}>{tache.cout.toLocaleString("fr-FR")}€</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: COLORS.grisMoyen, textTransform: "uppercase", letterSpacing: 0.3 }}>Marge</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: COLORS.dore }}>{marge.toLocaleString("fr-FR")}€</div>
              </div>
            </div>
          )}

          {/* SECTION BAT */}
          <div style={{
            padding: 20, background: "#FAFAF8",
            borderRadius: 12, border: `1px solid ${COLORS.grisBorder}`,
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14,
            }}>
              <h3 style={{
                fontFamily: "var(--font-dm-serif-display), Georgia, serif",
                fontSize: 18, color: COLORS.noir, margin: 0, fontWeight: 400,
              }}>
                ✎ Bon à tirer (BAT)
              </h3>
              {bat && (
                <span style={{
                  fontSize: 10, padding: "3px 8px", borderRadius: 4,
                  background: COLORS.gris, color: COLORS.grisMoyen, fontWeight: 700,
                }}>v{bat.version}</span>
              )}
            </div>

            {batError && (
              <div style={{
                padding: "10px 14px", marginBottom: 12,
                background: COLORS.rougeBg, border: `1px solid ${COLORS.rouge}44`,
                borderRadius: 8, color: COLORS.rouge, fontSize: 12, fontWeight: 600,
              }}>{batError}</div>
            )}

            {!bat && (
              <div style={{ textAlign: "center", padding: "24px 12px" }}>
                <div style={{ fontSize: 36, marginBottom: 8, color: COLORS.grisMoyen }}>📄</div>
                <p style={{ color: COLORS.grisMoyen, fontSize: 13, marginBottom: 16 }}>
                  Aucun BAT n&apos;a encore été uploadé pour cette tâche.
                </p>
                {isDirection ? (
                  <label style={{
                    display: "inline-block",
                    padding: "10px 18px", borderRadius: 8,
                    background: COLORS.noir, color: COLORS.dore,
                    fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}>
                    + Uploader un PDF (BAT)
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onUploadBat(f);
                        e.target.value = "";
                      }}
                      style={{ display: "none" }}
                    />
                  </label>
                ) : (
                  <p style={{ color: COLORS.grisMoyen, fontSize: 12, fontStyle: "italic" }}>
                    Direction et Admin peuvent uploader un BAT.
                  </p>
                )}
              </div>
            )}

            {bat && <BatPanel bat={bat} canManageBat={isDirection} layout="stacked" />}
          </div>
        </div>
      </div>
    </div>
  );
}
