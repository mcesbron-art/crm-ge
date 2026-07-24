import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getServerSession } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Abandonne le chrono de cette tâche sans créer de saisie de temps —
// distinct de /timer/stop qui encaisse toujours la durée accumulée.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from("task_timers")
    .delete()
    .eq("collaborateur_id", session.id)
    .eq("task_id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
