import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient, getServerSession } from "@/lib/supabase-server";
import { can } from "@/lib/permissions";
import { canViewProject } from "@/lib/project-access";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const supabase = createSupabaseServerClient();

  // 404 (jamais 403) pour un collaborateur non assigné — ne révèle pas
  // l'existence d'un projet auquel il n'a pas accès. Vérifié avant toute
  // lecture des données du projet, jamais chargé côté client pour ensuite
  // être masqué.
  if (!(await canViewProject(supabase, params.id, session))) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("projects")
    .select("id, name, client_name, status, assigned_to, start_date, due_date, axonaut_contract_id, axonaut_quotation_id, created_via, created_at, project_type")
    .eq("id", params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });

  return NextResponse.json({ data });
}

// Modifier un projet (statut, assignation, dates, type) est réservé à
// l'admin — le Collaborateur a une page Projets entièrement en lecture
// seule (spec permissions). Historise toute (ré)affectation dans
// assignment_events (migration 031), même pattern que task_events.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!can(session.role, "update_project")) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const supabase = createSupabaseServerClient();
  const body = await req.json();

  const allowed = ["status", "assigned_to", "start_date", "due_date", "project_type"] as const;
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  if (Object.keys(update).length === 0)
    return NextResponse.json({ error: "Aucun champ modifiable" }, { status: 400 });

  let previousAssignee: string | null = null;
  if ("assigned_to" in update) {
    const { data: existing } = await supabase.from("projects").select("assigned_to").eq("id", params.id).maybeSingle();
    previousAssignee = (existing?.assigned_to as string | null) ?? null;
  }

  const { error } = await supabase
    .from("projects")
    .update(update)
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if ("assigned_to" in update && update.assigned_to !== previousAssignee) {
    await supabase.from("assignment_events").insert({
      resource_type: "project",
      resource_id: params.id,
      actor_id: session.id,
      old_assignee_id: previousAssignee,
      new_assignee_id: (update.assigned_to as string | null) ?? null,
    });
  }

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/projets/:id — réservé admin (pas de permission dédiée dans
 * lib/permissions.ts, même choix que /api/tickets DELETE : vérification
 * directe du rôle plutôt qu'une permission qui n'existerait que pour ça).
 * Tâches, saisies de temps, BAT et heures sup liés partent en cascade
 * (ON DELETE CASCADE, cf. migrations 013/014/004/028) ; les tickets qui
 * référencent ce projet sont juste détachés (ON DELETE SET NULL, migration 009).
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("projects").delete().eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
