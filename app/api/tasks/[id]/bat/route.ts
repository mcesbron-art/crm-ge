import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getServerSession } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RevisionRow = {
  id: string; version: number; status: string; link: string | null;
  send_comment: string | null; sent_at: string;
  returned_at: string | null; return_comment: string | null;
  rejection_reason: string | null; next_stage: string | null;
  sender: { nom: string; color: string | null } | null;
  returner: { nom: string } | null;
};

// Historique complet des révisions de BAT d'une tâche — lecture réservée à
// l'assigné ou à l'admin, même règle que l'écriture (POST ci-dessous).
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const supabase = createSupabaseServerClient();
  const { data: task, error: taskErr } = await supabase.from("tasks").select("assigned_to").eq("id", params.id).maybeSingle();
  if (taskErr || !task) return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 });

  if (session.role !== "admin" && task.assigned_to !== session.id) {
    return NextResponse.json({ error: "Tu n'es pas assigné à cette tâche" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("task_bat_revisions")
    .select(`
      id, version, status, link, send_comment, sent_at, returned_at, return_comment, rejection_reason, next_stage,
      sender:collaborateurs!task_bat_revisions_sent_by_fkey(nom, color),
      returner:collaborateurs!task_bat_revisions_returned_by_fkey(nom)
    `)
    .eq("task_id", params.id)
    .order("version", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as unknown as RevisionRow[];
  return NextResponse.json({
    revisions: rows.map(r => ({
      id: r.id,
      version: r.version,
      status: r.status,
      link: r.link,
      sendComment: r.send_comment,
      sentAt: r.sent_at,
      sentByNom: r.sender?.nom ?? "—",
      returnedAt: r.returned_at,
      returnedByNom: r.returner?.nom ?? null,
      returnComment: r.return_comment,
      rejectionReason: r.rejection_reason,
      nextStage: r.next_stage,
    })),
  });
}

// Envoie une nouvelle révision de BAT — même permission que /wait et
// /billing pour la création : assigné à la tâche, ou admin. Écrit via la
// fonction transactionnelle send_task_bat (migration 027).
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const supabase = createSupabaseServerClient();
  const { data: task, error: taskErr } = await supabase.from("tasks").select("assigned_to").eq("id", params.id).maybeSingle();
  if (taskErr || !task) return NextResponse.json({ error: "Tâche introuvable" }, { status: 404 });

  if (session.role !== "admin" && task.assigned_to !== session.id) {
    return NextResponse.json({ error: "Tu n'es pas assigné à cette tâche" }, { status: 403 });
  }

  const body = await req.json();
  const { link, comment } = body;
  if (link !== undefined && link !== null && typeof link !== "string") {
    return NextResponse.json({ error: "Lien invalide" }, { status: 400 });
  }

  const { data: revisionId, error } = await supabase.rpc("send_task_bat", {
    p_task_id: params.id,
    p_link: typeof link === "string" && link.trim() ? link.trim() : null,
    p_comment: typeof comment === "string" && comment.trim() ? comment.trim() : null,
    p_collaborateur_id: session.id,
  });

  if (error) {
    const status = error.code === "P0001" ? 409 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ revisionId }, { status: 201 });
}
