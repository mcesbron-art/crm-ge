import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getServerSession } from "@/lib/supabase-server";
import { totalElapsedSeconds } from "@/lib/task-timer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Un seul chrono actif par collaborateur (contrainte UNIQUE en base).
// Démarrer un chrono sur une nouvelle tâche pendant qu'un autre tourne (ou
// est en pause) arrête et encaisse automatiquement le précédent en
// time_entries — pas de multi-chrono en parallèle, même en pause.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const supabase = createSupabaseServerClient();

  const { data: taskRow, error: taskErr } = await supabase.from("tasks").select("id").eq("id", params.id).maybeSingle();
  if (taskErr || !taskRow) return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 });

  const { data: existing } = await supabase
    .from("task_timers")
    .select("id, task_id, started_at, accumulated_seconds")
    .eq("collaborateur_id", session.id)
    .maybeSingle();

  if (existing && existing.task_id === params.id) {
    // Déjà le chrono actif de cette tâche — s'il était en pause, on le
    // reprend plutôt que de renvoyer un started_at nul au client.
    if (existing.started_at) return NextResponse.json({ startedAt: existing.started_at, previous: null });
    const { data: resumed, error: resumeErr } = await supabase
      .from("task_timers").update({ started_at: new Date().toISOString() }).eq("id", existing.id)
      .select("started_at").single();
    if (resumeErr) return NextResponse.json({ error: resumeErr.message }, { status: 500 });
    return NextResponse.json({ startedAt: resumed.started_at, previous: null });
  }

  let previous: { taskId: string; durationSeconds: number } | null = null;

  if (existing) {
    // Durée exacte + arrondi au supérieur pour duration_minutes : voir stop/route.ts.
    const elapsedSeconds = totalElapsedSeconds(existing.started_at as string | null, existing.accumulated_seconds as number);
    if (elapsedSeconds > 0) {
      const { data: prevTask } = await supabase.from("tasks").select("project_id").eq("id", existing.task_id).maybeSingle();
      if (prevTask) {
        await supabase.from("time_entries").insert({
          project_id: prevTask.project_id,
          task_id: existing.task_id,
          collaborateur_id: session.id,
          duration_minutes: Math.ceil(elapsedSeconds / 60),
          duration_seconds: elapsedSeconds,
          note: "Chrono",
        });
        previous = { taskId: existing.task_id as string, durationSeconds: elapsedSeconds };
      }
    }
    await supabase.from("task_timers").delete().eq("id", existing.id);
  }

  const { data, error } = await supabase
    .from("task_timers")
    .insert({ task_id: params.id, collaborateur_id: session.id })
    .select("started_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ startedAt: data.started_at, previous });
}
