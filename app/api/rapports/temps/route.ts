import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient, getServerSession } from "@/lib/supabase-server";
import { fetchProjectAggregates } from "@/lib/project-time-aggregates";
import { PROJECT_TYPE_LABEL, PROJECT_TYPE_COLOR } from "@/lib/project-taxonomy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function mondayOf(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + diff);
}
// Format compact "7h30" — même convention que /api/dashboard.
function fmtHM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h${String(m).padStart(2, "0")}`;
}
function levelColor(occPct: number): string {
  if (occPct > 100) return "#D64545";
  if (occPct >= 90) return "#D08A2E";
  return "#2FA968";
}
// Nombre de jours ouvrés (Lun-Ven) entre from et to inclus — sert de base au
// calcul de la capacité attendue sur la période (occupation = temps saisi /
// capacité), quelle que soit la durée de la période (semaine/mois/trimestre/année).
function countWeekdays(fromIso: string, toIso: string): number {
  const from = new Date(fromIso + "T00:00:00");
  const to = new Date(toIso + "T00:00:00");
  let count = 0;
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const PERIOD_LABEL_FORMATTER: Record<string, (from: Date, to: Date) => string> = {
  semaine: (from, to) => `Semaine du ${from.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })} au ${to.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`,
  mois: (from) => from.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
  trimestre: (from) => `T${Math.floor(from.getMonth() / 3) + 1} ${from.getFullYear()}`,
  annee: (from) => `${from.getFullYear()}`,
};

function periodRange(period: string, from: string | null, to: string | null): { from: string; to: string } | null {
  const now = new Date();
  if (period === "semaine") {
    const monday = mondayOf(now);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
    return { from: toIsoDate(monday), to: toIsoDate(sunday) };
  }
  if (period === "mois") {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: toIsoDate(first), to: toIsoDate(last) };
  }
  if (period === "trimestre") {
    const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
    const first = new Date(now.getFullYear(), qStartMonth, 1);
    const last = new Date(now.getFullYear(), qStartMonth + 3, 0);
    return { from: toIsoDate(first), to: toIsoDate(last) };
  }
  if (period === "annee") {
    return { from: `${now.getFullYear()}-01-01`, to: `${now.getFullYear()}-12-31` };
  }
  if (period === "custom" && from && to) return { from, to };
  return null;
}

type CollabRow = { id: string; nom: string; color: string | null; pole: string | null; base_heures: number | null };
type ProjectRow = { id: string; name: string; client_name: string | null; project_type: string | null };
type TimeEntryRow = { collaborateur_id: string; date: string; duration_minutes: number };

function getInitials(nom: string): string {
  return nom.split(" ").map(w => w[0] ?? "").join("").slice(0, 2).toUpperCase();
}

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const periodKey = searchParams.get("period") ?? "semaine";
  const range = periodRange(periodKey, searchParams.get("from"), searchParams.get("to"));
  if (!range) return NextResponse.json({ error: "Période invalide" }, { status: 400 });

  const supabase = createSupabaseAdminClient();
  const now = new Date();
  const weekMonday = mondayOf(now);
  const weekSunday = new Date(weekMonday.getFullYear(), weekMonday.getMonth(), weekMonday.getDate() + 6);
  const weekFrom = toIsoDate(weekMonday);
  const weekTo = toIsoDate(weekSunday);
  // Une seule requête time_entries couvrant l'union [période sélectionnée,
  // semaine calendaire en cours] — le motif "jours de la semaine" du tableau
  // collaborateur montre toujours la semaine en cours quelle que soit la
  // période choisie (même comportement que le modèle fourni).
  const spanFrom = range.from < weekFrom ? range.from : weekFrom;
  const spanTo = range.to > weekTo ? range.to : weekTo;

  const [{ data: collabs, error: collabsErr }, { data: activeProjects, error: projectsErr }, { data: entries, error: entriesErr }] = await Promise.all([
    supabase.from("collaborateurs").select("id, nom, color, pole, base_heures").eq("actif", true).order("nom"),
    supabase.from("projects").select("id, name, client_name, project_type").neq("status", "termine").eq("archived", false),
    supabase.from("time_entries").select("collaborateur_id, date, duration_minutes").gte("date", spanFrom).lte("date", spanTo),
  ]);

  if (collabsErr) return NextResponse.json({ error: collabsErr.message }, { status: 500 });
  if (projectsErr) return NextResponse.json({ error: projectsErr.message }, { status: 500 });
  if (entriesErr) return NextResponse.json({ error: entriesErr.message }, { status: 500 });

  const collabRowsRaw = (collabs ?? []) as CollabRow[];
  const projectRowsRaw = (activeProjects ?? []) as ProjectRow[];
  const entryRows = (entries ?? []) as TimeEntryRow[];

  // ── Temps par collaborateur (période sélectionnée) + motif jour (semaine en cours) ──
  const periodMinutesByCollab = new Map<string, number>();
  const dayMinutesByCollab = new Map<string, number[]>(); // index 0=Lun .. 6=Dim
  for (const c of collabRowsRaw) dayMinutesByCollab.set(c.id, [0, 0, 0, 0, 0, 0, 0]);

  for (const e of entryRows) {
    if (e.date >= range.from && e.date <= range.to) {
      periodMinutesByCollab.set(e.collaborateur_id, (periodMinutesByCollab.get(e.collaborateur_id) ?? 0) + e.duration_minutes);
    }
    if (e.date >= weekFrom && e.date <= weekTo) {
      const days = dayMinutesByCollab.get(e.collaborateur_id);
      if (days) {
        const dow = new Date(e.date + "T00:00:00").getDay();
        const idx = dow === 0 ? 6 : dow - 1;
        days[idx] += e.duration_minutes;
      }
    }
  }

  const weekdaysInPeriod = countWeekdays(range.from, range.to);
  let totalPeriodMinutes = 0;
  let totalExpectedMinutes = 0;

  const collabRows = collabRowsRaw.map(c => {
    const baseHeures = c.base_heures || 35;
    const periodeMinutes = periodMinutesByCollab.get(c.id) ?? 0;
    const expectedMinutes = (baseHeures / 5) * 60 * weekdaysInPeriod;
    const occPct = expectedMinutes > 0 ? Math.round((periodeMinutes / expectedMinutes) * 100) : 0;
    totalPeriodMinutes += periodeMinutes;
    totalExpectedMinutes += expectedMinutes;

    const dailyTargetMinutes = (baseHeures / 5) * 60;
    const days = (dayMinutesByCollab.get(c.id) ?? [0, 0, 0, 0, 0, 0, 0]).map((min, i) => {
      const dayOcc = dailyTargetMinutes > 0 ? (min / dailyTargetMinutes) * 100 : 0;
      return {
        label: DAY_LABELS[i],
        pct: Math.max(0, Math.min(100, Math.round((min / (dailyTargetMinutes * 1.3)) * 100))),
        color: min === 0 ? "#EDECE5" : levelColor(dayOcc),
      };
    });

    return {
      id: c.id, nom: c.nom, initials: getInitials(c.nom), color: c.color ?? "#8C8B83", pole: c.pole ?? "—",
      hoursLabel: fmtHM(periodeMinutes), occLabel: `${occPct}%`, occColor: levelColor(occPct),
      days, periodeMinutes,
    };
  }).sort((a, b) => b.periodeMinutes - a.periodeMinutes);

  // ── Temps par projet / type / client — état actuel (tous temps confondus, projets actifs) ──
  const projectIds = projectRowsRaw.map(p => p.id);
  const aggregates = await fetchProjectAggregates(supabase, projectIds);

  const projectRows = projectRowsRaw.map(p => {
    const agg = aggregates.get(p.id) ?? { total_minutes: 0, estimated_minutes_total: 0, tasks_done: 0, tasks_total: 0, assignee_ids: [] };
    const estime = agg.estimated_minutes_total;
    const passe = agg.total_minutes;
    const pct = estime > 0 ? Math.round((passe / estime) * 100) : 0;
    const over = estime > 0 && passe > estime;
    const color = over ? "#C2410C" : (pct >= 85 ? "#C9A24E" : "#1F9D57");
    const type = p.project_type ?? "autre";
    return {
      id: p.id, name: p.name, client: p.client_name ?? "—",
      type, typeLabel: PROJECT_TYPE_LABEL[type] ?? "Autre", typeColor: PROJECT_TYPE_COLOR[type] ?? "#8C8B83",
      estimeLabel: estime > 0 ? fmtHM(estime) : "—", passeLabel: fmtHM(passe),
      over, pct: Math.min(pct, 140), color,
      chargeLabel: estime > 0 ? `${pct}%${over ? " ⚠" : ""}` : "—",
      passeMinutes: passe, estimeMinutes: estime,
    };
  }).sort((a, b) => b.passeMinutes - a.passeMinutes);

  const typeAgg = new Map<string, { hours: number; count: number }>();
  for (const p of projectRows) {
    const prev = typeAgg.get(p.type) ?? { hours: 0, count: 0 };
    prev.hours += p.passeMinutes;
    prev.count += 1;
    typeAgg.set(p.type, prev);
  }
  const totalTypeMinutes = [...typeAgg.values()].reduce((s, t) => s + t.hours, 0);
  const typeRows = [...typeAgg.entries()]
    .map(([type, agg]) => ({
      value: type, label: PROJECT_TYPE_LABEL[type] ?? "Autre", color: PROJECT_TYPE_COLOR[type] ?? "#8C8B83",
      hoursLabel: fmtHM(agg.hours), pct: totalTypeMinutes > 0 ? Math.round((agg.hours / totalTypeMinutes) * 100) : 0,
      projectCount: agg.count,
    }))
    .sort((a, b) => b.pct - a.pct);

  const clientAgg = new Map<string, { projects: string[]; hours: number; target: number }>();
  for (const p of projectRows) {
    const prev = clientAgg.get(p.client) ?? { projects: [], target: 0, hours: 0 };
    prev.projects.push(p.name);
    prev.hours += p.passeMinutes;
    prev.target += p.estimeMinutes;
    clientAgg.set(p.client, prev);
  }
  const maxClientMinutes = Math.max(1, ...[...clientAgg.values()].map(c => c.hours));
  const clientRows = [...clientAgg.entries()]
    .map(([name, agg]) => {
      const over = agg.target > 0 && agg.hours > agg.target;
      const overPct = agg.target > 0 ? Math.round(((agg.hours - agg.target) / agg.target) * 100) : 0;
      return {
        name, projects: agg.projects.join(", "), hoursLabel: fmtHM(agg.hours),
        pct: Math.round((agg.hours / maxClientMinutes) * 100), color: over ? "#C2410C" : "#1F9D57",
        overrun: over, overrunLabel: over ? `+${overPct}%` : "Conforme",
        hoursMinutes: agg.hours,
      };
    })
    .sort((a, b) => b.hoursMinutes - a.hoursMinutes);

  const overrunCount = projectRows.filter(p => p.over).length;
  const occPctGlobal = totalExpectedMinutes > 0 ? Math.round((totalPeriodMinutes / totalExpectedMinutes) * 100) : 0;

  const periodLabel = (PERIOD_LABEL_FORMATTER[periodKey] ?? PERIOD_LABEL_FORMATTER.semaine)(new Date(range.from + "T00:00:00"), new Date(range.to + "T00:00:00"));
  const updatedAt = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  return NextResponse.json({
    period: range, periodLabel, updatedAt,
    kpi: {
      hoursLabel: fmtHM(totalPeriodMinutes), hoursNote: `sur ${fmtHM(totalExpectedMinutes)} disponibles`,
      occLabel: `${occPctGlobal}%`, occColor: levelColor(occPctGlobal),
      occNote: occPctGlobal > 100 ? "Charge très élevée" : occPctGlobal >= 90 ? "Charge élevée" : "Capacité disponible",
      overrunCount, overrunNote: `${overrunCount} projet(s) au-dessus de l'estimation`,
      clientCount: clientRows.length, clientNote: "sur les projets actifs",
    },
    collabRows, projectRows, typeRows, clientRows,
  });
}
