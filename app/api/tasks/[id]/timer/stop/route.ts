import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getServerSession } from "@/lib/supabase-server";
import { totalElapsedSeconds } from "@/lib/task-timer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const supabase = createSupabaseServerClient();

  const { data: existing } = await supabase
    .from("task_timers")
    .select("id, started_at, accumulated_seconds")
    .eq("collaborateur_id", session.id)
    .eq("task_id", params.id)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: "Aucun chrono actif sur cette tâche" }, { status: 404 });

  // duration_seconds garde la durée exacte (affichée dans le détail de la
  // tâche) ; duration_minutes reste l'arrondi au supérieur utilisé par les
  // agrégats existants (badges, rapports) — même quelques secondes de
  // chrono ne doivent jamais disparaître silencieusement. Fonctionne que le
  // chrono soit en cours ou en pause (started_at nul) au moment de l'arrêt.
  const elapsedSeconds = totalElapsedSeconds(existing.started_at as string | null, existing.accumulated_seconds as number);
  await supabase.from("task_timers").delete().eq("id", existing.id);

  if (elapsedSeconds <= 0) return NextResponse.json({ durationSeconds: 0 });

  const { data: taskRow, error: taskErr } = await supabase.from("tasks").select("project_id").eq("id", params.id).maybeSingle();
  if (taskErr || !taskRow) return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 });

  const { error } = await supabase.from("time_entries").insert({
    project_id: taskRow.project_id,
    task_id: params.id,
    collaborateur_id: session.id,
    duration_minutes: Math.ceil(elapsedSeconds / 60),
    duration_seconds: elapsedSeconds,
    note: "Chrono",
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ durationSeconds: elapsedSeconds });
}
