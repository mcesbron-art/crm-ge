import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getServerSession } from "@/lib/supabase-server";
import { can } from "@/lib/permissions";
import { ABSENCE_TYPES } from "@/lib/absence-taxonomy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TYPE_VALUES = new Set<string>(ABSENCE_TYPES.map(t => t.value));

type Row = {
  id: string; type: string; start_date: string; end_date: string; days: number; status: string;
  created_at: string; processed_at: string | null;
  collaborateur: { id: string; nom: string; color: string | null } | null;
  processor: { nom: string } | null;
};

// Liste des absences — un collaborateur ne voit que les siennes, direction
// et admin (manage_absences) voient tout. Même principe que
// task_billing_requests : filtrage réel côté serveur sur session.id, jamais
// sur un paramètre envoyé par le client.
export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const supabase = createSupabaseServerClient();
  const canSeeAll = can(session.role, "manage_absences");

  let query = supabase
    .from("absences")
    .select(`
      id, type, start_date, end_date, days, status, created_at, processed_at,
      collaborateur:collaborateurs!absences_collaborateur_id_fkey(id, nom, color),
      processor:collaborateurs!absences_processed_by_fkey(nom)
    `);

  if (!canSeeAll) query = query.eq("collaborateur_id", session.id);

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  if (status) query = query.eq("status", status);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = (data ?? []) as unknown as Row[];
  return NextResponse.json({
    absences: rows.map(r => ({
      id: r.id,
      type: r.type,
      startDate: r.start_date,
      endDate: r.end_date,
      days: r.days,
      status: r.status,
      createdAt: r.created_at,
      processedAt: r.processed_at,
      collaborateur: r.collaborateur,
      processedByNom: r.processor?.nom ?? null,
    })),
  });
}

// Crée une demande d'absence pour SOI-MÊME uniquement — le collaborateur
// connecté fait foi (session.id), jamais un champ envoyé par le client.
export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json();
  const { type, start_date, end_date, days } = body;

  if (typeof type !== "string" || !TYPE_VALUES.has(type)) {
    return NextResponse.json({ error: "Type d'absence invalide" }, { status: 400 });
  }
  if (typeof start_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(start_date)) {
    return NextResponse.json({ error: "Date de début invalide" }, { status: 400 });
  }
  if (typeof end_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
    return NextResponse.json({ error: "Date de fin invalide" }, { status: 400 });
  }
  if (end_date < start_date) {
    return NextResponse.json({ error: "La date de fin doit être après la date de début" }, { status: 400 });
  }
  const daysNum = typeof days === "number" ? days : Number(days);
  if (!Number.isFinite(daysNum) || daysNum <= 0) {
    return NextResponse.json({ error: "Nombre de jours invalide" }, { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("absences")
    .insert({ collaborateur_id: session.id, type, start_date, end_date, days: daysNum })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: data.id }, { status: 201 });
}
