import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient, getServerSession } from "@/lib/supabase-server";
import { can } from "@/lib/permissions";
import { canViewTicket } from "@/lib/ticket-access";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATUT_FR: Record<string, string> = {
  ouvert:   "Nouveau",
  en_cours: "En cours",
  resolu:   "Résolu",
  ferme:    "Fermé",
};

const FR_TO_STATUT: Record<string, string> = {
  "Nouveau":  "ouvert",
  "En cours": "en_cours",
  "Résolu":   "resolu",
  "Fermé":    "ferme",
};

function capitalizeFirst(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function frenchDate(isoStr: string) {
  return new Date(isoStr).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

function clientInitials(name: string | null | undefined) {
  if (!name) return "?";
  const words = name.trim().split(/\s+/);
  return words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const supabase = createSupabaseAdminClient();

  if (!(await canViewTicket(supabase, params.id, session))) {
    return NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("tickets")
    .select(
      "id, axonaut_ticket_id, titre, statut, priorite, client_name, projet_name, description, tags, echanges, created_at, updated_at, created_via, assigned_to, project_id, collaborateurs!assigned_to(id, nom, avatar, color), projects!project_id(id, name), ticket_collaborators(collaborateurs(id, nom, avatar, color))"
    )
    .eq("id", params.id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });

  const assignee = data.collaborateurs as unknown as { id: string; nom: string; avatar: string | null; color: string | null } | null;
  const project = data.projects as unknown as { id: string; name: string } | null;
  const collaborators = (data.ticket_collaborators as unknown as { collaborateurs: { id: string; nom: string; avatar: string | null; color: string | null } }[]) ?? [];
  const createdVia = (data.created_via as string) ?? "manual";

  return NextResponse.json({
    ticket: {
      uuid:           data.id as string,
      id:             data.id as string,
      ref:            createdVia === "axonaut" && data.axonaut_ticket_id ? `#AX-${data.axonaut_ticket_id}` : `#TKT-${(data.id as string).slice(0, 8).toUpperCase()}`,
      title:          data.titre ?? "",
      client:         data.client_name ?? "Client inconnu",
      clientInitials: clientInitials(data.client_name),
      project:        project?.name ?? data.projet_name ?? "—",
      projectId:      project?.id ?? null,
      priority:       capitalizeFirst(data.priorite ?? "normale"),
      status:         STATUT_FR[data.statut ?? "ouvert"] ?? "Nouveau",
      created:        frenchDate(data.created_at),
      modified:       frenchDate(data.updated_at ?? data.created_at),
      echanges:       data.echanges ?? 0,
      tags:           Array.isArray(data.tags) ? (data.tags as string[]) : [],
      description:    data.description ?? null,
      source:         data.created_via === "axonaut" ? "axonaut" : "manual",
      assignee:       assignee ? { id: assignee.id, nom: assignee.nom, avatar: assignee.avatar, color: assignee.color ?? "#888" } : null,
      collaborators:  collaborators.map(c => ({ id: c.collaborateurs.id, nom: c.collaborateurs.nom, avatar: c.collaborateurs.avatar, color: c.collaborateurs.color ?? "#888" })),
    },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const supabaseCheck = createSupabaseAdminClient();
  if (!(await canViewTicket(supabaseCheck, params.id, session))) {
    return NextResponse.json({ error: "Ticket introuvable" }, { status: 404 });
  }

  const body = await req.json();
  const { status, assigned_to, tags, project_id, collaborator_ids } = body;

  // Réaffecter (assigné principal ou collaborateurs additionnels) est une
  // décision de gestion, pas une mise à jour de son propre suivi — réservée
  // à manage_ticket_assignment (admin).
  if ((assigned_to !== undefined || collaborator_ids !== undefined) && !can(session.role, "manage_ticket_assignment")) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (status !== undefined) {
    const statut = FR_TO_STATUT[status];
    if (!statut) return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
    update.statut = statut;
  }

  let previousAssignee: string | null = null;
  if (assigned_to !== undefined) {
    const { data: existing } = await supabaseCheck.from("tickets").select("assigned_to").eq("id", params.id).maybeSingle();
    previousAssignee = (existing?.assigned_to as string | null) ?? null;
    update.assigned_to = assigned_to || null;
  }
  if (project_id !== undefined) update.project_id = project_id || null;
  if (tags !== undefined) {
    if (!Array.isArray(tags) || !tags.every(t => typeof t === "string")) {
      return NextResponse.json({ error: "Tags invalides" }, { status: 400 });
    }
    update.tags = tags;
  }

  if (collaborator_ids !== undefined && (!Array.isArray(collaborator_ids) || !collaborator_ids.every(c => typeof c === "string"))) {
    return NextResponse.json({ error: "Collaborateurs invalides" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: ticketRow, error: updateErr } = await supabase
    .from("tickets")
    .update(update)
    .eq("id", params.id)
    .select("id")
    .single();

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  if (assigned_to !== undefined && update.assigned_to !== previousAssignee) {
    await supabase.from("assignment_events").insert({
      resource_type: "ticket",
      resource_id: params.id,
      actor_id: session.id,
      old_assignee_id: previousAssignee,
      new_assignee_id: (update.assigned_to as string | null) ?? null,
    });
  }

  if (collaborator_ids !== undefined) {
    const ticketId = ticketRow.id as string;
    const { error: delErr } = await supabase.from("ticket_collaborators").delete().eq("ticket_id", ticketId);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

    if (collaborator_ids.length > 0) {
      const rows = (collaborator_ids as string[]).map(collaborateur_id => ({ ticket_id: ticketId, collaborateur_id }));
      const { error: insErr } = await supabase.from("ticket_collaborators").insert(rows);
      if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
