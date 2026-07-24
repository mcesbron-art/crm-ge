"use client";

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";

/* ─── Constantes ─── */
const AV: Record<string, string> = {
  N: "#7C3AED", AD: "#0E7C66", T: "#2563EB", NK: "#BE185D", J: "#16A34A", M: "#EA8A0C",
};
const ROSTER: Record<string, string> = {
  N: "Nina R.", AD: "Adèle D.", T: "Thomas L.", NK: "Naïma K.", J: "Julien P.", M: "Marc V.",
};
const CLIENT_FULL: Record<string, string> = {
  "Maison Relais": "Maison Relais Gourmet",
  "Netzy — Refonte": "Netzy",
  "Vins d'Anjou": "InterLoire (Vins d'Anjou)",
  "BÉRYL Patrimoine": "BÉRYL Patrimoine",
  "Studio Mira": "Studio Mira",
};
const PROJ_INITIALS: Record<string, string> = {
  "Maison Relais": "MR", "Netzy — Refonte": "NZ", "Vins d'Anjou": "VA",
  "BÉRYL Patrimoine": "BP", "Studio Mira": "SM",
};
const CLIENT_GOLD = "linear-gradient(135deg,#E0BC68,#A47E2A)";

type Priority = "Haute" | "Normale" | "Basse";

type Card = {
  id: number; ref: string; title: string; project: string; client: string;
  clientInitials: string; clientBg: string; priority: Priority;
  due: string; dueSoon: boolean; comments: number; owner: string; ownerBg: string;
  accent: string; description: string;
  taskType: string; dateDebut: string; dateFin: string; dateButoir: string; dureeEstimee: string;
};

type Column = {
  title: string; dot: string; accent: string; cards: Card[];
};

const DEFAULT_TASK_TYPES = ["Design", "Développement", "Rédaction", "Photo / Vidéo", "Réunion", "Autre"];

type Draft = {
  id: number | null; isNew: boolean; ref: string; title: string; project: string;
  clientInitials: string; priority: Priority; due: string; owner: string;
  comments: number; description: string; colIndex: number;
  taskType: string; dateDebut: string; dateFin: string; dateButoir: string; dureeEstimee: string;
};

let uid = 0;
function mkCard(
  ref: string, title: string, project: string, ci: string, p: Priority,
  due: string, dueSoon: boolean, comments: number, owner: string, accent: string,
  desc?: string
): Card {
  return {
    id: ++uid, ref, title, project, clientInitials: ci, clientBg: CLIENT_GOLD,
    priority: p, due, dueSoon, comments, owner, ownerBg: AV[owner], accent,
    client: CLIENT_FULL[project] || project,
    description: desc || `Tâche liée au projet « ${project} ». Objectifs et livrables à préciser avec l'équipe.`,
    taskType: "", dateDebut: "", dateFin: "", dateButoir: due !== "Livré" && due !== "Auj." ? due : "", dureeEstimee: "",
  };
}

const INITIAL_BOARD: Column[] = [
  { title: "Brief", dot: "#6E6A5E", accent: "#6E6A5E", cards: [
    mkCard("#T-242", "Cadrage refonte newsletter", "Maison Relais", "MR", "Normale", "2 juil.", false, 1, "NK", "#6E6A5E"),
    mkCard("#T-235", "Storyboard film de marque", "Studio Mira", "SM", "Normale", "28 juin", false, 1, "NK", "#6E6A5E"),
  ]},
  { title: "À faire", dot: "#9A998F", accent: "#9A998F", cards: [
    mkCard("#T-241", "Intégration responsive mobile", "Netzy — Refonte", "NZ", "Normale", "22 juin", true, 2, "AD", "#9A998F"),
    mkCard("#T-238", "Calibrage colorimétrie photos", "Vins d'Anjou", "VA", "Basse", "25 juin", false, 0, "J", "#9A998F"),
  ]},
  { title: "En cours", dot: "#2563EB", accent: "#2563EB", cards: [
    mkCard("#T-240", "Maquettes page panier", "Maison Relais", "MR", "Haute", "Auj.", true, 4, "T", "#2563EB"),
    mkCard("#T-233", "Déclinaisons logo", "BÉRYL Patrimoine", "BP", "Normale", "30 juin", false, 1, "T", "#2563EB"),
  ]},
  { title: "Attente élément", dot: "#C2530B", accent: "#C2530B", cards: [
    mkCard("#T-237", "Planning éditorial juillet", "Vins d'Anjou", "VA", "Normale", "27 juin", false, 2, "NK", "#C2530B"),
  ]},
  { title: "Validation client", dot: "#C9A24E", accent: "#C9A24E", cards: [
    mkCard("#T-231", "Charte graphique v2", "BÉRYL Patrimoine", "BP", "Normale", "26 juin", false, 3, "N", "#C9A24E"),
  ]},
  { title: "BAT envoyé", dot: "#7C3AED", accent: "#7C3AED", cards: [
    mkCard("#T-236", "Maquettes UI/UX home", "Netzy — Refonte", "NZ", "Haute", "24 juin", true, 5, "T", "#7C3AED"),
  ]},
  { title: "Terminé", dot: "#1F8A5B", accent: "#1F8A5B", cards: [
    mkCard("#T-230", "Campagne emailing juin", "Maison Relais", "MR", "Normale", "Livré", false, 2, "NK", "#1F8A5B"),
    mkCard("#T-228", "Shooting produits", "Vins d'Anjou", "VA", "Basse", "Livré", false, 0, "J", "#1F8A5B"),
  ]},
];

function prioStyle(p: Priority) {
  if (p === "Haute")   return { color: "#C2530B", bg: "#FBEAE0" };
  if (p === "Normale") return { color: "#2563EB", bg: "#E6EEFB" };
  return { color: "#5C5A52", bg: "#F0EFEA" };
}

