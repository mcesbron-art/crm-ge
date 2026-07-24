import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getServerSession } from "@/lib/supabase-server";
import { TASK_STAGES } from "@/lib/task-taxonomy";
import { canAccessTask } from "@/lib/task-access";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STAGE_VALUES = new Set<string>(TASK_STAGES.map(s => s.value));

// Écriture transactionnelle (durée + statut) depuis le panneau "Temps passé
// sur la tâche" — remplace un usage direct de /api/time-entries pour cette
// UI précise car elle doit aussi, en option, changer tasks.stage dans la
// même opération (voir supabase/migrations/021_log_task_time_function.sql).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const supabase = createSupabaseServerClient();

  const { data: task, error: taskErr } = await supabase
    .from("tasks")
    .select("project_id, assigned_to, stage")
    .eq("id", params.id)
    .maybeSingle();
  if (taskErr || !task) return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 });

  if (!(await canAccessTask(supabase, params.id, session))) {
    return NextResponse.json({ error: "Tu n'es pas assigné à cette tâche" }, { status: 403 });
  }

  const body = await req.json();
  const { duration_seconds, date, note, new_stage } = body;

  if (typeof duration_seconds !== "number" || !Number.isFinite(duration_seconds) || duration_seconds <= 0) {
    return NextResponse.json({ error: "Durée invalide" }, { status: 400 });
  }
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Date invalide" }, { status: 400 });
  }
  const todayStr = new Date().toISOString().slice(0, 10);
  if (date > todayStr) {
    return NextResponse.json({ error: "La date ne peut pas être dans le futur" }, { status: 400 });
  }
  if (new_stage !== undefined && new_stage !== null && !STAGE_VALUES.has(new_stage)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }
  // Même règle que PATCH /api/tasks/[id]/stage : "Facturation" ne se
  // rejoint que via l'envoi dédié (type de facture requis).
  if (new_stage === "facturation") {
    return NextResponse.json({ error: "Utiliser l'envoi en facturation dédié (type de facture requis)" }, { status: 400 });
  }
  if (new_stage === "bat_envoye") {
    return NextResponse.json({ error: "Utiliser l'envoi de BAT dédié" }, { status: 400 });
  }

  const stageToApply = (typeof new_stage === "string" && new_stage !== task.stage) ? new_stage : null;

  const { data: entryId, error } = await supabase.rpc("log_task_time", {
    p_task_id: params.id,
    p_project_id: task.project_id,
    p_collaborateur_id: session.id,
    p_duration_seconds: Math.round(duration_seconds),
    p_date: date,
    p_note: typeof note === "string" && note.trim() ? note.trim() : null,
    p_new_stage: stageToApply,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: sumRows } = await supabase.from("time_entries").select("duration_seconds").eq("task_id", params.id);
  const totalSeconds = (sumRows ?? []).reduce((s, r) => s + ((r.duration_seconds as number) ?? 0), 0);

  return NextResponse.json({ entryId, totalSeconds, stage: stageToApply ?? task.stage });
}
