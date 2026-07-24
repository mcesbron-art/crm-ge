import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getServerSession } from "@/lib/supabase-server";
import { totalElapsedSeconds } from "@/lib/task-timer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Fige le segment en cours dans accumulated_seconds et vide started_at —
// contrairement à stop, ne crée AUCUNE saisie de temps : la ligne
// task_timers reste vivante, reprenable via /timer/resume.
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
  if (!existing.started_at) {
    return NextResponse.json({ accumulatedSeconds: existing.accumulated_seconds as number });
  }

  const accumulatedSeconds = totalElapsedSeconds(existing.started_at as string, existing.accumulated_seconds as number);

  const { error } = await supabase
    .from("task_timers")
    .update({ started_at: null, accumulated_seconds: accumulatedSeconds })
    .eq("id", existing.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ accumulatedSeconds });
}
