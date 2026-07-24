import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getServerSession } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Reprend un chrono en pause appartenant à CETTE tâche. Pas de multi-chrono :
// si le chrono actif du collaborateur concerne une autre tâche, il faut
// passer par /timer/start sur cette tâche (qui encaisse l'ancien).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const supabase = createSupabaseServerClient();

  const { data: existing } = await supabase
    .from("task_timers")
    .select("id, task_id, started_at")
    .eq("collaborateur_id", session.id)
    .maybeSingle();

  if (!existing || existing.task_id !== params.id) {
    return NextResponse.json({ error: "Aucun chrono en pause sur cette tâche" }, { status: 409 });
  }
  if (existing.started_at) {
    return NextResponse.json({ startedAt: existing.started_at });
  }

  const startedAt = new Date().toISOString();
  const { error } = await supabase.from("task_timers").update({ started_at: startedAt }).eq("id", existing.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ startedAt });
}