/* ─── Composant Card ─── */
function KanbanCard({ card, onOpen, onDragStart, onDragEnd, dimmed }: {
  card: Card; onOpen: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  dimmed: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const ps = prioStyle(card.priority);

  const field = (label: string, value: string | null, opts?: { color?: string; bold?: boolean }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: "#B5B2A6", letterSpacing: ".07em", textTransform: "uppercase" }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: opts?.bold ? 600 : 400, color: opts?.color || (value ? "#33322C" : "#C8C6BE") }}>
        {value || "—"}
      </span>
    </div>
  );

  return (
    <div
      draggable
      onClick={onOpen}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#fff",
        border: `1px solid ${hovered ? "#C9A24E" : "#ECEBE4"}`,
        borderTop: `3px solid ${card.accent}`,
        borderRadius: 12,
        padding: "12px 13px",
        boxShadow: hovered ? "0 12px 26px -12px rgba(201,162,78,.55)" : "0 1px 2px rgba(20,20,15,.05)",
        cursor: "grab",
        opacity: dimmed ? 0.4 : 1,
        transform: hovered ? "translateY(-3px)" : "none",
        transition: "transform .16s ease, box-shadow .16s ease, border-color .16s ease",
        display: "flex", flexDirection: "column", gap: 10,
      }}
    >
      {/* Ligne 1 : priorité + ref */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, color: ps.color, background: ps.bg, borderRadius: 99, padding: "2px 8px" }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: ps.color }} />{card.priority}
        </span>
        <span style={{ fontSize: 13, color: "#A6A498", fontWeight: 600 }}>{card.ref}</span>
      </div>

      {/* Titre */}
      <div style={{ fontSize: 15.5, fontWeight: 700, color: "#1C1B16", lineHeight: 1.35 }}>{card.title}</div>

      {/* Grille de champs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 12px", paddingTop: 8, borderTop: "1px solid #F2F1EB" }}>
        {field("Type", card.taskType || null)}
        {field("Client", card.client, { bold: true })}
        {field("Projet", card.project)}
        {field("Affectation", ROSTER[card.owner] || card.owner)}
        {field("Début", card.dateDebut || null)}
        {field("Fin", card.dateFin || null)}
        {field("Butoir", card.dateButoir || card.due || null, { color: card.dueSoon ? "#C2530B" : undefined })}
        {field("Charge", card.dureeEstimee || null)}
      </div>
    </div>
  );
}

/* ─── Composant Modal ─── */
function CardModal({ draft, board, taskTypes, onClose, onUpdate, onSave, onDelete, onAddType }: {
  draft: Draft;
  board: Column[];
  taskTypes: string[];
  onClose: () => void;
  onUpdate: (patch: Partial<Draft>) => void;
  onSave: () => void;
  onDelete: () => void;
  onAddType: (t: string) => void;
}) {
  const isNew = draft.isNew;
  const prios: Priority[] = ["Basse", "Normale", "Haute"];
  const prioColors: Record<Priority, string> = { Basse: "#5C5A52", Normale: "#2563EB", Haute: "#C2530B" };
  const prioBgs: Record<Priority, string>    = { Basse: "#F0EFEA", Normale: "#E6EEFB", Haute: "#FBEAE0" };

  const [ownerOpen, setOwnerOpen]   = useState(false);
  const [typeOpen, setTypeOpen]     = useState(false);
  const [newTypeVal, setNewTypeVal] = useState("");
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const inputStyle: React.CSSProperties = {
    width: "100%", boxSizing: "border-box", border: "1px solid #E2E1DA", borderRadius: 9,
    padding: "10px 12px", fontFamily: "inherit", fontSize: 15.5, color: "#1C1B16",
    outline: "none", background: "#FBFBF9",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 12.5, letterSpacing: ".13em", textTransform: "uppercase",
    color: "#9A998F", fontWeight: 700, marginBottom: 8, display: "block",
  };

  const selectedOwner = draft.owner;

  if (!mounted) return null;

  return createPortal(
    <div
      onClick={onClose}
      className="modal-overlay-in"
      style={{
        position: "fixed", inset: 0, background: "rgba(10,10,8,.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 9999, padding: 32, fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="modal-panel-in"
        style={{
          width: 600, maxHeight: "92vh", overflowY: "auto",
          background: "#F5F5F2", borderRadius: 20,
          boxShadow: "0 40px 90px -34px rgba(0,0,0,.6)",
          border: "1px solid rgba(0,0,0,.06)",
        }}
      >
        {/* Header */}
        <div style={{ background: "#0A0A0A", padding: "18px 22px", borderRadius: "20px 20px 0 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: "#B79B5E", letterSpacing: ".04em" }}>
              {isNew ? "Nouvelle tâche" : draft.ref}
            </span>
            <span
              onClick={onClose}
              style={{
                width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center",
                justifyContent: "center", cursor: "pointer", color: "#9A988F",
                background: "#161512", border: "1px solid #242220", fontSize: 15, lineHeight: 1,
              }}
            >✕</span>
          </div>
          <input
            type="text"
            value={draft.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            placeholder="Titre de la tâche…"
            style={{
              width: "100%", boxSizing: "border-box", border: "none", outline: "none",
              background: "transparent", fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 22, fontWeight: 800, color: "#F4ECD7",
            }}
          />
        </div>

        {/* Body */}
        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 22 }}>

          {/* Affectée à + Type */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

            {/* Affectée à */}
            <div style={{ position: "relative" }}>
              <label style={labelStyle}>Affectée à</label>
              <button
                onClick={() => { setOwnerOpen(!ownerOpen); setTypeOpen(false); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 9,
                  background: "#FBFBF9", border: "1px solid #E2E1DA", borderRadius: 9,
                  padding: "9px 12px", cursor: "pointer", fontFamily: "inherit",
                  textAlign: "left",
                }}
              >
                <span style={{
                  width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center",
                  justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff",
                  background: AV[selectedOwner] || "#999", flex: "none",
                }}>{selectedOwner}</span>
                <span style={{ flex: 1, fontSize: 15.5, color: "#1C1B16", fontWeight: 500 }}>{ROSTER[selectedOwner] || "—"}</span>
                <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="#A6A498" strokeWidth="2" strokeLinecap="round">
                  <path d="M5 8l5 5 5-5"/>
                </svg>
              </button>
              {ownerOpen && (
                <>
                  <div onClick={() => setOwnerOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 25 }} />
                  <div style={{
                    position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 30,
                    background: "#fff", border: "1px solid #E6E5DE", borderRadius: 12,
                    boxShadow: "0 16px 36px -12px rgba(20,20,15,.28)", padding: 6,
                  }}>
                    {Object.keys(ROSTER).map((k) => {
                      const on = selectedOwner === k;
                      return (
                        <div
                          key={k}
                          onClick={() => { onUpdate({ owner: k }); setOwnerOpen(false); }}
                          style={{
                            display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
                            borderRadius: 8, cursor: "pointer",
                            background: on ? "#F6EFDD" : "transparent",
                          }}
                        >
                          <span style={{
                            width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center",
                            justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", background: AV[k], flex: "none",
                          }}>{k}</span>
                          <span style={{ fontSize: 15.5, fontWeight: on ? 700 : 500, color: on ? "#0A0A0A" : "#33322C" }}>{ROSTER[k]}</span>
                          {on && <span style={{ marginLeft: "auto", color: "#C9A24E", fontSize: 16 }}>✓</span>}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Type */}
            <div style={{ position: "relative" }}>
              <label style={labelStyle}>Type</label>
              <button
                onClick={() => { setTypeOpen(!typeOpen); setOwnerOpen(false); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 9,
                  background: "#FBFBF9", border: "1px solid #E2E1DA", borderRadius: 9,
                  padding: "9px 12px", cursor: "pointer", fontFamily: "inherit",
                  textAlign: "left",
                }}
              >
                <span style={{ flex: 1, fontSize: 15.5, color: draft.taskType ? "#1C1B16" : "#A6A498", fontWeight: 500 }}>
                  {draft.taskType || "Choisir un type…"}
                </span>
                <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="#A6A498" strokeWidth="2" strokeLinecap="round">
                  <path d="M5 8l5 5 5-5"/>
                </svg>
              </button>
              {typeOpen && (
                <>
                  <div onClick={() => setTypeOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 25 }} />
                  <div style={{
                    position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 30,
                    background: "#fff", border: "1px solid #E6E5DE", borderRadius: 12,
                    boxShadow: "0 16px 36px -12px rgba(20,20,15,.28)", padding: 6,
                  }}>
                    {taskTypes.map((t) => {
                      const on = draft.taskType === t;
                      return (
                        <div
                          key={t}
                          onClick={() => { onUpdate({ taskType: t }); setTypeOpen(false); }}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "8px 10px", borderRadius: 8, cursor: "pointer",
                            background: on ? "#F6EFDD" : "transparent",
                          }}
                        >
                          <span style={{ fontSize: 15.5, fontWeight: on ? 700 : 500, color: on ? "#0A0A0A" : "#33322C" }}>{t}</span>
                          {on && <span style={{ color: "#C9A24E", fontSize: 16 }}>✓</span>}
                        </div>
                      );
                    })}
                    {/* Créer un nouveau type */}
                    <div style={{ borderTop: "1px solid #F0EFEA", marginTop: 4, paddingTop: 6 }}>
                      <div style={{ display: "flex", gap: 6, padding: "4px 4px" }}>
                        <input
                          type="text"
                          value={newTypeVal}
                          onChange={(e) => setNewTypeVal(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newTypeVal.trim()) {
                              onAddType(newTypeVal.trim());
                              onUpdate({ taskType: newTypeVal.trim() });
                              setNewTypeVal("");
                              setTypeOpen(false);
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Créer un type…"
                          style={{ flex: 1, border: "1px solid #E2E1DA", borderRadius: 7, padding: "7px 10px", fontSize: 15, outline: "none", fontFamily: "inherit", color: "#1C1B16" }}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (newTypeVal.trim()) {
                              onAddType(newTypeVal.trim());
                              onUpdate({ taskType: newTypeVal.trim() });
                              setNewTypeVal("");
                              setTypeOpen(false);
                            }
                          }}
                          style={{ background: "#0A0A0A", color: "#E9D7A6", border: "none", borderRadius: 7, padding: "7px 12px", fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                        >+ Ajouter</button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={draft.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
              rows={4}
              placeholder="Décrivez la tâche, les objectifs, les livrables attendus…"
              style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }}
            />
          </div>

          {/* Priorité */}
          <div>
            <label style={labelStyle}>Priorité</label>
            <div style={{ display: "flex", gap: 8 }}>
              {prios.map((p) => {
                const on = draft.priority === p;
                return (
                  <span
                    key={p}
                    onClick={() => onUpdate({ priority: p })}
                    style={{
                      padding: "7px 18px", borderRadius: 99, fontSize: 15, fontWeight: 700,
                      cursor: "pointer",
                      color: on ? prioColors[p] : "#7C7B73",
                      background: on ? prioBgs[p] : "#F0EFEA",
                      border: `1px solid ${on ? prioColors[p] : "#E5E4DD"}`,
                      transition: "all .12s",
                    }}
                  >{p}</span>
                );
              })}
            </div>
          </div>

          {/* Planification */}
          <div style={{ background: "#fff", border: "1px solid #E6E5DE", borderRadius: 14, padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16 }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#C9A24E" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4.5" width="14" height="12.5" rx="2"/><line x1="3" y1="8.4" x2="17" y2="8.4"/>
                <line x1="6.8" y1="2.6" x2="6.8" y2="5.4"/><line x1="13.2" y1="2.6" x2="13.2" y2="5.4"/>
              </svg>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#33322C" }}>Quand prévoyez-vous de travailler sur cette tâche ?</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ ...labelStyle, marginBottom: 6 }}>Date de début</label>
                <input
                  type="date"
                  value={draft.dateDebut}
                  onChange={(e) => onUpdate({ dateDebut: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ ...labelStyle, marginBottom: 6 }}>Date de fin</label>
                <input
                  type="date"
                  value={draft.dateFin}
                  onChange={(e) => onUpdate({ dateFin: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ ...labelStyle, marginBottom: 6 }}>Date butoir</label>
                <input
                  type="date"
                  value={draft.dateButoir}
                  onChange={(e) => onUpdate({ dateButoir: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ ...labelStyle, marginBottom: 6 }}>Durée estimée</label>
                <input
                  type="text"
                  value={draft.dureeEstimee}
                  onChange={(e) => onUpdate({ dureeEstimee: e.target.value })}
                  placeholder="ex. 3h30"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>

          {/* Ajouter un document */}
          <AddDocBtn />

        </div>

        {/* Footer */}
        <div style={{
          padding: "16px 22px", borderTop: "1px solid #EAE9E3", background: "#FBFBF9",
          borderRadius: "0 0 20px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          {!isNew ? <DeleteBtn onDelete={onDelete} /> : <div />}
          <div style={{ display: "flex", gap: 10, marginLeft: "auto" }}>
            <button
              onClick={onClose}
              style={{
                background: "#fff", border: "1px solid #E2E1DA", color: "#33322C",
                fontSize: 15.5, fontWeight: 600, padding: "10px 18px", borderRadius: 9,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >Annuler</button>
            <button
              onClick={onSave}
              style={{
                background: "#0A0A0A", color: "#E9D7A6", border: "1px solid #0A0A0A",
                fontSize: 15.5, fontWeight: 600, padding: "10px 20px", borderRadius: 9,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >{isNew ? "Créer la tâche" : "Enregistrer"}</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function AddDocBtn() {
  const [h, setH] = useState(false);
  return (
    <button
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: "flex", alignItems: "center", gap: 9,
        background: h ? "#F6EFDD" : "#fff",
        border: `1.5px dashed ${h ? "#C9A24E" : "#D2D0C7"}`,
        color: h ? "#B08D32" : "#8C8B83",
        fontSize: 15, fontWeight: 600, padding: "11px 16px", borderRadius: 10,
        cursor: "pointer", fontFamily: "inherit", width: "100%", justifyContent: "center",
        transition: "all .15s",
      }}
    >
      <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 3H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V9z"/>
        <path d="M11 3v6h6"/><line x1="10" y1="12" x2="10" y2="16"/><line x1="8" y1="14" x2="12" y2="14"/>
      </svg>
      + Ajouter un document
    </button>
  );
}

function DeleteBtn({ onDelete }: { onDelete: () => void }) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onDelete}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: "flex", alignItems: "center", gap: 7,
        background: h ? "#FBEAE0" : "transparent",
        border: "1px solid #EAD3CB", color: "#C2530B",
        fontSize: 15, fontWeight: 600, padding: "9px 15px", borderRadius: 9,
        cursor: "pointer", fontFamily: "inherit", transition: "background .15s",
      }}
    >
      <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6h12"/><path d="M7.5 6V4.5h5V6"/>
        <path d="M5.5 6l.7 9.5c0 .6.5 1 1 1h5.6c.5 0 1-.4 1-1L15.5 6"/>
      </svg>
      Supprimer
    </button>
  );
}

function AddBtn({ onAdd }: { onAdd: () => void }) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onAdd}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        background: h ? "rgba(201,162,78,.05)" : "transparent",
        border: `1.5px dashed ${h ? "#C9A24E" : "#D2D0C7"}`,
        color: h ? "#B08D32" : "#9A998F",
        fontSize: 14, fontWeight: 600, padding: 9, borderRadius: 10,
        cursor: "pointer", fontFamily: "inherit",
        transition: "border-color .15s, color .15s, background .15s",
      }}
    >
      <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>Ajouter une tâche
    </button>
  );
}

function ClientOption({ label, count, on, onSelect }: { label: string; count: number; on: boolean; onSelect: () => void }) {
  const [h, setH] = useState(false);
  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "9px 11px", borderRadius: 8, cursor: "pointer", background: h ? "#F5F4EF" : on ? "#F6EFDD" : "#fff" }}
    >
      <span style={{ fontSize: 15, fontWeight: on ? 700 : 500, color: on ? "#0A0A0A" : "#33322C" }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: "#A6A498", background: "#F0EFEA", borderRadius: 99, padding: "1px 8px", flex: "none" }}>{count}</span>
    </div>
  );
}

function CollabAllBtn({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <span
      onClick={onClick}
      style={{
        padding: "6px 12px", borderRadius: 99, fontSize: 14.5, fontWeight: 600, cursor: "pointer",
        color: active ? "#0A0A0A" : "#7C7B73",
        background: active ? "#fff" : "#F0EFEA",
        border: `1px solid ${active ? "#C9A24E" : "#E5E4DD"}`,
      }}
    >Tous</span>
  );
}

function CollabChip({ initials, name, bg, active, onClick }: { initials: string; name: string; bg: string; active: boolean; onClick: () => void }) {
  return (
    <span
      onClick={onClick}
      title={name}
      style={{
        display: "flex", alignItems: "center", gap: 7, padding: "4px 12px 4px 4px",
        borderRadius: 99, cursor: "pointer", background: "#fff",
        border: `1.5px solid ${active ? "#C9A24E" : "transparent"}`,
      }}
    >
      <span style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 700, color: "#fff", background: bg }}>{initials}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: "#5C5A52" }}>{name}</span>
    </span>
  );
}

/* ─── Context Menu Item ─── */
function CtxItem({ label, icon, danger, onClick }: { label: string; icon: string; danger?: boolean; onClick: () => void }) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: "flex", alignItems: "center", gap: 9, width: "100%",
        padding: "8px 10px", borderRadius: 8, border: "none",
        background: h ? (danger ? "#FEF2F0" : "#F7F6F2") : "transparent",
        color: danger ? "#C2530B" : "#33322C",
        fontSize: 15, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", textAlign: "left" as const,
      }}
    >
      <span style={{ fontSize: 13, width: 16, textAlign: "center" as const }}>{icon}</span>
      {label}
    </button>
  );
}

