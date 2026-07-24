"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { can } from "@/lib/permissions";
import AccessDenied from "@/components/AccessDenied";
import { typography } from "@/lib/typography";
import Button from "@/components/ui/Button";
import { TASK_PRIORITIES, TASK_PRIORITY_COLOR } from "@/lib/task-taxonomy";

/* ─── Types (miroir de app/api/equipe/route.ts) ─────────────────────────── */

type PlanningBlock = { projectId: string; projectName: string; minutes: number; color: string };
type PlanningDay = { onLeave: boolean; blocks: PlanningBlock[] };
type Member = {
  id: string; nom: string; email: string; pole: string;
  avatar: string; avatarUrl: string | null; color: string;
  role: "admin" | "collaborateur"; baseHeures: number; weekMinutes: number; load: number;
  activeTasksCount: number; overdueTasksCount: number;
  activeProjects: { id: string; name: string }[];
  isOnLeaveToday: boolean; planning: PlanningDay[];
};
type WeekDay = { day: string; date: string; iso: string };
type TeamStats = { avgLoad: number; overdueTotal: number; activeTasksTotal: number; activeProjectsTotal: number; overloadedCount: number };

type MyTask = { id: string; label: string; done: boolean; dueDate: string | null; projectName: string };
type ProjetOption = { id: string; name: string; client_name: string };

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}
function fmtHoursMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m}`;
}
function loadStyle(load: number) {
  if (load > 100) return "#C2530B";
  if (load >= 85) return "#B0892B";
  return "#1F8A5B";
}
function statusOf(m: Member) {
  if (m.isOnLeaveToday) return { label: "En congé", color: "#5C5A52", bg: "#EEEDE6", dot: "#A6A498" };
  if (m.load > 100) return { label: "Surchargé", color: "#C2530B", bg: "#FBEAE0", dot: "#C2530B" };
  if (m.load >= 85) return { label: "Chargé", color: "#B0892B", bg: "rgba(201,162,78,.14)", dot: "#C9A24E" };
  if (m.load < 55) return { label: "Disponible", color: "#1F8A5B", bg: "#E7F3EB", dot: "#3FBF77" };
  return { label: "Actif", color: "#1F8A5B", bg: "#E7F3EB", dot: "#3FBF77" };
}
function dispoOf(load: number) {
  const left = 100 - load;
  if (left <= 0) return { text: "+" + Math.abs(left) + "%", color: "#C2530B" };
  if (left < 20) return { text: left + "% libre", color: "#B0892B" };
  return { text: left + "% libre", color: "#1F8A5B" };
}

const IconClose = () => (
  <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="5" x2="15" y2="15" /><line x1="15" y1="5" x2="5" y2="15" />
  </svg>
);

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default function EquipePage() {
  const { currentUser, effectiveRole } = useAuth();

  const [weekDays, setWeekDays] = useState<WeekDay[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats>({ avgLoad: 0, overdueTotal: 0, activeTasksTotal: 0, activeProjectsTotal: 0, overloadedCount: 0 });
  const [loading, setLoading] = useState(true);
  const [planningView, setPlanningView] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const [memberTasks, setMemberTasks] = useState<MyTask[] | null>(null);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);

  const canView = can(effectiveRole, "view_all_pages");

  useEffect(() => {
    if (!canView) return;
    fetch("/api/equipe", { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        setWeekDays(d.weekDays ?? []);
        setMembers(d.members ?? []);
        setTeamStats(d.teamStats ?? teamStats);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  if (!canView) {
    return (
      <AccessDenied
        message="La page Équipe est réservée aux administrateurs."
        user={{ nom: currentUser.nom, role: currentUser.role }}
      />
    );
  }

  const mDetail = members.find(m => m.id === currentMemberId) ?? null;

  function openMember(id: string) {
    setCurrentMemberId(id);
    setMemberOpen(true);
    setMemberTasks(null);
    setTasksLoading(true);
    fetch(`/api/tasks?mine=1&assigned_to=${id}`)
      .then(r => r.json())
      .then(d => {
        const tasks = (d.tasks ?? []) as { id: string; label: string; done: boolean; dueDate: string | null; projectName: string }[];
        setMemberTasks(tasks.filter(t => !t.done).slice(0, 8).map(t => ({ id: t.id, label: t.label, done: t.done, dueDate: t.dueDate, projectName: t.projectName })));
      })
      .catch(() => setMemberTasks([]))
      .finally(() => setTasksLoading(false));
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F5F5F2", display: "flex", flexDirection: "column", position: "relative" }}>
      <div style={{ padding: "26px 30px 36px", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Title row */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div>
            <h1 style={typography.pageTitle}>Équipe</h1>
            <div style={{ ...typography.description, marginTop: 5 }}>{members.length} collaborateur{members.length !== 1 ? "s" : ""} actif{members.length !== 1 ? "s" : ""}</div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/rapports" className="btn btn-secondary" style={{ textDecoration: "none" }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3v8" /><path d="M7 8.5l3 3 3-3" /><path d="M4.5 13.5v1.5C4.5 15.6 5 16 5.5 16h9c.5 0 1-.4 1-1v-1.5" /></svg>
              Rapports & export
            </Link>
            <button
              className="btn"
              onClick={() => setPlanningView(v => !v)}
              style={{ display: "flex", alignItems: "center", gap: 8, background: planningView ? "#0A0A0A" : "#fff", border: `1px solid ${planningView ? "#0A0A0A" : "#E2E1DA"}`, color: planningView ? "#E9D7A6" : "#33322C", fontSize: 15.5, fontWeight: 600, padding: "10px 16px", borderRadius: 10, fontFamily: "inherit" }}
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4.5" width="14" height="12.5" rx="2" /><line x1="3" y1="8.4" x2="17" y2="8.4" /></svg>
              {planningView ? "Vue équipe" : "Planning"}
            </button>
            <Link href="/administration" style={{ display: "flex", alignItems: "center", gap: 7, background: "#0A0A0A", color: "#E9D7A6", fontSize: 15.5, fontWeight: 600, padding: "10px 17px", borderRadius: 10, textDecoration: "none", border: "1px solid #0A0A0A", fontFamily: "inherit" }}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>Inviter un membre
            </Link>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#8C8B83", fontSize: 15 }}>Chargement…</div>
        ) : (
        <>
        {/* ──────────── VUE ÉQUIPE ──────────── */}
        {!planningView && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Stat cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
              <div style={{ background: "#0A0A0A", borderRadius: 16, padding: 20, color: "#EFE9DA", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -40, right: -30, width: 130, height: 130, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,162,78,.28), transparent 70%)" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
                  <span style={{ fontSize: 12.5, letterSpacing: ".13em", textTransform: "uppercase", color: "#B79B5E", fontWeight: 700 }}>Taux d&apos;occupation</span>
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(201,162,78,.16)", display: "flex", alignItems: "center", justifyContent: "center", color: "#E4C77B" }}>
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="7" /><path d="M10 6v4l2.5 2" /></svg>
                  </span>
                </div>
                <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 48, fontWeight: 800, lineHeight: 1, marginTop: 14, color: "#F4ECD7", position: "relative" }}>{teamStats.avgLoad} %</div>
                <div style={{ fontSize: 14.5, color: "#8E8876", marginTop: 10, position: "relative" }}>moyenne de l&apos;équipe cette semaine</div>
              </div>

              <div style={statCardBox}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={statCardLabel}>Tâches en retard</span>
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: "#FBEAE0", display: "flex", alignItems: "center", justifyContent: "center", color: "#C2530B" }}>
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="7" /><path d="M10 6v4l2.5 2" /></svg>
                  </span>
                </div>
                <div style={{ ...statCardValue, color: teamStats.overdueTotal > 0 ? "#C2530B" : "#16150F" }}>{teamStats.overdueTotal}</div>
                <div style={statCardHint}>échéance dépassée</div>
              </div>

              <div style={statCardBox}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={statCardLabel}>Tâches actives</span>
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(201,162,78,.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#B08D32" }}>
                    <svg width="15" height="15" viewBox="0 0 20 20" fill="currentColor"><path d="M6.5 4.5 15 10l-8.5 5.5z" /></svg>
                  </span>
                </div>
                <div style={statCardValue}>{teamStats.activeTasksTotal}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 11 }}>
                  <span style={{ background: "#F0EFEA", color: "#74726A", fontSize: 13.5, fontWeight: 700, padding: "2px 7px", borderRadius: 6 }}>sur {teamStats.activeProjectsTotal} projets</span>
                </div>
              </div>

              <div style={statCardBox}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={statCardLabel}>Surcharge</span>
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: "#FBEAE0", display: "flex", alignItems: "center", justifyContent: "center", color: "#C2530B" }}>
                    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3.5 17 16H3z" /><line x1="10" y1="8.6" x2="10" y2="11.8" /><circle cx="10" cy="13.9" r="0.5" fill="currentColor" /></svg>
                  </span>
                </div>
                <div style={statCardValue}>{teamStats.overloadedCount}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 11 }}>
                  <span style={{ background: "#FBEAE0", color: "#C2530B", fontSize: 13.5, fontWeight: 700, padding: "2px 7px", borderRadius: 6 }}>membres &gt; 100 %</span>
                </div>
              </div>
            </div>

            {/* Team cards */}
            {members.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#A6A498", fontSize: 15 }}>Aucun collaborateur actif.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                {members.map(m => (
                  <TeamCard key={m.id} m={m} onClick={() => openMember(m.id)} />
                ))}
              </div>
            )}

            {/* Workload table */}
            <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 18, padding: "8px 24px 16px", boxShadow: "0 1px 2px rgba(20,20,15,.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0 12px" }}>
                <h3 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 19, fontWeight: 700, color: "#16150F", margin: 0 }}>Répartition de la charge</h3>
                <span style={{ fontSize: 14.5, color: "#9A998F" }}>Semaine en cours</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1.6fr 2.6fr 1fr 1fr", gap: 14, paddingBottom: 12, borderBottom: "1px solid #EEEDE6" }}>
                {["Membre", "Projets en cours", "Charge", "Dispo."].map((h, i) => (
                  <span key={h} style={{ fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "#A6A498", fontWeight: 700, textAlign: i >= 2 ? (i === 3 ? "right" : "center") as "right" | "center" : "left" }}>{h}</span>
                ))}
              </div>
              {members.map(m => {
                const dispo = dispoOf(m.load);
                return (
                  <div key={m.id} style={{ display: "grid", gridTemplateColumns: "1.6fr 2.6fr 1fr 1fr", gap: 14, alignItems: "center", padding: "14px 0", borderBottom: "1px solid #F2F1EB" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                      <MemberAvatar m={m} size={34} />
                      <div>
                        <div style={{ fontSize: 15.5, fontWeight: 700, color: "#1C1B16" }}>{m.nom}</div>
                        <div style={{ fontSize: 13.5, color: "#A6A498" }}>{m.pole || "—"}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" as const }}>
                      {m.activeProjects.length === 0 ? (
                        <span style={{ fontSize: 13.5, color: "#C0BEB3" }}>—</span>
                      ) : m.activeProjects.slice(0, 3).map(p => (
                        <span key={p.id} style={{ fontSize: 13.5, fontWeight: 600, color: "#5C5A52", background: "#F5F4EF", border: "1px solid #EAE9E3", borderRadius: 7, padding: "3px 9px" }}>{p.name}</span>
                      ))}
                      {m.activeProjects.length > 3 && <span style={{ fontSize: 13, fontWeight: 700, color: "#A09E92" }}>+{m.activeProjects.length - 3}</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <div style={{ flex: 1, height: 6, borderRadius: 99, background: "#EFEDE5" }}>
                        <div style={{ height: "100%", borderRadius: 99, width: Math.min(m.load, 100) + "%", background: loadStyle(m.load) }} />
                      </div>
                      <span style={{ fontSize: 14.5, fontWeight: 700, color: loadStyle(m.load), width: 36, textAlign: "right" }}>{m.load}%</span>
                    </div>
                    <div style={{ textAlign: "right", fontSize: 14.5, fontWeight: 600, color: dispo.color }}>{dispo.text}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ──────────── VUE PLANNING ──────────── */}
        {planningView && (
          <div style={{ background: "#fff", border: "1px solid #ECEBE4", borderRadius: 18, padding: "20px 22px", boxShadow: "0 1px 2px rgba(20,20,15,.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 19, fontWeight: 700, color: "#16150F", margin: 0 }}>
                Planning — temps saisi cette semaine
              </h3>
              <span style={{ fontSize: 13.5, color: "#8C8B83" }}>Basé sur les saisies de temps réelles</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "180px repeat(5, 1fr)", border: "1px solid #EEEDE6", borderRadius: 12, overflow: "hidden" }}>
              <div style={{ background: "#FBFBF9", borderBottom: "1px solid #EEEDE6", padding: "11px 14px", fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase" as const, color: "#A6A498", fontWeight: 700 }}>Membre</div>
              {weekDays.map(d => (
                <div key={d.day} style={{ background: "#FBFBF9", borderBottom: "1px solid #EEEDE6", borderLeft: "1px solid #EEEDE6", padding: "11px 14px", textAlign: "center" as const }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: "#33322C" }}>{d.day}</div>
                  <div style={{ fontSize: 13, color: "#A6A498", marginTop: 1 }}>{d.date}</div>
                </div>
              ))}
              {members.length === 0 && (
                <div style={{ gridColumn: "1 / -1", padding: 32, textAlign: "center", color: "#A6A498", fontSize: 15 }}>Aucun collaborateur actif.</div>
              )}
              {members.map(m => (
                <PlanningRow key={m.id} m={m} />
              ))}
            </div>
          </div>
        )}
        </>
        )}
      </div>

      {/* ══════════ MODAL DÉTAILS MEMBRE ══════════ */}
      {memberOpen && mDetail && (
        <div onClick={() => setMemberOpen(false)} className="modal-overlay-in" style={{ position: "fixed", inset: 0, background: "rgba(16,15,11,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 30 }}>
          <div onClick={e => e.stopPropagation()} className="modal-panel-in" style={{ width: 560, maxWidth: "100%", maxHeight: "90vh", background: "#fff", borderRadius: 18, boxShadow: "0 30px 70px -20px rgba(16,15,11,.5)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ background: "#0A0A0A", padding: "24px 24px 22px", position: "relative", overflow: "hidden", flexShrink: 0 }}>
              <div style={{ position: "absolute", top: -50, right: -30, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(201,162,78,.22), transparent 68%)" }} />
              <Button variant="icon" aria-label="Fermer" onClick={() => setMemberOpen(false)} style={{ position: "absolute", top: 16, right: 16, color: "#8E8876", zIndex: 1 }}>
                <IconClose />
              </Button>
              <div style={{ display: "flex", alignItems: "center", gap: 16, position: "relative" }}>
                <MemberAvatar m={mDetail} size={62} fontSize={20} />
                <div>
                  <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 23, fontWeight: 800, color: "#F4ECD7" }}>{mDetail.nom}</div>
                  <div style={{ fontSize: 15, color: "#AEA890", marginTop: 2 }}>{mDetail.pole || "—"}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 9 }}>
                    {(() => { const st = statusOf(mDetail); return (
                      <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700, color: st.color, background: st.bg, borderRadius: 99, padding: "3px 9px" }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: st.dot }} />{st.label}
                      </span>
                    ); })()}
                    <span style={{ fontSize: 14, color: "#8E8876" }}>{mDetail.email}</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                {[
                  { label: "Charge", value: mDetail.load + "%", sub: `${fmtHoursMinutes(mDetail.weekMinutes)} / ${mDetail.baseHeures} h`, color: loadStyle(mDetail.load) },
                  { label: "En retard", value: String(mDetail.overdueTasksCount), sub: "tâches", color: mDetail.overdueTasksCount > 0 ? "#C2530B" : "#16150F" },
                  { label: "Dispo.", value: dispoOf(mDetail.load).text, sub: "cette semaine", color: dispoOf(mDetail.load).color },
                ].map(item => (
                  <div key={item.label} style={{ background: "#F7F6F2", borderRadius: 12, padding: 14 }}>
                    <div style={{ fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "#A6A498", fontWeight: 700 }}>{item.label}</div>
                    <div style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 24, fontWeight: 800, color: item.color, marginTop: 5 }}>{item.value}</div>
                    <div style={{ fontSize: 13, color: "#8C8B83", marginTop: 1 }}>{item.sub}</div>
                  </div>
                ))}
              </div>

              <div>
                <div style={{ fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase" as const, color: "#A6A498", fontWeight: 700, marginBottom: 10 }}>Projets assignés ({mDetail.activeProjects.length})</div>
                {mDetail.activeProjects.length === 0 ? (
                  <div style={{ fontSize: 14.5, color: "#A6A498" }}>Aucun projet actif.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {mDetail.activeProjects.map(p => (
                      <Link key={p.id} href={`/projets?q=${encodeURIComponent(p.name)}`} onClick={() => setMemberOpen(false)} style={{ display: "flex", alignItems: "center", gap: 11, background: "#fff", border: "1px solid #ECEBE4", borderRadius: 10, padding: "10px 12px", textDecoration: "none" }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#C9A24E", flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: "#1C1B16" }}>{p.name}</span>
                        <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="#C9A24E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h12M11 5l5 5-5 5" /></svg>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase" as const, color: "#A6A498", fontWeight: 700, marginBottom: 10 }}>Tâches en cours {memberTasks && `(${memberTasks.length})`}</div>
                {tasksLoading ? (
                  <div style={{ fontSize: 14.5, color: "#A6A498" }}>Chargement…</div>
                ) : !memberTasks || memberTasks.length === 0 ? (
                  <div style={{ fontSize: 14.5, color: "#A6A498" }}>Aucune tâche en cours.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {memberTasks.map(t => (
                      <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ width: 16, height: 16, borderRadius: 5, border: "2px solid #D6D4CB", flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 15, color: "#33322C", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.label}</span>
                        <span style={{ fontSize: 13.5, color: "#A6A498", whiteSpace: "nowrap" }}>{t.dueDate ? new Date(t.dueDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "—"}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 24px", borderTop: "1px solid #EEEDE6", background: "#FBFBF9", flexShrink: 0 }}>
              <a
                href={`mailto:${mDetail.email}`}
                className="btn btn-secondary"
                style={{ flex: 1, textDecoration: "none" }}
              >
                <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="14" height="11" rx="2" /><path d="M3 6.5 10 11l7-4.5" /></svg>Contacter
              </a>
              <Button variant="primary" style={{ flex: 1 }} onClick={() => setAssignOpen(true)}>
                <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10 4v12M4 10h12" /></svg>Assigner une tâche
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ MODAL ASSIGNER UNE TÂCHE ══════════ */}
      {assignOpen && mDetail && (
        <AssignTaskModal
          member={mDetail}
          onClose={() => setAssignOpen(false)}
          onAssigned={() => {
            setAssignOpen(false);
            if (currentMemberId) openMember(currentMemberId);
            fetch("/api/equipe", { cache: "no-store" }).then(r => r.json()).then(d => {
              setMembers(d.members ?? []);
              setTeamStats(d.teamStats ?? teamStats);
            }).catch(() => null);
          }}
        />
      )}
    </div>
  );
}

const statCardBox: React.CSSProperties = { background: "#fff", border: "1px solid #ECEBE4", borderRadius: 16, padding: 20, boxShadow: "0 1px 2px rgba(20,20,15,.04)" };
const statCardLabel: React.CSSProperties = { fontSize: 12.5, letterSpacing: ".13em", textTransform: "uppercase", color: "#9A998F", fontWeight: 700 };
const statCardValue: React.CSSProperties = { fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 38, fontWeight: 800, lineHeight: 1, marginTop: 14, color: "#16150F" };
const statCardHint: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, marginTop: 11, fontSize: 14.5, color: "#8C8B83" };

function MemberAvatar({ m, size, fontSize }: { m: Member; size: number; fontSize?: number }) {
  if (m.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={m.avatarUrl} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
    );
  }
  return (
    <span style={{ width: size, height: size, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: fontSize ?? size * 0.32, fontWeight: 700, color: "#fff", background: m.color }}>
      {m.avatar || initials(m.nom)}
    </span>
  );
}

/* ─── Team Card ──────────────────────────────────────────────────────────── */

function TeamCard({ m, onClick }: { m: Member; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const st = statusOf(m);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#fff",
        border: `1px solid ${hovered ? "#C9A24E" : "#ECEBE4"}`,
        borderRadius: 16, padding: 20,
        boxShadow: hovered ? "0 14px 30px -12px rgba(201,162,78,.55)" : "0 1px 2px rgba(20,20,15,.04)",
        cursor: "pointer",
        transform: hovered ? "translateY(-4px)" : "none",
        transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
        <MemberAvatar m={m} size={48} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1C1B16" }}>{m.nom}</div>
          <div style={{ fontSize: 14.5, color: "#8C8B83", marginTop: 2 }}>{m.pole || "—"}</div>
        </div>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700, color: st.color, background: st.bg, borderRadius: 99, padding: "3px 9px", flexShrink: 0 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: st.dot }} />{st.label}
        </span>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 7 }}>
          <span style={{ fontSize: 13.5, color: "#8C8B83", fontWeight: 600 }}>Charge — {fmtHoursMinutes(m.weekMinutes)} / {m.baseHeures} h</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: loadStyle(m.load), fontFamily: "Georgia, 'Times New Roman', serif" }}>{m.load}%</span>
        </div>
        <div style={{ height: 8, borderRadius: 99, background: "#F0EEE6", overflow: "hidden" }}>
          <div style={{ height: "100%", borderRadius: 99, width: Math.min(m.load, 100) + "%", background: loadStyle(m.load) }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 18, marginTop: 16, paddingTop: 14, borderTop: "1px solid #F2F1EB" }}>
        {[
          { label: "Projets", value: m.activeProjects.length },
          { label: "Tâches", value: m.activeTasksCount },
          { label: "En retard", value: m.overdueTasksCount, warn: m.overdueTasksCount > 0 },
        ].map(stat => (
          <div key={stat.label}>
            <div style={{ fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase" as const, color: "#A6A498", fontWeight: 700 }}>{stat.label}</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: stat.warn ? "#C2530B" : "#1C1B16", marginTop: 3, fontFamily: "Georgia, 'Times New Roman', serif" }}>{stat.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Ligne planning ─────────────────────────────────────────────────────── */

function PlanningRow({ m }: { m: Member }) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: "1px solid #F2F1EB" }}>
        <MemberAvatar m={m} size={30} fontSize={12} />
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1C1B16", whiteSpace: "nowrap" }}>{m.nom}</div>
          <div style={{ fontSize: 13, color: "#A6A498", whiteSpace: "nowrap" }}>{m.pole || "—"}</div>
        </div>
      </div>
      {m.planning.map((cell, ci) => (
        <div key={ci} style={{ borderBottom: "1px solid #F2F1EB", borderLeft: "1px solid #F2F1EB", padding: 7, display: "flex", flexDirection: "column", gap: 5, minHeight: 64, background: cell.onLeave || cell.blocks.length ? "#fff" : "#FBFBF9" }}>
          {cell.onLeave ? (
            <div style={{ background: "#F0EFEA", borderLeft: "3px solid #B5B2A6", borderRadius: 6, padding: "5px 8px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#8C8B83" }}>Congé</div>
            </div>
          ) : cell.blocks.map((b, bi) => (
            <div key={bi} style={{ background: `${b.color}18`, borderLeft: `3px solid ${b.color}`, borderRadius: 6, padding: "5px 8px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: b.color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.projectName}</div>
              <div style={{ fontSize: 12, color: "#8C8B83", marginTop: 1 }}>{fmtHoursMinutes(b.minutes)}</div>
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

/* ─── Modal assigner une tâche (réel, POST /api/tasks) ──────────────────── */

function AssignTaskModal({ member, onClose, onAssigned }: { member: Member; onClose: () => void; onAssigned: () => void }) {
  const [label, setLabel] = useState("");
  const [projectQuery, setProjectQuery] = useState("");
  const [projectOpen, setProjectOpen] = useState(false);
  const [projectResults, setProjectResults] = useState<ProjetOption[]>([]);
  const [project, setProject] = useState<ProjetOption | null>(null);
  const [due, setDue] = useState("");
  const [hours, setHours] = useState("");
  const [priority, setPriority] = useState<string>("Normale");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingResults, setLoadingResults] = useState(false);

  useEffect(() => {
    if (!projectOpen) return;
    setLoadingResults(true);
    const t = setTimeout(() => {
      fetch(`/api/projets?q=${encodeURIComponent(projectQuery)}&page_size=15`)
        .then(r => r.json())
        .then((d: { data?: ProjetOption[] }) => setProjectResults(Array.isArray(d.data) ? d.data : []))
        .catch(() => setProjectResults([]))
        .finally(() => setLoadingResults(false));
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectOpen, projectQuery]);

  async function handleSave() {
    if (!label.trim() || !project) return;
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/tasks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: project.id,
          label: label.trim(),
          assigned_to: member.id,
          due_date: due || undefined,
          estimated_minutes: hours ? Math.round(Number(hours) * 60) : undefined,
          priority,
        }),
      });
      const d = await r.json();
      if (r.ok) {
        setSaved(true);
        setTimeout(onAssigned, 700);
      } else {
        setError(d.error ?? "Échec de la création");
      }
    } catch {
      setError("Erreur réseau");
    } finally {
      setSaving(false);
    }
  }

  const warnColor = member.load > 100 ? "#C2530B" : member.load >= 85 ? "#B0892B" : "#1F8A5B";
  const warnBg = member.load > 100 ? "#FBEAE0" : member.load >= 85 ? "rgba(201,162,78,.10)" : "#F7F6F2";
  const warnBorder = member.load > 100 ? "#F4DAC6" : member.load >= 85 ? "#E9DEBE" : "#ECEBE4";
  const warnText = member.load > 100 ? "membre déjà en surcharge, à arbitrer" : member.load >= 85 ? "proche de la pleine capacité" : "capacité disponible";

  return (
    <div onClick={onClose} className="modal-overlay-in" style={{ position: "fixed", inset: 0, background: "rgba(16,15,11,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70, padding: 30 }}>
      <div onClick={e => e.stopPropagation()} className="modal-panel-in" style={{ width: 540, maxWidth: "100%", maxHeight: "90vh", background: "#fff", borderRadius: 18, boxShadow: "0 30px 70px -20px rgba(16,15,11,.5)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", background: "#0A0A0A", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
            <MemberAvatar m={member} size={34} fontSize={14} />
            <div>
              <span style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 17, fontWeight: 700, color: "#F4ECD7" }}>Assigner une tâche</span>
              <span style={{ display: "block", fontSize: 13.5, color: "#9A9078", marginTop: 1 }}>à {member.nom} · {member.pole || "—"}</span>
            </div>
          </div>
          <Button variant="icon" aria-label="Fermer" onClick={onClose} style={{ color: "#8E8876" }}><IconClose /></Button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 15 }}>
          {error && (
            <div style={{ background: "#FBEAE0", border: "1px solid #F0C5B0", borderRadius: 9, padding: "9px 12px", fontSize: 14, color: "#C2410C" }}>{error}</div>
          )}
          <div>
            <label style={fLabel}>Intitulé de la tâche</label>
            <input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="Ex. Préparer les maquettes home" style={fInput} />
          </div>
          <div>
            <label style={fLabel}>Projet</label>
            <div style={{ position: "relative" }}>
              <div onClick={() => setProjectOpen(o => !o)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", border: `1px solid ${projectOpen ? "#C9A24E" : "#E2E1DA"}`, borderRadius: 9, padding: "10px 12px", cursor: "pointer" }}>
                <span style={{ fontSize: 15, color: project ? "#1C1B16" : "#9A998F", fontWeight: project ? 600 : 400 }}>{project ? project.name : "Rechercher un projet…"}</span>
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="#A6A498" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8l4 4 4-4" /></svg>
              </div>
              {projectOpen && (
                <>
                  <div onClick={() => setProjectOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                  <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 50, background: "#fff", border: "1px solid #E6E5DE", borderRadius: 11, boxShadow: "0 20px 44px -18px rgba(20,20,15,.35)", padding: 8 }}>
                    <input autoFocus value={projectQuery} onChange={e => setProjectQuery(e.target.value)} placeholder="Rechercher…" style={{ width: "100%", fontSize: 15, border: "1px solid #E6E5DE", borderRadius: 8, padding: "7px 10px", outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const, marginBottom: 6 }} />
                    <div style={{ maxHeight: 220, overflowY: "auto" }}>
                      {loadingResults ? (
                        <div style={{ padding: "10px 8px", fontSize: 14.5, color: "#A6A498" }}>Recherche…</div>
                      ) : projectResults.length === 0 ? (
                        <div style={{ padding: "10px 8px", fontSize: 14.5, color: "#A6A498" }}>Aucun projet trouvé.</div>
                      ) : projectResults.map(p => (
                        <div key={p.id} onClick={() => { setProject(p); setProjectOpen(false); }} style={{ padding: "8px 9px", borderRadius: 8, cursor: "pointer", background: p.id === project?.id ? "#F6EFDD" : "transparent" }}>
                          <div style={{ fontSize: 15, fontWeight: 600, color: "#1C1B16" }}>{p.name}</div>
                          <div style={{ fontSize: 13.5, color: "#A6A498" }}>{p.client_name}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={fLabel}>Échéance</label>
              <input type="date" value={due} onChange={e => setDue(e.target.value)} style={fInput} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={fLabel}>Temps estimé (h)</label>
              <input type="number" min={0} value={hours} onChange={e => setHours(e.target.value)} placeholder="0" style={fInput} />
            </div>
          </div>
          <div>
            <label style={{ ...fLabel, marginBottom: 7 }}>Priorité</label>
            <div style={{ display: "flex", gap: 7 }}>
              {TASK_PRIORITIES.map(p => {
                const on = priority === p;
                const color = TASK_PRIORITY_COLOR[p];
                return (
                  <span key={p} onClick={() => setPriority(p)} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14.5, fontWeight: 600, color: on ? "#fff" : color, background: on ? color : `${color}18`, border: `1px solid ${on ? color : "transparent"}`, borderRadius: 8, padding: "7px 13px", cursor: "pointer" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: on ? "#fff" : color }} />{p}
                  </span>
                );
              })}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: warnBg, border: `1px solid ${warnBorder}`, borderRadius: 11, padding: "11px 13px" }}>
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke={warnColor} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="7" /><path d="M10 6.5v4l2.5 1.5" /></svg>
            <span style={{ fontSize: 14.5, color: "#5C5A52", flex: 1 }}>Charge actuelle : <b style={{ color: warnColor }}>{member.load}%</b> · {warnText}</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, padding: "15px 22px", borderTop: "1px solid #EEEDE6", background: "#FBFBF9", flexShrink: 0 }}>
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving || !label.trim() || !project}
            style={saved ? { background: "#1F8A5B", borderColor: "#1F8A5B", color: "#fff" } : undefined}
          >{saved ? "Tâche assignée ✓" : saving ? "Création…" : "Assigner la tâche"}</Button>
        </div>
      </div>
    </div>
  );
}

const fLabel: React.CSSProperties = { ...typography.label, letterSpacing: ".08em", textTransform: "uppercase", display: "block", marginBottom: 6 };
const fInput: React.CSSProperties = { width: "100%", boxSizing: "border-box", fontFamily: "inherit", fontSize: 15.5, color: "#1C1B16", background: "#fff", border: "1px solid #E2E1DA", borderRadius: 9, padding: "10px 12px", outline: "none" };
