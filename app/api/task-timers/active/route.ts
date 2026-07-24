import { NextResponse } from "next/server";
import { createSupabaseServerClient, getServerSession } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Chrono actif de l'utilisateur connecté, tous projets confondus — permet
// de restaurer l'affichage du chrono après un rechargement de page.
export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("task_timers")
    .select("task_id, started_at, accumulated_seconds, tasks(label, project_id, projects(name))")
    .eq("collaborateur_id", session.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const task = data?.tasks as unknown as { label: string; project_id: string; projects: { name: string } | null } | null;

  return NextResponse.json({
    timer: data ? {
      taskId: data.task_id as string,
      startedAt: data.started_at as string | null,
      accumulatedSeconds: data.accumulated_seconds as number,
      taskLabel: task?.label ?? "Tâche",
      projectId: task?.project_id ?? "",
      projectName: task?.projects?.name ?? "—",
    } : null,
  });
}
