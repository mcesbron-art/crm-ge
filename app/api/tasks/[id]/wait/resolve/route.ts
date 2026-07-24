import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getServerSession } from "@/lib/supabase-server";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// "Éléments reçus" — clôture l'attente active et restaure l'étape d'origine
// de la tâche, via la fonction transactionnelle resolve_task_wait.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const supabase = createSupabaseServerClient();

  const { data: task, error: taskErr } = await supabase.from("tasks").select("assigned_to").eq("id", params.id).maybeSingle();
  if (taskErr || !task) return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 });

  if (!can(session.role, "view_all_tasks") && task.assigned_to !== session.id) {
    return NextResponse.json({ error: "Tu n'es pas assigné à cette tâche" }, { status: 403 });
  }

  const { data, error } = await supabase.rpc("resolve_task_wait", {
    p_task_id: params.id,
    p_collaborateur_id: session.id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const row = (data as { wait_id: string; restored_stage: string }[] | null)?.[0];
  if (!row) return NextResponse.json({ error: "Aucune attente active sur cette tâche" }, { status: 404 });

  return NextResponse.json({ ok: true, stage: row.restored_stage });
}
