import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getServerSession } from "@/lib/supabase-server";
import { ABSENCE_TYPES } from "@/lib/absence-taxonomy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TYPE_VALUES = new Set<string>(ABSENCE_TYPES.map(t => t.value));

// Modifier/supprimer une absence déjà validée est réservé à l'admin.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const supabase = createSupabaseServerClient();
  const { data: existing } = await supabase.from("absences").select("status").eq("id", params.id).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  if (existing.status !== "validee") {
    return NextResponse.json({ error: "Seule une absence déjà validée peut être modifiée ici" }, { status: 400 });
  }

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

  const { error } = await supabase
    .from("absences")
    .update({ type, start_date, end_date, days: daysNum })
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const supabase = createSupabaseServerClient();
  const { data: existing } = await supabase.from("absences").select("status").eq("id", params.id).maybeSingle();
  if (!existing) return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
  if (existing.status !== "validee") {
    return NextResponse.json({ error: "Seule une absence déjà validée peut être supprimée ici" }, { status: 400 });
  }

  const { error } = await supabase.from("absences").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