/* ─── Pagination Button ─── */
function PageBtn({ label, active, disabled, onClick }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void }) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        padding: "5px 9px", minWidth: 32, borderRadius: 8, border: "1px solid",
        borderColor: active ? "#C9A24E" : h ? "#D4D3CA" : "#E6E5DE",
        background: active ? "#C9A24E" : h ? "#F7F6F2" : "#fff",
        color: active ? "#fff" : disabled ? "#C8C6BE" : "#33322C",
        fontSize: 14.5, fontWeight: active ? 700 : 500, cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit", transition: "all .1s",
      }}
    >
      {label}
    </button>
  );
}

/* ─── List Row ─── */
function ListRow2({ children, accentColor, isLast, isSelected, onOpen }: {
  children: React.ReactNode; accentColor: string; isLast: boolean; isSelected: boolean; onOpen: () => void;
}) {
  const [h, setH] = useState(false);
  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: "grid",
        gridTemplateColumns: "46px minmax(220px,1.7fr) 1.1fr 112px 104px 76px 152px 1fr",
        borderBottom: isLast ? "none" : "1px solid #F2F1EB",
        background: isSelected ? "#FDFAF4" : h ? "#FAF8F2" : "#fff",
        boxShadow: `inset 3px 0 0 ${accentColor}`,
        cursor: "pointer", transition: "background .1s",
      }}
    >
      {children}
    </div>
  );
}

