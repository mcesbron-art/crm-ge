import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getServerSession } from "@/lib/supabase-server";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Row = {
  id: string; date: string; hours: number; status: string; created_at: string; processed_at: string | null;
  collaborateur: { id: string; nom: string; color: string | null } | null;
  processor: { nom: string } | null;
  project: { name: string; client_name: string } | null;
};

// Liste des heures supplémentaires — même règle de visibilité que les
// absences : un collaborateur ne voit que les siennes, direction/admin
// (manage_absences) voient tout.
export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const supabase = createSupabaseServerClient();
  const canSeeAll = can(session.role, "manage_absences");

  let query = supabase
    .from("overtime_declarations")
    .select(`
      id, date, hours, status, created_at, processed_at,
      collaborateur:collaborateurs!overtime_declarations_collaborateur_id_fkey(id, nom, color),
      processor:collaborateurs!overtime_declarations_processed_by_fkey(nom),
      project:projects(name, client_name)
    `);

  if (!canSeeAll) query = query.eq("collaborateur_id", session.id);

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  if (status) query = query.eq("status", status);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as unknown as Row[];
  return NextResponse.json({
    overtimes: rows.map(r => ({
      id: r.id,
      date: r.date,
      hours: r.hours,
      status: r.status,
      createdAt: r.created_at,
      processedAt: r.processed_at,
      collaborateur: r.collaborateur,
      processedByNom: r.processor?.nom ?? null,
      projectName: r.project?.name ?? "—",
      projectClient: r.project?.client_name ?? "",
    })),
  });
}

// Crée une déclaration d'heures sup. pour SOI-MÊME uniquement.
export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json();
  const { project_id, date, hours } = body;

  if (typeof project_id !== "string" || !project_id) {
    return NextResponse.json({ error: "Projet requis" }, { status: 400 });
  }
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Date invalide" }, { status: 400 });
  }
  const hoursNum = typeof hours === "number" ? hours : Number(hours);
  if (!Number.isFinite(hoursNum) || hoursNum <= 0) {
    return NextResponse.json({ error: "Nombre d'heures invalide" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("overtime_declarations")
    .insert({ collaborateur_id: session.id, project_id, date, hours: hoursNum })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: data.id }, { status: 201 });
}
