"use client";

import { useState, useMemo } from "react";
import DatePickerField from "@/components/DatePickerField";

type ProjectOption = { id: string; name: string; clientName: string };

type Props = {
  projects: ProjectOption[];
  onClose: () => void;
  onConfirm: (data: { projectId: string; date: string; hours: number }) => Promise<void>;
};

const IconX = () => (<svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="5" x2="15" y2="15" /><line x1="15" y1="5" x2="5" y2="15" /></svg>);
const IconChevron = () => (<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="#A6A498" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8l4 4 4-4" /></svg>);
const IconClock = () => (<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="7" /><path d="M10 6.5v4l2.5 1.5" /></svg>);

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const PROJECT_COLORS = ["#2563EB", "#C9A24E", "#7C3AED", "#16A34A", "#C2410C", "#0E7C66", "#BE185D", "#EA8A0C"];
function accentFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PROJECT_COLORS[h % PROJECT_COLORS.length];
}

/**
 * "Déclarer des heures sup." — cascade Client → Projet, alimentée par les
 * vrais projets de l'agence (pas une liste séparée) : le client se lit sur
 * projects.client_name, pas dupliqué ici.
 */
export default function OvertimeFormModal({ projects, onClose, onConfirm }: Props) {
  const clients = useMemo(() => Array.from(new Set(projects.map(p => p.clientName))).sort(), [projects]);
  const [client, setClient] = useState(clients[0] ?? "");
  const [clientOpen, setClientOpen] = useState(false);
  const projectsForClient = useMemo(() => projects.filter(p => p.clientName === client), [projects, client]);
  const [projectId, setProjectId] = useState(projectsForClient[0]?.id ?? "");
  const [projectOpen, setProjectOpen] = useState(false);
  const [date, setDate] = useState(todayLocal());
  const [hours, setHours] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentProject = projects.find(p => p.id === projectId) ?? projectsForClient[0] ?? null;
  const hoursNum = Number(hours);
  const canSave = !saving && !!currentProject && !!date && Number.isFinite(hoursNum) && hoursNum > 0;

  const selectClient = (c: string) => {
    setClient(c);
    setClientOpen(false);
    const first = projects.find(p => p.clientName === c);
    setProjectId(first?.id ?? "");
  };

  const submit = async () => {
    if (!canSave || !currentProject) return;
    setSaving(true);
    setError(null);
    try {
      await onConfirm({ projectId: currentProject.id, date, hours: hoursNum });
      setSaved(true);
      setTimeout(onClose, 850);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Échec de l'enregistrement");
      setSaving(false);
    }
  };

  return (
    <div onClick={onClose} className="modal-overlay-in" style={{ position: "fixed", inset: 0, background: "rgba(16,15,11,.45)", zIndex: 90, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Déclarer des heures sup." className="modal-slide-in" style={{ width: 460, maxWidth: "100%", height: "100%", background: "#fff", display: "flex", flexDirection: "column", boxShadow: "-30px 0 70px -20px rgba(16,15,11,.5)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", background: "#0A0A0A", flex: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(201,162,78,.16)", display: "flex", alignItems: "center", justifyContent: "center", color: "#E4C77B" }}><IconClock /></span>
            <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 18, fontWeight: 700, color: "#F4ECD7" }}>Déclarer des heures sup.</span>
          </div>
          <span onClick={onClose} style={{ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#8E8876", cursor: "pointer" }}><IconX /></span>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 22, display: "flex", flexDirection: "column", gap: 17 }}>
          {projects.length === 0 ? (
            <div style={{ fontSize: 14.5, color: "#A6A498" }}>Aucun projet disponible pour déclarer des heures.</div>
          ) : (
            <>
              <div>
                <label style={{ fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, display: "block", marginBottom: 7 }}>Client</label>
                <div style={{ position: "relative" }}>
                  <div onClick={() => setClientOpen(o => !o)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", border: `1px solid ${clientOpen ? "#C9A24E" : "#E2E1DA"}`, borderRadius: 10, padding: "11px 13px", cursor: "pointer" }}>
                    <span style={{ fontSize: 15.5, color: "#1C1B16", fontWeight: 600 }}>{client}</span>
                    <IconChevron />
                  </div>
                  {clientOpen && (
                    <>
                      <div onClick={() => setClientOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 20 }} />
                      <div style={{ position: "absolute", top: 48, left: 0, right: 0, zIndex: 30, background: "#fff", border: "1px solid #E6E5DE", borderRadius: 12, boxShadow: "0 20px 44px -18px rgba(20,20,15,.35)", padding: 6, maxHeight: 240, overflowY: "auto" }}>
                        {clients.map(c => (
                          <div key={c} onClick={() => selectClient(c)} style={{ padding: "9px 11px", borderRadius: 8, cursor: "pointer", fontSize: 15, fontWeight: client === c ? 700 : 500, color: "#33322C", background: client === c ? "#F5F4EF" : "transparent" }}>
                            {c}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, display: "block", marginBottom: 7 }}>Projet lié</label>
                <div style={{ position: "relative" }}>
                  <div onClick={() => setProjectOpen(o => !o)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", border: `1px solid ${projectOpen ? "#C9A24E" : "#E2E1DA"}`, borderRadius: 10, padding: "11px 13px", cursor: "pointer" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: currentProject ? accentFor(currentProject.name) : "#D6D4CB", flex: "none" }} />
                      <span style={{ fontSize: 15.5, color: "#1C1B16", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentProject?.name ?? "Sélectionner un projet…"}</span>
                    </span>
                    <IconChevron />
                  </div>
                  {projectOpen && (
                    <>
                      <div onClick={() => setProjectOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 20 }} />
                      <div style={{ position: "absolute", top: 48, left: 0, right: 0, zIndex: 30, background: "#fff", border: "1px solid #E6E5DE", borderRadius: 12, boxShadow: "0 20px 44px -18px rgba(20,20,15,.35)", padding: 6, maxHeight: 240, overflowY: "auto" }}>
                        {projectsForClient.map(p => (
                          <div key={p.id} onClick={() => { setProjectId(p.id); setProjectOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 11px", borderRadius: 8, cursor: "pointer", background: p.id === projectId ? "#F5F4EF" : "transparent" }}>
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: accentFor(p.name), flex: "none" }} />
                            <span style={{ fontSize: 15, fontWeight: p.id === projectId ? 700 : 500, color: "#33322C" }}>{p.name}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, display: "block", marginBottom: 6 }}>Date</label>
                <DatePickerField value={date} onChange={setDate} disableFuture={false} />
              </div>

              <div>
                <label style={{ fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase", color: "#A6A498", fontWeight: 700, display: "block", marginBottom: 6 }}>Nombre d&apos;heures</label>
                <input type="number" min={0.5} step={0.5} value={hours} onChange={e => setHours(e.target.value)} placeholder="Ex. 2.5" style={{ width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: 15.5, color: "#1C1B16", background: "#fff", border: "1px solid #E2E1DA", borderRadius: 9, padding: "10px 12px", outline: "none" }} />
              </div>
            </>
          )}

          {error && (
            <div role="alert" style={{ background: "#FDECEC", border: "1px solid #F0B4B4", borderRadius: 9, padding: "9px 12px", fontSize: 14, color: "#DC2626", lineHeight: 1.45 }}>{error}</div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "16px 22px", borderTop: "1px solid #EEEDE6", background: "#FBFBF9", flex: "none" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, color: "#8C8B83" }}>
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="#B0892B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="7" /><path d="M10 6.5v4l2.5 1.5" /></svg>
            Envoyé pour validation à la direction
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, background: "#fff", border: "1px solid #E2E1DA", color: "#33322C", fontSize: 15, fontWeight: 600, padding: 10, borderRadius: 10, cursor: "pointer", fontFamily: "inherit" }}>Annuler</button>
            <button onClick={submit} disabled={!canSave} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, background: "linear-gradient(135deg,#D8B25C,#A07B26)", color: "#1A1206", fontSize: 15, fontWeight: 700, padding: 10, borderRadius: 10, cursor: canSave ? "pointer" : "default", border: "none", fontFamily: "inherit", opacity: canSave ? 1 : 0.6 }}>
              {saved ? "Déclaration envoyée ✓" : saving ? "Envoi…" : "Envoyer la déclaration"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