/* ─── Vue Liste ─── */
function ListeView({ board, allCards, matchCard, onOpen, onDelete, onDuplicate }: {
  board: Column[];
  allCards: Card[];
  matchCard: (c: Card) => boolean;
  onOpen: (id: number) => void;
  onDelete: (id: number) => void;
  onDuplicate: (id: number) => void;
}) {
  const [tab, setTab] = useState("toutes");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState("titre");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const colOf = useCallback((id: number) => board.find((col) => col.cards.some((c) => c.id === id)), [board]);

  const allVisible = allCards.filter(matchCard);
  const tabFiltered = tab === "toutes" ? allVisible : allVisible.filter((c) => colOf(c.id)?.title === tab);

  const PORD: Record<Priority, number> = { Haute: 0, Normale: 1, Basse: 2 };
  const sorted = [...tabFiltered].sort((a, b) => {
    let va: string | number = "";
    let vb: string | number = "";
    if (sortKey === "titre") { va = a.title.toLowerCase(); vb = b.title.toLowerCase(); }
    else if (sortKey === "priorite") { va = PORD[a.priority]; vb = PORD[b.priority]; }
    else if (sortKey === "butoir") { va = a.dateButoir || a.due || ""; vb = b.dateButoir || b.due || ""; }
    else if (sortKey === "charge") { va = a.dureeEstimee || ""; vb = b.dureeEstimee || ""; }
    else if (sortKey === "statut") { va = colOf(a.id)?.title || ""; vb = colOf(b.id)?.title || ""; }
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const curPage = Math.min(page, totalPages);
  const pageCards = sorted.slice((curPage - 1) * PER_PAGE, curPage * PER_PAGE);

  const toggleSort = (k: string) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("asc"); }
    setPage(1);
  };

  const toggleSelect = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleAll = () => {
    if (selected.size === pageCards.length && pageCards.length > 0) setSelected(new Set());
    else setSelected(new Set(pageCards.map((c) => c.id)));
  };

  const ps = (p: Priority) => {
    if (p === "Haute") return { color: "#C2530B", dot: "#C2530B" };
    if (p === "Normale") return { color: "#2563EB", dot: "#2563EB" };
    return { color: "#5C5A52", dot: "#9A998F" };
  };

  const GRID = "46px minmax(220px,1.7fr) 1.1fr 112px 104px 76px 152px 1fr";

  const tabs = [
    { key: "toutes", label: "Toutes", count: allVisible.length },
    ...board.map((col) => ({
      key: col.title, label: col.title,
      count: allVisible.filter((c) => colOf(c.id)?.title === col.title).length,
    })),
  ];

  const headers = [
    { k: "titre", l: "Tâche", s: true },
    { k: "client", l: "Client", s: false },
    { k: "priorite", l: "Priorité", s: true },
    { k: "butoir", l: "Butoir", s: true },
    { k: "charge", l: "Charge", s: true },
    { k: "statut", l: "Statut", s: true },
    { k: "affectation", l: "Affectation", s: false },
  ];

  return (
    <div style={{ background: "#fff", border: "1px solid #EAE9E3", borderRadius: 18, boxShadow: "0 1px 2px rgba(20,20,15,.04)", overflow: "hidden" }}>

      {/* Status tabs */}
      <div style={{ padding: "14px 20px 0", borderBottom: "1px solid #EAE9E3", overflowX: "auto" }}>
        <div style={{ display: "inline-flex", background: "#F4F3EE", border: "1px solid #EAE9E3", borderRadius: 11, padding: 4, gap: 2 }}>
          {tabs.map((t) => (
            <button key={t.key} onClick={() => { setTab(t.key); setPage(1); }} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 11px", borderRadius: 8, border: "none",
              background: tab === t.key ? "#fff" : "transparent",
              boxShadow: tab === t.key ? "0 1px 3px rgba(20,20,15,.09)" : "none",
              color: tab === t.key ? "#1C1B16" : "#8C8B83",
              fontSize: 14, fontWeight: tab === t.key ? 600 : 500, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" as const,
            }}>
              {t.label}
              {t.count > 0 && (
                <span style={{ fontSize: 12.5, fontWeight: 700, background: tab === t.key ? "#F4F3EE" : "transparent", color: tab === t.key ? "#6B6960" : "#B0AEAA", borderRadius: 99, padding: "0 6px" }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Selection bar */}
      {selected.size > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", background: "#FDFAF4", borderBottom: "1px solid #F0EFEA" }}>
          <span style={{ fontSize: 14.5, fontWeight: 500, color: "#5C5A52" }}>{selected.size} sélectionnée(s)</span>
          <button onClick={() => setSelected(new Set())} style={{ fontSize: 14, color: "#8C8B83", border: "1px solid #E2E1DA", borderRadius: 8, padding: "3px 10px", background: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
            Désélectionner
          </button>
        </div>
      )}

      {/* Empty state */}
      {sorted.length === 0 ? (
        <div style={{ textAlign: "center", padding: "64px 0", color: "#A6A498" }}>
          <svg width="40" height="40" viewBox="0 0 20 20" fill="none" stroke="#D4D3CA" strokeWidth="1.2" style={{ display: "block", margin: "0 auto 14px" }}>
            <rect x="3" y="4" width="14" height="14" rx="3"/><line x1="7" y1="8" x2="13" y2="8"/><line x1="7" y1="11.5" x2="11" y2="11.5"/>
          </svg>
          <div style={{ fontSize: 16.5, fontWeight: 600, color: "#5C5A52", marginBottom: 6 }}>Aucune tâche</div>
          <div style={{ fontSize: 14.5 }}>Aucune tâche ne correspond aux filtres sélectionnés.</div>
        </div>
      ) : (
        <>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: GRID, background: "#F8F7F3", borderBottom: "1px solid #EAE9E3" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "11px 0" }}>
              <input type="checkbox" checked={selected.size === pageCards.length && pageCards.length > 0} onChange={toggleAll}
                style={{ width: 16, height: 16, accentColor: "#C9A24E", cursor: "pointer" }} />
            </div>
            {headers.map(({ k, l, s }) => (
              <div key={k} onClick={() => s && toggleSort(k)}
                style={{ padding: "11px 14px", fontSize: 13.5, fontWeight: 700, color: "#9A998F", letterSpacing: ".06em", textTransform: "uppercase" as const, display: "flex", alignItems: "center", cursor: s ? "pointer" : "default", userSelect: "none" as const, whiteSpace: "nowrap" as const }}>
                {l}
                {s && (
                  <span style={{ marginLeft: 3, fontSize: 11, opacity: sortKey === k ? 1 : 0.3, color: sortKey === k ? "#C9A24E" : "#9A998F" }}>
                    {sortKey === k && sortDir === "desc" ? "↓" : "↑"}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Rows */}
          {pageCards.map((card, i) => {
            const col = colOf(card.id);
            const p = ps(card.priority);
            const butoir = card.dateButoir || card.due || "";
            const menuShowing = menuOpen === card.id;
            return (
              <ListRow2 key={card.id} accentColor={col?.accent || "#E2E1DA"} isLast={i === pageCards.length - 1} isSelected={selected.has(card.id)} onOpen={() => onOpen(card.id)}>
                {/* Checkbox */}
                <div onClick={(e) => toggleSelect(card.id, e)} style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <input type="checkbox" checked={selected.has(card.id)} onChange={() => {}} onClick={(e) => e.stopPropagation()}
                    style={{ width: 16, height: 16, accentColor: "#C9A24E", cursor: "pointer" }} />
                </div>
                {/* Tâche */}
                <div style={{ padding: "13px 14px", display: "flex", flexDirection: "column" as const, gap: 3, minWidth: 0 }}>
                  <span style={{ fontSize: 15.5, fontWeight: 600, color: "#1C1B16", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.title}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    {card.taskType && <span style={{ fontSize: 13, fontWeight: 600, color: "#6B6960", background: "#F4F3EE", borderRadius: 6, padding: "1px 7px", flex: "none" }}>{card.taskType}</span>}
                    <span style={{ fontSize: 13.5, color: "#A6A498", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.project}</span>
                  </div>
                </div>
                {/* Client */}
                <div style={{ padding: "13px 14px", display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <span style={{ width: 26, height: 26, borderRadius: 8, flex: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#1A1206", background: CLIENT_GOLD }}>{card.clientInitials}</span>
                  <span style={{ fontSize: 14.5, color: "#33322C", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.client}</span>
                </div>
                {/* Priorité */}
                <div style={{ padding: "13px 14px", display: "flex", alignItems: "center" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 14, fontWeight: 600, color: p.color }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: p.dot, flex: "none" }} />
                    {card.priority}
                  </span>
                </div>
                {/* Butoir */}
                <div style={{ padding: "13px 14px", display: "flex", alignItems: "center" }}>
                  <span style={{ fontSize: 14.5, fontWeight: card.dueSoon ? 700 : 400, color: butoir ? (card.dueSoon ? "#C2530B" : "#33322C") : "#C8C6BE" }}>{butoir || "—"}</span>
                </div>
                {/* Charge */}
                <div style={{ padding: "13px 14px", display: "flex", alignItems: "center" }}>
                  <span style={{ fontSize: 14.5, color: card.dureeEstimee ? "#33322C" : "#C8C6BE" }}>{card.dureeEstimee || "—"}</span>
                </div>
                {/* Statut */}
                <div style={{ padding: "13px 14px", display: "flex", alignItems: "center" }}>
                  {col && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 600, color: col.accent, background: col.accent + "18", borderRadius: 99, padding: "4px 11px", whiteSpace: "nowrap" as const }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: col.dot, flex: "none" }} />
                      {col.title}
                    </span>
                  )}
                </div>
                {/* Affectation */}
                <div style={{ padding: "13px 14px", display: "flex", alignItems: "center", gap: 7, position: "relative" as const }}>
                  <span style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", background: card.ownerBg, flex: "none" }}>{card.owner}</span>
                  <span style={{ fontSize: 14.5, color: "#33322C", fontWeight: 500, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ROSTER[card.owner] || card.owner}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(menuShowing ? null : card.id); }}
                    style={{ background: "transparent", border: "none", color: "#A6A498", cursor: "pointer", fontSize: 16, padding: "2px 5px", borderRadius: 6, lineHeight: 1, fontFamily: "inherit" }}
                  >⋮</button>
                  {menuShowing && (
                    <>
                      <div onClick={(e) => { e.stopPropagation(); setMenuOpen(null); }} style={{ position: "fixed", inset: 0, zIndex: 90 }} />
                      <div style={{ position: "absolute", right: 4, top: "calc(100% - 4px)", zIndex: 100, width: 184, background: "#fff", border: "1px solid #E6E5DE", borderRadius: 12, boxShadow: "0 18px 40px -16px rgba(20,20,15,.34)", padding: 6 }}>
                        <CtxItem label="Ouvrir" icon="↗" onClick={() => { setMenuOpen(null); onOpen(card.id); }} />
                        <CtxItem label="Dupliquer" icon="⊕" onClick={() => { setMenuOpen(null); onDuplicate(card.id); }} />
                        <div style={{ height: 1, background: "#F0EFEA", margin: "4px 6px" }} />
                        <CtxItem label="Supprimer" icon="✕" danger onClick={() => { setMenuOpen(null); onDelete(card.id); }} />
                      </div>
                    </>
                  )}
                </div>
              </ListRow2>
            );
          })}

          {/* Pagination */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderTop: "1px solid #F0EFEA" }}>
            <span style={{ fontSize: 14.5, color: "#8C8B83" }}>
              {sorted.length === 0 ? "0 tâche" : `${(curPage - 1) * PER_PAGE + 1}–${Math.min(curPage * PER_PAGE, sorted.length)} sur ${sorted.length}`}
            </span>
            {totalPages > 1 && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <PageBtn label="←" disabled={curPage === 1} onClick={() => setPage((p) => p - 1)} />
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                  <PageBtn key={p} label={String(p)} active={p === curPage} onClick={() => setPage(p)} />
                ))}
                <PageBtn label="→" disabled={curPage === totalPages} onClick={() => setPage((p) => p + 1)} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Page principale ─── */
export default function KanbanPage() {
  const [board, setBoard] = useState<Column[]>(INITIAL_BOARD);
  const [view, setView] = useState<"kanban" | "liste">("liste");
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("tous");
  const [collabFilter, setCollabFilter] = useState("tous");
  const [clientMenuOpen, setClientMenuOpen] = useState(false);
  const [dragId, setDragId] = useState<number | null>(null);
  const [dragOverCol, setDragOverCol] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [taskTypes, setTaskTypes] = useState<string[]>(DEFAULT_TASK_TYPES);

  const allCards = board.flatMap((c) => c.cards);

  const projNames = Array.from(new Set(allCards.map((c) => c.project))).sort((a, b) => a.localeCompare(b));
  const clientNames = Array.from(new Set(allCards.map((c) => c.client))).sort((a, b) => a.localeCompare(b));
  const ownersInUse = Array.from(new Set(allCards.map((c) => c.owner)));

  const matchCard = useCallback((t: Card) => {
    if (clientFilter !== "tous" && t.client !== clientFilter) return false;
    if (collabFilter !== "tous" && t.owner !== collabFilter) return false;
    const q = search.trim().toLowerCase();
    if (q && !(t.title.toLowerCase().includes(q) || t.project.toLowerCase().includes(q) || t.client.toLowerCase().includes(q))) return false;
    return true;
  }, [clientFilter, collabFilter, search]);

  const openCard = (id: number) => {
    let found: Draft | null = null;
    board.forEach((col, ci) => {
      const c = col.cards.find((x) => x.id === id);
      if (c) found = {
        id: c.id, isNew: false, ref: c.ref, title: c.title, project: c.project,
        clientInitials: c.clientInitials, priority: c.priority, due: c.due,
        owner: c.owner, comments: c.comments, description: c.description, colIndex: ci,
        taskType: c.taskType, dateDebut: c.dateDebut, dateFin: c.dateFin, dateButoir: c.dateButoir, dureeEstimee: c.dureeEstimee,
      };
    });
    if (found) setDraft(found);
  };

  const openNew = (colIndex: number) => {
    let max = 242;
    allCards.forEach((c) => { const n = parseInt(c.ref.replace(/\D/g, ""), 10); if (!isNaN(n) && n > max) max = n; });
    const firstProject = Object.keys(PROJ_INITIALS)[0];
    setDraft({
      id: null, isNew: true, ref: `#T-${max + 1}`, title: "", project: firstProject,
      clientInitials: PROJ_INITIALS[firstProject], priority: "Normale", due: "",
      owner: "N", comments: 0, description: "", colIndex,
      taskType: "", dateDebut: "", dateFin: "", dateButoir: "", dureeEstimee: "",
    });
  };

  const saveCard = () => {
    if (!draft) return;
    const newBoard = board.map((c) => ({ ...c, cards: c.cards.slice() }));
    if (draft.isNew) {
      const dest = draft.colIndex;
      newBoard[dest].cards.push({
        id: Date.now() + Math.floor(Math.random() * 1000),
        ref: draft.ref, title: (draft.title || "Nouvelle tâche").trim(),
        project: draft.project, client: CLIENT_FULL[draft.project] || draft.project,
        clientInitials: PROJ_INITIALS[draft.project] || draft.clientInitials,
        clientBg: CLIENT_GOLD, priority: draft.priority, due: draft.dateButoir || draft.due || "—", dueSoon: false,
        comments: draft.comments || 0, owner: draft.owner, ownerBg: AV[draft.owner],
        accent: newBoard[dest].accent, description: draft.description || `Tâche liée au projet « ${draft.project} ».`,
        taskType: draft.taskType, dateDebut: draft.dateDebut, dateFin: draft.dateFin, dateButoir: draft.dateButoir, dureeEstimee: draft.dureeEstimee,
      });
    } else {
      let src = -1, idx = -1;
      newBoard.forEach((col, ci) => { const i = col.cards.findIndex((c) => c.id === draft.id); if (i >= 0) { src = ci; idx = i; } });
      if (src >= 0) {
        const obj = newBoard[src].cards.splice(idx, 1)[0];
        const dest = draft.colIndex;
        newBoard[dest].cards.push({
          ...obj, title: draft.title, project: draft.project, priority: draft.priority,
          due: draft.dateButoir || draft.due, owner: draft.owner, ownerBg: AV[draft.owner],
          description: draft.description, accent: newBoard[dest].accent,
          taskType: draft.taskType, dateDebut: draft.dateDebut, dateFin: draft.dateFin, dateButoir: draft.dateButoir, dureeEstimee: draft.dureeEstimee,
        });
      }
    }
    setBoard(newBoard);
    setDraft(null);
  };

  const deleteCard = () => {
    if (!draft) return;
    setBoard(board.map((c) => ({ ...c, cards: c.cards.filter((x) => x.id !== draft.id) })));
    setDraft(null);
  };

  const deleteCardById = (id: number) => {
    setBoard(board.map((c) => ({ ...c, cards: c.cards.filter((x) => x.id !== id) })));
  };

  const duplicateCardById = (id: number) => {
    const newBoard = board.map((c) => ({ ...c, cards: c.cards.slice() }));
    for (const col of newBoard) {
      const card = col.cards.find((c) => c.id === id);
      if (card) {
        col.cards.push({ ...card, id: Date.now() + Math.floor(Math.random() * 1000), ref: card.ref + " (copie)" });
        break;
      }
    }
    setBoard(newBoard);
  };

  const moveCard = (cardId: number, destCol: number) => {
    const newBoard = board.map((c) => ({ ...c, cards: c.cards.slice() }));
    let moved: Card | null = null;
    for (const col of newBoard) {
      const i = col.cards.findIndex((c) => c.id === cardId);
      if (i >= 0) { moved = col.cards.splice(i, 1)[0]; break; }
    }
    if (moved) { newBoard[destCol].cards.push({ ...moved, accent: newBoard[destCol].accent }); }
    setBoard(newBoard);
    setDragId(null);
    setDragOverCol(null);
  };

  const openCount = board.slice(0, board.length - 1).reduce((n, c) => n + c.cards.filter(matchCard).length, 0);

  return (
    <div style={{ flex: 1, minWidth: 0, background: "#F5F5F2", display: "flex", flexDirection: "column", fontFamily: "'Plus Jakarta Sans',system-ui,sans-serif" }}>

      <div style={{ padding: "26px 30px 36px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Titre */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 34, fontWeight: 800, color: "#16150F", margin: 0, letterSpacing: "-.015em" }}>Tâches</h1>
            <div style={{ fontSize: 15.5, color: "#8C8B83", marginTop: 5 }}>Suivi des tâches · {openCount} tâches en cours</div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {/* Toggle vue */}
            <div style={{ display: "flex", background: "#F0EFEA", border: "1px solid #E5E4DD", borderRadius: 9, padding: 3, gap: 2 }}>
              <button
                onClick={() => setView("kanban")}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 7, border: "none",
                  background: view === "kanban" ? "#0A0A0A" : "transparent",
                  color: view === "kanban" ? "#E4C77B" : "#8C8B83",
                  fontSize: 14.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  transition: "all .15s",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="3.6" height="12" rx="1.2"/><rect x="8.2" y="4" width="3.6" height="8.5" rx="1.2"/><rect x="13.4" y="4" width="3.6" height="12" rx="1.2"/>
                </svg>
                Kanban
              </button>
              <button
                onClick={() => setView("liste")}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 7, border: "none",
                  background: view === "liste" ? "#0A0A0A" : "transparent",
                  color: view === "liste" ? "#E4C77B" : "#8C8B83",
                  fontSize: 14.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                  transition: "all .15s",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="6" x2="16" y2="6"/><line x1="4" y1="10" x2="16" y2="10"/><line x1="4" y1="14" x2="11" y2="14"/>
                </svg>
                Liste
              </button>
            </div>
            {/* Recherche */}
            <div style={{ display: "flex", alignItems: "center", gap: 9, background: "#fff", border: "1px solid #E2E1DA", borderRadius: 10, padding: "9px 13px", width: 240 }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#A6A498" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="9" r="6"/><line x1="13.5" y1="13.5" x2="18" y2="18"/>
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher une tâche…"
                style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 15, color: "#1C1B16", width: "100%" }}
              />
            </div>
            <button
              onClick={() => openNew(1)}
              style={{ display: "flex", alignItems: "center", gap: 7, background: "#0A0A0A", color: "#E9D7A6", fontSize: 15.5, fontWeight: 600, padding: "10px 17px", borderRadius: 10, cursor: "pointer", border: "1px solid #0A0A0A", fontFamily: "inherit" }}
            >
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>Nouvelle tâche
            </button>
          </div>
        </div>

        {/* Filtres */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>

          {/* Dropdown Client */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setClientMenuOpen(!clientMenuOpen)}
              style={{ display: "flex", alignItems: "center", gap: 9, background: "#fff", border: `1px solid ${clientFilter === "tous" ? "#E2E1DA" : "#C9A24E"}`, borderRadius: 10, padding: "9px 14px", fontSize: 15, fontWeight: 600, color: "#33322C", cursor: "pointer", fontFamily: "inherit" }}
            >
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="#B08D32" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="10" cy="7" r="3"/><path d="M4 16.5c0-3.2 2.7-5.2 6-5.2s6 2 6 5.2"/>
              </svg>
              <span style={{ color: "#9A998F" }}>Client :</span>
              <span style={{ color: "#B08D32" }}>{clientFilter === "tous" ? "Tous" : clientFilter}</span>
              <span style={{ color: "#A6A498", fontSize: 13 }}>▾</span>
            </button>
            {clientMenuOpen && (
              <>
                <div onClick={() => setClientMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 25 }} />
                <div style={{
                  position: "absolute", top: 46, left: 0, zIndex: 30, width: 248,
                  background: "#fff", border: "1px solid #E6E5DE", borderRadius: 12,
                  boxShadow: "0 20px 44px -18px rgba(20,20,15,.35)", padding: 6, maxHeight: 320, overflowY: "auto",
                }}>
                  {[
                    { key: "tous", label: "Tous les clients", count: allCards.length },
                    ...clientNames.map((n) => ({ key: n, label: n, count: allCards.filter((t) => t.client === n).length })),
                  ].map(({ key, label, count }) => (
                    <ClientOption key={key} label={label} count={count} on={clientFilter === key} onSelect={() => { setClientFilter(key); setClientMenuOpen(false); }} />
                  ))}
                </div>
              </>
            )}
          </div>

          <span style={{ width: 1, height: 24, background: "#E2E1DA" }} />

          {/* Filtre Collaborateur */}
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#A6A498" }}>Collaborateur</span>
            <CollabAllBtn active={collabFilter === "tous"} onClick={() => setCollabFilter("tous")} />
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {Object.keys(ROSTER).filter((k) => ownersInUse.includes(k)).map((k) => (
                <CollabChip
                  key={k} initials={k} name={ROSTER[k]} bg={AV[k]}
                  active={collabFilter === k}
                  onClick={() => setCollabFilter(collabFilter === k ? "tous" : k)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Vue Liste */}
        {view === "liste" && (
          <ListeView board={board} allCards={allCards} matchCard={matchCard} onOpen={openCard} onDelete={deleteCardById} onDuplicate={duplicateCardById} />
        )}

        {/* Board Kanban */}
        {view === "kanban" && <div style={{ display: "flex", gap: 14, alignItems: "flex-start", overflowX: "auto", paddingBottom: 10 }}>
          {board.map((col, ci) => {
            const over = dragOverCol === ci;
            const visible = col.cards.filter(matchCard);
            return (
              <div
                key={ci}
                style={{
                  width: 262, flex: "none",
                  background: over ? "#F6EFDD" : "#EFEEE9",
                  border: `1.5px solid ${over ? "#C9A24E" : "#E6E5DE"}`,
                  borderRadius: 16, padding: 12, display: "flex", flexDirection: "column",
                  gap: 10, minHeight: 420,
                  transition: "background .15s ease, border-color .15s ease",
                }}
                onDragOver={(e) => { e.preventDefault(); if (dragOverCol !== ci) setDragOverCol(ci); }}
                onDragLeave={() => { if (dragOverCol === ci) setDragOverCol(null); }}
                onDrop={(e) => { e.preventDefault(); if (dragId != null) moveCard(dragId, ci); }}
              >
                {/* En-tête colonne */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 6px 8px", borderBottom: "1px solid #E2E1DA" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: col.dot }} />
                    <span style={{ fontSize: 15, fontWeight: 700, color: "#33322C" }}>{col.title}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#9A998F", background: "#E2E1DA", borderRadius: 99, padding: "1px 7px" }}>{visible.length}</span>
                  </div>
                  <span onClick={() => openNew(ci)} style={{ color: "#A6A498", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>+</span>
                </div>

                {/* Cartes */}
                {visible.map((card) => (
                  <KanbanCard
                    key={card.id}
                    card={card}
                    onOpen={() => openCard(card.id)}
                    onDragStart={(e) => { try { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(card.id)); } catch (_) {} setDragId(card.id); }}
                    onDragEnd={() => { setDragId(null); setDragOverCol(null); }}
                    dimmed={dragId === card.id}
                  />
                ))}

                <AddBtn onAdd={() => openNew(ci)} />
              </div>
            );
          })}
        </div>}

      </div>

      {/* Modal */}
      {draft && (
        <CardModal
          draft={draft}
          board={board}
          taskTypes={taskTypes}
          onClose={() => setDraft(null)}
          onUpdate={(patch) => setDraft((d) => d ? { ...d, ...patch } : d)}
          onSave={saveCard}
          onDelete={deleteCard}
          onAddType={(t) => setTaskTypes((prev) => prev.includes(t) ? prev : [...prev, t])}
        />
      )}
    </div>
  );
}
