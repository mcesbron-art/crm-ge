import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient, getServerSession } from "@/lib/supabase-server";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function dateToOrd(isoStr: string): number {
  const d = new Date(isoStr);
  return (d.getMonth() + 1) * 100 + d.getDate();
}

function frenchDate(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

function clientInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function capitalizeFirst(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const STATUT_FR: Record<string, string> = {
  ouvert:   "Nouveau",
  en_cours: "En cours",
  resolu:   "Résolu",
  ferme:    "Fermé",
};

function ticketRef(row: { axonaut_ticket_id: number | null; id: string; created_via: string }): string {
  if (row.created_via === "axonaut" && row.axonaut_ticket_id) return `#AX-${row.axonaut_ticket_id}`;
  return `#TKT-${row.id.slice(0, 8).toUpperCase()}`;
}

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const supabase = createSupabaseAdminClient();

  // Client admin (bypass RLS) : le filtrage par assignation doit donc être
  // fait explicitement en application, pas délégué à des policies — seul
  // le rôle admin (lib/permissions.ts) voit tous les tickets.
  if (!can(session.role, "view_all_tickets")) {
    const [{ data: assignedRows }, { data: collabRows }] = await Promise.all([
      supabase.from("tickets").select("id").eq("assigned_to", session.id),
      supabase.from("ticket_collaborators").select("ticket_id").eq("collaborateur_id", session.id),
    ]);
    const allowedIds = Array.from(new Set([
      ...(assignedRows ?? []).map(r => r.id as string),
      ...(collabRows ?? []).map(r => r.ticket_id as string),
    ]));
    if (allowedIds.length === 0) return NextResponse.json({ tickets: [] });
    return respondTickets(supabase, allowedIds);
  }

  return respondTickets(supabase, null);
}

async function respondTickets(supabase: ReturnType<typeof createSupabaseAdminClient>, restrictToIds: string[] | null) {
  let query = supabase
    .from("tickets")
    .select(
      "id, axonaut_ticket_id, titre, statut, priorite, client_name, projet_name, tags, echanges, created_at, updated_at, created_via, assigned_to, project_id, collaborateurs!assigned_to(nom), projects!project_id(name)"
    );
  // Un ticket archivé (import Axonaut ancien, cf. supabase/migrations/034)
  // reste accessible à un collaborateur qui y est directement assigné —
  // seule la vue "tous les tickets" le masque, même règle que projects.archived.
  if (restrictToIds) query = query.in("id", restrictToIds);
  else query = query.eq("archived", false);

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ticketIds = (data ?? []).map(row => row.id as string);
  const collabsByTicket = new Map<string, { nom: string; avatar: string | null; color: string | null }[]>();

  if (ticketIds.length > 0) {
    const { data: collabRows } = await supabase
      .from("ticket_collaborators")
      .select("ticket_id, collaborateurs(nom, avatar, color)")
      .in("ticket_id", ticketIds);

    for (const row of collabRows ?? []) {
      const c = row.collaborateurs as unknown as { nom: string; avatar: string | null; color: string | null } | null;
      if (!c) continue;
      const list = collabsByTicket.get(row.ticket_id as string) ?? [];
      list.push(c);
      collabsByTicket.set(row.ticket_id as string, list);
    }
  }

  const tickets = (data ?? []).map(row => {
    const assignee = row.collaborateurs as unknown as { nom: string } | null;
    const project = row.projects as unknown as { name: string } | null;
    const createdVia = (row.created_via as string) ?? "manual";
    return {
      id:             row.id as string,
      ref:            ticketRef({ axonaut_ticket_id: row.axonaut_ticket_id as number | null, id: row.id as string, created_via: createdVia }),
      title:          row.titre ?? "",
      client:         row.client_name ?? "Client inconnu",
      clientInitials: clientInitials(row.client_name),
      project:        project?.name ?? row.projet_name ?? "—",
      priority:       capitalizeFirst(row.priorite ?? "Normale"),
      status:         STATUT_FR[row.statut ?? "ouvert"] ?? "Nouveau",
      created:        frenchDate(row.created_at),
      cOrd:           dateToOrd(row.created_at),
      modified:       frenchDate(row.updated_at ?? row.created_at),
      mOrd:           dateToOrd(row.updated_at ?? row.created_at),
      echanges:       row.echanges ?? 0,
      tags:           Array.isArray(row.tags) ? row.tags as string[] : [],
      owner:          assignee?.nom ?? "",
      collabs:        collabsByTicket.get(row.id as string) ?? [],
      source:         createdVia === "axonaut" ? ("axonaut" as const) : ("manual" as const),
    };
  });

  return NextResponse.json({ tickets });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (!can(session.role, "create_ticket")) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await req.json();
  const { titre, client_name, priorite, description, tags, assigned_to } = body;

  if (typeof titre !== "string" || !titre.trim()) {
    return NextResponse.json({ error: "Titre requis" }, { status: 400 });
  }

  // Choisir l'assigné (manage_ticket_assignment) est réservé à l'admin —
  // un collaborateur qui crée un ticket se le voit assigné automatiquement
  // (sinon il ne le reverrait plus lui-même, vu qu'il ne voit que ses
  // tickets assignés), jamais un id envoyé par le client.
  const resolvedAssignee = can(session.role, "manage_ticket_assignment")
    ? (typeof assigned_to === "string" && assigned_to.trim() ? assigned_to.trim() : null)
    : session.id;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("tickets")
    .insert({
      titre:        titre.trim(),
      client_name:  typeof client_name === "string" && client_name.trim() ? client_name.trim() : null,
      description:  typeof description === "string" && description.trim() ? description.trim() : null,
      priorite:     typeof priorite === "string" && priorite.trim() ? priorite.trim() : "normale",
      tags:         Array.isArray(tags) ? tags.filter((t): t is string => typeof t === "string") : [],
      statut:       "ouvert",
      created_via:  "manual",
      created_by:   session.authId,
      assigned_to:  resolvedAssignee,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: data.id as string }, { status: 201 });
}

/**
 * DELETE /api/tickets — body: { ids: string[] }
 * Suppression en masse, réservée admin (comme le reste de la gestion des
 * tickets Axonaut/manuels — pas de permission dédiée dans lib/permissions.ts,
 * même choix que /api/rapports/temps : vérification directe du rôle).
 * Les commentaires et collaborateurs liés (ticket_comments,
 * ticket_collaborators) partent avec via ON DELETE CASCADE.
 */
export async function DELETE(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
  }

  let body: { ids?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const ids = Array.isArray(body.ids) ? body.ids.filter((id): id is string => typeof id === "string" && id.length > 0) : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "Aucun ticket à supprimer" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { error, count } = await supabase
    .from("tickets")
    .delete({ count: "exact" })
    .in("id", ids);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, deleted: count ?? ids.length });
}
